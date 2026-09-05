import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Package,
  Layers,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { IAnalyticsData } from '../types.js';
import { api } from '../services/api.js';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<IAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAnalytics();
      if (res.success) setData(res);
    } catch (err) {
      console.error('Failed fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500 text-xs">
        <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 mr-2" />
        Calculating warehouse analytics & AI slotting insights...
      </div>
    );
  }

  const { summary, inventoryByCategory, rowStats, aiInsights, recentTransactions } = data;

  const CATEGORY_COLORS = ['#059669', '#2563eb', '#7c3aed', '#d97706', '#db2777', '#0891b2'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Intelligence & KPI Reporting
            </span>
            <span className="text-xs text-slate-500 font-medium">Audited Warehouse Operations</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Warehouse Analytics & AI Advisory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time throughput metrics, inventory balance by aisle, and predictive restocking recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Refresh Metrics
        </button>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Picking Accuracy</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">100%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {summary.mispickAttemptsPrevented} mispicks intercepted by scanner verification
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Units in Stock</span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{summary.totalInventoryUnits}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Across {summary.totalProducts} registered product SKUs
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Warehouse Utilization</span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{summary.warehouseOccupancyRate}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {summary.warehouseOccupancy} / {summary.warehouseCapacity} units capacity
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Orders Dispatched</span>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
            {summary.dispatchedOrders + summary.readyForDispatchOrders}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {summary.pendingOrders + summary.pickingOrders} orders currently in fulfillment queue
          </p>
        </div>
      </div>

      {/* AI Restocking Advisory Section */}
      {aiInsights && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">StockPilot AI Inventory Advisory</h3>
                <p className="text-xs text-slate-500">Automated slotting optimization & reorder suggestions</p>
              </div>
            </div>
            <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              Engine: {aiInsights.source}
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">{aiInsights.summary}</p>

          {/* Restock Recommendations Table */}
          {aiInsights.restockRecommendations.length > 0 && (
            <div className="mt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-2">
                Automated Restock Recommendations ({aiInsights.restockRecommendations.length} items)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {aiInsights.restockRecommendations.map((rec) => (
                  <div
                    key={rec.sku}
                    className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{rec.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">SKU: {rec.sku}</p>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                          rec.priority === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : rec.priority === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {rec.priority} Priority
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 rounded p-1.5 text-[11px]">
                      <span className="text-slate-500">
                        Current: <strong className="text-slate-800">{rec.currentStock}</strong> (Min: {rec.minimumStock})
                      </span>
                      <span className="text-emerald-700 font-bold">
                        Suggested Order: +{rec.suggestedReorderQuantity} units
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Units by Category */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-0.5">Inventory by Category</h3>
          <p className="text-xs text-slate-500 mb-3">Unit volume distribution across product families</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                />
                <Bar dataKey="units" fill="#059669" radius={[4, 4, 0, 0]}>
                  {inventoryByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row Capacity Comparison */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-0.5">Aisle Load Distribution</h3>
          <p className="text-xs text-slate-500 mb-3">Capacity vs occupied units by storage aisle</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rowStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="row" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                />
                <Bar dataKey="capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Capacity" />
                <Bar dataKey="occupancy" fill="#2563eb" radius={[4, 4, 0, 0]} name="Occupied" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Inventory Transactions Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-0.5">Audited Stock Movement Log</h3>
        <p className="text-xs text-slate-500 mb-3">Immutable ledger of inwarding, picks, and location adjustments</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2">Time</th>
                <th className="px-3.5 py-2">Type</th>
                <th className="px-3.5 py-2">Product & SKU</th>
                <th className="px-3.5 py-2">Delta</th>
                <th className="px-3.5 py-2">Location</th>
                <th className="px-3.5 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-400">
                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                        tx.type === 'INWARD'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : tx.type === 'PICK'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-semibold text-slate-900">{tx.productName}</div>
                    <div className="font-mono text-[10px] text-slate-400">{tx.sku}</div>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono">
                    <span className={tx.quantity > 0 ? 'text-emerald-700 font-bold' : 'text-slate-800 font-semibold'}>
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                    </span>{' '}
                    <span className="text-[10px] text-slate-400">
                      ({tx.previousQuantity} → {tx.newQuantity})
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-emerald-700 font-medium">
                    {tx.location.row} → {tx.location.bin}
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-500 max-w-xs truncate">{tx.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
