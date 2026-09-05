import React, { useState } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scan,
  Package,
  Truck,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IOrder, IOrderItem } from '../types.js';
import { api } from '../services/api.js';
import { CameraScannerModal } from './CameraScannerModal.js';
import { BarcodeRenderer } from './BarcodeRenderer.js';
import { playScanSuccessBeep, playScanErrorBuzzer, playScanCompleteChime } from '../utils/sound.js';

interface PickOrderModalProps {
  order: IOrder;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const PickOrderModal: React.FC<PickOrderModalProps> = ({
  order: initialOrder,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<IOrder>(initialOrder);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    status: 'success' | 'error' | null;
    message: string;
    details?: any;
  }>({ status: null, message: '' });

  // Update order when props change
  React.useEffect(() => {
    setOrder(initialOrder);
    // Focus on first unpicked item
    const firstUnpicked = initialOrder.items.findIndex((i) => !i.isPicked);
    setActiveItemIndex(firstUnpicked >= 0 ? firstUnpicked : 0);
    setVerificationFeedback({ status: null, message: '' });
  }, [initialOrder]);

  if (!isOpen) return null;

  const currentItem: IOrderItem | undefined = order.items[activeItemIndex];
  const allItemsPicked = order.items.every((i) => i.isPicked);

  const handleScanBarcode = async (scannedBarcode: string) => {
    if (!currentItem) return;

    setIsVerifying(true);
    setVerificationFeedback({ status: null, message: '' });

    try {
      const res = await api.pickOrderItem(order.orderId, {
        scannedBarcode,
        expectedBarcode: currentItem.barcode,
      });

      if (res.success && res.verified) {
        // SUCCESS VERIFICATION
        setVerificationFeedback({
          status: 'success',
          message: '✓ Product Verified! Correct item & location picked.',
          details: {
            item: currentItem.name,
            barcode: scannedBarcode,
            location: `${currentItem.location.row} → Bin ${currentItem.location.bin}`,
          },
        });

        // Update local order state
        if (res.order) {
          setOrder(res.order);
        } else {
          const updatedItems = [...order.items];
          updatedItems[activeItemIndex].isPicked = true;
          setOrder({ ...order, items: updatedItems });
        }

        if (res.allPicked) {
          playScanCompleteChime();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } else {
          playScanSuccessBeep();
        }

        // Auto advance to next unpicked item if available
        setTimeout(() => {
          const nextIndex = order.items.findIndex((item, idx) => idx !== activeItemIndex && !item.isPicked);
          if (nextIndex >= 0) {
            setActiveItemIndex(nextIndex);
            setVerificationFeedback({ status: null, message: '' });
          }
        }, 1800);

        onOrderUpdated();
      } else {
        // WRONG BARCODE / MISPICK PREVENTED
        playScanErrorBuzzer();
        setVerificationFeedback({
          status: 'error',
          message: res.message || 'Mispick Prevented! Scanned barcode does not match.',
          details: {
            expected: res.expected || { name: currentItem.name, barcode: currentItem.barcode },
            scanned: res.scanned || { barcode: scannedBarcode },
          },
        });
        onOrderUpdated();
      }
    } catch (err: any) {
      setVerificationFeedback({
        status: 'error',
        message: err.message || 'Verification failed. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDispatch = async () => {
    try {
      await api.dispatchOrder(order.orderId);
      onOrderUpdated();
      onClose();
    } catch (err: any) {
      alert(`Dispatch error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900">ORDER #{order.orderId}</h2>
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border ${
                    order.status === 'Ready for Dispatch'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : order.status === 'Picking'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {order.status}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                  {order.priority} Priority
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: <strong className="text-slate-800">{order.customerName}</strong> • {order.destination}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Order Items Tab Selector */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Order Line Items ({order.items.filter((i) => i.isPicked).length}/{order.items.length} Picked)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {order.items.map((item, idx) => {
                const isCurrent = idx === activeItemIndex;
                return (
                  <button
                    key={item.barcode + idx}
                    type="button"
                    onClick={() => {
                      setActiveItemIndex(idx);
                      setVerificationFeedback({ status: null, message: '' });
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30'
                        : item.isPicked
                        ? 'border-slate-200 bg-slate-50 text-slate-400'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                          item.isPicked
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600 font-mono text-xs font-bold'
                        }`}
                      >
                        {item.isPicked ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${item.isPicked ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Qty: {item.quantity} • {item.location.row} → {item.location.bin}
                        </p>
                      </div>
                    </div>
                    {item.isPicked && (
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Picked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Item Picking Directive (Hero Card) */}
          {currentItem && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-xs relative overflow-hidden">
              {/* Location Guidance Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg bg-white border border-slate-200 p-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <MapPin className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Warehouse Location Directive
                    </span>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Go to {currentItem.location.row} → <span className="text-emerald-700">Bin {currentItem.location.bin}</span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-700">
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  Pick Qty: <strong className="text-slate-900 font-bold">{currentItem.quantity} units</strong>
                </div>
              </div>

              {/* Item Details and Barcode Target */}
              <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-medium">Target Product</span>
                  <h4 className="text-sm font-bold text-slate-900">{currentItem.name}</h4>
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono">
                    <span>SKU: <strong className="text-slate-700">{currentItem.sku}</strong></span>
                    <span>Expected: <strong className="text-emerald-700">{currentItem.barcode}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end justify-center p-2 rounded bg-white border border-slate-200 shadow-xs">
                  <BarcodeRenderer value={currentItem.barcode} width={160} height={36} showText={true} />
                </div>
              </div>

              {/* Verification Feedback Banner */}
              {verificationFeedback.status === 'success' && (
                <div className="mt-3.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">{verificationFeedback.message}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Matched barcode {verificationFeedback.details?.barcode}. Inventory and bin occupancy automatically updated in MongoDB.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {verificationFeedback.status === 'error' && (
                <div className="mt-3.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900 animate-in shake duration-200">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-rose-800">{verificationFeedback.message}</p>
                      <div className="rounded bg-white p-2 text-xs text-rose-800 border border-rose-200 font-mono">
                        <p>Expected Product: <strong className="text-slate-900">{verificationFeedback.details?.expected?.name}</strong> ({verificationFeedback.details?.expected?.barcode})</p>
                        <p>Scanned Product: <strong className="text-amber-700">{verificationFeedback.details?.scanned?.name || 'Wrong SKU'}</strong> ({verificationFeedback.details?.scanned?.barcode})</p>
                      </div>
                      <p className="text-[10px] text-rose-700">
                        Item pick blocked. StockPilot prevents shipping errors by requiring an exact barcode scan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Action Trigger Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={currentItem.isPicked || isVerifying}
                  onClick={() => setIsScannerOpen(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-xs"
                >
                  <Zap className="h-4 w-4 text-emerald-200" />
                  {currentItem.isPicked ? '✓ Item Already Picked' : 'Auto-Scan Barcode with Camera'}
                </button>

                {/* Quick test actions */}
                {!currentItem.isPicked && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleScanBarcode(currentItem.barcode)}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs"
                      title="Simulates scanning the correct barcode instantly"
                    >
                      Quick Correct Scan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScanBarcode('8901001002')}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors shadow-xs"
                      title="Simulates scanning the WRONG barcode to demonstrate error interception"
                    >
                      Test Mispick Error
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Completion & Dispatch Section */}
          {allItemsPicked && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-xs">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-1.5 border border-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">All Items Successfully Picked!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-0.5 mb-3">
                All order line items have been barcode-verified and deducted from inventory. Order is staged at packing bay.
              </p>
              {order.status !== 'Dispatched' ? (
                <button
                  type="button"
                  onClick={handleDispatch}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                >
                  <Truck className="h-4 w-4" /> Dispatch Order to Carrier
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                  <Truck className="h-4 w-4" /> Order Handed Over & Dispatched
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">
          <span>Picking Accuracy Guard: Active</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* Embedded Camera Scanner Modal */}
      {currentItem && (
        <CameraScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScanBarcode}
          title={`Scan Product: ${currentItem.name}`}
          expectedBarcode={currentItem.barcode}
          expectedProductName={currentItem.name}
        />
      )}
    </div>
  );
};
