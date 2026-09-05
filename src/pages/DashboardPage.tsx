import React, { useEffect, useState } from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  ScanLine,
  Truck,
  Sparkles,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { IAnalyticsData, IActivityLog, IProduct } from '../types.js';
import { api } from '../services/api.js';
import { NavTab } from '../components/Sidebar.js';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenPickOrder?: (orderId: string) => void;
  onScanItem?: (barcode: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenPickOrder,
}) => {
  const [data, setData] = useState<IAnalyticsData | null>(null);
  const [activities, setActivities] = useState<IActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [analyticsRes, activityRes] = await Promise.all([
        api.getAnalytics(),
        api.getActivity({ limit: 6 }),
      ]);
      if (analyticsRes.success) {
        setData(analyticsRes);
      } else {
        throw new Error((analyticsRes as any).message || 'Analytics response indicated failure');
      }
      if (activityRes.success) {
        setActivities(activityRes.logs);
      }
    } catch (err: any) {
      console.error('Failed loading dashboard data:', err);
      setFetchError(err.message || 'Unable to connect to warehouse API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          Loading Warehouse Dashboard...
        </div>
      </div>
    );
  }

  if (fetchError && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] p-6 text-center">
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-6 max-w-md w-full shadow-xs space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">Dashboard Unavailable</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {fetchError}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => loadDashboardData()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, rowStats, ordersByStatus, lowStockList, aiInsights } = data;

  // Pie chart colors
  const STATUS_COLORS: Record<string, string> = {
    Pending: '#3b82f6',
    Picking: '#f59e0b',
    'Ready for Dispatch': '#10b981',
    Dispatched: '#6b7280',
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Hero */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Live Operations Hub
            </span>
            <span className="text-xs text-slate-500 font-medium">Warehouse WH-01 • Automated Dynamic Slotting</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Smart Warehouse Inventory Command
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5 leading-relaxed">
            Real-time barcode inwarding, zero-error pick verification, and automated aisle cascading powered by MongoDB.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('scan')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs"
          >
            <ScanLine className="h-4 w-4" /> Scan / Inward Stock
          </button>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ClipboardList className="h-4 w-4 text-blue-600" /> View Orders ({summary.pendingOrders + summary.pickingOrders})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('warehouse')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Layers className="h-4 w-4 text-emerald-600" /> 2D Floor Plan & 3D Model
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Inventory Units */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Inventory</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{summary.totalInventoryUnits}</span>
            <span className="text-xs text-slate-500">units</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Across <strong className="text-slate-800">{summary.totalProducts} distinct SKUs</strong>
          </p>
        </div>

        {/* Warehouse Occupancy */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Warehouse Capacity</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">{summary.warehouseOccupancyRate}%</span>
            <span className="text-xs text-slate-500">utilized</span>
          </div>
          <div className="mt-1.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.warehouseOccupancyRate)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {summary.warehouseOccupancy} / {summary.warehouseCapacity} units ({summary.occupiedBins}/{summary.totalBins} bins)
          </p>
        </div>

        {/* Error Prevention & Accuracy */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Picking Accuracy</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600">100%</span>
            <span className="text-xs text-slate-500">accuracy</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            <strong className="text-rose-600">{summary.mispickAttemptsPrevented} mispicks</strong> intercepted by scanner
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Low Stock Watch</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-600">{summary.lowStockCount}</span>
            <span className="text-xs text-slate-500">items</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {summary.outOfStockCount > 0 ? (
              <span className="text-rose-600 font-semibold">{summary.outOfStockCount} out of stock</span>
            ) : (
              'All products currently restockable'
            )}
          </p>
        </div>
      </div>

      {/* Main Grid: Charts & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Aisle / Row Occupancy Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Warehouse Aisle Occupancy</h3>
              <p className="text-xs text-slate-500">Real-time load distribution across storage aisles</p>
            </div>
            <button
              onClick={() => onNavigate('warehouse')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Floor Plan <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-3 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rowStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="row" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} units`,
                    name === 'occupancy' ? 'Current Occupancy' : 'Total Capacity',
                  ]}
                />
                <Bar dataKey="capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="capacity" />
                <Bar dataKey="occupancy" fill="#10b981" radius={[4, 4, 0, 0]} name="occupancy" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-slate-200" />
              <span>Aisle Capacity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
              <span>Current Units Stored</span>
            </div>
          </div>
        </div>

        {/* Order Fulfillment Pipeline (Pie Chart) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-sm text-slate-900">Order Pipeline</h3>
            <p className="text-xs text-slate-500">Active fulfillment status across orders</p>
          </div>

          <div className="h-44 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {ordersByStatus.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5">
            {ordersByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[item.status] || '#64748b' }}
                  />
                  <span className="text-slate-600 truncate">{item.status}</span>
                </div>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Slotting & AI Insights Widget */}
      {aiInsights && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">StockPilot AI Inventory Advisory</h3>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                {aiInsights.source}
              </span>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Detailed Analytics →
            </button>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{aiInsights.summary}</p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                Throughput Recommendation
              </span>
              <p className="text-xs text-slate-600">{aiInsights.throughputTip}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                Dynamic Slotting Strategy
              </span>
              <p className="text-xs text-slate-600">{aiInsights.slottingAdvice[0]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Grid: Low Stock Warnings & Live Activity Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Watch */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900">Low Stock Items</h3>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Catalog ({summary.totalProducts}) →
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {lowStockList.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">All inventory levels are optimal.</p>
            ) : (
              lowStockList.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{item.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono">{item.sku}</span>
                      <span>•</span>
                      <span className="text-emerald-700 flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3" /> {item.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold border ${
                        item.status === 'out_of_stock'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {item.quantity} in stock (Min: {item.minimumStock})
                    </span>
                    <button
                      onClick={() => onNavigate('scan')}
                      className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-sm text-slate-900">Live Activity Stream</h3>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Full Audit Log →
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {activities.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No recent activity logged.</p>
            ) : (
              activities.map((act) => (
                <div
                  key={act._id}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                      act.severity === 'error'
                        ? 'bg-rose-100 text-rose-600'
                        : act.severity === 'warning'
                        ? 'bg-amber-100 text-amber-600'
                        : act.severity === 'success'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {act.severity === 'error' ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{act.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
