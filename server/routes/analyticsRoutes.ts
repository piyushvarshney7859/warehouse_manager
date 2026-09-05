import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Bin } from '../models/Bin.js';
import { Row } from '../models/Row.js';
import { Warehouse } from '../models/Warehouse.js';
import { InventoryTransaction } from '../models/InventoryTransaction.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { generateWarehouseInsights } from '../services/geminiService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const warehouseId = 'WH-01';

    const [products, orders, bins, rows, warehouse, transactions, mispickLogs] = await Promise.all([
      Product.find({}),
      Order.find({}),
      Bin.find({ warehouseId }),
      Row.find({ warehouseId }),
      Warehouse.findOne({ warehouseId }),
      InventoryTransaction.find({}).sort({ timestamp: -1 }).limit(10),
      ActivityLog.countDocuments({ eventType: 'WRONG_BARCODE_SCANNED' }),
    ]);

    // Totals
    const totalProducts = products.length;
    const totalInventoryUnits = products.reduce((acc, p) => acc + p.quantity, 0);
    const lowStockProducts = products.filter((p) => p.quantity <= p.minimumStock);
    const outOfStockProducts = products.filter((p) => p.quantity === 0);

    // Orders breakdown
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
    const pickingOrders = orders.filter((o) => o.status === 'Picking').length;
    const pickedOrders = orders.filter((o) => o.status === 'Picked').length;
    const readyForDispatchOrders = orders.filter((o) => o.status === 'Ready for Dispatch').length;
    const dispatchedOrders = orders.filter((o) => o.status === 'Dispatched').length;

    // Warehouse stats
    const totalCapacity = warehouse ? warehouse.totalCapacity : 1200;
    const currentOccupancy = warehouse ? warehouse.currentOccupancy : totalInventoryUnits;
    const occupancyRate = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;
    const availableBins = bins.filter((b) => b.currentOccupancy < b.capacity).length;
    const occupiedBins = bins.filter((b) => b.currentOccupancy > 0).length;

    // Inventory by Category
    const categoryMap: Record<string, { count: number; units: number }> = {};
    products.forEach((p) => {
      const cat = p.category || 'General';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, units: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].units += p.quantity;
    });
    const inventoryByCategory = Object.entries(categoryMap).map(([name, val]) => ({
      name,
      skus: val.count,
      units: val.units,
    }));

    // Row Occupancy
    const rowStats = rows.map((r) => ({
      row: r.rowCode,
      occupancy: r.currentOccupancy,
      capacity: r.capacity,
      occupancyRate: r.capacity > 0 ? Math.round((r.currentOccupancy / r.capacity) * 100) : 0,
      binsCount: r.binsCount,
    }));

    // Picking Accuracy & Error Prevention metric
    const successfulPickLogs = await ActivityLog.countDocuments({ eventType: 'PRODUCT_PICKED' });
    const totalPickAttempts = successfulPickLogs + mispickLogs;
    const pickingAccuracy =
      totalPickAttempts > 0 ? Math.round((successfulPickLogs / totalPickAttempts) * 100) : 100;

    // Fetch smart / AI insights
    const aiInsights = await generateWarehouseInsights();

    res.json({
      success: true,
      summary: {
        totalProducts,
        totalInventoryUnits,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalOrders,
        pendingOrders,
        pickingOrders,
        pickedOrders,
        readyForDispatchOrders,
        dispatchedOrders,
        warehouseCapacity: totalCapacity,
        warehouseOccupancy: currentOccupancy,
        warehouseOccupancyRate: occupancyRate,
        totalBins: bins.length,
        availableBins,
        occupiedBins,
        mispickAttemptsPrevented: mispickLogs,
        successfulPicks: successfulPickLogs,
        pickingAccuracy,
      },
      inventoryByCategory,
      rowStats,
      ordersByStatus: [
        { status: 'Pending', count: pendingOrders, fill: '#3b82f6' },
        { status: 'Picking', count: pickingOrders, fill: '#f59e0b' },
        { status: 'Ready for Dispatch', count: readyForDispatchOrders, fill: '#10b981' },
        { status: 'Dispatched', count: dispatchedOrders, fill: '#6b7280' },
      ],
      lowStockList: lowStockProducts.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        quantity: p.quantity,
        minimumStock: p.minimumStock,
        location: `${p.location.row} → ${p.location.bin}`,
        status: p.quantity === 0 ? 'out_of_stock' : 'low_stock',
      })),
      recentTransactions: transactions,
      aiInsights,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
