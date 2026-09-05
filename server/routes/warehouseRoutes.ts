import { Router } from 'express';
import { Warehouse } from '../models/Warehouse.js';
import { Row } from '../models/Row.js';
import { Bin } from '../models/Bin.js';
import { ActivityLog } from '../models/ActivityLog.js';

const router = Router();

// GET /api/warehouse - overview
router.get('/', async (req, res) => {
  try {
    const warehouseId = 'WH-01';
    let warehouse = await Warehouse.findOne({ warehouseId });
    if (!warehouse) {
      warehouse = await Warehouse.create({
        warehouseId,
        name: 'StockPilot Central Logistics Hub',
        code: warehouseId,
        totalCapacity: 1200,
        currentOccupancy: 0,
        rowsCount: 3,
        status: 'active',
      });
    }

    const rows = await Row.find({ warehouseId }).sort({ orderIndex: 1 });
    const bins = await Bin.find({ warehouseId }).sort({ rowCode: 1, orderIndex: 1 });

    const totalBins = bins.length;
    const occupiedBins = bins.filter((b) => b.currentOccupancy > 0).length;
    const availableBins = bins.filter((b) => b.currentOccupancy < b.capacity).length;
    const fullBins = bins.filter((b) => b.currentOccupancy >= b.capacity).length;
    const occupancyRate = warehouse.totalCapacity > 0
      ? Math.round((warehouse.currentOccupancy / warehouse.totalCapacity) * 100)
      : 0;

    res.json({
      success: true,
      warehouse,
      stats: {
        totalCapacity: warehouse.totalCapacity,
        currentOccupancy: warehouse.currentOccupancy,
        occupancyRate,
        totalRows: rows.length,
        totalBins,
        occupiedBins,
        availableBins,
        fullBins,
      },
      rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/warehouse/bins - all bins with assigned products
router.get('/bins', async (req, res) => {
  try {
    const warehouseId = 'WH-01';
    const bins = await Bin.find({ warehouseId }).sort({ rowCode: 1, orderIndex: 1 });
    const rows = await Row.find({ warehouseId }).sort({ orderIndex: 1 });

    // Group bins by row
    const grouped = rows.map((row) => {
      const rowBins = bins.filter((b) => b.rowCode === row.rowCode);
      const occupancyRate = row.capacity > 0 ? Math.round((row.currentOccupancy / row.capacity) * 100) : 0;
      return {
        rowCode: row.rowCode,
        orderIndex: row.orderIndex,
        capacity: row.capacity,
        currentOccupancy: row.currentOccupancy,
        occupancyRate,
        status: row.status,
        bins: rowBins,
      };
    });

    res.json({ success: true, rows: grouped, rawBins: bins });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/warehouse/bin/:binCode - specific bin details
router.get('/bin/:binCode', async (req, res) => {
  try {
    const bin = await Bin.findOne({ binCode: req.params.binCode.toUpperCase() });
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }
    res.json({ success: true, bin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/warehouse/add-row - manual or on-demand row expansion
router.post('/add-row', async (req, res) => {
  try {
    const warehouseId = 'WH-01';
    const rows = await Row.find({ warehouseId });
    const nextRowLetter = String.fromCharCode(65 + rows.length);
    const rowCode = `Row ${nextRowLetter}`;

    const newRow = await Row.create({
      warehouseId,
      rowCode,
      orderIndex: rows.length + 1,
      capacity: 300,
      currentOccupancy: 0,
      binsCount: 6,
      status: 'active',
    });

    const newBins = [];
    for (let i = 1; i <= 6; i++) {
      const binNum = i < 10 ? `0${i}` : `${i}`;
      newBins.push({
        warehouseId,
        rowCode,
        binCode: `${nextRowLetter}${binNum}`,
        orderIndex: i,
        capacity: 50,
        currentOccupancy: 0,
        status: 'empty',
        assignedProducts: [],
      });
    }
    const createdBins = await Bin.insertMany(newBins);

    await Warehouse.findOneAndUpdate(
      { warehouseId },
      { $inc: { rowsCount: 1, totalCapacity: 300 } }
    );

    await ActivityLog.create({
      eventType: 'ROW_ACTIVATED',
      title: 'Warehouse Aisle Expanded',
      description: `Manually activated ${rowCode} with 6 new dynamic bins (${nextRowLetter}01-${nextRowLetter}06).`,
      severity: 'info',
    });

    res.status(201).json({
      success: true,
      message: `${rowCode} added with 6 bins!`,
      row: newRow,
      bins: createdBins,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
