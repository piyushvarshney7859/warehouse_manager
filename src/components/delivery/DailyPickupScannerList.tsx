import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode as BarcodeIcon,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Package,
  MapPin,
  Clock,
  Search,
  Camera,
  CheckCheck,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  Phone,
  User,
  ShieldCheck,
  ChevronRight,
  Calendar,
  Compass,
  Footprints,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../../services/api.js';
import { IPartnerPickupItem, IDeliveryPartner } from '../../types.js';

interface DailyPickupScannerListProps {
  partner: IDeliveryPartner | null;
  onPickupConfirmed?: (data: any) => void;
  onLocateInsideWarehouse?: (item: IPartnerPickupItem) => void;
  onPickupsLoaded?: (items: IPartnerPickupItem[]) => void;
}

export const DailyPickupScannerList: React.FC<DailyPickupScannerListProps> = ({
  partner,
  onPickupConfirmed,
  onLocateInsideWarehouse,
  onPickupsLoaded,
}) => {
  const [pickups, setPickups] = useState<IPartnerPickupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Barcode / QR scanning state
  const [scannedInput, setScannedInput] = useState('');
  const [selectedOrderForScan, setSelectedOrderForScan] = useState<IPartnerPickupItem | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  // Camera QR/Barcode Scanner Modal State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerId = 'qr-barcode-reader-container';

  // Fetch assigned pickups for this delivery partner
  const fetchAssignedPickups = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAssignedPickups({
        partnerId: partner?.partnerId || 'DP-101',
        phone: partner?.phone,
      });
      if (res.success) {
        const items = res.pickups || [];
        setPickups(items);
        onPickupsLoaded?.(items);
      }
    } catch (err) {
      console.error('Failed to fetch assigned pickups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedPickups();
  }, [partner?.partnerId]);

  // Audio confirmation beep
  const playBeep = (type: 'success' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  };

  // Process Barcode or QR Code confirmation
  const handleConfirmPickup = async (barcodeToConfirm: string, orderId?: string) => {
    if (!barcodeToConfirm || !barcodeToConfirm.trim()) return;

    setIsProcessingScan(true);
    setScanFeedback(null);

    try {
      const res = await api.confirmBarcodePickup({
        barcode: barcodeToConfirm.trim(),
        orderId: orderId || selectedOrderForScan?.orderId,
        partnerId: partner?.partnerId || 'DP-101',
        partnerName: partner?.name || 'Ramesh Kumar',
        partnerPhone: partner?.phone || '9876543210',
      });

      if (res.success) {
        playBeep('success');
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });

        setScanFeedback({
          type: 'success',
          message: `✓ Pickup Confirmed for ${res.item?.name || 'Item'}!`,
          details: `Space added to vacant data: +${res.freedSpace} units free in Bin ${res.binCode}. Warehouse Vacancy: ${res.newWarehouseVacancy} units.`,
        });

        // Clear input and modal
        setScannedInput('');
        setSelectedOrderForScan(null);

        // Stop camera if active
        if (isCameraActive) {
          stopCamera();
        }

        // Refresh pickups
        await fetchAssignedPickups();

        if (onPickupConfirmed) {
          onPickupConfirmed(res);
        }
      } else {
        playBeep('error');
        setScanFeedback({
          type: 'error',
          message: res.message || 'Pickup confirmation failed. Barcode does not match.',
        });
      }
    } catch (err: any) {
      playBeep('error');
      setScanFeedback({
        type: 'error',
        message: err.message || 'Error processing pickup confirmation',
      });
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Initialize html5-qrcode camera scanner
  const startCamera = () => {
    setIsCameraActive(true);
    setScanFeedback(null);

    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          scannerContainerId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            console.log('QR/Barcode scanned:', decodedText);
            handleConfirmPickup(decodedText);
          },
          (error) => {
            // benign frame-by-frame error
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        console.error('Error starting scanner:', err);
      }
    }, 150);
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Filtered pickups list
  const filteredPickups = pickups.filter((item) => {
    const matchesFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending'
        ? !item.isPicked
        : item.isPicked;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.productName.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.barcode.toLowerCase().includes(query) ||
      item.orderId.toLowerCase().includes(query) ||
      item.customerName.toLowerCase().includes(query) ||
      item.location.bin.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = pickups.filter((p) => !p.isPicked).length;
  const completedCount = pickups.filter((p) => p.isPicked).length;

  return (
    <section className="space-y-4">
      {/* Header & Scanning Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
                <QrCode className="h-4 w-4" />
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Daily Pickup Manifest & Barcode Confirmation
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              List of products assigned by the warehouse owner for daily pickup. Scan QR code or barcode to confirm pickup and free bin space.
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-700 block">Pending Pickup</span>
              <span className="text-base font-black">{pendingCount}</span> items
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 block">Picked & Dispatched</span>
              <span className="text-base font-black">{completedCount}</span> items
            </div>
            <button
              type="button"
              onClick={fetchAssignedPickups}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh pickup assignments"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Barcode Scanner Input & Camera Launch */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <BarcodeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={scannedInput}
              onChange={(e) => setScannedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && scannedInput.trim()) {
                  handleConfirmPickup(scannedInput);
                }
              }}
              placeholder="Scan Barcode / QR Code or enter number (press Enter)..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs font-mono font-medium placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => handleConfirmPickup(scannedInput)}
            disabled={!scannedInput.trim() || isProcessingScan}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4 text-emerald-400" />
            <span>Confirm Scan</span>
          </button>

          <button
            type="button"
            onClick={startCamera}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-900 transition-all shadow-xs"
          >
            <Camera className="h-4 w-4 text-emerald-600" />
            <span>Open Camera Scanner</span>
          </button>
        </div>

        {/* Scan Feedback Banner */}
        {scanFeedback && (
          <div
            className={`mt-3 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              scanFeedback.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-rose-300 bg-rose-50 text-rose-950'
            }`}
          >
            {scanFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-black">{scanFeedback.message}</div>
              {scanFeedback.details && (
                <div className="text-[11px] opacity-90 mt-0.5 font-medium">
                  {scanFeedback.details}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Camera Scanner Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Scan Product QR Code / Barcode
                </h3>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Close (✕)
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Point your device camera at the item's barcode or box QR label. Pickup will confirm automatically upon recognition.
            </p>

            <div
              id={scannerContainerId}
              className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-950"
            />

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Products ({pickups.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterStatus === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            To Pick Up ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterStatus === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Confirmed Pickups ({completedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product, SKU, bin..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Pickup Products Cards Grid */}
      {filteredPickups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Package className="mx-auto h-9 w-9 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Pickup Tasks Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {filterStatus === 'pending'
              ? 'All daily products assigned to you have been picked up and confirmed!'
              : 'The warehouse owner has not assigned any pending products for pickup yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPickups.map((item) => {
            const isConfirmed = item.isPicked;

            return (
              <div
                key={item.uniqueId}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isConfirmed
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar: Order & Warehouse Slot Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.orderId}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {item.scheduledDateStr} • {item.pickupTimeSlot}
                      </span>
                    </div>

                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Picked Up
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        <Clock className="h-3 w-3 text-amber-600" />
                        Scan Required
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-950 leading-snug">
                        {item.productName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                        <span>SKU: <strong className="font-mono text-slate-700">{item.sku}</strong></span>
                        <span>•</span>
                        <span>Qty: <strong className="text-slate-900 font-bold">{item.quantity} units</strong></span>
                      </div>
                    </div>

                    {/* Warehouse Bin Location Tag */}
                    <div className="shrink-0 text-right flex flex-col items-end gap-1">
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-center shadow-xs">
                        <div className="text-[9px] uppercase font-black tracking-wider text-emerald-800">
                          {item.location.row}
                        </div>
                        <div className="font-mono text-xs font-black text-emerald-950">
                          Bin {item.location.bin}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onLocateInsideWarehouse?.(item)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/60 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                        title="Show location on Inside Warehouse Map"
                      >
                        <Compass className="h-3 w-3" />
                        <span>Indoor Route</span>
                      </button>
                    </div>
                  </div>

                  {/* Barcode representation */}
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarcodeIcon className="h-5 w-5 text-slate-700" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Product Barcode</div>
                        <div className="font-mono text-xs font-black text-slate-900">
                          {item.barcode}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setScannedInput(item.barcode);
                        handleConfirmPickup(item.barcode, item.orderId);
                      }}
                      disabled={isConfirmed || isProcessingScan}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline disabled:opacity-40 disabled:no-underline"
                    >
                      {isConfirmed ? 'Scanned' : 'Quick Verify'}
                    </button>
                  </div>

                  {/* Customer Destination info */}
                  <div className="mt-2.5 text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="truncate">
                      To: <strong>{item.customerName}</strong> ({item.customerPhone}) • {item.destination}
                    </span>
                  </div>
                </div>

                {/* Card Footer: Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isConfirmed ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <span>Space added to vacant data (+{item.quantity} in Bin {item.location.bin})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onLocateInsideWarehouse?.(item)}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 shrink-0"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        <span>View Bin</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => onLocateInsideWarehouse?.(item)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800 transition-all shrink-0"
                        title="View path inside warehouse"
                      >
                        <Footprints className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Indoor Path</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmPickup(item.barcode, item.orderId)}
                        disabled={isProcessingScan}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white transition-all shadow-xs"
                      >
                        <BarcodeIcon className="h-4 w-4" />
                        <span>Scan & Confirm Pickup (Freed Space: +{item.quantity})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
