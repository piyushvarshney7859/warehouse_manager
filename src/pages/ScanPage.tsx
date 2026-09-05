import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Scan,
  Package,
  MapPin,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  KeyRound,
  RefreshCw,
  Info,
  Upload,
  X,
  FileImage,
  ZoomIn,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import { IProduct, IBin, IAllocationResult } from '../types.js';
import { api } from '../services/api.js';
import { CameraScannerModal } from '../components/CameraScannerModal.js';
import { AutoBarcodeScanner } from '../components/AutoBarcodeScanner.js';
import { BarcodeRenderer } from '../components/BarcodeRenderer.js';
import { playScanSuccessBeep, playScanErrorBuzzer } from '../utils/sound.js';
import { decodeBarcodeFromImageFile, BarcodeDecodeResult } from '../utils/imageBarcodeDecoder.js';
import { Zap } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAutoScannerActive, setIsAutoScannerActive] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(true);
  const [autoDetectOnType, setAutoDetectOnType] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isInwarding, setIsInwarding] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Uploaded Image State
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    name: string;
    size: number;
    barcode?: string;
  } | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [unrecognizedModal, setUnrecognizedModal] = useState<{
    isOpen: boolean;
    dataUrl: string;
    fileName: string;
    enteredCode: string;
  } | null>(null);

  // Scan Result State
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<IProduct | null>(null);
  const [assignedBin, setAssignedBin] = useState<IBin | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Inward existing product form state
  const [restockQty, setRestockQty] = useState<number>(10);
  const [incomingSerialNumber, setIncomingSerialNumber] = useState('');
  const [restockSuccess, setRestockSuccess] = useState<string | null>(null);

  // New product registration form state
  const [newBarcode, setNewBarcode] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newQty, setNewQty] = useState<number>(20);
  const [newMinStock, setNewMinStock] = useState<number>(10);
  const [newPrice, setNewPrice] = useState<number>(39.99);
  const [newDesc, setNewDesc] = useState('');
  const [allocationSuccess, setAllocationSuccess] = useState<IAllocationResult | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeFormInputRef = useRef<HTMLInputElement | null>(null);

  // Demo shortcut test barcodes & serial numbers
  const demoShortcuts = [
    { label: 'Wireless Mouse', code: '8901001001', type: 'Barcode', hint: 'Row B → Bin B04 (Existing SKU)' },
    { label: 'Mouse S/N Unit', code: 'SN-WM-8901-01', type: 'Serial No', hint: 'Serial Number lookup' },
    { label: 'Mechanical Keyboard', code: '8901001002', type: 'Barcode', hint: 'Row B → Bin B02 (Existing SKU)' },
    { label: 'Keyboard S/N Unit', code: 'SN-KB-8902-77', type: 'Serial No', hint: 'Serial Number lookup' },
    { label: 'USB-C Hub 7-in-1', code: '8901001003', type: 'Barcode', hint: 'Row A → Bin A01 (Existing SKU)' },
    { label: 'Unregistered Barcode', code: '8901001099', type: 'New Item', hint: 'Tests Smart Bin Allocation' },
  ];

  // Listen for USB handheld barcode scanner gun input
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 130) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          e.preventDefault();
          const scanned = buffer.trim();
          setBarcodeInput(scanned);
          handleLookupBarcode(scanned);
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smart Auto-Detect when typing or pasting standard barcodes (e.g. 8-14 digits or SKU-)
  useEffect(() => {
    if (!autoDetectOnType) return;
    const clean = barcodeInput.trim();
    if (clean.length >= 8 && clean.length <= 18 && clean !== scannedBarcode && !isSearching) {
      const timer = setTimeout(() => {
        handleLookupBarcode(clean);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [barcodeInput, autoDetectOnType, scannedBarcode, isSearching]);

  const handleAutoScannerDetected = (barcode: string, _format?: string, serialNumber?: string) => {
    setBarcodeInput(barcode);
    if (serialNumber) {
      setNewSerialNumber(serialNumber);
    }
    handleLookupBarcode(barcode);
    setIsAutoScannerActive(false);
  };

  const handleProcessImageFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (e.g. JPG, PNG, WEBP).');
      return;
    }

    setIsImageProcessing(true);
    setUploadFeedback({ type: 'info', message: `Analyzing "${file.name}" for barcodes...` });

    try {
      const result: BarcodeDecodeResult = await decodeBarcodeFromImageFile(file);

      setUploadedImage({
        url: result.dataUrl,
        name: result.fileName,
        size: result.fileSize,
        barcode: result.barcode,
      });

      if (result.success && (result.barcode || result.serialNumber)) {
        const detectedBarcode = result.barcode?.trim() || '';
        const detectedSerial = result.serialNumber?.trim() || '';
        const primaryCode = detectedBarcode || detectedSerial;

        playScanSuccessBeep();
        setBarcodeInput(primaryCode);
        setScannedBarcode(primaryCode);
        if (detectedBarcode) setNewBarcode(detectedBarcode);
        if (detectedSerial) setNewSerialNumber(detectedSerial);

        const feedbackMsg =
          detectedBarcode && detectedSerial
            ? `Extracted Barcode (${detectedBarcode}) & S/N (${detectedSerial}) from "${file.name}"!`
            : `Extracted ${detectedBarcode ? `Barcode ${detectedBarcode}` : `Serial Number ${detectedSerial}`} from "${file.name}"!`;

        setUploadFeedback({
          type: 'success',
          message: feedbackMsg,
        });

        if (result.labelHint && !newName) {
          setNewName(result.labelHint);
        }

        // Trigger instant identification & inwarding lookup
        handleLookupBarcode(primaryCode);
      } else {
        // Image was readable, but barcode algorithm couldn't unambiguously resolve it
        playScanErrorBuzzer();
        setUploadFeedback({
          type: 'warning',
          message: `Could not automatically detect barcode or serial number in "${file.name}". You can review the photo and confirm the digits directly.`,
        });

        setUnrecognizedModal({
          isOpen: true,
          dataUrl: result.dataUrl,
          fileName: file.name,
          enteredCode: '',
        });
      }
    } catch (err: any) {
      console.warn('Image processing error:', err);
      playScanErrorBuzzer();
      setUploadFeedback({
        type: 'warning',
        message: 'Could not process image: ' + (err.message || 'Please ensure high clarity and contrast.'),
      });
    } finally {
      setIsImageProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDirectImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handleLookupBarcode = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setIsSearching(true);
    setScannedBarcode(cleanCode);

    // If the input matches serial number format, also populate newSerialNumber
    const isSerialHint =
      /^(SN|S\/N|SER|IMEI|MAC|REF|ID|LOT)/i.test(cleanCode) ||
      (/[a-zA-Z]/i.test(cleanCode) && /\d/.test(cleanCode) && cleanCode.length >= 5);

    if (isSerialHint) {
      setNewSerialNumber(cleanCode);
      if (!newBarcode) setNewBarcode(cleanCode);
    } else {
      setNewBarcode(cleanCode);
    }

    setRestockSuccess(null);
    setAllocationSuccess(null);

    try {
      const res = await api.scanBarcode(cleanCode);
      if (res.success && res.found && res.product) {
        playScanSuccessBeep();
        setFoundProduct(res.product);
        setAssignedBin(res.bin || null);
        setIsNewProduct(false);
      } else {
        // Barcode or Serial Number is not yet registered in system
        playScanSuccessBeep();
        setFoundProduct(null);
        setAssignedBin(null);
        setIsNewProduct(true);

        // Turn off live camera auto-scanner so it doesn't repeatedly scan and clear user input
        setIsAutoScannerActive(false);
        setIsCameraOpen(false);

        // Set suggested SKU if not already customized
        setNewSku((prev) => (prev ? prev : `SKU-${cleanCode.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'ITEM'}`));

        // Scroll to form and focus Product Name field
        setTimeout(() => {
          document.getElementById('new-product-registration-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          nameInputRef.current?.focus();
        }, 150);
      }
    } catch (err: any) {
      playScanErrorBuzzer();
      alert('Error querying code: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInwardExisting = async () => {
    if (!foundProduct || !scannedBarcode || restockQty <= 0) return;

    setIsInwarding(true);
    setRestockSuccess(null);
    try {
      const res = await api.inwardStock({
        barcode: scannedBarcode,
        serialNumber: incomingSerialNumber.trim() || undefined,
        quantity: Number(restockQty),
      });

      if (res.success && res.product) {
        setFoundProduct(res.product);
        const serialMsg = incomingSerialNumber.trim() ? ` with S/N: ${incomingSerialNumber.trim()}` : '';
        setRestockSuccess(
          `Successfully inwarded ${restockQty} unit(s)${serialMsg}! New quantity is ${res.product.quantity} units.`
        );
        setIncomingSerialNumber('');
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        // refresh bin
        const scanRes = await api.scanBarcode(scannedBarcode);
        if (scanRes.bin) setAssignedBin(scanRes.bin);
      }
    } catch (err: any) {
      alert('Inward error: ' + err.message);
    } finally {
      setIsInwarding(false);
    }
  };

  const handleRegisterNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcodeToSave = (newBarcode || newSerialNumber || scannedBarcode || '').trim();
    if (!barcodeToSave) {
      alert('Please scan or enter a barcode number or serial number.');
      barcodeFormInputRef.current?.focus();
      return;
    }
    if (!newName.trim()) {
      alert('Please enter a product name.');
      nameInputRef.current?.focus();
      return;
    }
    if (!newSku.trim()) {
      alert('Please enter a SKU code.');
      return;
    }

    setIsInwarding(true);
    try {
      const res = await api.createProduct({
        barcode: barcodeToSave,
        serialNumber: newSerialNumber.trim() || undefined,
        name: newName.trim(),
        sku: newSku.trim(),
        category: newCategory,
        quantity: Number(newQty),
        minimumStock: Number(newMinStock),
        unitPrice: Number(newPrice),
        description: newDesc,
      });

      if (res.success && res.product && res.allocation) {
        setFoundProduct(res.product);
        setAllocationSuccess(res.allocation);
        setIsNewProduct(false);
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
        });
        // refresh bin
        const scanRes = await api.scanBarcode(barcodeToSave);
        if (scanRes.bin) setAssignedBin(scanRes.bin);
      } else {
        alert(res.message || 'Product creation failed.');
      }
    } catch (err: any) {
      alert('Registration error: ' + err.message);
    } finally {
      setIsInwarding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Intake & Receiving Bay
            </span>
            <span className="text-xs text-slate-500 font-medium">Barcode Scanning & Smart Slotting</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Scan & Inward Inventory
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5 leading-relaxed">
            Scan any barcode using your camera or enter manually. The smart allocation engine identifies the item,
            checks aisle occupancy, and routes it to the optimal storage bin automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsNewProduct(true);
              const code = barcodeInput.trim() || '';
              if (code) {
                setNewBarcode(code);
                setScannedBarcode(code);
                if (!newSku) setNewSku(`SKU-${code.slice(-4).toUpperCase()}`);
              }
              setTimeout(() => {
                document.getElementById('new-product-registration-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (!code) {
                  barcodeFormInputRef.current?.focus();
                } else {
                  nameInputRef.current?.focus();
                }
              }, 100);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4 text-emerald-600" />
            + Add New Product Form
          </button>
        </div>
      </div>

      {/* Main Barcode Intake & Auto-Detection Bay */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border p-4 sm:p-5 shadow-xs space-y-4 transition-all ${
          isDragOver
            ? 'border-dashed border-2 border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
            : 'border-slate-200 bg-white'
        }`}
      >
        {/* Drag & Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 rounded-xl bg-emerald-500/10 backdrop-blur-xs flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-600 animate-in fade-in duration-150">
            <Upload className="h-10 w-10 text-emerald-600 animate-bounce mb-2" />
            <p className="text-sm font-bold text-emerald-950">Drop photo here to scan barcode</p>
            <p className="text-xs text-emerald-700">PNG, JPG, WEBP formats supported</p>
          </div>
        )}

        {/* Camera Capture & Scanner Mode Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Optical Barcode & Serial Scanner
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              <Camera className="h-2.5 w-2.5" /> Capture to Read
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoScannerActive(!isAutoScannerActive)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isAutoScannerActive
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              {isAutoScannerActive ? 'Close Camera View' : '📸 Open Camera Scanner'}
            </button>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Full Modal View
            </button>
          </div>
        </div>

        {/* Embedded Live Camera Viewport */}
        {isAutoScannerActive && (
          <div className="space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Live Camera Active — Frame barcode and click "CAPTURE & READ BARCODE"
              </span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={isContinuousMode}
                  onChange={(e) => setIsContinuousMode(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                Continuous Mode
              </label>
            </div>

            <AutoBarcodeScanner
              id="stockpilot-page-inline-scanner"
              isActive={isAutoScannerActive}
              onDetected={handleAutoScannerDetected}
              continuous={isContinuousMode}
              onStop={() => setIsAutoScannerActive(false)}
              height={280}
              showControls={true}
              showQuickBarcodes={false}
            />
          </div>
        )}

        {/* Upload Status / Feedback Banner */}
        {uploadFeedback && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
              uploadFeedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : uploadFeedback.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-blue-200 bg-blue-50 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {uploadFeedback.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {uploadFeedback.type === 'warning' && <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
              {uploadFeedback.type === 'info' && <RefreshCw className="h-4 w-4 text-blue-600 animate-spin shrink-0" />}
              <span>{uploadFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadFeedback(null)}
              className="text-slate-400 hover:text-slate-700 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Uploaded Image Active Session Strip */}
        {uploadedImage && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={uploadedImage.url}
                alt="Uploaded barcode item"
                className="h-12 w-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-white shadow-xs"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">{uploadedImage.name}</span>
                  <span className="text-[10px] text-slate-500">({Math.round(uploadedImage.size / 1024)} KB)</span>
                  {uploadedImage.barcode && (
                    <span className="rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold px-1.5 py-0.5 border border-emerald-300">
                      ✓ Barcode: {uploadedImage.barcode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Package photo attached to this scan session.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shadow-xs"
              >
                Upload Different Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadedImage(null);
                  setUploadFeedback(null);
                }}
                className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                title="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Manual Barcode Search & Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleDirectImageUpload}
            className="hidden"
          />

          <button
            type="button"
            disabled={isImageProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            title="Upload a picture of a barcode from phone or file"
          >
            {isImageProcessing ? <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" /> : <Upload className="h-4 w-4 text-slate-500" />}
            {isImageProcessing ? 'Scanning Image...' : 'Upload Image'}
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLookupBarcode(barcodeInput);
              }}
              placeholder="Enter/paste Barcode, Serial Number (S/N), or SKU..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {barcodeInput && (
              <button
                type="button"
                onClick={() => setBarcodeInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!barcodeInput.trim() || isSearching}
            onClick={() => handleLookupBarcode(barcodeInput)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
          >
            {isSearching ? <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" /> : <Scan className="h-4 w-4" />}
            Lookup Barcode / S/N
          </button>
        </div>

        {/* Auto-detect typing helper indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" /> Auto-detection: Typing or pasting Barcodes or Serial Numbers triggers instant lookup.
          </span>
          <label className="inline-flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoDetectOnType}
              onChange={(e) => setAutoDetectOnType(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3 w-3"
            />
            Auto-trigger on type
          </label>
        </div>

        {/* Quick Sample Barcodes */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              Quick Test Barcodes (Click to Scan)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {demoShortcuts.map((demo) => (
              <button
                key={demo.code}
                type="button"
                onClick={() => {
                  setBarcodeInput(demo.code);
                  handleLookupBarcode(demo.code);
                }}
                className="flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-left hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-800">{demo.label}</span>
                <span className="font-mono text-xs text-emerald-700 font-semibold">{demo.code}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{demo.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULT 1: Existing Product Identified */}
      {foundProduct && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Product Identified
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Barcode: {foundProduct.barcode}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{foundProduct.name}</h2>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-0.5">
                  <span>SKU: <strong className="text-slate-800">{foundProduct.sku}</strong></span>
                  <span>•</span>
                  <span>Category: <strong className="text-slate-800">{foundProduct.category}</strong></span>
                  <span>•</span>
                  <span>Unit Price: <strong className="text-slate-800">${foundProduct.unitPrice.toFixed(2)}</strong></span>
                </div>

                {/* Serial Numbers Display */}
                {(foundProduct.serialNumber || (foundProduct.serialNumbers && foundProduct.serialNumbers.length > 0)) && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <KeyRound className="h-3 w-3 text-emerald-600" /> Serial Numbers:
                    </span>
                    {foundProduct.serialNumber && (
                      <span className="font-mono bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                        Primary S/N: {foundProduct.serialNumber}
                      </span>
                    )}
                    {foundProduct.serialNumbers?.filter((sn) => sn !== foundProduct.serialNumber).map((sn) => (
                      <span key={sn} className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {sn}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Visual Barcode */}
            <div className="shrink-0 flex flex-col items-center p-2 rounded border border-slate-200 bg-white">
              <BarcodeRenderer value={foundProduct.barcode} width={160} height={38} showText={true} />
            </div>
          </div>

          {/* Allocation & Location Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Storage Location Hero */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Assigned Storage Slot
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {foundProduct.location.row} → <span className="text-emerald-700">Bin {foundProduct.location.bin}</span>
                  </h3>
                </div>
              </div>

              {assignedBin && (
                <div className="mt-2.5 rounded-lg bg-white p-2.5 border border-emerald-100 text-xs space-y-1.5 shadow-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Bin Occupancy:</span>
                    <strong className="text-slate-900">
                      {assignedBin.currentOccupancy} / {assignedBin.capacity} units
                    </strong>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (assignedBin.currentOccupancy / assignedBin.capacity) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Remaining capacity in this bin:{' '}
                    <strong className="text-emerald-700">
                      {assignedBin.capacity - assignedBin.currentOccupancy} units
                    </strong>
                  </p>
                </div>
              )}
            </div>

            {/* Current Stock Metrics */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-xs font-semibold text-slate-500">Inventory Status</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">{foundProduct.quantity}</span>
                  <span className="text-xs text-slate-500">units available</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold border ${
                      foundProduct.quantity <= 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : foundProduct.quantity <= foundProduct.minimumStock
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {foundProduct.quantity <= 0
                      ? 'Out of Stock'
                      : foundProduct.quantity <= foundProduct.minimumStock
                      ? `Low Stock (Min: ${foundProduct.minimumStock})`
                      : 'Stock Optimal'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Every inward scan updates MongoDB, writes an immutable transaction log, and adjusts bin occupancy.
              </p>
            </div>
          </div>

          {/* Quick Restock / Inward Action */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Inward Stock (Add to Warehouse Inventory)
            </h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
                {[5, 10, 25, 50].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setRestockQty(qty)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                      restockQty === qty ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    +{qty}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Custom Qty:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-slate-400" /> Unit S/N (Optional):
                </span>
                <input
                  type="text"
                  value={incomingSerialNumber}
                  onChange={(e) => setIncomingSerialNumber(e.target.value)}
                  placeholder="e.g. SN-WM-8901-02"
                  className="w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={isInwarding}
                onClick={handleInwardExisting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" />
                {isInwarding ? 'Processing Inward...' : `Inward +${restockQty} Units`}
              </button>
            </div>

            {restockSuccess && (
              <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 animate-in fade-in duration-150 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{restockSuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT 2: Unregistered Product (Smart Bin Allocation Demonstration) */}
      {isNewProduct && (
        <div id="new-product-registration-card" className="rounded-xl border-2 border-emerald-500/40 bg-white p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Smart Bin Allocation & Product Intake
                  </span>
                  {newBarcode && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Barcode Saved: {newBarcode}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  Add Additional Details for Scanned Barcode
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  The barcode number has been captured. Fill in the product details below to automatically slot it into the optimal warehouse bin.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
              >
                <Camera className="h-3.5 w-3.5 text-emerald-600" /> Re-Scan Barcode
              </button>
              <button
                type="button"
                onClick={() => setIsNewProduct(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Dismiss form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleRegisterNewProduct} className="space-y-4">
            {/* Attached Photo Preview (if scanned from image) */}
            {uploadedImage && (
              <div className="flex items-center gap-3.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                <img
                  src={uploadedImage.url}
                  alt="Scanned product package"
                  className="h-14 w-14 rounded-lg object-cover border border-emerald-300 bg-white shrink-0 shadow-xs"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-950">Package Photo Attached</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                      From Uploaded Image
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    File: <span className="font-semibold">{uploadedImage.name}</span> ({Math.round(uploadedImage.size / 1024)} KB)
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    You can reference the physical packaging details above while filling in the product specifications.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Barcode & Serial Number (Saved & Editable) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Step 1: Product Identifiers (Barcode & Serial Number) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const temp = newBarcode;
                      setNewBarcode(newSerialNumber);
                      setNewSerialNumber(temp);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 cursor-pointer"
                    title="Swap Barcode and Serial Number values if reversed"
                  >
                    ⇄ Swap Barcode & S/N
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="h-3 w-3" /> Change via Camera
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Barcode Number Field */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Barcode Number (UPC / EAN / GTIN) *
                  </label>
                  <div className="relative">
                    <input
                      ref={barcodeFormInputRef}
                      type="text"
                      required={!newSerialNumber}
                      value={newBarcode}
                      onChange={(e) => {
                        setNewBarcode(e.target.value);
                        if (!newSku || newSku.startsWith('SKU-')) {
                          setNewSku(`SKU-${e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'ITEM'}`);
                        }
                      }}
                      placeholder="e.g. 8901001099"
                      className="w-full rounded-lg border border-emerald-300 bg-white px-3.5 py-2 font-mono text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                    />
                  </div>
                  {newBarcode && (
                    <div className="mt-1.5 bg-white p-1 rounded-lg border border-emerald-200 shadow-xs flex items-center justify-center">
                      <BarcodeRenderer value={newBarcode} height={28} showText={false} />
                    </div>
                  )}
                </div>

                {/* Serial Number Field */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1 flex items-center justify-between">
                    <span>Serial Number (S/N / Unit ID)</span>
                    <span className="text-[10px] text-emerald-700 font-normal">Optional / Unit-Level</span>
                  </label>
                  <input
                    type="text"
                    value={newSerialNumber}
                    onChange={(e) => {
                      setNewSerialNumber(e.target.value);
                      if (!newBarcode) {
                        setNewBarcode(e.target.value);
                      }
                    }}
                    placeholder="e.g. SN-2024-8839"
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3.5 py-2 font-mono text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                  />
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Allows identifying and tracking this exact physical unit throughout the warehouse.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800">
                ✓ Barcode and Serial Number are both indexed. Operators can scan either code later to find this item, inward stock, or verify bin locations.
              </p>
            </div>

            {/* Step 2: Additional Product Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Step 2: Additional Product Details
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. 4K Ultra-Wide Monitor Arm"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                    placeholder="e.g. ACC-ARM-99"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 uppercase placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Audio">Audio</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Office">Office</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Home">Home</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Inward Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newQty}
                    onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Notes / Storage Hint</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Fragile glass packaging, store on middle racks"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 flex items-start gap-2">
              <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Smart Slotting Algorithm:</strong> StockPilot will evaluate Row A first (closest to intake bay).
                If Row A bins have sufficient capacity, it will assign the lowest index available bin. If Row A is full,
                it cascades to Row B or Row C, or automatically commissions a new aisle!
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isInwarding || !newBarcode.trim() || !newName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                {isInwarding ? 'Allocating Optimal Bin...' : 'Run Smart Bin Allocation & Inward'}
              </button>

              <button
                type="button"
                onClick={() => setIsNewProduct(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Allocation Success Banner */}
      {allocationSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Smart Slot Allocation Complete!</h3>
              <p className="text-xs text-emerald-800">{allocationSuccess.reason}</p>
              <div className="mt-1.5 flex items-center gap-2 text-xs font-mono text-emerald-800">
                <span className="rounded bg-white px-2 py-0.5 border border-emerald-200 shadow-xs">
                  Assigned Location: {allocationSuccess.row} → Bin {allocationSuccess.bin}
                </span>
                <span className="rounded bg-white px-2 py-0.5 border border-emerald-200 shadow-xs">
                  New Bin Occupancy: {allocationSuccess.newOccupancy} / {allocationSuccess.capacity}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unrecognized Image Manual Verification Modal */}
      {unrecognizedModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5 text-slate-100 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileImage className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Review Uploaded Package Image</h3>
              </div>
              <button
                type="button"
                onClick={() => setUnrecognizedModal(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                The optical scanner could not automatically resolve barcode stripes or text in <span className="font-semibold text-slate-100 font-mono">"{unrecognizedModal.fileName}"</span>.
                You can review the photo below and type the barcode number or serial number printed on the package to proceed!
              </p>

              <div className="relative max-h-56 overflow-auto rounded-lg border border-slate-800 bg-black flex items-center justify-center p-2">
                <img
                  src={unrecognizedModal.dataUrl}
                  alt="Review barcode or serial"
                  className="max-h-52 object-contain rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter Barcode or Serial Number Visible on Package *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={unrecognizedModal.enteredCode}
                    onChange={(e) =>
                      setUnrecognizedModal({ ...unrecognizedModal, enteredCode: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && unrecognizedModal.enteredCode.trim()) {
                        const code = unrecognizedModal.enteredCode.trim();
                        setUnrecognizedModal(null);
                        setBarcodeInput(code);
                        handleLookupBarcode(code);
                      }
                    }}
                    placeholder="e.g. 8901001099 or SN-WM-8901-01"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!unrecognizedModal.enteredCode.trim()}
                    onClick={() => {
                      const code = unrecognizedModal.enteredCode.trim();
                      setUnrecognizedModal(null);
                      setBarcodeInput(code);
                      handleLookupBarcode(code);
                    }}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    Confirm Code
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setUnrecognizedModal(null);
                  fileInputRef.current?.click();
                }}
                className="text-slate-400 hover:text-slate-200 underline"
              >
                Upload a Different Image
              </button>
              <button
                type="button"
                onClick={() => setUnrecognizedModal(null)}
                className="rounded border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={(code) => {
          setBarcodeInput(code);
          handleLookupBarcode(code);
        }}
        title="Scan Barcode or Serial Number"
      />
    </div>
  );
};
