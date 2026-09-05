import { Router } from 'express';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Bin } from '../models/Bin.js';
import { Row } from '../models/Row.js';
import { Warehouse } from '../models/Warehouse.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ActivityLog } from '../models/ActivityLog.js';

const router = Router();

// GET /api/orders - list orders
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter: any = {};
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (search) {
      const regex = new RegExp(String(search), 'i');
      filter.$or = [{ orderId: regex }, { customerName: regex }];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/:id - get single order
router.get('/:id', async (req, res) => {
  try {
    let order = await Order.findOne({ $or: [{ _id: req.params.id }, { orderId: req.params.id }] });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/orders - create an order
router.post('/', async (req, res) => {
  try {
    const { customerName, customerEmail, destination, priority = 'Standard', items } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Customer name and at least one order item are required.' });
    }

    // Generate unique order ID like SP1005, SP1006
    const count = await Order.countDocuments();
    const orderId = `SP${1001 + count}`;

    const populatedItems = [];
    for (const item of items) {
      let product: any = null;
      if (item.productId) {
        product = await Product.findById(item.productId);
      } else if (item.barcode) {
        product = await Product.findOne({ barcode: item.barcode });
      }

      if (!product) {
        return res.status(400).json({ success: false, message: `Product not found for item: ${item.name || item.barcode}` });
      }

      const reqQty = Number(item.quantity) || 1;
      if (product.quantity < reqQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for "${product.name}". Available: ${product.quantity}, Requested: ${reqQty}`,
        });
      }

      populatedItems.push({
        productId: product._id,
        barcode: product.barcode,
        name: product.name,
        sku: product.sku,
        quantity: reqQty,
        location: product.location,
        isPicked: false,
      });
    }

    const order = await Order.create({
      orderId,
      customerName: customerName.trim(),
      customerEmail: customerEmail?.trim() || '',
      destination: destination?.trim() || 'Bay 1 - Fulfillment Hub',
      priority,
      items: populatedItems,
      status: 'Pending',
    });

    await ActivityLog.create({
      eventType: 'ORDER_CREATED',
      title: `Order ${orderId} Created`,
      description: `New order for customer ${order.customerName} containing ${populatedItems.length} line items.`,
      severity: 'info',
      metadata: { orderId, itemsCount: populatedItems.length },
    });

    res.status(201).json({ success: true, order, message: `Order ${orderId} created successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/orders/:id/pick-item - Barcode Verification & Picking Engine!
router.post('/:id/pick-item', async (req, res) => {
  try {
    const { scannedBarcode, expectedBarcode } = req.body;

    if (!scannedBarcode || !expectedBarcode) {
      return res.status(400).json({
        success: false,
        message: 'Both scannedBarcode and expectedBarcode are required for verification.',
      });
    }

    const order = await Order.findOne({ $or: [{ _id: req.params.id }, { orderId: req.params.id }] });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const itemIndex = order.items.findIndex(
      (item: any) => item.barcode.trim() === expectedBarcode.trim()
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not part of this order.' });
    }

    const item = order.items[itemIndex];

    if (item.isPicked) {
      return res.status(400).json({ success: false, message: 'This item has already been verified and picked.' });
    }

    // --- REAL-WORLD ERROR PREVENTION CHECK ---
    const cleanScanned = scannedBarcode.trim();
    const cleanExpected = expectedBarcode.trim();

    if (cleanScanned !== cleanExpected) {
      // Find what was wrongly scanned for descriptive feedback
      const wrongProduct = await Product.findOne({ barcode: cleanScanned });
      const scannedName = wrongProduct ? wrongProduct.name : `Unknown Barcode (${cleanScanned})`;

      await ActivityLog.create({
        eventType: 'WRONG_BARCODE_SCANNED',
        title: 'Mispick Attempt Intercepted',
        description: `Picker scanned "${scannedName}" (${cleanScanned}) instead of expected "${item.name}" (${cleanExpected}) on Order ${order.orderId}.`,
        severity: 'error',
        metadata: {
          orderId: order.orderId,
          expectedBarcode: cleanExpected,
          expectedName: item.name,
          scannedBarcode: cleanScanned,
          scannedName,
        },
      });

      return res.status(400).json({
        success: false,
        verified: false,
        errorType: 'MISPICK_PREVENTED',
        message: 'Mispick Blocked! Scanned barcode does NOT match expected product.',
        expected: {
          name: item.name,
          barcode: item.barcode,
          location: item.location,
        },
        scanned: {
          name: scannedName,
          barcode: cleanScanned,
        },
      });
    }

    // --- BARCODE MATCHES! PROCESS THE PICK ---
    item.isPicked = true;
    item.pickedAt = new Date();
    item.scannedBarcode = cleanScanned;

    // Deduct from Product Inventory
    const product = await Product.findById(item.productId);
    if (product) {
      const prevQty = product.quantity;
      const newQty = Math.max(0, product.quantity - item.quantity);
      product.quantity = newQty;
      await product.save();

      // Update Bin Occupancy
      const bin = await Bin.findOne({ binCode: product.location.bin });
      if (bin) {
        bin.currentOccupancy = Math.max(0, bin.currentOccupancy - item.quantity);
        const assignedItem = bin.assignedProducts.find((p: any) => p.barcode === product.barcode);
        if (assignedItem) {
          assignedItem.quantity = Math.max(0, assignedItem.quantity - item.quantity);
        }
        await bin.save();
        await Row.findOneAndUpdate({ rowCode: bin.rowCode }, { $inc: { currentOccupancy: -item.quantity } });
        await Warehouse.findOneAndUpdate({ warehouseId: product.location.warehouseId }, { $inc: { currentOccupancy: -item.quantity } });
      }

      // Record Pick Inventory Transaction
      await InventoryTransaction.create({
        product: product._id,
        productName: product.name,
        barcode: product.barcode,
        sku: product.sku,
        type: 'PICK',
        quantity: item.quantity,
        previousQuantity: prevQty,
        newQuantity: newQty,
        reason: `Order ${order.orderId} fulfillment by picker`,
        location: { row: product.location.row, bin: product.location.bin },
        referenceOrder: order.orderId,
      });
    }

    // Check if entire order is now picked
    const allPicked = order.items.every((i: any) => i.isPicked);
    if (allPicked) {
      order.status = 'Ready for Dispatch';
      order.pickedAt = new Date();
    } else {
      order.status = 'Picking';
    }

    await order.save();

    await ActivityLog.create({
      eventType: 'PRODUCT_PICKED',
      title: `Item Picked: ${item.name}`,
      description: `Verified and picked ${item.quantity}x "${item.name}" from ${item.location.row} → ${item.location.bin} for Order ${order.orderId}.`,
      severity: 'success',
      metadata: {
        orderId: order.orderId,
        barcode: item.barcode,
        allPicked,
      },
    });

    res.json({
      success: true,
      verified: true,
      message: `✓ Product Verified! Item picked successfully from ${item.location.bin}.`,
      allPicked,
      orderStatus: order.status,
      order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/orders/:id/dispatch - mark order dispatched
router.post('/:id/dispatch', async (req, res) => {
  try {
    const order = await Order.findOne({ $or: [{ _id: req.params.id }, { orderId: req.params.id }] });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = 'Dispatched';
    order.dispatchedAt = new Date();
    await order.save();

    await ActivityLog.create({
      eventType: 'ORDER_DISPATCHED',
      title: `Order ${order.orderId} Dispatched`,
      description: `Order handed over to outbound carrier for ${order.customerName}.`,
      severity: 'success',
      metadata: { orderId: order.orderId },
    });

    res.json({ success: true, message: `Order ${order.orderId} marked as Dispatched.`, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
