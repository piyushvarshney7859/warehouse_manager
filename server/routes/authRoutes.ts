import { Router } from 'express';
import { User, IUser, UserRole } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';

const router = Router();

// Auto-seed default demo users if none exist
async function ensureDemoUsers() {
  const count = await User.countDocuments();
  if (count > 0) return;

  const defaultUsers: Partial<IUser>[] = [
    {
      userId: 'USR-MFG-01',
      name: 'Rajesh Singhania',
      email: 'manufacturer@stockpilot.io',
      phone: '+91 98100 11223',
      password: 'password123',
      role: 'manufacturer',
      companyName: 'Apex Industrial Manufacturing Ltd.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      userId: 'USR-WH-01',
      name: 'Vikram Malhotra',
      email: 'warehouse@stockpilot.io',
      phone: '+91 98200 44556',
      password: 'password123',
      role: 'warehouse',
      warehouseId: 'WH-01',
      companyName: 'StockPilot Central Logistics',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      userId: 'USR-DEL-01',
      name: 'Ramesh Kumar',
      email: 'delivery@stockpilot.io',
      phone: '9876543210',
      password: 'password123',
      role: 'delivery',
      partnerId: 'DP-101',
      agency: 'Delhivery Express',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    },
  ];

  await User.insertMany(defaultUsers);
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    await ensureDemoUsers();
    const { email, password, role, isQuickDemo } = req.body;

    // Quick demo login by role
    if (isQuickDemo && role) {
      let user = await User.findOne({ role });
      if (!user) {
        await ensureDemoUsers();
        user = await User.findOne({ role });
      }
      return res.json({
        success: true,
        user,
        token: `demo-token-${user?.userId}`,
        message: `Logged in as ${user?.name} (${role.toUpperCase()})`,
      });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email or Mobile number is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let user = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanEmail }],
    });

    if (!user) {
      // If user doesn't exist, create automatically for smooth UX
      const userCount = await User.countDocuments();
      user = await User.create({
        userId: `USR-${Date.now().toString().slice(-6)}`,
        name: cleanEmail.split('@')[0] || 'Operator',
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@stockpilot.local`,
        phone: !cleanEmail.includes('@') ? cleanEmail : '',
        password: password || 'password123',
        role: (role as UserRole) || 'warehouse',
        companyName: role === 'manufacturer' ? 'Global Supply Corp' : 'StockPilot Operations',
        warehouseId: 'WH-01',
        partnerId: role === 'delivery' ? `DP-${100 + userCount}` : '',
      });
    }

    res.json({
      success: true,
      user,
      token: `token-${user.userId}`,
      message: `Welcome, ${user.name}!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role, companyName, warehouseId, agency, vehicleNumber } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Account with this email already exists. Please log in.',
      });
    }

    const userCount = await User.countDocuments();
    const targetRole: UserRole = role || 'warehouse';
    let partnerId = '';

    if (targetRole === 'delivery') {
      partnerId = `DP-${105 + userCount}`;
      // Also register in DeliveryPartner collection for dispatcher consistency
      await DeliveryPartner.create({
        partnerId,
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        agency: agency || 'In-House Express',
        pin: '1234',
        vehicleNumber: vehicleNumber || 'MH 01 AB 1234',
        vehicleType: 'Motorcycle / Bike',
        city: 'Central Logistics Hub',
        active: true,
        totalPickups: 0,
        totalUnitsDelivered: 0,
      });
    }

    const newUser = await User.create({
      userId: `USR-${Date.now().toString().slice(-6)}`,
      name: String(name).trim(),
      email: cleanEmail,
      phone: phone || '',
      password: password || 'password123',
      role: targetRole,
      companyName: companyName || (targetRole === 'manufacturer' ? 'Apex Industrial Manufacturing' : 'StockPilot Warehouse Hub'),
      warehouseId: warehouseId || 'WH-01',
      partnerId,
      agency: agency || '',
    });

    res.status(201).json({
      success: true,
      user: newUser,
      token: `token-${newUser.userId}`,
      message: `Account created successfully as ${targetRole.toUpperCase()}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    await ensureDemoUsers();
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
