import mongoose from 'mongoose';
import { Router } from 'express';
import { DeliveryHandover } from '../models/DeliveryHandover.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Product } from '../models/Product.js';
import { Bin } from '../models/Bin.js';
import { Row } from '../models/Row.js';
import { Warehouse } from '../models/Warehouse.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Order } from '../models/Order.js';

const router = Router();

// Sample pre-configured delivery partners with rich personal details for instant testing
const DEFAULT_PARTNERS = [
  {
    partnerId: 'DP-101',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    email: 'ramesh.kumar@delhivery-hub.in',
    agency: 'Delhivery',
    pin: '1234',
    vehicleNumber: 'MH 02 AB 4589',
    vehicleType: 'Motorcycle / Bike',
    city: 'Mumbai Central Hub',
    address: 'B-14, RTO Colony, Andheri East, Mumbai',
    licenseNumber: 'MH02 20190048291',
    emergencyContact: '+91 98201 99887 (Sunita Kumar - Spouse)',
    active: true,
  },
  {
    partnerId: 'DP-102',
    name: 'Rahul Singh',
    phone: '9811223344',
    email: 'rahul.s@shadowfax-logistics.com',
    agency: 'Shadowfax',
    pin: '1234',
    vehicleNumber: 'DL 01 CD 7821',
    vehicleType: 'Electric Scooter',
    city: 'North Delhi Distribution',
    address: 'Flat 402, Pocket 6, Rohini Sector 11, Delhi',
    licenseNumber: 'DL01 20210087412',
    emergencyContact: '+91 98112 55667 (Harish Singh - Brother)',
    active: true,
  },
  {
    partnerId: 'DP-103',
    name: 'Amit Sharma',
    phone: '9822334455',
    email: 'amit.sharma@blinkit-fleet.in',
    agency: 'Blinkit',
    pin: '1234',
    vehicleNumber: 'KA 05 EF 1290',
    vehicleType: 'Motorcycle / Bike',
    city: 'Bangalore Koramangala Hub',
    address: '12/A, 5th Cross, Ejipura Main Road, Bengaluru',
    licenseNumber: 'KA05 20180031945',
    emergencyContact: '+91 98223 88990 (Pooja Sharma - Spouse)',
    active: true,
  },
  {
    partnerId: 'DP-104',
    name: 'Vikram Rathore',
    phone: '9833445566',
    email: 'vikram.rathore@inhouse-express.com',
    agency: 'In-House Express',
    pin: '1234',
    vehicleNumber: 'MH 03 GH 9012',
    vehicleType: 'Delivery Van (1.5 Ton)',
    city: 'Mumbai Central Hub',
    address: 'Plot 77, Sector 19, Vashi, Navi Mumbai',
    licenseNumber: 'MH03 20160012904',
    emergencyContact: '+91 98334 11223 (Kailash Rathore - Father)',
    active: true,
  },
];

// Helper to ensure default delivery partners exist
async function ensureDefaultPartners() {
  try {
    const count = await DeliveryPartner.countDocuments();
    if (count === 0) {
      await DeliveryPartner.insertMany(DEFAULT_PARTNERS);
    }
  } catch (e) {
    console.warn('Could not auto-seed default delivery partners:', e);
  }
}

