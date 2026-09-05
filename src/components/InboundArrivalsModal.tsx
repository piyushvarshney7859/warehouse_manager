import React, { useState, useEffect } from 'react';
import {
  Truck,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowDownToLine,
  Boxes,
  Factory,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { IInboundShipment } from '../types.js';
import { api } from '../services/api.js';

interface InboundArrivalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockReceived?: () => void;
}

export const InboundArrivalsModal: React.FC<InboundArrivalsModalProps> = ({
  isOpen,
  onClose,
  onStockReceived,
}) => {
  const [shipments, setShipments] = useState<IInboundShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const res = await api.getInboundShipments();
      if (res.success) {
        setShipments(res.shipments);
      }
    } catch (err) {
      console.error('Failed to load inbound arrivals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShipments();
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleReceiveStock = async (shipment: IInboundShipment) => {
    setReceivingId(shipment._id);
    setSuccessMsg(null);
    try {
      const res = await api.receiveInboundShipment(shipment._id, {
        receiverName: 'Warehouse',
      });
      if (res.success) {
        const binNotice = res.allocation
          ? `Slotted ${shipment.quantity} units into ${res.allocation.row} → ${res.allocation.binCode}`
          : 'Stock slotted into warehouse storage';
        setSuccessMsg(`Shipment ${shipment.shipmentId} received! ${binNotice}. Inventory updated!`);
        await loadShipments();
        if (onStockReceived) {
          onStockReceived();
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error receiving shipment');
    } finally {
      setReceivingId(null);
    }
  };

  if (!isOpen) return null;

  // Group by arrival timing
  const today = new Date();
  const todayStr = today.toDateString();

  const arrivingToday = shipments.filter(
    (s) => new Date(s.expectedArrivalDate).toDateString() === todayStr && s.status !== 'Received'
  );
  const upcomingShipments = shipments.filter(
    (s) => new Date(s.expectedArrivalDate).toDateString() !== todayStr && s.status !== 'Received'
  );
  const receivedShipments = shipments.filter((s) => s.status === 'Received');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Incoming Stock Arrival Schedule (Manufacturer Portal Link)
              </h3>
              <p className="text-xs text-slate-400">
                Connection portal with manufacturers: Track when new production batches arrive and intake them to bins
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-500" />
            Loading incoming shipment calendar...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Arriving Today */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Scheduled for Arrival Today ({arrivingToday.length})
                </span>
                <span className="text-[11px] text-slate-400">Receiving Bay Priority</span>
              </div>

              {arrivingToday.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-center text-xs text-slate-500">
                  No shipments scheduled for arrival today.
                </div>
              ) : (
                <div className="space-y-2">
                  {arrivingToday.map((s) => (
                    <div
                      key={s._id}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-950/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{s.shipmentId}</span>
                          <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-sm">
                            Arriving Today
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            Carrier: {s.carrierName}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-200">
                          {s.quantity}x {s.productName} <span className="text-slate-400 font-mono">(SKU: {s.sku})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Factory className="h-3 w-3 text-slate-500" />
                          <span>Manufacturer: {s.manufacturerName}</span>
                          <span className="text-slate-600">•</span>
                          <span>Target: {s.targetWarehouseName}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={receivingId === s._id}
                        onClick={() => handleReceiveStock(s)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        {receivingId === s._id ? 'Allocating Bin...' : 'Receive & Slot into Bin'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Shipments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Future Incoming Shipments ({upcomingShipments.length})
                </span>
                <span className="text-[11px] text-slate-400">Datewise Pipeline</span>
              </div>

              {upcomingShipments.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-center text-xs text-slate-500">
                  No upcoming shipments in queue.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingShipments.map((s) => {
                    const arrivalDate = new Date(s.expectedArrivalDate);
                    return (
                      <div
                        key={s._id}
                        className="rounded-xl border border-slate-800 bg-slate-800/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white">{s.shipmentId}</span>
                            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-sm">
                              ETA: {arrivalDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {s.carrierName}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-200">
                            {s.quantity}x {s.productName} <span className="text-slate-400 font-mono">({s.sku})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>From: {s.manufacturerName}</span>
                            <span className="text-slate-600">•</span>
                            <span>Destination: {s.targetWarehouseName}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={receivingId === s._id}
                          onClick={() => handleReceiveStock(s)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-emerald-600 hover:border-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" /> Early Receiving
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recently Received History */}
            {receivedShipments.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Recently Received & Slotted Stock ({receivedShipments.length})
                </div>
                <div className="space-y-1.5">
                  {receivedShipments.slice(0, 3).map((s) => (
                    <div
                      key={s._id}
                      className="rounded-lg border border-slate-800 bg-slate-800/30 p-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-300">{s.shipmentId}</span>
                        <span className="text-slate-400 ml-2">
                          {s.quantity}x {s.productName}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono">
                        Slotted to {s.assignedBin || 'Storage Bin'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex justify-end border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            Close Calendar
          </button>
        </div>
      </div>
    </div>
  );
};
