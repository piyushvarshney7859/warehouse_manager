import React, { useState } from 'react';
import {
  Camera,
  X,
  AlertCircle,
  KeyRound,
  Sparkles,
  Upload,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { AutoBarcodeScanner } from './AutoBarcodeScanner.js';
import { playScanSuccessBeep, playScanErrorBuzzer } from '../utils/sound.js';
import { decodeBarcodeFromImageFile } from '../utils/imageBarcodeDecoder.js';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string, serialNumber?: string, barcode?: string) => void;
  title?: string;
  expectedBarcode?: string;
  expectedProductName?: string;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Automatic Barcode & Serial Scanner',
  expectedBarcode,
  expectedProductName,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [fileScanError, setFileScanError] = useState<string | null>(null);

  // Demo shortcut barcodes & serial numbers for rapid testing
  const sampleBarcodes = [
    { label: 'Wireless Mouse (Barcode)', code: '8901001001', hint: 'Row B → B04 (SP1001 Item)' },
    { label: 'Mouse S/N (Unit ID)', code: 'SN-WM-8901-01', hint: 'Serial Number lookup' },
    { label: 'Mechanical Keyboard (Barcode)', code: '8901001002', hint: 'Row B → B02' },
    { label: 'Keyboard S/N (Unit ID)', code: 'SN-KB-8902-77', hint: 'Serial Number lookup' },
    { label: 'USB-C Hub (Barcode)', code: '8901001003', hint: 'Row A → A01' },
    { label: 'New Barcode (Unregistered)', code: '8901001099', hint: 'Test Smart Bin Slotting' },
  ];

  if (!isOpen) return null;

  const handleDetected = (barcode: string, _format?: string, serialNumber?: string) => {
    onScan(barcode, serialNumber, barcode);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playScanSuccessBeep();
      onScan(manualCode.trim());
      onClose();
    }
  };

  const handleQuickSelect = (code: string) => {
    playScanSuccessBeep();
    onScan(code);
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setFileScanError(null);

    try {
      const result = await decodeBarcodeFromImageFile(file);

      const codeToUse = (result.barcode || result.serialNumber || '').trim();
      if (result.success && codeToUse) {
        playScanSuccessBeep();
        onScan(codeToUse, result.serialNumber, result.barcode);
        onClose();
      } else {
        playScanErrorBuzzer();
        setFileScanError(result.message || 'Could not detect a valid barcode or serial number in this image. Ensure lighting and contrast are clear.');
      }
    } catch (err: any) {
      playScanErrorBuzzer();
      setFileScanError('No readable barcode/serial detected: ' + (err.message || 'Please check image clarity.'));
    } finally {
      setIsFileScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5 text-slate-100 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-base sm:text-lg text-white leading-tight">{title}</h3>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  <Camera className="h-2.5 w-2.5" /> Capture & Read
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Frame barcode or serial number and capture to read</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Context if in Pick Mode */}
        {expectedBarcode && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Target Verification Barcode
                </span>
                <p className="text-sm font-semibold text-slate-100">{expectedProductName || 'Item Required'}</p>
                <p className="text-xs text-amber-200 font-mono">Expected: {expectedBarcode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Input Method Selector Tabs */}
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Camera className="h-3.5 w-3.5" /> Camera Capture
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> Image File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" /> Direct Entry
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-3">
          {/* TAB 1: LIVE AUTO-DETECTION CAMERA */}
          {activeTab === 'camera' && (
            <AutoBarcodeScanner
              id="stockpilot-modal-camera-stream"
              isActive={isOpen && activeTab === 'camera'}
              onDetected={handleDetected}
              expectedBarcode={expectedBarcode}
              expectedProductName={expectedProductName}
              height={290}
              showControls={true}
            />
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <label className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-800/40 hover:bg-slate-800/70 p-8 rounded-xl flex flex-col items-center justify-center text-center transition-all group block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="rounded-full bg-slate-800 p-3.5 text-slate-400 group-hover:text-emerald-400 border border-slate-700 mb-3 transition-colors inline-flex">
                  {isFileScanning ? (
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white">
                  {isFileScanning ? 'Detecting Barcode...' : 'Click or Drag Barcode Image Here'}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Supports photo uploads, product labels, shipping barcodes, and screenshots
                </p>
              </label>

              {fileScanError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <p>{fileScanError}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT KEYPAD / MANUAL ENTRY */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-emerald-400" /> Enter Barcode Number, Serial Number (S/N), or SKU
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. 8901001001 or SN-WM-8901-01"
                    autoFocus
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Instant Quick-Test Barcodes */}
          <div className="border-t border-slate-800 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Instant Quick-Test Barcodes:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sampleBarcodes.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleQuickSelect(item.code)}
                  className="flex flex-col items-start rounded-lg border border-slate-800 bg-slate-800/60 p-2 text-left hover:border-emerald-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
                >
                  <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-300">
                    {item.label}
                  </span>
                  <span className="font-mono text-xs text-emerald-400 font-semibold">{item.code}</span>
                  <span className="text-[10px] text-slate-400">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