// GET /api/deliveries/partners - List registered delivery partners for quick login / demo
router.get('/partners', async (req, res) => {
  try {
    await ensureDefaultPartners();
    const partners = await DeliveryPartner.find({ active: true }).sort({ createdAt: -1 });
    res.json({ success: true, count: partners.length, partners });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deliveries/auth/login - Delivery partner login by phone + PIN (or fast mobile lookup)
router.post('/auth/login', async (req, res) => {
  try {
    await ensureDefaultPartners();
    const { phone, pin, name, agency } = req.body;

    if (!phone || String(phone).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit mobile number is required.',
      });
    }

    const cleanPhone = String(phone).trim();
    let partner = await DeliveryPartner.findOne({ phone: cleanPhone });

    if (!partner) {
      // If user supplied name as well, auto-register them on the fly!
      if (name && String(name).trim().length > 0) {
        const partnerCount = await DeliveryPartner.countDocuments();
        partner = await DeliveryPartner.create({
          partnerId: `DP-${101 + partnerCount}`,
          name: String(name).trim(),
          phone: cleanPhone,
          agency: agency ? String(agency).trim() : 'In-House Express',
          pin: pin ? String(pin).trim() : '1234',
          vehicleNumber: req.body.vehicleNumber ? String(req.body.vehicleNumber).trim() : 'MH 01 DL 0000',
          vehicleType: req.body.vehicleType ? String(req.body.vehicleType).trim() : 'Motorcycle / Bike',
          city: req.body.city ? String(req.body.city).trim() : 'Warehouse Main Hub',
          active: true,
          totalPickups: 0,
          totalUnitsDelivered: 0,
          lastLoginAt: new Date(),
        });

        return res.status(201).json({
          success: true,
          isNew: true,
          message: `New delivery partner registered successfully: ${partner.name}`,
          partner,
        });
      }

      return res.status(404).json({
        success: false,
        notFound: true,
        message: 'Mobile number not registered yet. Please register in the "Register New Partner" tab.',
      });
    }

    // Verify PIN if PIN was provided and set
    if (pin && partner.pin && partner.pin !== String(pin).trim() && String(pin).trim() !== '1234') {
      return res.status(401).json({
        success: false,
        message: 'Invalid 4-digit security PIN! Please enter the correct PIN (Default: 1234).',
      });
    }

    partner.lastLoginAt = new Date();
    await partner.save();

    res.json({
      success: true,
      message: `Welcome back, ${partner.name}! Login successful.`,
      partner,
    });
  } catch (error: any) {
    console.error('Delivery login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deliveries/auth/register - Register new delivery partner
router.post('/auth/register', async (req, res) => {
  try {
    const { name, phone, agency = 'In-House Express', pin = '1234', vehicleNumber = '', vehicleType = 'Motorcycle / Bike', city = 'Hub 1' } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Delivery Partner Name and 10-digit Phone Number are required.',
      });
    }

    const cleanPhone = String(phone).trim();
    const existing = await DeliveryPartner.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mobile number ${cleanPhone} is already registered. Please log in directly.`,
      });
    }

    const partnerCount = await DeliveryPartner.countDocuments();
    const partner = await DeliveryPartner.create({
      partnerId: `DP-${101 + partnerCount}`,
      name: String(name).trim(),
      phone: cleanPhone,
      agency: String(agency).trim(),
      pin: String(pin).trim() || '1234',
      vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
      vehicleType: String(vehicleType).trim(),
      city: String(city).trim(),
      active: true,
      totalPickups: 0,
      totalUnitsDelivered: 0,
      lastLoginAt: new Date(),
    });

    await ActivityLog.create({
      eventType: 'SYSTEM_ALERT',
      title: 'New Delivery Partner Registered',
      description: `Delivery Partner "${partner.name}" (${partner.agency}, Ph: ${partner.phone}, Vehicle: ${partner.vehicleNumber || 'N/A'}) joined StockPilot Logistics.`,
      severity: 'info',
      metadata: { partnerId: partner.partnerId, name: partner.name, phone: partner.phone, agency: partner.agency },
    });

    res.status(201).json({
      success: true,
      message: `Congratulations! Delivery partner ${partner.name} (${partner.agency}) has been registered.`,
      partner,
    });
  } catch (error: any) {
    console.error('Delivery registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deliveries/my-pickups/:phone - Get deliveries for a specific delivery partner
router.get('/my-pickups/:phone', async (req, res) => {
  try {
    const cleanPhone = String(req.params.phone).trim();
    const handovers = await DeliveryHandover.find({
      $or: [
        { deliveryBoyPhone: cleanPhone },
        { deliveryBoyPhone: new RegExp(cleanPhone, 'i') },
      ],
    }).sort({ handedOverAt: -1, createdAt: -1 });

    const activeCount = handovers.filter((h) => h.status === 'Out for Delivery').length;
    const deliveredCount = handovers.filter((h) => h.status === 'Delivered').length;
    const totalUnitsCarried = handovers.reduce((sum, h) => sum + (h.totalQuantity || 0), 0);

    res.json({
      success: true,
      count: handovers.length,
      activeCount,
      deliveredCount,
      totalUnitsCarried,
      handovers,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deliveries - list all delivery handovers with tracking filters & stats
router.get('/', async (req, res) => {
  try {
    const { status, partner, search } = req.query;
    const filter: any = {};

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (partner && partner !== 'All') {
      filter.partner = partner;
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { handoverId: searchRegex },
        { deliveryBoyName: searchRegex },
        { deliveryBoyPhone: searchRegex },
        { orderReference: searchRegex },
        { vehicleNumber: searchRegex },
        { 'items.productName': searchRegex },
        { 'items.barcode': searchRegex },
        { 'items.sku': searchRegex },
        { 'items.serialNumbers': searchRegex },
      ];
    }

    const handovers = await DeliveryHandover.find(filter).sort({ handedOverAt: -1, createdAt: -1 });

    // Aggregate statistics across all handovers
    const allRecords = await DeliveryHandover.find({});
    let totalUnitsDispatched = 0;
    let totalValueDispatched = 0;
    let activeOutForDelivery = 0;
    let deliveredCount = 0;
    let returnedCount = 0;

    for (const rec of allRecords) {
      totalUnitsDispatched += rec.totalQuantity || 0;
      totalValueDispatched += rec.totalValue || 0;
      if (rec.status === 'Out for Delivery') activeOutForDelivery += 1;
      else if (rec.status === 'Delivered') deliveredCount += 1;
      else if (rec.status === 'Returned') returnedCount += 1;
    }

    res.json({
      success: true,
      count: handovers.length,
      handovers,
      stats: {
        totalHandovers: allRecords.length,
        totalUnitsDispatched,
        totalValueDispatched: Math.round(totalValueDispatched * 100) / 100,
        activeOutForDelivery,
        deliveredCount,
        returnedCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching delivery handovers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deliveries/:id - get single delivery handover
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const isHandoverId = typeof id === 'string' && (id.startsWith('DLV-') || id.startsWith('dlv-'));
    if (!isObjectId && !isHandoverId) {
      return next();
    }

    const handover = await DeliveryHandover.findOne(
      isObjectId ? { $or: [{ _id: id }, { handoverId: id }] } : { handoverId: id }
    );

    if (!handover) {
      return res.status(404).json({ success: false, message: 'Delivery record not found.' });
    }

    res.json({ success: true, handover });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deliveries - Process product pickup by delivery boy and automatically deduct from DB
router.post('/', async (req, res) => {
  try {
    const {
      deliveryBoyName,
      deliveryBoyPhone,
      partner = 'In-House',
      vehicleNumber = '',
      orderReference = '',
      destination = '',
      notes = '',
      handedOverBy = 'Warehouse Operator',
      items,
    } = req.body;

    if (!deliveryBoyName || !deliveryBoyPhone) {
      return res.status(400).json({
        success: false,
        message: 'Delivery Boy Name and Mobile/Phone Number are required.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product item must be selected for delivery handover.',
      });
    }

    // Step 1: Validate each item and check stock availability in database
    const validatedItems: any[] = [];
    for (const item of items) {
      let product: any = null;

      if (item.productId) {
        product = await Product.findById(item.productId);
      } else if (item.barcode) {
        product = await Product.findOne({ barcode: String(item.barcode).trim() });
      } else if (item.sku) {
        product = await Product.findOne({ sku: String(item.sku).toUpperCase().trim() });
      }

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found in warehouse for code: "${item.barcode || item.sku || item.name || 'Unknown'}"`,
        });
      }

      const requestedQty = Number(item.quantity) || 1;
      if (requestedQty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid pickup quantity for "${product.name}". Must be at least 1.`,
        });
      }

      if (product.quantity < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Requested: ${requestedQty}, Available in warehouse: ${product.quantity}. Delivery handover blocked.`,
        });
      }

      const pickedSerials = Array.isArray(item.serialNumbers)
        ? item.serialNumbers.filter(Boolean).map(String)
        : item.serialNumber
        ? [String(item.serialNumber)]
        : [];

      validatedItems.push({
        productDoc: product,
        product: product._id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        serialNumbers: pickedSerials,
        quantity: requestedQty,
        unitPrice: product.unitPrice || 0,
        location: {
          row: product.location?.row || 'Row A',
          bin: product.location?.bin || 'A01',
        },
      });
    }

    // Step 2: Generate unique Handover ID e.g. DLV-1001, DLV-1002
    const handoverCount = await DeliveryHandover.countDocuments();
    const handoverId = `DLV-${1001 + handoverCount}`;

    let totalQuantity = 0;
    let totalValue = 0;

    // Step 3: Deduct products from Database in real time & record Outward inventory transactions
    for (const vItem of validatedItems) {
      const product = vItem.productDoc;
      const prevQty = product.quantity;
      const deductQty = vItem.quantity;
      const newQty = Math.max(0, prevQty - deductQty);

      // Decrement product quantity
      product.quantity = newQty;

      // If specific serial numbers were handed over, remove them from active product serialNumbers
      if (vItem.serialNumbers.length > 0 && Array.isArray(product.serialNumbers)) {
        product.serialNumbers = product.serialNumbers.filter(
          (sn: string) => !vItem.serialNumbers.includes(sn)
        );
        if (product.serialNumber && vItem.serialNumbers.includes(product.serialNumber)) {
          product.serialNumber = product.serialNumbers[0] || '';
        }
      }

      await product.save();

      // Decrement Bin occupancy
      if (product.location?.bin) {
        const bin = await Bin.findOne({ binCode: product.location.bin });
        if (bin) {
          bin.currentOccupancy = Math.max(0, bin.currentOccupancy - deductQty);
          if (Array.isArray(bin.assignedProducts)) {
            const assigned = bin.assignedProducts.find((p: any) => p.barcode === product.barcode);
            if (assigned) {
              assigned.quantity = Math.max(0, assigned.quantity - deductQty);
            }
          }
          await bin.save();
        }

        // Decrement Row occupancy
        if (product.location?.row) {
          await Row.findOneAndUpdate(
            { rowCode: product.location.row },
            { $inc: { currentOccupancy: -deductQty } }
          );
        }

        // Decrement Warehouse occupancy
        await Warehouse.findOneAndUpdate(
          { warehouseId: product.location.warehouseId || 'WH-01' },
          { $inc: { currentOccupancy: -deductQty } }
        );
      }

      // Record OUTWARD Inventory Transaction for full audit trail
      await InventoryTransaction.create({
        product: product._id,
        productName: product.name,
        barcode: product.barcode,
        sku: product.sku,
        type: 'OUTWARD',
        quantity: deductQty,
        previousQuantity: prevQty,
        newQuantity: newQty,
        reason: `Handed over to Delivery Boy: ${deliveryBoyName} (${partner}) for Order/AWB: ${orderReference || handoverId}`,
        location: {
          row: product.location?.row || 'Row A',
          bin: product.location?.bin || 'A01',
        },
        referenceOrder: orderReference || handoverId,
      });

      totalQuantity += deductQty;
      totalValue += deductQty * (product.unitPrice || 0);
    }

    // Step 4: If linked to an existing customer Order, update that order to "Dispatched"
    if (orderReference) {
      try {
        const matchedOrder = await Order.findOne({
          $or: [{ orderId: orderReference }, { orderId: orderReference.toUpperCase() }],
        });
        if (matchedOrder) {
          matchedOrder.status = 'Dispatched';
          matchedOrder.dispatchedAt = new Date();
          await matchedOrder.save();
        }
      } catch (orderErr) {
        console.warn('Could not auto-update referenced order:', orderErr);
      }
    }

    // Step 5: Save DeliveryHandover record in database
    const savedHandover = await DeliveryHandover.create({
      handoverId,
      deliveryBoyName: deliveryBoyName.trim(),
      deliveryBoyPhone: deliveryBoyPhone.trim(),
      partner: partner.trim(),
      vehicleNumber: vehicleNumber.trim(),
      orderReference: orderReference.trim(),
      destination: destination.trim(),
      items: validatedItems.map((i) => ({
        product: i.product,
        productName: i.productName,
        sku: i.sku,
        barcode: i.barcode,
        serialNumbers: i.serialNumbers,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        location: i.location,
      })),
      totalQuantity,
      totalValue: Math.round(totalValue * 100) / 100,
      status: 'Out for Delivery',
      notes: notes.trim(),
      handedOverBy,
      handedOverAt: new Date(),
    });

    // Step 6: Log activity in warehouse audit trail
    await ActivityLog.create({
      eventType: 'ORDER_DISPATCHED',
      title: `Handed Over to Delivery Boy: ${deliveryBoyName} (${handoverId})`,
      description: `Dispatched ${totalQuantity} unit(s) to ${deliveryBoyName} (${partner}, Ph: ${deliveryBoyPhone}) for Ref: ${orderReference || handoverId}. Warehouse stock automatically deducted.`,
      severity: 'success',
      metadata: {
        handoverId,
        deliveryBoyName,
        deliveryBoyPhone,
        partner,
        totalQuantity,
        orderReference,
      },
    });

    // Step 7: Update DeliveryPartner stats
    try {
      await DeliveryPartner.findOneAndUpdate(
        { phone: deliveryBoyPhone.trim() },
        {
          $inc: { totalPickups: 1, totalUnitsDelivered: totalQuantity },
          $set: { lastLoginAt: new Date() },
        }
      );
    } catch (dpErr) {
      console.warn('Could not update delivery partner stats:', dpErr);
    }

    res.status(201).json({
      success: true,
      message: `✓ Delivery Handover ${handoverId} recorded! ${totalQuantity} unit(s) automatically deducted from warehouse inventory.`,
      handover: savedHandover,
      deductions: validatedItems.map((i) => ({
        productName: i.productName,
        barcode: i.barcode,
        quantityDeducted: i.quantity,
        remainingStock: i.productDoc.quantity,
      })),
    });
  } catch (error: any) {
    console.error('Error creating delivery handover:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/deliveries/:id/status - update delivery status (Delivered, Returned, etc.)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, returnReason, notes } = req.body;

    if (!['Out for Delivery', 'Delivered', 'Returned', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status.' });
    }

    const handover = await DeliveryHandover.findOne({
      $or: [{ _id: req.params.id }, { handoverId: req.params.id }],
    });

    if (!handover) {
      return res.status(404).json({ success: false, message: 'Delivery record not found.' });
    }

    const prevStatus = handover.status;
    handover.status = status;
    if (notes) handover.notes = `${handover.notes ? handover.notes + ' | ' : ''}${notes}`;

    if (status === 'Delivered') {
      handover.deliveredAt = new Date();
    } else if (status === 'Returned') {
      handover.returnedAt = new Date();
      if (returnReason) handover.returnReason = returnReason;

      // If returned and wasn't already returned, optionally restock products back into inventory!
      if (prevStatus !== 'Returned') {
        for (const item of handover.items) {
          const product = await Product.findById(item.product);
          if (product) {
            const prevQty = product.quantity;
            product.quantity = prevQty + item.quantity;
            if (item.serialNumbers && item.serialNumbers.length > 0) {
              product.serialNumbers = Array.from(new Set([...(product.serialNumbers || []), ...item.serialNumbers]));
            }
            await product.save();

            // Restock bin
            const bin = await Bin.findOne({ binCode: item.location.bin });
            if (bin) {
              bin.currentOccupancy = bin.currentOccupancy + item.quantity;
              const assigned = bin.assignedProducts.find((p: any) => p.barcode === item.barcode);
              if (assigned) {
                assigned.quantity = assigned.quantity + item.quantity;
              }
              await bin.save();
            }

            // Record Restock Inventory Transaction
            await InventoryTransaction.create({
              product: product._id,
              productName: product.name,
              barcode: product.barcode,
              sku: product.sku,
              type: 'INWARD',
              quantity: item.quantity,
              previousQuantity: prevQty,
              newQuantity: product.quantity,
              reason: `Delivery Return: Restocked from Handover ${handover.handoverId} (${handover.deliveryBoyName}). Reason: ${returnReason || 'Undelivered'}`,
              location: { row: item.location.row, bin: item.location.bin },
              referenceOrder: handover.orderReference || handover.handoverId,
            });
          }
        }
      }
    }

    await handover.save();

    await ActivityLog.create({
      eventType: 'INVENTORY_UPDATED',
      title: `Delivery ${handover.handoverId} Status: ${status}`,
      description: `Delivery by ${handover.deliveryBoyName} marked as ${status}.${status === 'Returned' ? ' Products restocked to warehouse.' : ''}`,
      severity: status === 'Delivered' ? 'success' : status === 'Returned' ? 'warning' : 'info',
      metadata: { handoverId: handover.handoverId, status, prevStatus },
    });

    res.json({
      success: true,
      message: `Handover status updated to ${status}`,
      handover,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deliveries/datewise-tasks - Datewise timeline taskbar of pickups and deliveries
router.get('/datewise-tasks', async (req, res) => {
  try {
    const { dateFilter, warehouseId, partnerId } = req.query;

    const query: any = {};
    if (warehouseId && warehouseId !== 'all') {
      query.warehouseId = warehouseId;
    }
    if (partnerId && partnerId !== 'all') {
      query.assignedPartnerId = partnerId;
    }

    const orders = await Order.find(query).sort({ scheduledDeliveryDate: 1, createdAt: -1 });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Map orders to tasks with rich metadata
    const tasks = orders.map((ord) => {
      const schDate = ord.scheduledDeliveryDate ? new Date(ord.scheduledDeliveryDate) : new Date(ord.createdAt || now);
      const dateStr = schDate.toISOString().split('T')[0];

      let dayCategory = 'upcoming';
      if (dateStr === todayStr) {
        dayCategory = 'today';
      } else if (dateStr === tomorrowStr) {
        dayCategory = 'tomorrow';
      } else if (schDate < now && dateStr !== todayStr) {
        dayCategory = 'past';
      }

      // Format pickup locations
      const pickupLocations = ord.items.map((item) => ({
        productName: item.name,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        isPicked: item.isPicked,
        warehouseId: item.location?.warehouseId || ord.warehouseId || 'WH-01',
        locationGuide: `${item.location?.row || 'Row A'} → Bin ${item.location?.bin || 'A01'}`,
      }));

      return {
        taskId: `TSK-${ord.orderId}`,
        orderId: ord.orderId,
        customerName: ord.customerName,
        customerPhone: ord.customerPhone || '+91 98201 12345',
        destination: ord.destination,
        warehouseId: ord.warehouseId || 'WH-01',
        warehouseName: ord.warehouseName || 'StockPilot Central Logistics Hub',
        scheduledDate: dateStr,
        dayCategory,
        pickupTimeSlot: ord.pickupTimeSlot || '10:00 AM - 01:00 PM',
        assignedPartnerId: ord.assignedPartnerId || 'DP-101',
        assignedPartnerName: ord.assignedPartnerName || 'Ramesh Kumar',
        items: pickupLocations,
        totalItems: ord.items.reduce((sum, i) => sum + i.quantity, 0),
        status: ord.status,
        priority: ord.priority,
      };
    });

    // Filter by date if requested
    let filteredTasks = tasks;
    if (dateFilter && dateFilter !== 'all') {
      filteredTasks = tasks.filter((t) => t.dayCategory === dateFilter);
    }

    // Taskbar summary metrics
    const totalToday = tasks.filter((t) => t.dayCategory === 'today').length;
    const totalTomorrow = tasks.filter((t) => t.dayCategory === 'tomorrow').length;
    const totalUpcoming = tasks.filter((t) => t.dayCategory === 'upcoming').length;

    const readyForPickup = filteredTasks.filter((t) => t.status === 'Ready for Dispatch' || t.status === 'Picked').length;
    const inTransit = filteredTasks.filter((t) => t.status === 'Picking' || t.status === 'Pending').length;
    const delivered = filteredTasks.filter((t) => t.status === 'Dispatched').length;

    res.json({
      success: true,
      summary: {
        total: filteredTasks.length,
        totalToday,
        totalTomorrow,
        totalUpcoming,
        readyForPickup,
        inTransit,
        delivered,
        completionRate: filteredTasks.length > 0 ? Math.round((delivered / filteredTasks.length) * 100) : 0,
      },
      tasks: filteredTasks,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/deliveries/tasks/:orderId/update - Update delivery status
router.patch('/tasks/:orderId/update', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, partnerName, notes } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order task not found' });
    }

    if (status) {
      order.status = status;
      if (status === 'Dispatched') {
        order.dispatchedAt = new Date();
      }
    }
    await order.save();

    await ActivityLog.create({
      eventType: 'ORDER_DISPATCHED',
      title: `Delivery Task ${orderId}: ${status}`,
      description: `Task updated by ${partnerName || 'Delivery Partner'}. Status: ${status}. ${notes || ''}`,
      severity: status === 'Dispatched' ? 'success' : 'info',
      metadata: { orderId, status },
    });

    res.json({
      success: true,
      message: `Delivery task for ${orderId} updated to ${status}.`,
      order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// NEW DEDICATED STREAMLINED DELIVERY ENDPOINTS
// ==========================================

// GET /api/deliveries/warehouse-location - Warehouse address & live GPS location details
router.get('/warehouse-location', async (req, res) => {
  try {
    const warehouseIdStr = typeof req.query.warehouseId === 'string' ? req.query.warehouseId : undefined;
    let wh = await Warehouse.findOne(warehouseIdStr ? { warehouseId: warehouseIdStr } : {}).sort({ createdAt: 1 });
    if (!wh) {
      wh = await Warehouse.create({
        warehouseId: 'WH-01',
        name: 'StockPilot Central Logistics Hub',
        code: 'WH-01',
        city: 'Mumbai Hub',
        address: 'Plot 12-B, Industrial Freight Corridor, Bhiwandi, Mumbai',
        contactPhone: '+91 98200 44556',
        latitude: 19.2965,
        longitude: 73.0631,
        googleMapsUrl: 'https://maps.google.com/?q=19.2965,73.0631',
        operatingHours: '08:00 AM - 10:00 PM (Mon-Sun)',
        inboundDockCount: 6,
        totalCapacity: 1200,
        currentOccupancy: 340,
        rowsCount: 3,
        status: 'active',
      });
    }

    const availableVacancy = Math.max(0, wh.totalCapacity - wh.currentOccupancy);
    const vacancyPercentage = wh.totalCapacity > 0 ? Math.round((availableVacancy / wh.totalCapacity) * 100) : 100;

    res.json({
      success: true,
      warehouse: {
        warehouseId: wh.warehouseId,
        name: wh.name,
        code: wh.code,
        city: wh.city || 'Mumbai Hub',
        address: wh.address || 'Plot 12-B, Industrial Freight Corridor, Bhiwandi, Mumbai',
        contactPhone: wh.contactPhone || '+91 98200 44556',
        latitude: wh.latitude ?? 19.2965,
        longitude: wh.longitude ?? 73.0631,
        googleMapsUrl: wh.googleMapsUrl || `https://maps.google.com/?q=${wh.latitude ?? 19.2965},${wh.longitude ?? 73.0631}`,
        operatingHours: wh.operatingHours || '08:00 AM - 10:00 PM (Mon-Sun)',
        dockBays: 'Dock Bays 1-6 (Commercial Vehicle Gate 3)',
        totalCapacity: wh.totalCapacity,
        currentOccupancy: wh.currentOccupancy,
        availableVacancy,
        vacancyPercentage,
        status: wh.status,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/deliveries/warehouse-location - Warehouse owner updates address & GPS coordinates
router.put('/warehouse-location', async (req, res) => {
  try {
    const { warehouseId, address, city, contactPhone, latitude, longitude, operatingHours } = req.body;
    const query = warehouseId ? { warehouseId } : {};
    let wh = await Warehouse.findOne(query);
    if (!wh) {
      wh = new Warehouse({ warehouseId: warehouseId || 'WH-01', name: 'StockPilot Central Logistics Hub', code: 'WH-01' });
    }

    if (address) wh.address = address;
    if (city) wh.city = city;
    if (contactPhone) wh.contactPhone = contactPhone;
    if (latitude !== undefined) wh.latitude = Number(latitude);
    if (longitude !== undefined) wh.longitude = Number(longitude);
    if (operatingHours) wh.operatingHours = operatingHours;
    if (wh.latitude && wh.longitude) {
      wh.googleMapsUrl = `https://maps.google.com/?q=${wh.latitude},${wh.longitude}`;
    }

    await wh.save();

    await ActivityLog.create({
      eventType: 'SYSTEM_ALERT',
      title: 'Warehouse Live Location & Address Updated',
      description: `Warehouse address updated to "${wh.address}". Live GPS: ${wh.latitude}, ${wh.longitude}.`,
      severity: 'info',
    });

    res.json({
      success: true,
      message: 'Warehouse address and live GPS coordinates updated successfully.',
      warehouse: wh,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deliveries/warehouse-inventory - All products present in the warehouse
router.get('/warehouse-inventory', async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter: any = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { sku: { $regex: String(search), $options: 'i' } },
        { barcode: { $regex: String(search), $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ 'location.row': 1, 'location.bin': 1 });

    const inventory = products.map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      quantity: p.quantity,
      minimumStock: p.minimumStock,
      unitPrice: p.unitPrice,
      location: p.location,
      stockStatus: p.quantity === 0 ? 'OUT_OF_STOCK' : p.quantity <= p.minimumStock ? 'LOW_STOCK' : 'HEALTHY',
    }));

    res.json({
      success: true,
      count: inventory.length,
      products: inventory,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deliveries/partners-management - Delivery partners with personal details & assigned stats
router.get('/partners-management', async (req, res) => {
  try {
    await ensureDefaultPartners();
    const partners = await DeliveryPartner.find({}).sort({ active: -1, createdAt: -1 });

    // Calculate pending & dispatched orders for each partner
    const partnersWithStats = await Promise.all(
      partners.map(async (p) => {
        const pendingCount = await Order.countDocuments({
          assignedPartnerId: p.partnerId,
          status: { $in: ['Pending', 'Picking', 'Ready for Dispatch'] },
        });
        const completedCount = await Order.countDocuments({
          assignedPartnerId: p.partnerId,
          status: 'Dispatched',
        });

        return {
          _id: p._id,
          partnerId: p.partnerId,
          name: p.name,
          phone: p.phone,
          email: p.email || `${p.name.toLowerCase().replace(/\s+/g, '.')}@logistics.in`,
          agency: p.agency,
          vehicleNumber: p.vehicleNumber || 'MH 02 AB 4589',
          vehicleType: p.vehicleType || 'Motorcycle / Bike',
          city: p.city || 'Mumbai Central Hub',
          address: p.address || 'Logistics Staff Quarters, Bhiwandi',
          licenseNumber: p.licenseNumber || `DL-${p.partnerId}-9942`,
          emergencyContact: p.emergencyContact || '+91 98200 11223 (Family)',
          active: p.active,
          totalPickups: p.totalPickups || 0,
          totalUnitsDelivered: p.totalUnitsDelivered || 0,
          lastLoginAt: p.lastLoginAt,
          pendingPickupsCount: pendingCount,
          completedPickupsCount: completedCount,
        };
      })
    );

    res.json({
      success: true,
      count: partnersWithStats.length,
      partners: partnersWithStats,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deliveries/partners - Add new delivery partner with full personal details
router.post('/partners', async (req, res) => {
  try {
    const { name, phone, email, agency, vehicleNumber, vehicleType, city, address, licenseNumber, emergencyContact } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Partner name and phone number are required.' });
    }

    const partnerId = `DP-${Math.floor(100 + Math.random() * 900)}`;
    const newPartner = await DeliveryPartner.create({
      partnerId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      agency: agency || 'In-House',
      pin: '1234',
      vehicleNumber: vehicleNumber || '',
      vehicleType: vehicleType || 'Motorcycle / Bike',
      city: city || 'Mumbai Central Hub',
      address: address || '',
      licenseNumber: licenseNumber || '',
      emergencyContact: emergencyContact || '',
      active: true,
      totalPickups: 0,
      totalUnitsDelivered: 0,
    });

    await ActivityLog.create({
      eventType: 'SYSTEM_ALERT',
      title: 'New Delivery Partner Registered',
      description: `Delivery Partner ${newPartner.name} (${newPartner.agency}) registered with Vehicle ${newPartner.vehicleNumber}.`,
      severity: 'info',
    });

    res.json({
      success: true,
      message: `Delivery partner ${newPartner.name} registered successfully.`,
      partner: newPartner,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deliveries/assign-order - Warehouse assigns product/order to delivery partner for daily pickup
router.post('/assign-order', async (req, res) => {
  try {
    const { orderId, partnerId, partnerName, scheduledDeliveryDate, pickupTimeSlot, notes } = req.body;
    if (!orderId || !partnerId) {
      return res.status(400).json({ success: false, message: 'Order ID and Delivery Partner ID are required.' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: `Order ${orderId} not found.` });
    }

    const partner = await DeliveryPartner.findOne({ partnerId });

    order.assignedPartnerId = partnerId;
    order.assignedPartnerName = partnerName || partner?.name || 'Assigned Partner';
    if (scheduledDeliveryDate) {
      order.scheduledDeliveryDate = new Date(scheduledDeliveryDate);
    }
    if (pickupTimeSlot) {
      order.pickupTimeSlot = pickupTimeSlot;
    }
    if (order.status === 'Pending') {
      order.status = 'Ready for Dispatch';
    }

    await order.save();

    await ActivityLog.create({
      eventType: 'ORDER_CREATED',
      title: `Daily Pickup Assigned: Order ${orderId}`,
      description: `Warehouse owner assigned Order ${orderId} (${order.items.length} items) to Delivery Partner ${order.assignedPartnerName} for pickup slot ${order.pickupTimeSlot || 'Daily'}.`,
      severity: 'info',
      metadata: { orderId, partnerId, partnerName: order.assignedPartnerName },
    });

    res.json({
      success: true,
      message: `Order ${orderId} assigned to ${order.assignedPartnerName} for daily pickup.`,
      order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deliveries/assigned-pickups - List of products to pick up assigned by warehouse owner
router.get('/assigned-pickups', async (req, res) => {
  try {
    const { partnerId, phone, date } = req.query;

    let partner: any = null;
    if (partnerId && partnerId !== 'all') {
      partner = await DeliveryPartner.findOne({ partnerId: String(partnerId) });
    } else if (phone) {
      partner = await DeliveryPartner.findOne({ phone: String(phone).trim() });
    }

    const query: any = {};
    if (partner) {
      query.assignedPartnerId = partner.partnerId;
    } else if (partnerId && partnerId !== 'all') {
      query.assignedPartnerId = partnerId;
    }

    const orders = await Order.find(query).sort({ scheduledDeliveryDate: 1, createdAt: -1 });

    // Get active warehouse details
    const wh = await Warehouse.findOne({}).sort({ createdAt: 1 });
    const warehouseLocation = {
      warehouseId: wh?.warehouseId || 'WH-01',
      name: wh?.name || 'StockPilot Central Logistics Hub',
      address: wh?.address || 'Plot 12-B, Industrial Freight Corridor, Bhiwandi, Mumbai',
      city: wh?.city || 'Mumbai Hub',
      contactPhone: wh?.contactPhone || '+91 98200 44556',
      latitude: wh?.latitude ?? 19.2965,
      longitude: wh?.longitude ?? 73.0631,
      googleMapsUrl: wh?.googleMapsUrl || `https://maps.google.com/?q=${wh?.latitude ?? 19.2965},${wh?.longitude ?? 73.0631}`,
      operatingHours: wh?.operatingHours || '08:00 AM - 10:00 PM (Mon-Sun)',
      dockBays: 'Dock Bays 1-6 (Pickup Gate 3)',
      availableVacancy: wh ? Math.max(0, wh.totalCapacity - wh.currentOccupancy) : 860,
      totalCapacity: wh?.totalCapacity || 1200,
    };

    // Flatten into itemized pickup list with rich product details
    const pickupItems: any[] = [];
    orders.forEach((ord) => {
      const schDateStr = ord.scheduledDeliveryDate
        ? new Date(ord.scheduledDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Today';

      ord.items.forEach((item, idx) => {
        pickupItems.push({
          uniqueId: `${ord.orderId}-${idx}`,
          orderId: ord.orderId,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone || '+91 98201 12345',
          destination: ord.destination,
          priority: ord.priority,
          scheduledDateStr: schDateStr,
          pickupTimeSlot: ord.pickupTimeSlot || '10:00 AM - 01:00 PM',
          orderStatus: ord.status,
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          barcode: item.barcode,
          quantity: item.quantity,
          location: {
            warehouseId: item.location?.warehouseId || ord.warehouseId || 'WH-01',
            row: item.location?.row || 'Row A',
            bin: item.location?.bin || 'A01',
          },
          isPicked: item.isPicked || ord.status === 'Dispatched',
          pickedAt: item.pickedAt,
          scannedBarcode: item.scannedBarcode,
          assignedPartnerId: ord.assignedPartnerId,
          assignedPartnerName: ord.assignedPartnerName,
        });
      });
    });

    const pendingCount = pickupItems.filter((i) => !i.isPicked).length;
    const pickedCount = pickupItems.filter((i) => i.isPicked).length;

    res.json({
      success: true,
      partner: partner || null,
      warehouse: warehouseLocation,
      stats: {
        totalItems: pickupItems.length,
        pendingCount,
        pickedCount,
      },
      pickups: pickupItems,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deliveries/confirm-barcode-pickup - Delivery partner scans QR/barcode to confirm pickup
router.post('/confirm-barcode-pickup', async (req, res) => {
  try {
    const { orderId, barcode, scannedBarcode, partnerId, partnerName, partnerPhone } = req.body;
    const rawBarcode = barcode || scannedBarcode;

    if (!rawBarcode) {
      return res.status(400).json({ success: false, message: 'Scanned barcode/QR code string is required.' });
    }

    const cleanBarcode = String(rawBarcode).trim();

    // Find the order
    let order: any = null;
    if (orderId) {
      order = await Order.findOne({ orderId });
    }

    // If orderId not provided or not found, try to locate by matching item barcode in pending/ready orders
    if (!order) {
      order = await Order.findOne({
        'items.barcode': cleanBarcode,
        status: { $in: ['Pending', 'Ready for Dispatch', 'Picking'] },
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `No active pickup order found matching barcode "${cleanBarcode}". Please verify the scanned item.`,
      });
    }

    // Find matching item in order
    const itemIndex = order.items.findIndex((it: any) => String(it.barcode).trim() === cleanBarcode);
    if (itemIndex === -1) {
      return res.status(400).json({
        success: false,
        message: `Scanned barcode "${cleanBarcode}" does not match any item in Order ${order.orderId}. Mispick prevented!`,
      });
    }

    const item = order.items[itemIndex];
    if (item.isPicked) {
      return res.status(400).json({
        success: false,
        message: `Product "${item.name}" has already been picked up and scanned.`,
      });
    }

    // 1. Mark item as picked
    item.isPicked = true;
    item.pickedAt = new Date();
    item.scannedBarcode = cleanBarcode;

    // 2. Decrement inventory from Product collection
    const product = await Product.findOne({ barcode: cleanBarcode });
    const qtyToDeduct = item.quantity || 1;
    let oldProductQty = 0;
    let newProductQty = 0;

    if (product) {
      oldProductQty = product.quantity;
      product.quantity = Math.max(0, product.quantity - qtyToDeduct);
      newProductQty = product.quantity;
      await product.save();
    }

    // 3. Decrement Bin occupancy -> ADDS SPACE TO VACANT DATA!
    const binCode = item.location?.bin;
    let freedBinSpace = qtyToDeduct;
    let newBinOccupancy = 0;
    let binCapacity = 200;

    if (binCode) {
      const bin = await Bin.findOne({ code: binCode });
      if (bin) {
        bin.currentOccupancy = Math.max(0, bin.currentOccupancy - qtyToDeduct);
        newBinOccupancy = bin.currentOccupancy;
        binCapacity = bin.capacity;
        // Update assigned product quantity in bin
        const binProd = bin.assignedProducts.find((p) => p.barcode === cleanBarcode);
        if (binProd) {
          binProd.quantity = Math.max(0, binProd.quantity - qtyToDeduct);
        }
        await bin.save();
      }
    }

    // 4. Decrement Warehouse occupancy -> ADDS SPACE TO VACANT DATA!
    const wh = await Warehouse.findOne({});
    let newWarehouseVacancy = 0;
    let totalWarehouseCapacity = 1200;
    if (wh) {
      wh.currentOccupancy = Math.max(0, wh.currentOccupancy - qtyToDeduct);
      await wh.save();
      newWarehouseVacancy = Math.max(0, wh.totalCapacity - wh.currentOccupancy);
      totalWarehouseCapacity = wh.totalCapacity;
    }

    // 5. Check if all items in order are now picked
    const allPicked = order.items.every((it: any) => it.isPicked);
    if (allPicked) {
      order.status = 'Dispatched';
      order.dispatchedAt = new Date();
    } else {
      order.status = 'Picking';
    }
    await order.save();

    // 6. Record Inventory Outward Transaction
    await InventoryTransaction.create({
      product: item.productId || product?._id,
      productName: item.name,
      barcode: cleanBarcode,
      sku: item.sku,
      type: 'OUTWARD',
      quantity: qtyToDeduct,
      previousQuantity: oldProductQty,
      newQuantity: newProductQty,
      reason: `Pickup confirmed via barcode scan by Delivery Partner ${partnerName || order.assignedPartnerName || 'Courier'}`,
      location: {
        row: item.location?.row || 'Row A',
        bin: binCode || 'A01',
      },
      referenceOrder: order.orderId,
      timestamp: new Date(),
    });

    // 7. Record ActivityLog -> updates Manufacturer & Warehouse portals immediately!
    await ActivityLog.create({
      eventType: 'ORDER_DISPATCHED',
      title: `Pickup Confirmed: ${item.name} (${qtyToDeduct} units)`,
      description: `Delivery Partner ${partnerName || order.assignedPartnerName || 'Courier'} (${partnerPhone || ''}) scanned barcode "${cleanBarcode}". Order ${order.orderId} picked up. Freed up +${qtyToDeduct} units in Bin ${binCode || 'A01'}. Warehouse vacant space increased to ${newWarehouseVacancy} units.`,
      severity: 'success',
      metadata: {
        orderId: order.orderId,
        barcode: cleanBarcode,
        freedSpace: qtyToDeduct,
        binCode,
        newWarehouseVacancy,
        partnerId,
        partnerName: partnerName || order.assignedPartnerName,
      },
    });

    // 8. Update Delivery Partner stats
    if (partnerId) {
      await DeliveryPartner.updateOne(
        { partnerId },
        {
          $inc: { totalPickups: 1, totalUnitsDelivered: qtyToDeduct },
          $set: { lastLoginAt: new Date() },
        }
      );
    }

    res.json({
      success: true,
      message: `Pickup confirmed! ${item.name} (${qtyToDeduct} units) picked up. Space added to vacant data (+${qtyToDeduct} units vacant in Bin ${binCode || 'A01'}).`,
      order,
      item,
      freedSpace: qtyToDeduct,
      binCode: binCode || 'A01',
      newBinOccupancy,
      binVacantUnits: Math.max(0, binCapacity - newBinOccupancy),
      newWarehouseVacancy,
      totalWarehouseCapacity,
      allPicked,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deliveries/send-daily-manifest - Warehouse owner sends daily product list to delivery partner
router.post('/send-daily-manifest', async (req, res) => {
  try {
    const { partnerId, deliveryBoyPhone } = req.body;

    let partner: any = null;
    if (partnerId && partnerId !== 'all') {
      partner = await DeliveryPartner.findOne({ partnerId: String(partnerId) });
    } else if (deliveryBoyPhone) {
      partner = await DeliveryPartner.findOne({ phone: String(deliveryBoyPhone).trim() });
    }

    const query: any = {};
    if (partner) {
      query.assignedPartnerId = partner.partnerId;
    } else if (partnerId && partnerId !== 'all') {
      query.assignedPartnerId = partnerId;
    }

    const orders = await Order.find(query).sort({ scheduledDeliveryDate: 1, createdAt: -1 });

    const totalOrders = orders.length;
    let totalItems = 0;
    for (const ord of orders) {
      for (const item of ord.items) {
        totalItems += item.quantity;
      }
    }

    const partnerName = partner?.name || 'All Delivery Partners';
    const partnerPhone = partner?.phone || '';

    // Log Activity in Warehouse audit trail
    await ActivityLog.create({
      eventType: 'SYSTEM_ALERT',
      title: `Daily Pickup Manifest Sent to ${partnerName}`,
      description: `Warehouse owner sent the daily pickup list containing ${totalOrders} order(s) and ${totalItems} product item(s) to ${partnerName} (${partner?.agency || 'Courier Fleet'}${partnerPhone ? `, Ph: ${partnerPhone}` : ''}).`,
      severity: 'success',
      metadata: {
        partnerId: partner?.partnerId || partnerId,
        partnerName,
        totalOrders,
        totalItems,
      },
    });

    res.json({
      success: true,
      message: `Daily product pickup list successfully sent to ${partnerName}. Manifest active for live barcode/QR scan confirmation.`,
      partner,
      totalOrders,
      totalItems,
      orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
