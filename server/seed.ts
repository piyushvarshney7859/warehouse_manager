import { connectDB } from './db.js';
import { Warehouse } from './models/Warehouse.js';
import { Row } from './models/Row.js';
import { Bin } from './models/Bin.js';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { InventoryTransaction } from './models/InventoryTransaction.js';
import { ActivityLog } from './models/ActivityLog.js';
import { DeliveryPartner } from './models/DeliveryPartner.js';
import { DeliveryHandover } from './models/DeliveryHandover.js';
import { InboundShipment } from './models/InboundShipment.js';
import { User } from './models/User.js';
import { calculateBinStatus } from './services/allocationService.js';

export async function seedDatabase(force: boolean = false) {
  await connectDB();

  const existingProducts = await Product.countDocuments();
  if (existingProducts > 0 && !force) {
    console.log(`Database already seeded (${existingProducts} products found). Skipping seed.`);
    return { status: 'already_seeded', productCount: existingProducts };
  }

  console.log('Seeding StockPilot MongoDB database with realistic warehouse dataset...');

  // Clear existing collections
  await Promise.all([
    Warehouse.deleteMany({}),
    Row.deleteMany({}),
    Bin.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    InventoryTransaction.deleteMany({}),
    ActivityLog.deleteMany({}),
    DeliveryPartner.deleteMany({}),
    DeliveryHandover.deleteMany({}),
    InboundShipment.deleteMany({}),
    User.deleteMany({}),
  ]);

  const warehouseId = 'WH-01';

  // 1. Create Multiple Warehouses with Capacities & Vacancies
  const warehousesData = [
    {
      warehouseId: 'WH-01',
      name: 'StockPilot Central Logistics Hub',
      code: 'WH-01',
      city: 'Mumbai Hub',
      address: 'Plot 12-B, Industrial Freight Corridor, Bhiwandi, Mumbai',
      contactPhone: '+91 98200 44556',
      latitude: 19.2965,
      longitude: 73.0631,
      googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=19.2965,73.0631',
      operatingHours: '08:00 AM - 10:00 PM (Daily)',
      dockBays: 'Gate 3 • Commercial Bays 1-6',
      inboundDockCount: 6,
      totalCapacity: 1200,
      currentOccupancy: 0,
      rowsCount: 3,
      status: 'active',
    },
    {
      warehouseId: 'WH-02',
      name: 'North Logistics Fulfillment Center',
      code: 'WH-02',
      city: 'Delhi NCR Hub',
      address: 'Express Logistic Park, Kundli, Sonipat, Delhi NCR',
      contactPhone: '+91 98112 33445',
      latitude: 28.8742,
      longitude: 77.1264,
      googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=28.8742,77.1264',
      operatingHours: '07:30 AM - 09:30 PM (Daily)',
      dockBays: 'North Gate 1 • Bay A-D',
      inboundDockCount: 5,
      totalCapacity: 1000,
      currentOccupancy: 680,
      rowsCount: 3,
      status: 'active',
    },
    {
      warehouseId: 'WH-03',
      name: 'South Fast-Fulfillment Terminal',
      code: 'WH-03',
      city: 'Bengaluru Terminal',
      address: 'Hosur Road Cargo Gate 4, Electronic City, Bengaluru',
      contactPhone: '+91 98450 77889',
      latitude: 12.8399,
      longitude: 77.677,
      googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=12.8399,77.6770',
      operatingHours: '08:00 AM - 11:00 PM (Daily)',
      dockBays: 'Cargo Gate 4 • Rapid Bay 1-4',
      inboundDockCount: 4,
      totalCapacity: 800,
      currentOccupancy: 240,
      rowsCount: 2,
      status: 'active',
    },
    {
      warehouseId: 'WH-04',
      name: 'Western Regional Gateway',
      code: 'WH-04',
      city: 'Pune Terminal',
      address: 'Chakan MIDC Phase II, Pune Industrial Zone',
      contactPhone: '+91 98900 12345',
      latitude: 18.7606,
      longitude: 73.8617,
      googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=18.7606,73.8617',
      operatingHours: '08:30 AM - 08:30 PM (Daily)',
      dockBays: 'MIDC Gate 2',
      inboundDockCount: 3,
      totalCapacity: 600,
      currentOccupancy: 520,
      rowsCount: 2,
      status: 'active',
    },
  ];

  await Warehouse.insertMany(warehousesData);

  // 2. Create Rows (Row A, Row B, Row C)
  const rowsData = [
    { warehouseId, rowCode: 'Row A', orderIndex: 1, capacity: 300, currentOccupancy: 0, binsCount: 6, status: 'active' },
    { warehouseId, rowCode: 'Row B', orderIndex: 2, capacity: 300, currentOccupancy: 0, binsCount: 6, status: 'active' },
    { warehouseId, rowCode: 'Row C', orderIndex: 3, capacity: 300, currentOccupancy: 0, binsCount: 6, status: 'active' },
  ];
  await Row.insertMany(rowsData);

  // 3. Create Bins (A01-A06, B01-B06, C01-C06)
  const binsToInsert = [];
  const rowLetters = ['A', 'B', 'C'];
  for (const letter of rowLetters) {
    for (let i = 1; i <= 6; i++) {
      const binNum = i < 10 ? `0${i}` : `${i}`;
      binsToInsert.push({
        warehouseId,
        rowCode: `Row ${letter}`,
        binCode: `${letter}${binNum}`,
        orderIndex: i,
        capacity: 50,
        currentOccupancy: 0,
        status: 'empty',
        assignedProducts: [],
      });
    }
  }
  await Bin.insertMany(binsToInsert);

  // 4. Products Master Data (Realistic Barcodes & Quantities)
  // Notice: Wireless Mouse is in Row B -> Bin B04, exactly as highlighted in user prompt workflow!
  const productsMaster = [
    {
      name: 'Wireless Ergonomic Mouse',
      sku: 'ELEC-MOU-01',
      barcode: '8901001001',
      category: 'Electronics',
      quantity: 28,
      minimumStock: 10,
      unitPrice: 24.99,
      description: '2.4GHz rechargeable wireless optical mouse with ergonomic palm contour.',
      location: { warehouseId, row: 'Row B', bin: 'B04' },
    },
    {
      name: 'Mechanical Gaming Keyboard RGB',
      sku: 'ELEC-KEY-02',
      barcode: '8901001002',
      category: 'Electronics',
      quantity: 18,
      minimumStock: 8,
      unitPrice: 79.99,
      description: 'Tenkeyless tactile mechanical switches with per-key RGB backlighting.',
      location: { warehouseId, row: 'Row B', bin: 'B02' },
    },
    {
      name: 'USB-C Fast Charging Hub 7-in-1',
      sku: 'ELEC-HUB-03',
      barcode: '8901001003',
      category: 'Electronics',
      quantity: 35,
      minimumStock: 12,
      unitPrice: 39.5,
      description: 'Multi-port aluminum adapter with HDMI 4K 60Hz and 100W PD delivery.',
      location: { warehouseId, row: 'Row A', bin: 'A01' },
    },
    {
      name: 'Noise-Cancelling Wireless Headphones',
      sku: 'AUD-HDP-04',
      barcode: '8901001004',
      category: 'Audio',
      quantity: 4, // LOW STOCK
      minimumStock: 10,
      unitPrice: 129.0,
      description: 'Hybrid active noise cancellation with 40-hour battery stamina.',
      location: { warehouseId, row: 'Row A', bin: 'A03' },
    },
    {
      name: 'Braided Thunderbolt 4 Cable 2m',
      sku: 'ACC-TBL-05',
      barcode: '8901001005',
      category: 'Accessories',
      quantity: 45,
      minimumStock: 15,
      unitPrice: 19.99,
      description: '40Gbps high-speed data transfer & 240W EPR charging cable.',
      location: { warehouseId, row: 'Row A', bin: 'A02' },
    },
    {
      name: 'Adjustable Aluminum Laptop Stand',
      sku: 'OFF-LST-06',
      barcode: '8901001006',
      category: 'Office',
      quantity: 22,
      minimumStock: 10,
      unitPrice: 34.0,
      description: 'Foldable dual-pivot riser supporting 11-17 inch laptops.',
      location: { warehouseId, row: 'Row B', bin: 'B01' },
    },
    {
      name: 'Smart 4K Web Camera 60FPS',
      sku: 'ELEC-CAM-07',
      barcode: '8901001007',
      category: 'Electronics',
      quantity: 3, // LOW STOCK
      minimumStock: 10,
      unitPrice: 89.99,
      description: 'Ultra HD sensor with auto-framing and dual stereo microphones.',
      location: { warehouseId, row: 'Row A', bin: 'A04' },
    },
    {
      name: 'Extended Anti-Fray Desk Mat',
      sku: 'OFF-MAT-08',
      barcode: '8901001008',
      category: 'Office',
      quantity: 40,
      minimumStock: 15,
      unitPrice: 16.5,
      description: '900x400mm waterproof micro-weave cloth with non-slip rubber base.',
      location: { warehouseId, row: 'Row B', bin: 'B03' },
    },
    {
      name: 'Smart WiFi LED Desk Lamp',
      sku: 'HOM-LMP-09',
      barcode: '8901001009',
      category: 'Home & Office',
      quantity: 14,
      minimumStock: 8,
      unitPrice: 42.0,
      description: 'Stepless dimming with wireless QI charging pad in the base.',
      location: { warehouseId, row: 'Row C', bin: 'C01' },
    },
    {
      name: 'Thermal Barcode Label Printer',
      sku: 'LOG-PRN-10',
      barcode: '8901001010',
      category: 'Hardware',
      quantity: 8,
      minimumStock: 5,
      unitPrice: 145.0,
      description: 'Direct thermal 4x6 shipping and warehouse bin label generator.',
      location: { warehouseId, row: 'Row C', bin: 'C02' },
    },
    {
      name: 'Magnetic Cable Organizer Clips (5-pk)',
      sku: 'ACC-ORG-11',
      barcode: '8901001011',
      category: 'Accessories',
      quantity: 48,
      minimumStock: 20,
      unitPrice: 9.99,
      description: 'Reusable silicone magnetic cable ties and desk wire holders.',
      location: { warehouseId, row: 'Row A', bin: 'A05' },
    },
    {
      name: 'Compact Cordless Barcode Scanner 2D',
      sku: 'LOG-SCN-12',
      barcode: '8901001012',
      category: 'Hardware',
      quantity: 0, // OUT OF STOCK
      minimumStock: 6,
      unitPrice: 65.0,
      description: 'Bluetooth & 2.4G rugged warehouse QR and 1D barcode reader.',
      location: { warehouseId, row: 'Row C', bin: 'C03' },
    },
    {
      name: 'High-Speed NVMe M.2 Enclosure',
      sku: 'ELEC-SSD-13',
      barcode: '8901001013',
      category: 'Electronics',
      quantity: 26,
      minimumStock: 10,
      unitPrice: 27.99,
      description: 'Tool-free 10Gbps USB 3.2 Gen 2 aluminum heatsink casing.',
      location: { warehouseId, row: 'Row B', bin: 'B05' },
    },
    {
      name: 'Ergonomic Memory Foam Wrist Rest',
      sku: 'OFF-WRS-14',
      barcode: '8901001014',
      category: 'Office',
      quantity: 5, // LOW STOCK
      minimumStock: 12,
      unitPrice: 14.99,
      description: 'Relieves carpal tunnel pressure with cooling gel layer.',
      location: { warehouseId, row: 'Row B', bin: 'B06' },
    },
  ];

  const createdProducts = await Product.insertMany(productsMaster);

  // Update Bins and Rows with initial product assignments
  let totalOccupancy = 0;
  for (const prod of createdProducts) {
    totalOccupancy += prod.quantity;
    const bin = await Bin.findOne({ warehouseId, binCode: prod.location.bin });
    if (bin) {
      bin.assignedProducts.push({
        productId: prod._id,
        sku: prod.sku,
        barcode: prod.barcode,
        name: prod.name,
        quantity: prod.quantity,
      });
      bin.currentOccupancy += prod.quantity;
      bin.status = calculateBinStatus(bin.currentOccupancy, bin.capacity);
      await bin.save();

      await Row.findOneAndUpdate(
        { warehouseId, rowCode: bin.rowCode },
        { $inc: { currentOccupancy: prod.quantity } }
      );
    }

    // Create Initial Inward Transaction
    await InventoryTransaction.create({
      product: prod._id,
      productName: prod.name,
      barcode: prod.barcode,
      sku: prod.sku,
      type: 'INWARD',
      quantity: prod.quantity,
      previousQuantity: 0,
      newQuantity: prod.quantity,
      reason: 'Initial warehouse intake and smart bin slotting',
      location: { row: prod.location.row, bin: prod.location.bin },
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 3),
    });
  }

  await Warehouse.findOneAndUpdate({ warehouseId }, { currentOccupancy: totalOccupancy });

  // 5. Create Sample Orders
  const mouseProd = createdProducts.find((p) => p.barcode === '8901001001')!;
  const kbProd = createdProducts.find((p) => p.barcode === '8901001002')!;
  const hubProd = createdProducts.find((p) => p.barcode === '8901001003')!;
  const matProd = createdProducts.find((p) => p.barcode === '8901001008')!;
  const headpProd = createdProducts.find((p) => p.barcode === '8901001004')!;

  const ordersData = [
    {
      orderId: 'SP1001',
      customerName: 'Marcus Vance',
      customerPhone: '+91 98201 11223',
      customerEmail: 'm.vance@techfleet.io',
      destination: 'Bandra West, Mumbai (Bay 4 Pickup)',
      warehouseId: 'WH-01',
      warehouseName: 'StockPilot Central Logistics Hub',
      scheduledDeliveryDate: new Date(),
      pickupTimeSlot: '11:00 AM - 01:00 PM',
      assignedPartnerId: 'DP-101',
      assignedPartnerName: 'Ramesh Kumar',
      priority: 'Express',
      status: 'Ready for Dispatch',
      items: [
        {
          productId: mouseProd._id,
          barcode: mouseProd.barcode,
          name: mouseProd.name,
          sku: mouseProd.sku,
          quantity: 2,
          location: mouseProd.location,
          isPicked: true,
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      orderId: 'SP1002',
      customerName: 'Avery Chen',
      customerPhone: '+91 98112 44556',
      customerEmail: 'avery.c@designlab.org',
      destination: 'Andheri East Logistics Corridor, Mumbai',
      warehouseId: 'WH-01',
      warehouseName: 'StockPilot Central Logistics Hub',
      scheduledDeliveryDate: new Date(),
      pickupTimeSlot: '02:00 PM - 04:00 PM',
      assignedPartnerId: 'DP-101',
      assignedPartnerName: 'Ramesh Kumar',
      priority: 'High',
      status: 'Picking',
      items: [
        {
          productId: kbProd._id,
          barcode: kbProd.barcode,
          name: kbProd.name,
          sku: kbProd.sku,
          quantity: 1,
          location: kbProd.location,
          isPicked: true,
          pickedAt: new Date(Date.now() - 1800000),
          scannedBarcode: kbProd.barcode,
        },
        {
          productId: hubProd._id,
          barcode: hubProd.barcode,
          name: hubProd.name,
          sku: hubProd.sku,
          quantity: 2,
          location: hubProd.location,
          isPicked: false,
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 5),
    },
    {
      orderId: 'SP1003',
      customerName: 'Devon Miller',
      customerPhone: '+91 98450 66778',
      customerEmail: 'dmiller@hyperops.net',
      destination: 'Rohini Sector 14, Delhi NCR',
      warehouseId: 'WH-02',
      warehouseName: 'North Logistics Fulfillment Center',
      scheduledDeliveryDate: new Date(Date.now() + 86400000),
      pickupTimeSlot: '10:30 AM - 12:30 PM',
      assignedPartnerId: 'DP-102',
      assignedPartnerName: 'Rahul Singh',
      priority: 'Standard',
      status: 'Pending',
      items: [
        {
          productId: matProd._id,
          barcode: matProd.barcode,
          name: matProd.name,
          sku: matProd.sku,
          quantity: 1,
          location: matProd.location,
          isPicked: false,
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 8),
    },
    {
      orderId: 'SP1004',
      customerName: 'Elena Rostova',
      customerPhone: '+91 98900 88990',
      customerEmail: 'elena@vanguard.co',
      destination: 'Koramangala 4th Block, Bengaluru',
      warehouseId: 'WH-03',
      warehouseName: 'South Fast-Fulfillment Terminal',
      scheduledDeliveryDate: new Date(Date.now() + 86400000),
      pickupTimeSlot: '03:00 PM - 05:00 PM',
      assignedPartnerId: 'DP-103',
      assignedPartnerName: 'Amit Sharma',
      priority: 'Standard',
      status: 'Pending',
      items: [
        {
          productId: headpProd._id,
          barcode: headpProd.barcode,
          name: headpProd.name,
          sku: headpProd.sku,
          quantity: 1,
          location: headpProd.location,
          isPicked: false,
        },
      ],
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      orderId: 'SP1005',
      customerName: 'Simran Kaur',
      customerPhone: '+91 98199 77889',
      customerEmail: 'simran.k@orbittech.in',
      destination: 'Colaba Causeway Commercial Hub, Mumbai',
      warehouseId: 'WH-01',
      warehouseName: 'StockPilot Central Logistics Hub',
      scheduledDeliveryDate: new Date(Date.now() + 86400000 * 2),
      pickupTimeSlot: '11:00 AM - 01:00 PM',
      assignedPartnerId: 'DP-101',
      assignedPartnerName: 'Ramesh Kumar',
      priority: 'Express',
      status: 'Pending',
      items: [
        {
          productId: mouseProd._id,
          barcode: mouseProd.barcode,
          name: mouseProd.name,
          sku: mouseProd.sku,
          quantity: 3,
          location: mouseProd.location,
          isPicked: false,
        },
      ],
      createdAt: new Date(),
    },
  ];

  await Order.insertMany(ordersData);

  // 6. Seed Inbound Manufacturer Shipments (Datewise Arrival Calendar)
  const initialInboundShipments = [
    {
      shipmentId: 'INB-2026-1001',
      manufacturerName: 'Apex Industrial Manufacturing Ltd.',
      manufacturerContact: '+91 98100 11223',
      targetWarehouseId: 'WH-01',
      targetWarehouseName: 'StockPilot Central Logistics Hub',
      productName: 'Wireless Ergonomic Mouse',
      sku: 'ELEC-MOU-01',
      barcode: '8901001001',
      category: 'Electronics',
      quantity: 50,
      dispatchDate: new Date(Date.now() - 86400000),
      expectedArrivalDate: new Date(), // Arriving Today!
      status: 'In Transit',
      trackingNumber: 'TRK-BLUEDART-88210',
      carrierName: 'BlueDart Freight Logistics',
      notes: 'Dock Receiving Bay 2. Heavy pallets shrink-wrapped.',
    },
    {
      shipmentId: 'INB-2026-1002',
      manufacturerName: 'KeyTech Peripheral Works',
      manufacturerContact: '+91 98112 44332',
      targetWarehouseId: 'WH-02',
      targetWarehouseName: 'North Logistics Fulfillment Center',
      productName: 'Mechanical Gaming Keyboard RGB',
      sku: 'ELEC-KEY-02',
      barcode: '8901001002',
      category: 'Electronics',
      quantity: 40,
      dispatchDate: new Date(Date.now() - 86400000 * 2),
      expectedArrivalDate: new Date(Date.now() + 86400000), // Arriving Tomorrow!
      status: 'In Transit',
      trackingNumber: 'TRK-DELHIVERY-77192',
      carrierName: 'Delhivery Surface Express',
      notes: 'Scheduled for morning inward inspection.',
    },
    {
      shipmentId: 'INB-2026-1003',
      manufacturerName: 'SiliconCraft Microelectronics',
      manufacturerContact: '+91 98230 55667',
      targetWarehouseId: 'WH-01',
      targetWarehouseName: 'StockPilot Central Logistics Hub',
      productName: 'USB-C Multiport Hub 7-in-1',
      sku: 'ELEC-HUB-03',
      barcode: '8901001003',
      category: 'Electronics',
      quantity: 80,
      dispatchDate: new Date(),
      expectedArrivalDate: new Date(Date.now() + 86400000 * 2), // In 2 Days
      status: 'Scheduled',
      trackingNumber: 'TRK-SHADOWFAX-33109',
      carrierName: 'Shadowfax Linehaul',
      notes: 'High-density micro-electronics cartons.',
    },
    {
      shipmentId: 'INB-2026-1004',
      manufacturerName: 'AcousticPro Audio Lab',
      manufacturerContact: '+91 98450 11998',
      targetWarehouseId: 'WH-03',
      targetWarehouseName: 'South Fast-Fulfillment Terminal',
      productName: 'Active Noise-Canceling Headphones',
      sku: 'AUD-HDP-04',
      barcode: '8901001004',
      category: 'Audio',
      quantity: 35,
      dispatchDate: new Date(),
      expectedArrivalDate: new Date(Date.now() + 86400000 * 4), // In 4 Days
      status: 'Scheduled',
      trackingNumber: 'TRK-DHL-991204',
      carrierName: 'DHL Supply Chain Express',
      notes: 'Secured anti-tamper tape on all boxes.',
    },
    {
      shipmentId: 'INB-2026-1000',
      manufacturerName: 'Apex Industrial Manufacturing Ltd.',
      manufacturerContact: '+91 98100 11223',
      targetWarehouseId: 'WH-01',
      targetWarehouseName: 'StockPilot Central Logistics Hub',
      productName: '4K Ultra-HD Streaming Webcam',
      sku: 'CAM-WBC-07',
      barcode: '8901001007',
      category: 'Video',
      quantity: 30,
      dispatchDate: new Date(Date.now() - 86400000 * 3),
      expectedArrivalDate: new Date(Date.now() - 86400000),
      status: 'Received',
      receivedAt: new Date(Date.now() - 86400000),
      receivedBy: 'Vikram Malhotra',
      assignedBin: 'Row A - Bin A02',
      trackingNumber: 'TRK-BLUEDART-55421',
      carrierName: 'BlueDart Freight Logistics',
      notes: 'Received and slotted into Bin A02 successfully.',
    },
  ];

  await InboundShipment.insertMany(initialInboundShipments);

  // 7. Seed Default Users for unified Login / Signup
  const initialUsers = [
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

  await User.insertMany(initialUsers);

  // 6. Create Realistic Activity Logs
  const initialLogs = [
    {
      eventType: 'SYSTEM_ALERT',
      title: 'Warehouse System Initialized',
      description: 'StockPilot online. 3 storage aisles (Rows A-C) mapped with 18 high-density dynamic storage bins.',
      severity: 'info',
      timestamp: new Date(Date.now() - 86400000 * 3),
    },
    {
      eventType: 'PRODUCT_ADDED',
      title: 'Bulk Intake Processed',
      description: '14 product SKUs received, cataloged with high-resolution 1D/2D barcodes.',
      severity: 'success',
      timestamp: new Date(Date.now() - 86400000 * 2),
    },
    {
      eventType: 'LOCATION_ASSIGNED',
      title: 'Smart Bin Assigned',
      description: 'Assigned "Wireless Ergonomic Mouse" to Row B → Bin B04 based on proximity routing.',
      severity: 'success',
      timestamp: new Date(Date.now() - 3600000 * 12),
    },
    {
      eventType: 'ORDER_CREATED',
      title: 'Order SP1001 Ingested',
      description: 'Customer Marcus Vance placed express order for 2x Wireless Ergonomic Mouse.',
      severity: 'info',
      timestamp: new Date(Date.now() - 3600000 * 2),
    },
    {
      eventType: 'WRONG_BARCODE_SCANNED',
      title: 'Mispick Attempt Intercepted',
      description: 'Picker scanned keyboard barcode for mouse order item. StockPilot error-prevention blocked pick.',
      severity: 'error',
      timestamp: new Date(Date.now() - 3600000),
    },
  ];

  await ActivityLog.insertMany(initialLogs);

  // 7. Seed Default Delivery Partners with Personal Details
  const initialPartners = [
    {
      partnerId: 'DP-101',
      name: 'Ramesh Kumar',
      phone: '9876543210',
      email: 'ramesh.kumar@delhivery.com',
      agency: 'Delhivery Express',
      pin: '1234',
      vehicleNumber: 'MH 02 AB 4589',
      vehicleType: 'Motorcycle / Bike',
      licenseNumber: 'MH02 20180029314',
      emergencyContact: '+91 98201 11998 (Pooja Kumar - Wife)',
      address: 'Room 14, Chawl No 3, Kurla West, Mumbai',
      city: 'Mumbai Central Hub',
      active: true,
      totalPickups: 12,
      totalUnitsDelivered: 42,
    },
    {
      partnerId: 'DP-102',
      name: 'Rahul Singh',
      phone: '9811223344',
      email: 'rahul.singh@shadowfax.in',
      agency: 'Shadowfax Logistics',
      pin: '1234',
      vehicleNumber: 'DL 01 CD 7821',
      vehicleType: 'Electric Scooter',
      licenseNumber: 'DL01 20200088123',
      emergencyContact: '+91 98112 99882 (Sunil Singh - Brother)',
      address: 'Plot 45, Sector 15, Rohini, New Delhi',
      city: 'North Delhi Distribution',
      active: true,
      totalPickups: 8,
      totalUnitsDelivered: 26,
    },
    {
      partnerId: 'DP-103',
      name: 'Amit Sharma',
      phone: '9822334455',
      email: 'amit.sharma@blinkit.com',
      agency: 'Blinkit Quick Fleet',
      pin: '1234',
      vehicleNumber: 'KA 05 EF 1290',
      vehicleType: 'Motorcycle / Bike',
      licenseNumber: 'KA05 20190033100',
      emergencyContact: '+91 98223 88112 (Deepa Sharma - Mother)',
      address: 'Flat 202, Green Glen Layout, Bellandur, Bangalore',
      city: 'Bangalore Koramangala Hub',
      active: true,
      totalPickups: 15,
      totalUnitsDelivered: 50,
    },
    {
      partnerId: 'DP-104',
      name: 'Vikram Rathore',
      phone: '9833445566',
      email: 'vikram.rathore@stockpilot.io',
      agency: 'In-House Express',
      pin: '1234',
      vehicleNumber: 'MH 03 GH 9012',
      vehicleType: 'Delivery Van',
      licenseNumber: 'MH03 20150099887',
      emergencyContact: '+91 98334 77123 (Suresh Rathore - Father)',
      address: 'B-104, Sai Dham Complex, Thane West, Mumbai',
      city: 'Mumbai Central Hub',
      active: true,
      totalPickups: 24,
      totalUnitsDelivered: 110,
    },
  ];

  await DeliveryPartner.insertMany(initialPartners);

  console.log('StockPilot database seed completed successfully!');
  return {
    status: 'success',
    productsCount: createdProducts.length,
    ordersCount: ordersData.length,
    binsCount: binsToInsert.length,
  };
}

// Standalone execution support: tsx server/seed.ts
if (process.argv[1]?.includes('seed')) {
  seedDatabase(true)
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed script failure:', err);
      process.exit(1);
    });
}
