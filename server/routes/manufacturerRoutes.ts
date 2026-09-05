import { Router } from 'express';
import { Warehouse } from '../models/Warehouse.js';
import { InboundShipment } from '../models/InboundShipment.js';
import { Product } from '../models/Product.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { allocateBinForProduct } from '../services/allocationService.js';
import { ManufacturerProduct } from '../models/ManufacturerProduct.js';
import { ManufacturerChat } from '../models/ManufacturerChat.js';

const router = Router();

// GET /api/manufacturer/warehouses - Vacancy & Capacity Matrix for senders
router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ status: 'active' }).sort({ warehouseId: 1 });

    // For each warehouse, calculate available vacancy and pending inbound units
    const result = await Promise.all(
      warehouses.map(async (wh) => {
        const pendingShipments = await InboundShipment.find({
          targetWarehouseId: wh.warehouseId,
          status: { $in: ['Scheduled', 'In Transit', 'Arrived'] },
        });

        const pendingInboundUnits = pendingShipments.reduce((acc, curr) => acc + curr.quantity, 0);
        const availableVacancy = Math.max(0, wh.totalCapacity - wh.currentOccupancy);
        const vacancyPercentage = wh.totalCapacity > 0
          ? Math.round((availableVacancy / wh.totalCapacity) * 100)
          : 0;

        let vacancyStatus: 'high' | 'moderate' | 'low' = 'moderate';
        if (vacancyPercentage >= 50) {
          vacancyStatus = 'high'; // Lots of empty space
        } else if (vacancyPercentage < 20) {
          vacancyStatus = 'low'; // Near capacity
        }

        return {
          warehouseId: wh.warehouseId,
          name: wh.name,
          code: wh.code,
          city: wh.city || 'Central Region',
          address: wh.address || 'Corridor Logistics Hub',
          contactPhone: wh.contactPhone || '+91 98765 43210',
          inboundDockCount: wh.inboundDockCount || 4,
          totalCapacity: wh.totalCapacity,
          currentOccupancy: wh.currentOccupancy,
          availableVacancy,
          vacancyPercentage,
          vacancyStatus,
          pendingInboundUnits,
          status: wh.status,
        };
      })
    );

    res.json({
      success: true,
      count: result.length,
      warehouses: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/manufacturer/shipments - List of inbound dispatches with date filters
router.get('/shipments', async (req, res) => {
  try {
    const { warehouseId, manufacturer, status } = req.query;
    const filter: any = {};

    if (warehouseId && warehouseId !== 'all') {
      filter.targetWarehouseId = warehouseId;
    }
    if (manufacturer && manufacturer !== 'all') {
      filter.manufacturerName = new RegExp(String(manufacturer), 'i');
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    const shipments = await InboundShipment.find(filter).sort({ expectedArrivalDate: 1, createdAt: -1 });

    res.json({
      success: true,
      count: shipments.length,
      shipments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/manufacturer/shipments - Create new stock dispatch from Manufacturer to Warehouse
router.post('/shipments', async (req, res) => {
  try {
    const {
      manufacturerName,
      manufacturerContact,
      targetWarehouseId,
      productName,
      sku,
      barcode,
      category,
      quantity,
      dispatchDate,
      expectedArrivalDate,
      carrierName,
      notes,
    } = req.body;

    if (!targetWarehouseId || !productName || !sku || !quantity || !expectedArrivalDate) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse, Product Name, SKU, Quantity, and Arrival Date are required.',
      });
    }

    const warehouse = await Warehouse.findOne({ warehouseId: targetWarehouseId });
    if (!warehouse) {
      return res.status(404).json({ success: false, message: `Warehouse ${targetWarehouseId} not found.` });
    }

    const availableSpace = warehouse.totalCapacity - warehouse.currentOccupancy;
    if (Number(quantity) > availableSpace) {
      return res.status(400).json({
        success: false,
        message: `Quantity (${quantity}) exceeds remaining vacancy in ${warehouse.name} (${availableSpace} units available). Please select a warehouse with higher vacancy.`,
      });
    }

    const shipmentCount = await InboundShipment.countDocuments();
    const shipmentId = `INB-2026-${(1001 + shipmentCount).toString()}`;
    const cleanBarcode = barcode && String(barcode).trim().length > 0
      ? String(barcode).trim()
      : `890${Math.floor(1000000 + Math.random() * 9000000)}`;

    const newShipment = await InboundShipment.create({
      shipmentId,
      manufacturerName: manufacturerName || 'Apex Industrial Manufacturing Ltd.',
      manufacturerContact: manufacturerContact || '+91 98100 11223',
      targetWarehouseId,
      targetWarehouseName: warehouse.name,
      productName: String(productName).trim(),
      sku: String(sku).trim().toUpperCase(),
      barcode: cleanBarcode,
      category: category || 'Electronics',
      quantity: Number(quantity),
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
      expectedArrivalDate: new Date(expectedArrivalDate),
      status: 'In Transit',
      trackingNumber: `TRK-INB-${Math.floor(100000 + Math.random() * 900000)}`,
      carrierName: carrierName || 'BlueDart Logistics Fleet',
      notes: notes || 'Standard pallet delivery to bay receiving area.',
    });

    // If this product is tracked in Manufacturer's factory inventory, deduct dispatched units
    const mfgProd = await ManufacturerProduct.findOne({ sku: String(sku).trim().toUpperCase() });
    if (mfgProd) {
      mfgProd.unitsPresent = Math.max(0, mfgProd.unitsPresent - Number(quantity));
      await mfgProd.save();
    }

    // Log Activity
    await ActivityLog.create({
      eventType: 'INVENTORY_UPDATED',
      title: `Stock Dispatched: ${newShipment.productName} (${newShipment.quantity} units)`,
      description: `Manufacturer ${newShipment.manufacturerName} dispatched ${newShipment.quantity} units to ${warehouse.name}. Expected Arrival: ${new Date(expectedArrivalDate).toLocaleDateString()}.`,
      severity: 'info',
      metadata: { shipmentId, targetWarehouseId, quantity },
    });

    res.status(201).json({
      success: true,
      message: `Stock shipment ${shipmentId} scheduled successfully for delivery on ${new Date(expectedArrivalDate).toLocaleDateString()}!`,
      shipment: newShipment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/manufacturer/shipments/:id/receive - Inward shipment at warehouse
router.post('/shipments/:id/receive', async (req, res) => {
  try {
    const { id } = req.params;
    const { receiverName = 'Warehouse Floor Staff' } = req.body;

    const shipment = await InboundShipment.findOne({
      $or: [{ _id: id }, { shipmentId: id }],
    });

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Inbound shipment not found.' });
    }

    if (shipment.status === 'Received') {
      return res.status(400).json({ success: false, message: 'Shipment has already been received into inventory.' });
    }

    // Allocate bin in target warehouse
    const allocation = await allocateBinForProduct({
      productName: shipment.productName,
      barcode: shipment.barcode,
      sku: shipment.sku,
      quantity: shipment.quantity,
      warehouseId: shipment.targetWarehouseId,
    });

    // Upsert Product record
    let product = await Product.findOne({ barcode: shipment.barcode });
    let previousQty = 0;
    if (product) {
      previousQty = product.quantity;
      product.quantity += shipment.quantity;
      product.location = {
        warehouseId: shipment.targetWarehouseId,
        row: allocation.row,
        bin: allocation.bin,
      };
      await product.save();
    } else {
      product = await Product.create({
        name: shipment.productName,
        sku: shipment.sku,
        barcode: shipment.barcode,
        category: shipment.category || 'General',
        quantity: shipment.quantity,
        minimumStock: 10,
        unitPrice: 29.99,
        description: `Inwarded from manufacturer: ${shipment.manufacturerName}`,
        location: {
          warehouseId: shipment.targetWarehouseId,
          row: allocation.row,
          bin: allocation.bin,
        },
      });
    }

    // Update shipment status
    shipment.status = 'Received';
    shipment.receivedAt = new Date();
    shipment.receivedBy = receiverName;
    shipment.assignedBin = `${allocation.row} - Bin ${allocation.bin}`;
    await shipment.save();

    // Log Inventory Transaction
    await InventoryTransaction.create({
      product: product._id,
      productName: product.name,
      barcode: product.barcode,
      sku: product.sku,
      type: 'INWARD',
      quantity: shipment.quantity,
      previousQuantity: previousQty,
      newQuantity: product.quantity,
      reason: `Manufacturer Inward Received from ${shipment.manufacturerName} (Shipment: ${shipment.shipmentId})`,
      location: {
        row: allocation.row,
        bin: allocation.bin,
      },
    });

    // Log Activity
    await ActivityLog.create({
      eventType: 'PRODUCT_SCANNED',
      title: `Inward Complete: ${shipment.quantity} units of ${shipment.productName}`,
      description: `Slotted into ${allocation.row} → Bin ${allocation.bin} at ${shipment.targetWarehouseName}. Inwarded from ${shipment.manufacturerName}.`,
      severity: 'success',
      metadata: {
        shipmentId: shipment.shipmentId,
        location: `${allocation.row} - ${allocation.bin}`,
      },
    });

    res.json({
      success: true,
      message: `Inbound shipment ${shipment.shipmentId} successfully received! ${shipment.quantity} units added to ${allocation.row} → Bin ${allocation.bin}.`,
      shipment,
      product,
      allocation,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// MANUFACTURER'S OWN FACTORY PRODUCTS
// Feature: Manually list products & quantity present at factory
// ==========================================

// GET /api/manufacturer/my-products - List manufacturer's factory stock
router.get('/my-products', async (req, res) => {
  try {
    const { manufacturerId = 'apex_mfg' } = req.query;

    let products = await ManufacturerProduct.find({ manufacturerId: String(manufacturerId) }).sort({ createdAt: -1 });

    // Auto-seed if empty for instant interactive experience
    if (products.length === 0) {
      const initialProducts = [
        {
          manufacturerId: String(manufacturerId),
          manufacturerName: 'Apex Industrial Manufacturing Ltd.',
          name: 'Apex SoundCore ANC Wireless Headphones',
          sku: 'APX-AUD-01',
          barcode: '8901001001',
          category: 'Audio',
          unitsPresent: 350,
          unitOfMeasure: 'Units',
          batchNumber: 'BATCH-2026-A1',
          unitPrice: 89.99,
          notes: 'Tested QC Passed. Palletized for dispatch.',
        },
        {
          manufacturerId: String(manufacturerId),
          manufacturerName: 'Apex Industrial Manufacturing Ltd.',
          name: 'Industrial PoE Ethernet Switch 16-Port',
          sku: 'APX-NET-02',
          barcode: '8901001002',
          category: 'Electronics',
          unitsPresent: 140,
          unitOfMeasure: 'Units',
          batchNumber: 'BATCH-2026-N2',
          unitPrice: 149.50,
          notes: 'Rack-mount ready. Dual power input.',
        },
        {
          manufacturerId: String(manufacturerId),
          manufacturerName: 'Apex Industrial Manufacturing Ltd.',
          name: 'High-Precision 2D Handheld Barcode Scanner',
          sku: 'APX-SCN-03',
          barcode: '8901001003',
          category: 'Hardware',
          unitsPresent: 260,
          unitOfMeasure: 'Units',
          batchNumber: 'BATCH-2026-S3',
          unitPrice: 119.00,
          notes: 'Rugged IP54 drop-tested. USB + BT cradle.',
        },
        {
          manufacturerId: String(manufacturerId),
          manufacturerName: 'Apex Industrial Manufacturing Ltd.',
          name: 'Smart IoT Temperature & Humidity Sensor Hub',
          sku: 'APX-IOT-04',
          barcode: '8901001004',
          category: 'Electronics',
          unitsPresent: 190,
          unitOfMeasure: 'Units',
          batchNumber: 'BATCH-2026-I4',
          unitPrice: 45.00,
          notes: 'Calibrated for cold storage & ambient warehouses.',
        },
        {
          manufacturerId: String(manufacturerId),
          manufacturerName: 'Apex Industrial Manufacturing Ltd.',
          name: 'Heavy-Duty 8-Outlet Surge Protector Strip',
          sku: 'APX-PWR-05',
          barcode: '8901001005',
          category: 'Electrical',
          unitsPresent: 420,
          unitOfMeasure: 'Units',
          batchNumber: 'BATCH-2026-P5',
          unitPrice: 32.50,
          notes: 'Flame retardant casing. 15A breaker.',
        },
      ];

      await ManufacturerProduct.insertMany(initialProducts);
      products = await ManufacturerProduct.find({ manufacturerId: String(manufacturerId) }).sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/manufacturer/my-products - Manually list a new product
router.post('/my-products', async (req, res) => {
  try {
    const {
      manufacturerId = 'apex_mfg',
      manufacturerName = 'Apex Industrial Manufacturing Ltd.',
      name,
      sku,
      barcode,
      category = 'Electronics',
      unitsPresent = 0,
      unitOfMeasure = 'Units',
      batchNumber,
      unitPrice = 49.99,
      notes = '',
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ success: false, message: 'Product Name and SKU are required.' });
    }

    const cleanSku = String(sku).trim().toUpperCase();
    const cleanBarcode = barcode && String(barcode).trim().length > 0
      ? String(barcode).trim()
      : `890${Math.floor(1000000 + Math.random() * 9000000)}`;

    const existing = await ManufacturerProduct.findOne({ sku: cleanSku, manufacturerId });
    if (existing) {
      existing.name = name;
      existing.barcode = cleanBarcode;
      existing.category = category;
      existing.unitsPresent = Number(unitsPresent);
      existing.unitOfMeasure = unitOfMeasure;
      existing.batchNumber = batchNumber || existing.batchNumber;
      existing.unitPrice = Number(unitPrice);
      existing.notes = notes;
      await existing.save();

      return res.json({
        success: true,
        message: `Product ${cleanSku} updated with ${existing.unitsPresent} units present in factory stock.`,
        product: existing,
      });
    }

    const newProduct = await ManufacturerProduct.create({
      manufacturerId,
      manufacturerName,
      name: String(name).trim(),
      sku: cleanSku,
      barcode: cleanBarcode,
      category,
      unitsPresent: Math.max(0, Number(unitsPresent)),
      unitOfMeasure,
      batchNumber: batchNumber || `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      unitPrice: Number(unitPrice),
      notes,
    });

    await ActivityLog.create({
      eventType: 'INVENTORY_UPDATED',
      title: `Factory Product Listed: ${newProduct.name} (${newProduct.unitsPresent} units present)`,
      description: `Manufacturer ${manufacturerName} manually listed ${newProduct.unitsPresent} units of ${newProduct.sku} at manufacturing plant.`,
      severity: 'info',
      metadata: { sku: newProduct.sku, unitsPresent: newProduct.unitsPresent },
    });

    res.status(201).json({
      success: true,
      message: `Successfully listed ${newProduct.name} with ${newProduct.unitsPresent} units present!`,
      product: newProduct,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/manufacturer/my-products/:id - Edit product / update factory stock
router.put('/my-products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, barcode, category, unitsPresent, unitOfMeasure, batchNumber, unitPrice, notes } = req.body;

    const product = await ManufacturerProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found in factory catalog.' });
    }

    if (name) product.name = String(name).trim();
    if (barcode) product.barcode = String(barcode).trim();
    if (category) product.category = category;
    if (unitsPresent !== undefined) product.unitsPresent = Math.max(0, Number(unitsPresent));
    if (unitOfMeasure) product.unitOfMeasure = unitOfMeasure;
    if (batchNumber !== undefined) product.batchNumber = batchNumber;
    if (unitPrice !== undefined) product.unitPrice = Number(unitPrice);
    if (notes !== undefined) product.notes = notes;

    await product.save();

    res.json({
      success: true,
      message: `Product ${product.sku} updated successfully. Present Stock: ${product.unitsPresent} units.`,
      product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/manufacturer/my-products/:id/adjust - Quick adjust factory stock
router.post('/my-products/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { delta = 0, reason = 'Manual Production Adjustment' } = req.body;

    const product = await ManufacturerProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const previous = product.unitsPresent;
    product.unitsPresent = Math.max(0, product.unitsPresent + Number(delta));
    await product.save();

    res.json({
      success: true,
      message: `Stock updated for ${product.name}: ${previous} → ${product.unitsPresent} units (${delta >= 0 ? '+' : ''}${delta}).`,
      product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/manufacturer/my-products/:id - Remove product
router.delete('/my-products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ManufacturerProduct.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({
      success: true,
      message: `Product ${deleted.sku} removed from your factory listing.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// CHATBOT: MANUFACTURER <-> INVENTORY LOGISTICS
// Sharing conversations regarding pickup time, date, dock bays & vacancies
// ==========================================

// GET /api/manufacturer/chat/messages - Retrieve message thread
router.get('/chat/messages', async (req, res) => {
  try {
    const { conversationId = 'mfg-inv-desk' } = req.query;

    let messages = await ManufacturerChat.find({ conversationId: String(conversationId) }).sort({ timestamp: 1 });

    // Seed default welcoming conversation if none exists
    if (messages.length === 0) {
      const initialChat = [
        {
          conversationId: String(conversationId),
          sender: 'inventory_bot',
          senderName: 'StockPilot Inventory Coordinator Desk',
          text: 'Hello Apex Industrial Manufacturing! 👋 This is the dedicated Warehouse & Inventory Coordination desk. You can chat with us to check dock availability, inquire about warehouse vacancies, or schedule pickup dates and time windows for your shipments.',
          timestamp: new Date(Date.now() - 3600000 * 2),
        },
        {
          conversationId: String(conversationId),
          sender: 'inventory_bot',
          senderName: 'StockPilot Inventory Coordinator Desk',
          text: 'Current Status: Inbound Dock Bays 1 & 2 are operating at WH-01 Central. Available time slots for tomorrow are: Morning (09:00 AM - 12:00 PM) and Afternoon (02:00 PM - 05:00 PM). Let us know your preferred date and time!',
          timestamp: new Date(Date.now() - 3600000),
          pickupDetails: {
            warehouseId: 'WH-01',
            warehouseName: 'North Star Central Hub',
            pickupTimeSlot: '09:00 AM - 12:00 PM',
            dockBay: 'Dock Bay 2',
            status: 'proposed',
          },
        },
      ];

      await ManufacturerChat.insertMany(initialChat);
      messages = await ManufacturerChat.find({ conversationId: String(conversationId) }).sort({ timestamp: 1 });
    }

    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/manufacturer/chat/messages - Send message & receive smart inventory response
router.post('/chat/messages', async (req, res) => {
  try {
    const {
      conversationId = 'mfg-inv-desk',
      text,
      senderName,
      sender = 'manufacturer',
      requestedPickup,
    } = req.body;

    if (!text || String(text).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    // If message is sent from Warehouse Portal / Inventory Manager
    if (sender === 'inventory_manager') {
      const warehouseMsg = await ManufacturerChat.create({
        conversationId,
        sender: 'inventory_manager',
        senderName: senderName || 'Warehouse Desk Coordinator',
        text: String(text).trim(),
        timestamp: new Date(),
        pickupDetails: requestedPickup || undefined,
      });

      return res.status(201).json({
        success: true,
        userMessage: warehouseMsg,
        botReply: null,
      });
    }

    // 1. Save manufacturer's message
    const userMsg = await ManufacturerChat.create({
      conversationId,
      sender: 'manufacturer',
      senderName: senderName || 'Apex Industrial (Manufacturer)',
      text: String(text).trim(),
      timestamp: new Date(),
      pickupDetails: requestedPickup || undefined,
    });

    // 2. Analyze message to provide intelligent inventory coordinator reply
    const lowerText = String(text).toLowerCase();
    let botReplyText = '';
    let pickupDetails: any = null;

    // Fetch live warehouses to give real vacancy numbers
    const warehouses = await Warehouse.find({ status: 'active' });
    const wh01 = warehouses.find(w => w.warehouseId === 'WH-01') || warehouses[0];
    const wh02 = warehouses.find(w => w.warehouseId === 'WH-02') || warehouses[1];

    if (
      lowerText.includes('vacancy') ||
      lowerText.includes('space') ||
      lowerText.includes('capacity') ||
      lowerText.includes('available')
    ) {
      const summaryList = warehouses
        .map(w => `• ${w.code} (${w.city}): ${w.totalCapacity - w.currentOccupancy} units free space`)
        .join('\n');
      botReplyText = `Here is our live warehouse vacancy status:\n${summaryList}\n\nAll inbound bays are equipped for automated barcode scanning upon arrival. Which warehouse would you like to schedule a pickup or drop date for?`;
    } else if (
      lowerText.includes('pickup') ||
      lowerText.includes('time') ||
      lowerText.includes('date') ||
      lowerText.includes('schedule') ||
      lowerText.includes('slot') ||
      lowerText.includes('tomorrow') ||
      lowerText.includes('today') ||
      lowerText.includes('dispatch') ||
      requestedPickup
    ) {
      // Determine date & time
      const targetDate = requestedPickup?.pickupDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const targetSlot = requestedPickup?.pickupTimeSlot || (lowerText.includes('afternoon') || lowerText.includes('pm') ? '02:30 PM - 05:00 PM' : '10:00 AM - 12:30 PM');
      const targetWh = warehouses.find(w => w.warehouseId === requestedPickup?.warehouseId) || wh01;
      const gatePass = `GP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const dockBay = `Dock Bay ${Math.floor(1 + Math.random() * (targetWh?.inboundDockCount || 3))}`;

      pickupDetails = {
        warehouseId: targetWh?.warehouseId || 'WH-01',
        warehouseName: targetWh?.name || 'North Star Central Hub',
        productName: requestedPickup?.productName || 'Manufacturing Batch Dispatch',
        quantity: requestedPickup?.quantity || 100,
        pickupDate: targetDate,
        pickupTimeSlot: targetSlot,
        dockBay,
        gatePassNumber: gatePass,
        status: 'confirmed',
      };

      botReplyText = `✅ Inbound Pickup & Dock Slot Confirmed!\n\n• Target Warehouse: ${targetWh?.name} (${targetWh?.code})\n• Date: ${new Date(targetDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}\n• Time Window: ${targetSlot}\n• Allocated Bay: ${dockBay}\n• Gate Pass Code: ${gatePass}\n\nOur warehouse receiving team has reserved this time slot. The transport truck will be expedited through Gate 2 with this gate pass.`;
    } else if (lowerText.includes('product') || lowerText.includes('sku') || lowerText.includes('stock')) {
      botReplyText = `You can easily manage your factory inventory under the "My Manufactured Products" section. When you are ready to dispatch, simply click "Send to Warehouse" next to any product, and the system will automatically allocate based on live warehouse vacancy.`;
    } else {
      botReplyText = `Thank you for the message! The StockPilot Inventory & Warehouse Coordination Desk is monitoring all incoming dispatches. If you would like to book or adjust a pickup date, arrival time window, or check bay readiness, please send your preferred date and time or click one of the quick slot buttons below.`;
    }

    // Save bot reply
    const botMsg = await ManufacturerChat.create({
      conversationId,
      sender: 'inventory_bot',
      senderName: 'StockPilot Inventory Coordinator Desk',
      text: botReplyText,
      timestamp: new Date(Date.now() + 500),
      pickupDetails,
    });

    res.status(201).json({
      success: true,
      userMessage: userMsg,
      botReply: botMsg,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/manufacturer/chat/book-slot - Formally book a pickup appointment
router.post('/chat/book-slot', async (req, res) => {
  try {
    const {
      conversationId = 'mfg-inv-desk',
      warehouseId = 'WH-01',
      productName,
      quantity = 50,
      pickupDate,
      pickupTimeSlot,
      truckNumber,
      notes,
    } = req.body;

    const warehouse = await Warehouse.findOne({ warehouseId }) || await Warehouse.findOne();
    const gatePass = `GP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const dockBay = `Dock Bay ${Math.floor(1 + Math.random() * (warehouse?.inboundDockCount || 3))}`;
    const formattedDate = pickupDate ? new Date(pickupDate).toISOString().split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const timeSlot = pickupTimeSlot || '10:00 AM - 12:30 PM';

    const pickupDetails = {
      warehouseId: warehouse?.warehouseId || 'WH-01',
      warehouseName: warehouse?.name || 'Central Logistics Hub',
      productName: productName || 'Factory Production Pallets',
      quantity: Number(quantity),
      pickupDate: formattedDate,
      pickupTimeSlot: timeSlot,
      dockBay,
      gatePassNumber: gatePass,
      status: 'confirmed' as const,
    };

    // Post booking confirmation card to chat
    const confirmationMsg = await ManufacturerChat.create({
      conversationId,
      sender: 'inventory_bot',
      senderName: 'StockPilot Inventory Coordinator Desk',
      text: `🎯 Official Inbound Slot Booked for ${productName || 'Stock Dispatch'}!\nWarehouse: ${warehouse?.name} | Date: ${formattedDate} | Slot: ${timeSlot} | Bay: ${dockBay} | Gate Pass: ${gatePass}${truckNumber ? ` | Vehicle: ${truckNumber}` : ''}`,
      timestamp: new Date(),
      pickupDetails,
    });

    await ActivityLog.create({
      eventType: 'INVENTORY_UPDATED',
      title: `Pickup Slot Booked: ${gatePass} for ${formattedDate}`,
      description: `Manufacturer booked inbound delivery at ${warehouse?.name} (${dockBay}) on ${formattedDate} at ${timeSlot}.`,
      severity: 'info',
      metadata: { gatePass, warehouseId: warehouse?.warehouseId, dockBay, timeSlot },
    });

    res.status(201).json({
      success: true,
      message: `Pickup slot confirmed on ${formattedDate} at ${timeSlot} (Gate Pass: ${gatePass})!`,
      booking: confirmationMsg,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/manufacturer/warehouse-notifications - Latest communications and dispatches for warehouse notification bar
router.get('/warehouse-notifications', async (req, res) => {
  try {
    // 1. Get recent messages from manufacturer
    const recentMessages = await ManufacturerChat.find({
      conversationId: 'mfg-inv-desk',
    })
      .sort({ timestamp: -1 })
      .limit(10);

    // 2. Get incoming dispatches in transit or scheduled
    const incomingShipments = await InboundShipment.find({
      status: { $in: ['In Transit', 'Scheduled', 'Arrived'] },
    })
      .sort({ expectedArrivalDate: 1 })
      .limit(5);

    // Count manufacturer messages
    const mfgMessages = recentMessages.filter(m => m.sender === 'manufacturer');
    const latestMfgMessage = mfgMessages[0] || recentMessages[0] || null;

    res.json({
      success: true,
      latestMessage: latestMfgMessage,
      recentMessages,
      incomingShipments,
      unreadCount: mfgMessages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
