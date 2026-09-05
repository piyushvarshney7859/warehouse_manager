import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Bin } from '../models/Bin.js';
import { Row } from '../models/Row.js';
import { Warehouse } from '../models/Warehouse.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { allocateBinForProduct } from '../services/allocationService.js';

const router = Router();

// POST /api/scan/decode-image - AI barcode decoder fallback
router.post('/decode-image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Image data is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: false,
        message: 'No GEMINI_API_KEY available for AI vision decoding.',
      });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Clean base64 string
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const rawBase64 = match ? match[2] : imageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: rawBase64,
          },
        },
        'Analyze this package image carefully. Packages often contain both a Product Barcode (EAN, UPC, GTIN, Code 128) and a Serial Number (often labeled S/N, Serial No, SN, IMEI, or asset tag). Extract both if visible. If multiple barcodes or labels are present, identify which is the product barcode and which is the serial number. Reply with a valid JSON object ONLY: { "found": true, "barcode": "<primary product barcode digits>", "serialNumber": "<serial number if found or null>", "format": "<format name if recognizable>", "labelHint": "<optional brand or product name text detected on package>" } or if nothing is visible: { "found": false, "barcode": null, "serialNumber": null }.',
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    try {
      const parsed = JSON.parse(text);
      if (parsed.found && (parsed.barcode || parsed.serialNumber)) {
        return res.json({
          success: true,
          barcode: parsed.barcode ? String(parsed.barcode).replace(/\s+/g, '') : null,
          serialNumber: parsed.serialNumber ? String(parsed.serialNumber).trim() : null,
          format: parsed.format || 'AI Vision Decoded',
          labelHint: parsed.labelHint || null,
        });
      }
    } catch {
      const digitsMatch = text.match(/\b\d{8,14}\b/);
      if (digitsMatch) {
        return res.json({
          success: true,
          barcode: digitsMatch[0],
          format: 'AI Vision Decoded',
        });
      }
    }

    return res.json({ success: false, message: 'AI could not detect barcode or serial number in image.' });
  } catch (error: any) {
    console.warn('AI Barcode decode failed:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/scan - identify product from barcode or serial number scan
router.post('/', async (req, res) => {
  try {
    const { barcode, serialNumber } = req.body;
    const lookupKey = (barcode || serialNumber || '').trim();

    if (!lookupKey) {
      return res.status(400).json({ success: false, message: 'Barcode or Serial Number is required.' });
    }

    const cleanKey = String(lookupKey).trim();
    const product = await Product.findOne({
      $or: [
        { barcode: cleanKey },
        { serialNumber: cleanKey },
        { serialNumbers: cleanKey },
        { sku: cleanKey.toUpperCase() },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        found: false,
        barcode: cleanKey,
        message: `No product found matching code "${cleanKey}". You can register and slot it now.`,
      });
    }

    const bin = await Bin.findOne({ binCode: product.location.bin });

    // Log scan event
    await ActivityLog.create({
      eventType: 'PRODUCT_SCANNED',
      title: 'Barcode / S/N Scanned',
      description: `Scanned code ${cleanKey} for "${product.name}". Located at ${product.location.row} → Bin ${product.location.bin}.`,
      severity: 'info',
      metadata: { barcode: product.barcode, serialNumber: product.serialNumber, sku: product.sku, bin: product.location.bin },
    });

    res.json({
      success: true,
      found: true,
      product,
      bin,
      message: `Product identified: ${product.name}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/scan/inward - restock or add new stock via barcode / serial number
router.post('/inward', async (req, res) => {
  try {
    const { barcode, serialNumber, quantity, name, sku, category, unitPrice, description } = req.body;
    const lookupKey = (barcode || serialNumber || '').trim();

    if (!lookupKey) {
      return res.status(400).json({ success: false, message: 'Barcode or Serial Number is required.' });
    }

    const cleanBarcode = String(lookupKey).trim();
    const cleanSerial = serialNumber ? String(serialNumber).trim() : '';
    const qtyNum = Number(quantity) || 1;

    let product = await Product.findOne({
      $or: [
        { barcode: cleanBarcode },
        { serialNumber: cleanBarcode },
        { serialNumbers: cleanBarcode },
        { sku: cleanBarcode.toUpperCase() },
      ],
    });

    if (product) {
      // Existing product: increase quantity
      const prevQty = product.quantity;
      product.quantity += qtyNum;
      if (cleanSerial && !product.serialNumbers?.includes(cleanSerial)) {
        if (!product.serialNumbers) product.serialNumbers = [];
        product.serialNumbers.push(cleanSerial);
        if (!product.serialNumber) product.serialNumber = cleanSerial;
      }
      await product.save();

      // Update Bin
      const bin = await Bin.findOne({ binCode: product.location.bin });
      if (bin) {
        bin.currentOccupancy += qtyNum;
        const pItem = bin.assignedProducts.find((p: any) => p.barcode === product.barcode);
        if (pItem) {
          pItem.quantity += qtyNum;
        } else {
          bin.assignedProducts.push({
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            quantity: qtyNum,
          });
        }
        await bin.save();
        await Row.findOneAndUpdate({ rowCode: bin.rowCode }, { $inc: { currentOccupancy: qtyNum } });
        await Warehouse.findOneAndUpdate({ warehouseId: product.location.warehouseId }, { $inc: { currentOccupancy: qtyNum } });
      }

      await InventoryTransaction.create({
        product: product._id,
        productName: product.name,
        barcode: product.barcode,
        sku: product.sku,
        type: 'INWARD',
        quantity: qtyNum,
        previousQuantity: prevQty,
        newQuantity: product.quantity,
        reason: cleanSerial ? `Restock via scan (S/N: ${cleanSerial})` : 'Restock via barcode scanner intake',
        location: { row: product.location.row, bin: product.location.bin },
      });

      await ActivityLog.create({
        eventType: 'INVENTORY_UPDATED',
        title: 'Stock Restocked via Scan',
        description: `Added ${qtyNum} units of "${product.name}" to ${product.location.row} → ${product.location.bin}.`,
        severity: 'success',
      });

      return res.json({
        success: true,
        product,
        message: `Successfully restocked ${qtyNum} units of "${product.name}".`,
      });
    }

    // New product intake: run smart bin allocation
    if (!name || !sku || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, SKU, and category are required to register a brand-new product.',
      });
    }

    const allocation = await allocateBinForProduct({
      productName: name,
      barcode: cleanBarcode,
      sku: sku.toUpperCase().trim(),
      quantity: qtyNum,
    });

    product = await Product.create({
      name: String(name).trim(),
      sku: String(sku).toUpperCase().trim(),
      barcode: cleanBarcode,
      serialNumber: cleanSerial || undefined,
      serialNumbers: cleanSerial ? [cleanSerial] : [],
      category: String(category).trim(),
      quantity: qtyNum,
      minimumStock: 5,
      unitPrice: Number(unitPrice) || 19.99,
      description: description || '',
      location: {
        warehouseId: allocation.warehouseId,
        row: allocation.row,
        bin: allocation.binCode,
      },
    });

    await InventoryTransaction.create({
      product: product._id,
      productName: product.name,
      barcode: product.barcode,
      sku: product.sku,
      type: 'INWARD',
      quantity: qtyNum,
      previousQuantity: 0,
      newQuantity: qtyNum,
      reason: `Intake scan: ${allocation.reason}`,
      location: { row: allocation.row, bin: allocation.binCode },
    });

    res.status(201).json({
      success: true,
      product,
      allocation,
      message: `Product scanned, registered, and assigned to ${allocation.binCode}.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
