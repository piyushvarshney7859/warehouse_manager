import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Barcode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  DollarSign,
  Hash,
  Upload,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { AutoBarcodeScanner } from './AutoBarcodeScanner.js';
import { BarcodeRenderer } from './BarcodeRenderer.js';
import { playScanSuccessBeep, playScanErrorBuzzer } from '../utils/sound.js';
import { decodeBarcodeFromImageFile } from '../utils/imageBarcodeDecoder.js';
import { IProduct, IAllocationResult } from '../types.js';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: IProduct, allocation: IAllocationResult) => void;
  initialBarcode?: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  initialBarcode = '',
}) => {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [quantity, setQuantity] = useState<number>(20);
  const [minimumStock, setMinimumStock] = useState<number>(10);
  const [unitPrice, setUnitPrice] = useState<number>(29.99);
  const [description, setDescription] = useState('');

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);
  const [existingConflict, setExistingConflict] = useState<string | null>(null);
  const [barcodeSavedSuccess, setBarcodeSavedSuccess] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialBarcode) {
        setBarcode(initialBarcode);
        setBarcodeSavedSuccess(true);
        if (!sku) setSku(`SKU-${initialBarcode.slice(-4).toUpperCase()}`);
      } else {
        // Automatically start camera if no barcode yet
        setIsCameraActive(true);
      }
    } else {
      setIsCameraActive(false);
      setExistingConflict(null);
      setBarcodeSavedSuccess(false);
    }
  }, [isOpen, initialBarcode]);

  if (!isOpen) return null;

  const handleBarcodeScanned = async (detectedCode: string) => {
    const clean = detectedCode.trim();
    if (!clean) return;

    setBarcode(clean);
    setBarcodeSavedSuccess(true);
    setIsCameraActive(false); // Stop camera to prevent repeatedly clearing user inputs
    playScanSuccessBeep();

    // Auto-generate SKU if blank
    if (!sku) {
      setSku(`SKU-${clean.slice(-4).toUpperCase()}`);
    }

    // Check if barcode already exists
    try {
      setIsCheckingBarcode(true);
      const res = await api.scanBarcode(clean);
      if (res.success && res.found && res.product) {
        setExistingConflict(
          `Notice: Barcode "${clean}" is already registered to "${res.product.name}" (${res.product.sku}) in bin ${res.product.location?.bin || 'unassigned'}.`
        );
      } else {
        setExistingConflict(null);
      }
    } catch {
      // Ignore lookup errors
    } finally {
      setIsCheckingBarcode(false);
    }

    // Focus product name
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await decodeBarcodeFromImageFile(file);
      if (result.success && result.barcode) {
        handleBarcodeScanned(result.barcode);
      } else {
        playScanErrorBuzzer();
        alert(result.message || 'Could not detect barcode from image. Please verify clarity and contrast.');
      }
    } catch (err: any) {
      playScanErrorBuzzer();
      alert('Error analyzing image: ' + (err.message || 'Please try another photo.'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcode.trim();
    const cleanName = name.trim();
    const cleanSku = sku.trim();

    if (!cleanBarcode) {
      alert('Please scan or enter a barcode number.');
      return;
    }
    if (!cleanName) {
      alert('Please enter a product name.');
      return;
    }
    if (!cleanSku) {
      alert('Please enter a SKU code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createProduct({
        barcode: cleanBarcode,
        name: cleanName,
        sku: cleanSku,
        category,
        quantity: Number(quantity),
        minimumStock: Number(minimumStock),
        unitPrice: Number(unitPrice),
        description,
      });

      if (res.success && res.product && res.allocation) {
        playScanSuccessBeep();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        onProductCreated(res.product, res.allocation);
        onClose();
      } else {
        playScanErrorBuzzer();
        alert(res.message || 'Failed creating product.');
      }
    } catch (err: any) {
      playScanErrorBuzzer();
      alert('Error registering product: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickDemoBarcodes = [
    { label: 'Unregistered Barcode 1', code: '8901001099' },
    { label: 'Unregistered Barcode 2', code: '8901001088' },
    { label: 'Unregistered Barcode 3', code: '8901001077' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6 text-slate-100 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                  Add Product & Smart Bin Slotting
                </h3>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Auto-Allocation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan barcode, add details, and automatically allocate optimal storage bin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Scrollable Area */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
          {/* STEP 1: BARCODE SCANNER SECTION */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Barcode className="h-4 w-4 text-emerald-400" />
                Step 1: Barcode Number *
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    isCameraActive
                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {isCameraActive ? 'Close Camera' : 'Scan with Camera'}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload Image
                </button>
              </div>
            </div>

            {/* Live Camera Viewfinder when open */}
            {isCameraActive && (
              <div className="space-y-2 animate-in zoom-in-95 duration-150">
                <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Frame barcode in camera and click "Capture & Read Barcode" to save.
                </div>
                <AutoBarcodeScanner
                  id="add-product-camera-viewfinder"
                  isActive={isCameraActive}
                  onDetected={handleBarcodeScanned}
                  height={220}
                  showControls={true}
                  showQuickBarcodes={false}
                />
              </div>
            )}

            {/* Barcode Input & Saved Status Indicator */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    setBarcodeSavedSuccess(false);
                  }}
                  placeholder="Scan or enter barcode (e.g. 8901001099)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {barcodeSavedSuccess && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" /> Saved to Product
                  </span>
                )}
              </div>

              {barcode && (
                <div className="shrink-0 bg-white p-1 rounded border border-slate-700 flex items-center justify-center">
                  <BarcodeRenderer value={barcode} height={32} showText={false} />
                </div>
              )}
            </div>

            {/* Quick Demo Barcode Pickers */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Quick Test Codes:
              </span>
              {quickDemoBarcodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleBarcodeScanned(item.code)}
                  className="rounded border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[11px] font-mono text-slate-300 hover:border-emerald-500 hover:text-emerald-300 transition-colors"
                >
                  {item.code}
                </button>
              ))}
            </div>

            {/* Existing Barcode Warning if duplicate */}
            {existingConflict && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{existingConflict}</span>
              </div>
            )}
          </div>

          {/* STEP 2: ADDITIONAL PRODUCT DETAILS FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                Step 2: Additional Product Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ergonomic Dual Monitor Mount"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* SKU Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="e.g. ACC-MNT-09"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 font-mono text-xs uppercase text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Audio">Audio</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Office">Office</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Home">Home</option>
                  </select>
                </div>

                {/* Initial Inward Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Low Stock Alert Threshold */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Warehouse Notes / Location Hint
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Heavy item, prefer lower shelves"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Smart Slotting Notice */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-200">Autonomous Bin Routing:</strong>
                <span>
                  {' '}
                  Upon saving, StockPilot automatically analyzes aisle capacities and routes this product
                  to the optimal row & bin (e.g. Row A, B, or creates a new Aisle).
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !barcode.trim() || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                {isSubmitting ? 'Allocating Bin & Saving...' : 'Save Product & Run Smart Slotting'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
