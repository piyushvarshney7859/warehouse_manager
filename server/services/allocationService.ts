import { Warehouse } from '../models/Warehouse.js';
import { Row } from '../models/Row.js';
import { Bin, IBin } from '../models/Bin.js';
import { ActivityLog } from '../models/ActivityLog.js';

export interface AllocationResult {
  warehouseId: string;
  row: string;
  bin: string;
  binCode: string;
  capacity: number;
  newOccupancy: number;
  reason: string;
  isNewRowCreated: boolean;
}

export async function allocateBinForProduct(params: {
  productName: string;
  barcode: string;
  sku: string;
  quantity: number;
  warehouseId?: string;
}): Promise<AllocationResult> {
  const { productName, barcode, sku, quantity, warehouseId = 'WH-01' } = params;

  // 1. Ensure warehouse exists
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

  // 2. Fetch all active rows sorted by orderIndex
  const rows = await Row.find({ warehouseId, status: { $ne: 'inactive' } }).sort({ orderIndex: 1 });

  // 3. First check if this exact barcode is already assigned to a bin that has space to consolidate
  const existingBin = await Bin.findOne({
    warehouseId,
    'assignedProducts.barcode': barcode,
  });

  if (existingBin) {
    const availableSpace = existingBin.capacity - existingBin.currentOccupancy;
    if (availableSpace >= quantity) {
      // Update existing bin
      const itemIndex = existingBin.assignedProducts.findIndex((p: any) => p.barcode === barcode);
      if (itemIndex >= 0) {
        existingBin.assignedProducts[itemIndex].quantity += quantity;
      } else {
        existingBin.assignedProducts.push({ sku, barcode, name: productName, quantity });
      }
      existingBin.currentOccupancy += quantity;
      existingBin.status = calculateBinStatus(existingBin.currentOccupancy, existingBin.capacity);
      await existingBin.save();

      // Update row occupancy
      await Row.findOneAndUpdate(
        { warehouseId, rowCode: existingBin.rowCode },
        { $inc: { currentOccupancy: quantity } }
      );
      await Warehouse.findOneAndUpdate({ warehouseId }, { $inc: { currentOccupancy: quantity } });

      const reason = `Consolidated with existing SKU stock in ${existingBin.rowCode} → Bin ${existingBin.binCode} (${availableSpace - quantity} units remaining capacity).`;

      await ActivityLog.create({
        eventType: 'LOCATION_ASSIGNED',
        title: 'Product Stock Consolidated',
        description: `Product "${productName}" (${quantity} units) consolidated to ${existingBin.binCode}.`,
        severity: 'info',
        metadata: { barcode, bin: existingBin.binCode, row: existingBin.rowCode, reason },
      });

      return {
        warehouseId,
        row: existingBin.rowCode,
        bin: existingBin.binCode,
        binCode: existingBin.binCode,
        capacity: existingBin.capacity,
        newOccupancy: existingBin.currentOccupancy,
        reason,
        isNewRowCreated: false,
      };
    }
  }

  // 4. Search through rows in sequence (Row A -> Row B -> Row C...)
  let selectedBin: any = null;
  let cascadeNotes: string[] = [];

  for (const row of rows) {
    // Find bins in this row with capacity >= quantity, sorted by orderIndex
    const binsInRow = await Bin.find({
      warehouseId,
      rowCode: row.rowCode,
    }).sort({ orderIndex: 1 });

    let foundInThisRow = false;
    for (const bin of binsInRow) {
      const remainingCapacity = bin.capacity - bin.currentOccupancy;
      if (remainingCapacity >= quantity) {
        selectedBin = bin;
        foundInThisRow = true;
        break;
      }
    }

    if (foundInThisRow) {
      break;
    } else {
      cascadeNotes.push(`${row.rowCode} is at capacity for this batch`);
    }
  }

  // 5. If no bin found in existing rows, automatically activate/create a new Row!
  let isNewRowCreated = false;
  if (!selectedBin) {
    isNewRowCreated = true;
    const nextRowLetter = String.fromCharCode(65 + rows.length); // A=65, B=66, C=67 -> D=68
    const newRowCode = `Row ${nextRowLetter}`;
    const nextOrderIndex = rows.length + 1;

    console.log(`Auto-activating new row in warehouse: ${newRowCode}`);

    // Create Row in DB
    const newRow = await Row.create({
      warehouseId,
      rowCode: newRowCode,
      orderIndex: nextOrderIndex,
      capacity: 300,
      currentOccupancy: 0,
      binsCount: 6,
      status: 'active',
    });

    // Create 6 fresh bins for this new row
    const newBins = [];
    for (let i = 1; i <= 6; i++) {
      const binNum = i < 10 ? `0${i}` : `${i}`;
      const code = `${nextRowLetter}${binNum}`;
      newBins.push({
        warehouseId,
        rowCode: newRowCode,
        binCode: code,
        orderIndex: i,
        capacity: 50,
        currentOccupancy: 0,
        status: 'empty',
        assignedProducts: [],
      });
    }
    const createdBins = await Bin.insertMany(newBins);

    // Update warehouse metadata
    await Warehouse.findOneAndUpdate(
      { warehouseId },
      { $inc: { rowsCount: 1, totalCapacity: 300 } }
    );

    await ActivityLog.create({
      eventType: 'ROW_ACTIVATED',
      title: 'New Warehouse Row Activated',
      description: `All existing rows reached threshold. Automatically commissioned ${newRowCode} with 6 new storage bins (${nextRowLetter}01-${nextRowLetter}06).`,
      severity: 'warning',
      metadata: { newRowCode, binsCreated: 6 },
    });

    selectedBin = createdBins[0] as IBin;
  }

  // 6. Assign product to the selected bin
  selectedBin.assignedProducts.push({
    sku,
    barcode,
    name: productName,
    quantity,
  });
  selectedBin.currentOccupancy += quantity;
  selectedBin.status = calculateBinStatus(selectedBin.currentOccupancy, selectedBin.capacity);
  await selectedBin.save();

  // 7. Update Row & Warehouse occupancy
  await Row.findOneAndUpdate(
    { warehouseId, rowCode: selectedBin.rowCode },
    { $inc: { currentOccupancy: quantity } }
  );
  await Warehouse.findOneAndUpdate({ warehouseId }, { $inc: { currentOccupancy: quantity } });

  // 8. Generate intelligent reason string
  let reason = '';
  if (isNewRowCreated) {
    reason = `All previous rows (${rows.map((r) => r.rowCode).join(', ')}) were fully occupied. Automatically activated ${selectedBin.rowCode} and assigned nearest available Bin ${selectedBin.binCode} (capacity: ${selectedBin.capacity}).`;
  } else if (cascadeNotes.length > 0) {
    reason = `Cascaded past full rows (${cascadeNotes.join('; ')}). Assigned to ${selectedBin.rowCode} → Bin ${selectedBin.binCode} as the nearest slot with sufficient available space (${selectedBin.capacity - selectedBin.currentOccupancy} remaining).`;
  } else {
    reason = `Assigned to ${selectedBin.rowCode} → Bin ${selectedBin.binCode} because it is the nearest available slot with sufficient capacity (Occupancy: ${selectedBin.currentOccupancy}/${selectedBin.capacity}).`;
  }

  await ActivityLog.create({
    eventType: 'LOCATION_ASSIGNED',
    title: 'Smart Bin Allocated',
    description: `Assigned "${productName}" (${quantity} units) to ${selectedBin.rowCode} → Bin ${selectedBin.binCode}.`,
    severity: 'success',
    metadata: {
      barcode,
      sku,
      bin: selectedBin.binCode,
      row: selectedBin.rowCode,
      reason,
    },
  });

  return {
    warehouseId,
    row: selectedBin.rowCode,
    bin: selectedBin.binCode,
    binCode: selectedBin.binCode,
    capacity: selectedBin.capacity,
    newOccupancy: selectedBin.currentOccupancy,
    reason,
    isNewRowCreated,
  };
}

export function calculateBinStatus(occupancy: number, capacity: number): 'empty' | 'available' | 'nearly_full' | 'full' {
  if (occupancy <= 0) return 'empty';
  const ratio = occupancy / capacity;
  if (ratio >= 1) return 'full';
  if (ratio >= 0.8) return 'nearly_full';
  return 'available';
}
