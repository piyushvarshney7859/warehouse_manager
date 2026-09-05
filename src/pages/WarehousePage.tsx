import React, { useState, useEffect } from 'react';
import {
  Grid3X3,
  Layers,
  Plus,
  Package,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  Scan,
  RefreshCw,
  Sparkles,
  Info,
  Compass,
  Box,
} from 'lucide-react';
import { IRowGroup, IBin, IWarehouseStats } from '../types.js';
import { api } from '../services/api.js';
import { Warehouse3DModel } from '../components/Warehouse3DModel.js';

interface WarehousePageProps {
  onNavigateToScan?: (barcode?: string) => void;
}

export const WarehousePage: React.FC<WarehousePageProps> = ({ onNavigateToScan }) => {
  const [rows, setRows] = useState<IRowGroup[]>([]);
  const [stats, setStats] = useState<IWarehouseStats | null>(null);
  const [selectedBin, setSelectedBin] = useState<IBin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [selectedRowCode, setSelectedRowCode] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'both'>('3d');

  const loadWarehouseData = async () => {
    try {
      setIsLoading(true);
      const [binsRes, overviewRes] = await Promise.all([
        api.getWarehouseBins(),
        api.getWarehouseOverview(),
      ]);

      if (binsRes.success) setRows(binsRes.rows);
      if (overviewRes.success) setStats(overviewRes.stats);
    } catch (err) {
      console.error('Failed loading warehouse grid:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouseData();
  }, []);

  const handleAddRow = async () => {
    setIsAddingRow(true);
    try {
      const res = await api.addWarehouseRow();
      if (res.success) {
        alert(res.message);
        loadWarehouseData();
      }
    } catch (err: any) {
      alert('Error expanding aisle: ' + err.message);
    } finally {
      setIsAddingRow(false);
    }
  };

  const getStatusColor = (status: string, occupancy: number, capacity: number) => {
    const rate = capacity > 0 ? (occupancy / capacity) * 100 : 0;
    if (rate === 0) return 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300';
    if (rate >= 100) return 'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300';
    if (rate >= 80) return 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300';
    return 'border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:border-emerald-300';
  };

  const getBarColor = (rate: number) => {
    if (rate >= 100) return 'bg-rose-500';
    if (rate >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const filteredRows = selectedRowCode === 'All' ? rows : rows.filter((r) => r.rowCode === selectedRowCode);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Compass className="h-3 w-3 text-indigo-600" />
              3D Digital Twin & 2D Grid
            </span>
            <span className="text-xs text-slate-500 font-medium">Warehouse WH-01 Central Facility</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Warehouse 3D Model & Product Topology
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize where every product is present in 3D without any hustle. Orbit around aisles, locate SKUs instantly, or inspect 2D storage grids.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>3D Model</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>2D Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Dual View</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isAddingRow}
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" />
            {isAddingRow ? 'Commissioning...' : 'Add Aisle'}
          </button>
        </div>
      </div>

      {/* Warehouse Metrics Overview Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Total Bins</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{stats.totalBins}</p>
            <span className="text-[10px] text-slate-400">{stats.totalRows} active aisles</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Occupied Bins</span>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">{stats.occupiedBins}</p>
            <span className="text-[10px] text-slate-400">{stats.availableBins} bins have room</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Units Stored</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {stats.currentOccupancy} <span className="text-xs text-slate-400 font-normal">/ {stats.totalCapacity}</span>
            </p>
            <span className="text-[10px] text-slate-400">{stats.occupancyRate}% utilized</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500">Full Bins</span>
            <p className="text-lg font-bold text-rose-600 mt-0.5">{stats.fullBins}</p>
            <span className="text-[10px] text-slate-400">Triggers auto-cascade</span>
          </div>
        </div>
      )}

      {/* 3D Digital Twin Visualizer */}
      {(viewMode === '3d' || viewMode === 'both') && (
        <div className="animate-in fade-in duration-150">
          <Warehouse3DModel
            rows={rows}
            selectedBin={selectedBin}
            onSelectBin={setSelectedBin}
            onNavigateToScan={onNavigateToScan}
          />
        </div>
      )}

      {/* 2D Floor Plan Layout & Aisle Filter */}
      {(viewMode === '2d' || viewMode === 'both') && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Aisle Filter & Color Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium text-xs">Filter Aisle:</span>
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setSelectedRowCode('All')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    selectedRowCode === 'All' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Aisles
                </button>
                {rows.map((r) => (
                  <button
                    key={r.rowCode}
                    onClick={() => setSelectedRowCode(r.rowCode)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      selectedRowCode === r.rowCode ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r.rowCode}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-slate-300" />
                <span>Empty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                <span>Available (&lt;80%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
                <span>Nearly Full (80-99%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                <span>Full (100%)</span>
              </div>
            </div>
          </div>

          {/* 2D Floor Plan Layout */}
          {isLoading ? (
            <div className="flex h-56 items-center justify-center text-slate-500 text-xs">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 mr-2" />
              Loading warehouse rack topology...
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRows.map((row) => (
                <div
                  key={row.rowCode}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                >
                  {/* Row Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-emerald-700 font-black text-xs border border-slate-200">
                        {row.rowCode.replace('Row ', '')}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{row.rowCode} (Storage Aisle)</h3>
                        <p className="text-[11px] text-slate-500">
                          {row.bins.length} dynamic bins • Capacity: {row.capacity} units
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        Occupancy: <strong className="text-slate-800">{row.currentOccupancy} / {row.capacity}</strong> ({row.occupancyRate}%)
                      </span>
                      <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getBarColor(row.occupancyRate)}`}
                          style={{ width: `${Math.min(100, row.occupancyRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bins Grid (6 bins per row) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {row.bins.map((bin) => {
                      const rate = bin.capacity > 0 ? Math.round((bin.currentOccupancy / bin.capacity) * 100) : 0;
                      const isSelected = selectedBin?.binCode === bin.binCode;

                      return (
                        <button
                          key={bin.binCode}
                          type="button"
                          onClick={() => setSelectedBin(bin)}
                          className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-all relative overflow-hidden ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/70'
                              : getStatusColor(bin.status, bin.currentOccupancy, bin.capacity)
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black text-slate-900">{bin.binCode}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 font-mono text-slate-700">
                              {rate}%
                            </span>
                          </div>

                          <div className="my-2">
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getBarColor(rate)}`}
                                style={{ width: `${Math.min(100, rate)}%` }}
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px]">
                              <span className="font-medium text-slate-700">
                                {bin.currentOccupancy} <span className="text-slate-400">/ {bin.capacity}</span>
                              </span>
                              <span className="text-slate-500 font-mono">
                                {bin.assignedProducts?.length || 0} SKUs
                              </span>
                            </div>
                          </div>

                          <div className="truncate text-[10px] text-slate-600 font-medium">
                            {bin.assignedProducts && bin.assignedProducts.length > 0
                              ? bin.assignedProducts[0].name
                              : 'Empty Storage Cell'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bin Detail Inspection Modal / Drawer */}
      {selectedBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-xs">
                  {selectedBin.binCode}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Storage Bin {selectedBin.binCode}</h3>
                  <p className="text-xs text-slate-500">{selectedBin.rowCode} • Slot {selectedBin.orderIndex}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBin(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Occupancy Stats */}
            <div className="my-3.5 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Occupancy:</span>
                <strong className="text-slate-900 font-mono">
                  {selectedBin.currentOccupancy} / {selectedBin.capacity} units (
                  {Math.round((selectedBin.currentOccupancy / selectedBin.capacity) * 100)}%)
                </strong>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(
                    (selectedBin.currentOccupancy / selectedBin.capacity) * 100
                  )}`}
                  style={{
                    width: `${Math.min(100, (selectedBin.currentOccupancy / selectedBin.capacity) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Remaining Free Space:</span>
                <strong className="text-emerald-700 font-mono font-bold">
                  {selectedBin.capacity - selectedBin.currentOccupancy} units
                </strong>
              </div>
            </div>

            {/* Products stored in this bin */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Assigned SKUs ({selectedBin.assignedProducts?.length || 0})
              </span>

              {!selectedBin.assignedProducts || selectedBin.assignedProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                  Bin is completely empty and ready for incoming products.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedBin.assignedProducts.map((p) => (
                    <div
                      key={p.barcode}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                          SKU: {p.sku} • Barcode: {p.barcode}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {p.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setSelectedBin(null)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
