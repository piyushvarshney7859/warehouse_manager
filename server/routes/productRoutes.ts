import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Bin } from '../models/Bin.js';
import { Row } from '../models/Row.js';
import { Warehouse } from '../models/Warehouse.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { allocateBinForProduct } from '../services/allocationService.js';

const router = Router();

// GET /api/products - list all products with filtering & sorting
router.get('/', async (req, res) => {
  try {
    const { search, category, status, sortBy = 'createdAt', order = 'desc' } = req.query;

    let query: any = {};
    if (search) {
      const regex = new RegExp(String(search), 'i');
      query.$or = [
        { name: regex },
        { sku: regex },
        { barcode: regex },
        { category: regex },
        { serialNumber: regex },
        { serialNumbers: regex },
      ];
    }
    if (category && category !== 'All') {
      query.category = category;
    }

    let products = await Product.find(query).sort({ [String(sortBy)]: order === 'asc' ? 1 : -1 });

    if (status && status !== 'All') {
      products = products.filter((p: any) => p.stockStatus === status);
    }

    res.json({ success: true, count: products.length, products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/barcode/:barcode - lookup by barcode or serial number
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const rawCode = req.params.barcode.trim();
    const product = await Product.findOne({
      $or: [
        { barcode: rawCode },
        { serialNumber: rawCode },
        { serialNumbers: rawCode },
        { sku: rawCode.toUpperCase() },
      ],
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No product registered with barcode or serial number: ${req.params.barcode}`,
      });
    }

    const bin = await Bin.findOne({ binCode: product.location.bin });

    res.json({ success: true, product, bin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/:id - detail
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const recentTransactions = await InventoryTransaction.find({ product: product._id })
      .sort({ timestamp: -1 })
      .limit(10);

    const bin = await Bin.findOne({ binCode: product.location.bin });

    res.json({ success: true, product, bin, recentTransactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/products - create new product with Smart Bin Allocation
router.post('/', async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      serialNumber = '',
      category,
      quantity = 10,
      minimumStock = 5,
      unitPrice = 19.99,
      description = '',
    } = req.body;

    if (!name || !sku || !barcode || !category) {
      return res.status(400).json({ success: false, message: 'Name, SKU, barcode, and category are required.' });
    }

    const cleanBarcode = barcode.trim();
    const cleanSku = sku.toUpperCase().trim();
    const cleanSerial = serialNumber ? String(serialNumber).trim() : '';

    // Check duplicate
    const existing = await Product.findOne({
      $or: [
        { barcode: cleanBarcode },
        { sku: cleanSku },
        ...(cleanSerial ? [{ serialNumber: cleanSerial }, { serialNumbers: cleanSerial }] : []),
      ],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Product with barcode "${cleanBarcode}", serial number "${cleanSerial}", or SKU "${cleanSku}" already exists.`,
      });
    }

    // SMART BIN ALLOCATION: automatically finds nearest suitable bin or creates new row
    const qtyNum = Number(quantity) || 0;
    const allocation = await allocateBinForProduct({
      productName: name,
      barcode: cleanBarcode,
      sku: cleanSku,
      quantity: qtyNum,
    });

    const product = await Product.create({
      name: name.trim(),
      sku: cleanSku,
      barcode: cleanBarcode,
      serialNumber: cleanSerial,
      serialNumbers: cleanSerial ? [cleanSerial] : [],
      category: category.trim(),
      quantity: qtyNum,
      minimumStock: Number(minimumStock) || 5,
      unitPrice: Number(unitPrice) || 19.99,
      description: description.trim(),
      location: {
        warehouseId: allocation.warehouseId,
        row: allocation.row,
        bin: allocation.binCode,
      },
    });

    // Record Inward Transaction
    await InventoryTransaction.create({
      product: product._id,
      productName: product.name,
      barcode: product.barcode,
      sku: product.sku,
      type: 'INWARD',
      quantity: qtyNum,
      previousQuantity: 0,
      newQuantity: qtyNum,
      reason: `New product intake. ${allocation.reason}`,
      location: { row: allocation.row, bin: allocation.binCode },
    });

    await ActivityLog.create({
      eventType: 'PRODUCT_ADDED',
      title: 'New Product Registered',
      description: `Added "${product.name}" (${qtyNum} units) assigned to ${allocation.row} → Bin ${allocation.binCode}.`,
      severity: 'success',
      metadata: { barcode: product.barcode, sku: product.sku, allocationReason: allocation.reason },
    });

    res.status(201).json({
      success: true,
      product,
      allocation,
      message: `Product registered and automatically assigned to ${allocation.binCode}.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id - update product info or adjust stock
router.put('/:id', async (req, res) => {
  try {
    const { name, category, minimumStock, unitPrice, description, quantity } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousQuantity = product.quantity;
    if (name) product.name = name;
    if (category) product.category = category;
    if (minimumStock !== undefined) product.minimumStock = Number(minimumStock);
    if (unitPrice !== undefined) product.unitPrice = Number(unitPrice);
    if (description !== undefined) product.description = description;

    let stockDelta = 0;
    if (quantity !== undefined && Number(quantity) !== previousQuantity) {
      const newQty = Number(quantity);
      stockDelta = newQty - previousQuantity;
      product.quantity = newQty;

      // Update Bin Occupancy
      const bin = await Bin.findOne({ binCode: product.location.bin });
      if (bin) {
        bin.currentOccupancy = Math.max(0, bin.currentOccupancy + stockDelta);
        const pItem = bin.assignedProducts.find((p: any) => p.barcode === product.barcode);
        if (pItem) {
          pItem.quantity = newQty;
        }
        await bin.save();

        await Row.findOneAndUpdate({ rowCode: bin.rowCode }, { $inc: { currentOccupancy: stockDelta } });
        await Warehouse.findOneAndUpdate({ warehouseId: product.location.warehouseId }, { $inc: { currentOccupancy: stockDelta } });
      }

      await InventoryTransaction.create({
        product: product._id,
        productName: product.name,
        barcode: product.barcode,
        sku: product.sku,
        type: 'ADJUSTMENT',
        quantity: Math.abs(stockDelta),
        previousQuantity,
        newQuantity: newQty,
        reason: `Manual inventory count adjustment (${stockDelta > 0 ? '+' : ''}${stockDelta})`,
        location: { row: product.location.row, bin: product.location.bin },
      });

      await ActivityLog.create({
        eventType: 'INVENTORY_UPDATED',
        title: 'Inventory Count Adjusted',
        description: `Updated stock of "${product.name}" from ${previousQuantity} to ${newQty}.`,
        severity: 'info',
      });
    }

    await product.save();
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/products/:id - remove product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Release occupancy in bin
    const bin = await Bin.findOne({ binCode: product.location.bin });
    if (bin) {
      bin.assignedProducts = bin.assignedProducts.filter((p: any) => p.barcode !== product.barcode);
      bin.currentOccupancy = Math.max(0, bin.currentOccupancy - product.quantity);
      await bin.save();
      await Row.findOneAndUpdate({ rowCode: bin.rowCode }, { $inc: { currentOccupancy: -product.quantity } });
      await Warehouse.findOneAndUpdate({ warehouseId: product.location.warehouseId }, { $inc: { currentOccupancy: -product.quantity } });
    }

    await Product.findByIdAndDelete(req.params.id);

    await ActivityLog.create({
      eventType: 'INVENTORY_UPDATED',
      title: 'Product Decommissioned',
      description: `Removed "${product.name}" (${product.sku}) from warehouse storage.`,
      severity: 'warning',
    });

    res.json({ success: true, message: `Product ${product.name} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
