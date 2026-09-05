import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Warehouse,
  MapPin,
  CheckCircle2,
  Truck,
  ArrowRight,
  Package,
  Phone,
  Barcode,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Filter,
  Check,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IDeliveryDateTask, IDeliveryPartner } from '../types.js';
import { api } from '../services/api.js';

interface DatewiseDeliveryTaskbarProps {
  currentPartner?: IDeliveryPartner | null;
  onTaskUpdated?: () => void;
}

export const DatewiseDeliveryTaskbar: React.FC<DatewiseDeliveryTaskbarProps> = ({
  currentPartner,
  onTaskUpdated,
}) => {
  const [tasks, setTasks] = useState<IDeliveryDateTask[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    totalToday: 0,
    totalTomorrow: 0,
    totalUpcoming: 0,
    readyForPickup: 0,
    inTransit: 0,
    delivered: 0,
    completionRate: 0,
  });
  const [activeDateFilter, setActiveDateFilter] = useState<'today' | 'tomorrow' | 'upcoming' | 'all'>('today');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getDatewiseDeliveryTasks({
        dateFilter: activeDateFilter === 'all' ? undefined : activeDateFilter,
        warehouseId: selectedWarehouseFilter === 'ALL' ? undefined : selectedWarehouseFilter,
        partnerId: currentPartner?.partnerId,
      });

      if (res.success) {
        setTasks(res.tasks);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load datewise delivery tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [activeDateFilter, selectedWarehouseFilter, currentPartner]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingTaskId(orderId);
    try {
      const res = await api.updateDeliveryTaskStatus(orderId, {
        status: newStatus,
        partnerName: currentPartner?.name || 'Assigned Driver',
      });
      if (res.success) {
        if (newStatus === 'Dispatched') {
          confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
        await loadTasks();
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Datewise Taskbar Header & Filter Strip */}
      <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Calendar className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Date-wise Warehouse Pickup & Delivery Schedule
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact warehouse collection bays, product bin coordinates & customer destination timeline
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTasks}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Date Timeline Filter Tabs (The requested Datewise Taskbar!) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-700/60">
          {/* Today Button */}
          <button
            type="button"
            onClick={() => setActiveDateFilter('today')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
              activeDateFilter === 'today'
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-sm'
                : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Today's Tasks</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                activeDateFilter === 'today' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {summary.totalToday}
            </span>
          </button>

          {/* Tomorrow Button */}
          <button
            type="button"
            onClick={() => setActiveDateFilter('tomorrow')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
              activeDateFilter === 'tomorrow'
                ? 'border-blue-500 bg-blue-500/15 text-blue-300 shadow-sm'
                : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span>Tomorrow</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                activeDateFilter === 'tomorrow' ? 'bg-blue-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {summary.totalTomorrow}
            </span>
          </button>

          {/* Upcoming Button */}
          <button
            type="button"
            onClick={() => setActiveDateFilter('upcoming')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
              activeDateFilter === 'upcoming'
                ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-sm'
                : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Upcoming Dates</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                activeDateFilter === 'upcoming' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {summary.totalUpcoming}
            </span>
          </button>

          {/* All Dates Button */}
          <button
            type="button"
            onClick={() => setActiveDateFilter('all')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
              activeDateFilter === 'all'
                ? 'border-slate-500 bg-slate-700 text-white shadow-sm'
                : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span>All Scheduled</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                activeDateFilter === 'all' ? 'bg-slate-200 text-slate-900 font-black' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {summary.total}
            </span>
          </button>
        </div>

        {/* Task Progress Summary Meter */}
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">
              Fleet Delivery Completion Meter ({summary.delivered} of {summary.total} orders completed)
            </span>
            <span className="font-mono font-bold text-emerald-400">{summary.completionRate}% Done</span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Ready for Pickup: <strong className="text-white">{summary.readyForPickup}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span>In Transit: <strong className="text-white">{summary.inTransit}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Delivered: <strong className="text-white">{summary.delivered}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* TASK CARDS LIST: ALL THE NECESSARY DETAILS */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
          Loading scheduled warehouse pickup and delivery tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-8 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Tasks Scheduled for this Date Window</h3>
          <p className="text-xs text-slate-400">
            Check other dates using the taskbar above, or refresh for live order dispatches.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {tasks.map((task) => {
            const isPicked = task.status === 'Ready for Dispatch' || task.status === 'Dispatched';
            const isDispatched = task.status === 'Dispatched';
            const scheduledDate = new Date(task.scheduledDate);

            return (
              <div
                key={task.taskId}
                className={`rounded-2xl border bg-slate-800/90 p-4 sm:p-5 shadow-lg space-y-3.5 transition-all ${
                  isDispatched
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : isPicked
                    ? 'border-blue-500/40 bg-blue-950/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                {/* Header: Order ID, Time Window, Priority */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-black text-white">{task.orderId}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        task.priority === 'Express'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : task.priority === 'High'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {task.priority} Priority
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.dayCategory === 'today'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : task.dayCategory === 'tomorrow'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {task.dayCategory === 'today'
                        ? 'Today'
                        : task.dayCategory === 'tomorrow'
                        ? 'Tomorrow'
                        : scheduledDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="h-3.5 w-3.5 text-amber-400" /> Slot: {task.pickupTimeSlot}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        isDispatched
                          ? 'bg-emerald-500 text-slate-950'
                          : isPicked
                          ? 'bg-blue-500 text-white'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* 2-Column: Warehouse Collection & Customer Destination */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Collection Warehouse Details */}
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Warehouse className="h-3.5 w-3.5" /> Collect from Warehouse
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-300">
                        {task.warehouseId}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white">{task.warehouseName}</div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>Dock Collection Gate 4 • Loading Bay</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Delivery Details */}
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Deliver to Customer
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-400" /> {task.customerPhone}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white">{task.customerName}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{task.destination}</div>
                  </div>
                </div>

                {/* Products to Collect with Storage Row/Bin Location Guides */}
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Products to Collect ({task.totalItems} Items)</span>
                    <span>Bin Slot Location Guide</span>
                  </div>

                  <div className="divide-y divide-slate-800/80">
                    {task.items.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-blue-400" />
                          <span className="font-semibold text-white">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">({item.barcode})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                            {item.locationGuide}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Handlers */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400">
                    Assigned Driver: <strong className="text-slate-200">{task.assignedPartnerName}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status === 'Pending' || task.status === 'Picking' ? (
                      <button
                        type="button"
                        disabled={updatingTaskId === task.orderId}
                        onClick={() => handleUpdateStatus(task.orderId, 'Ready for Dispatch')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50"
                      >
                        <Package className="h-3.5 w-3.5" />
                        {updatingTaskId === task.orderId ? 'Updating...' : 'Confirm Items Collected'}
                      </button>
                    ) : task.status === 'Ready for Dispatch' ? (
                      <button
                        type="button"
                        disabled={updatingTaskId === task.orderId}
                        onClick={() => handleUpdateStatus(task.orderId, 'Dispatched')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {updatingTaskId === task.orderId ? 'Completing...' : 'Mark Delivered to Customer'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Delivery Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
