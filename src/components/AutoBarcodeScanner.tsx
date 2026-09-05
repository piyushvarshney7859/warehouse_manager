import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Flashlight,
  SwitchCamera,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Upload,
  Sparkles,
  ArrowRight,
  RotateCcw,
  KeyRound,
  Eye,
} from 'lucide-react';
import { playScanSuccessBeep, playScanErrorBuzzer, playCameraShutterSound } from '../utils/sound.js';
import { decodeBarcodeFromImageFile } from '../utils/imageBarcodeDecoder.js';

export interface AutoBarcodeScannerProps {
  id?: string;
  onDetected: (barcode: string, format?: string, serialNumber?: string) => void;
  isActive: boolean;
  onStop?: () => void;
  expectedBarcode?: string;
  expectedProductName?: string;
  continuous?: boolean;
  cooldownMs?: number;
  className?: string;
  showControls?: boolean;
  showQuickBarcodes?: boolean;
  height?: number | string;
}

interface CapturedResult {
  dataUrl: string;
  barcode?: string;
  serialNumber?: string;
  format?: string;
  success: boolean;
  message?: string;
}

export const AutoBarcodeScanner: React.FC<AutoBarcodeScannerProps> = ({
  id = 'stockpilot-barcode-capture-scanner',
  onDetected,
  isActive,
  onStop,
  expectedBarcode,
  expectedProductName,
  continuous = false,
  className = '',
  showControls = true,
  showQuickBarcodes = false,
  height = 340,
}) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);

  // Capture & Analysis State
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [capturedResult, setCapturedResult] = useState<CapturedResult | null>(null);
  const [editableCode, setEditableCode] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Safe camera stream shutdown
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setTorchEnabled(false);
    setHasTorchCapability(false);
  }, []);

  // Enumerate available video input devices
  const refreshCameraList = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        // Try to pick environment / back camera first
        const backCam = videoDevices.find((d) => /back|rear|environment/i.test(d.label));
        if (backCam) {
          setSelectedCameraId(backCam.deviceId);
        } else {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate cameras:', err);
    }
  }, [selectedCameraId]);

  // Start live camera stream (no auto-reading loop!)
  const startCamera = useCallback(
    async (deviceIdToUse?: string) => {
      stopStream();
      setCameraError(null);
      setIsInitializing(true);
      setCapturedResult(null);

      try {
        const targetDeviceId = deviceIdToUse || selectedCameraId;

        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        };

        if (targetDeviceId) {
          videoConstraints.deviceId = { exact: targetDeviceId };
        } else {
          videoConstraints.facingMode = { ideal: 'environment' };
        }

        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch (firstErr) {
          // Fallback to plain video constraint if ideal failed
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (secondErr) {
            throw firstErr || secondErr;
          }
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }

        setIsStreaming(true);
        setIsInitializing(false);

        // Check torch capability
        try {
          const track = mediaStream.getVideoTracks()[0];
          if (track && 'getCapabilities' in track) {
            const capabilities = (track as any).getCapabilities();
            setHasTorchCapability(Boolean(capabilities?.torch));
          }
        } catch {
          setHasTorchCapability(false);
        }

        // Re-check camera labels once permission granted
        refreshCameraList();
      } catch (err: any) {
        console.warn('Camera failed to start:', err);
        setIsStreaming(false);
        setIsInitializing(false);

        const msg = err?.message || String(err);
        if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
          setCameraError('Camera access denied. Please allow camera permissions in browser settings or upload an image.');
        } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
          setCameraError('No camera detected on this device. You can upload barcode photos or enter codes directly.');
        } else {
          setCameraError('Unable to activate camera stream. Check permissions or upload a package photo.');
        }
      }
    },
    [refreshCameraList, selectedCameraId, stopStream]
  );

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        const next = !torchEnabled;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchEnabled(next);
      }
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Switch camera device
  const handleSwitchCamera = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (isStreaming) {
      await startCamera(cameraId);
    }
  };

  // CAPTURE & READ BARCODE: Frame is frozen & processed
  const handleCapture = async () => {
    if (!videoRef.current || isCapturing || isAnalyzing) return;

    setIsCapturing(true);
    playCameraShutterSound();

    // Trigger visual camera shutter flash effect
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 120);

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not create offscreen canvas');
      }

      // Draw exact captured video frame
      ctx.drawImage(video, 0, 0, width, height);

      // Convert canvas to Blob & File
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));

      if (!blob) {
        throw new Error('Failed to create snapshot blob');
      }

      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Show analyzing spinner
      setIsAnalyzing(true);

      // Read barcode numbers from the captured snapshot
      const decodeResult = await decodeBarcodeFromImageFile(file);

      const foundBarcode = decodeResult.barcode?.trim() || '';
      const foundSerial = decodeResult.serialNumber?.trim() || '';
      const primaryCode = foundBarcode || foundSerial;

      const result: CapturedResult = {
        dataUrl,
        barcode: foundBarcode,
        serialNumber: foundSerial,
        format: decodeResult.format,
        success: Boolean(decodeResult.success && primaryCode),
        message: decodeResult.message,
      };

      setCapturedResult(result);
      setEditableCode(primaryCode);

      if (result.success && primaryCode) {
        playScanSuccessBeep();
      } else {
        playScanErrorBuzzer();
      }
    } catch (err: any) {
      console.error('Capture read error:', err);
      playScanErrorBuzzer();
      setCapturedResult({
        dataUrl: '',
        success: false,
        message: 'Could not process captured frame: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setIsCapturing(false);
      setIsAnalyzing(false);
    }
  };

  // Reset capture to retake photo with live camera
  const handleRetake = () => {
    setCapturedResult(null);
    setEditableCode('');
    if (!isStreaming) {
      startCamera();
    }
  };

  // Confirm and submit the read barcode number
  const handleConfirmCode = () => {
    const codeToSubmit = (editableCode || capturedResult?.barcode || capturedResult?.serialNumber || '').trim();
    if (!codeToSubmit) return;

    playScanSuccessBeep();
    onDetected(codeToSubmit, capturedResult?.format, capturedResult?.serialNumber);

    if (!continuous) {
      stopStream();
      onStop?.();
    } else {
      // In continuous mode, reset to take another capture
      setCapturedResult(null);
      setEditableCode('');
    }
  };

  // Upload image file fallback
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const decodeResult = await decodeBarcodeFromImageFile(file);

      const foundBarcode = decodeResult.barcode?.trim() || '';
      const foundSerial = decodeResult.serialNumber?.trim() || '';
      const primaryCode = foundBarcode || foundSerial;

      const result: CapturedResult = {
        dataUrl: decodeResult.dataUrl || '',
        barcode: foundBarcode,
        serialNumber: foundSerial,
        format: decodeResult.format,
        success: Boolean(decodeResult.success && primaryCode),
        message: decodeResult.message,
      };

      setCapturedResult(result);
      setEditableCode(primaryCode);

      if (result.success && primaryCode) {
        playScanSuccessBeep();
      } else {
        playScanErrorBuzzer();
      }
    } catch (err: any) {
      playScanErrorBuzzer();
      setCapturedResult({
        dataUrl: '',
        success: false,
        message: 'Could not decode barcode: ' + (err?.message || 'Check image clarity'),
      });
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Keyboard shortcut: Space or Enter to capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || capturedResult) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capturedResult, isActive, isAnalyzing, isCapturing]);

  // Synchronize camera state with `isActive` prop
  useEffect(() => {
    if (isActive) {
      startCamera();
      return () => {
        stopStream();
      };
    } else {
      stopStream();
      setCapturedResult(null);
    }
  }, [isActive, startCamera, stopStream]);

  const sampleTestCodes = [
    { label: 'Wireless Mouse', code: '8901001001' },
    { label: 'Mouse S/N', code: 'SN-WM-8901-01' },
    { label: 'Mechanical Keyboard', code: '8901001002' },
    { label: 'USB-C Hub', code: '8901001003' },
    { label: 'New Intake Item', code: '8901001099' },
  ];

  return (
    <div
      id={id}
      className={`relative flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-white shadow-xl ${className}`}
    >
      {/* Expected Target Barcode Banner if provided */}
      {expectedBarcode && (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold text-amber-300">Target Item:</span>
            <span className="font-mono font-bold text-white bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
              {expectedBarcode}
            </span>
          </div>
          {expectedProductName && <span className="text-slate-300 truncate max-w-[200px]">{expectedProductName}</span>}
        </div>
      )}

      {/* Main Viewport Container */}
      <div
        className="relative w-full overflow-hidden bg-black flex items-center justify-center select-none"
        style={{ minHeight: height }}
      >
        {/* Shutter Flash Animation Effect */}
        {isFlashActive && (
          <div className="absolute inset-0 z-40 bg-white opacity-85 transition-opacity duration-150 pointer-events-none" />
        )}

        {/* 1. LIVE CAMERA STREAM (When not yet captured) */}
        {!capturedResult && (
          <div className="relative w-full h-full flex items-center justify-center min-h-[260px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ minHeight: height }}
            />

            {/* Viewfinder Target Reticle Frame */}
            {isStreaming && !isAnalyzing && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 sm:p-8">
                {/* Top Guides */}
                <div className="flex justify-between items-start">
                  <div className="h-8 w-8 border-t-3 border-l-3 border-emerald-400 rounded-tl-xl shadow-[0_0_12px_#10b981]" />
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-md border border-emerald-500/30">
                    <ScanLine className="h-3.5 w-3.5 text-emerald-400" />
                    Align Barcode or Serial Number in Frame
                  </div>
                  <div className="h-8 w-8 border-t-3 border-r-3 border-emerald-400 rounded-tr-xl shadow-[0_0_12px_#10b981]" />
                </div>

                {/* Central Horizontal Alignment Guide Line */}
                <div className="relative w-full my-auto flex flex-col items-center">
                  <div className="h-0.5 w-4/5 bg-linear-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399]" />
                  <span className="mt-2 text-[10px] text-slate-300 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs">
                    Press "Capture & Read" button below
                  </span>
                </div>

                {/* Bottom Guides */}
                <div className="flex justify-between items-end">
                  <div className="h-8 w-8 border-b-3 border-l-3 border-emerald-400 rounded-bl-xl shadow-[0_0_12px_#10b981]" />
                  <div className="h-8 w-8 border-b-3 border-r-3 border-emerald-400 rounded-br-xl shadow-[0_0_12px_#10b981]" />
                </div>
              </div>
            )}

            {/* Analyzing / Reading Snapshot State */}
            {isAnalyzing && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 p-4 text-center backdrop-blur-xs animate-in fade-in duration-150">
                <RefreshCw className="h-10 w-10 animate-spin text-emerald-400 mb-3" />
                <p className="text-base font-bold text-white">Reading Barcode Numbers...</p>
                <p className="text-xs text-slate-300 max-w-xs mt-1">
                  Analyzing high-resolution capture for 1D/2D stripes & Serial Numbers
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. CAPTURED SNAPSHOT & READ NUMBER RESULT DISPLAY */}
        {capturedResult && !isAnalyzing && (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950/95 animate-in zoom-in-95 duration-150">
            {/* Captured Image Thumbnail with result frame */}
            {capturedResult.dataUrl && (
              <div className="relative max-h-48 max-w-full overflow-hidden rounded-lg border-2 border-emerald-500/50 bg-black shadow-lg mb-3">
                <img
                  src={capturedResult.dataUrl}
                  alt="Captured Barcode Snapshot"
                  className="max-h-44 object-contain rounded"
                />
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-xs border border-emerald-500/40">
                  <Eye className="h-3 w-3" /> Captured Snapshot
                </span>
              </div>
            )}

            {/* If Barcode/Serial was read successfully */}
            {capturedResult.success ? (
              <div className="w-full max-w-md space-y-3 text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-4 w-4" /> Barcode Read Successfully!
                </div>

                {/* Extracted Number Display (Prominent & Editable) */}
                <div className="rounded-xl border border-emerald-500/40 bg-slate-900/90 p-3.5 shadow-inner text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center justify-between">
                    <span>What Number Was Read:</span>
                    {capturedResult.format && (
                      <span className="text-[10px] text-slate-400 font-normal">Format: {capturedResult.format}</span>
                    )}
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={editableCode}
                      onChange={(e) => setEditableCode(e.target.value)}
                      className="w-full rounded-lg border border-emerald-500/50 bg-slate-950 px-3 py-2 font-mono text-lg sm:text-xl font-black text-emerald-300 tracking-wider focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  {capturedResult.serialNumber && capturedResult.barcode && capturedResult.serialNumber !== capturedResult.barcode && (
                    <div className="mt-2 text-xs text-slate-300 flex items-center gap-2">
                      <span className="text-slate-400">Detected S/N:</span>
                      <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                        {capturedResult.serialNumber}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Verify number against package. You can edit digits if needed or click "Use Barcode".
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" /> Retake Photo
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCode}
                    disabled={!editableCode.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Use Barcode ({editableCode || 'Code'})
                  </button>
                </div>
              </div>
            ) : (
              /* If Barcode could NOT be decoded automatically from photo */
              <div className="w-full max-w-md space-y-3 text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300 border border-rose-500/30">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  Could not read barcode stripes automatically
                </div>

                <p className="text-xs text-slate-300">
                  The photo may be blurry or angled. You can type the numbers printed below the stripes or retake a sharper picture.
                </p>

                {/* Manual number entry from photo */}
                <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-left">
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-emerald-400" /> Enter Number Visible in Photo:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editableCode}
                      onChange={(e) => setEditableCode(e.target.value)}
                      placeholder="e.g. 8901001001"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!editableCode.trim()}
                      onClick={handleConfirmCode}
                      className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Confirm
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" /> Retake Sharper Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initializing / Connecting state */}
        {isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mb-2" />
            <p className="text-sm font-semibold text-slate-100">Connecting Camera...</p>
            <p className="text-xs text-slate-400 max-w-xs mt-0.5">
              Opening camera view for manual capture & barcode extraction
            </p>
          </div>
        )}

        {/* Standby / Inactive View */}
        {!isActive && !isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
            <div className="rounded-full bg-slate-900 p-4 text-emerald-400 mb-3 border border-slate-800 shadow-sm">
              <Camera className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Camera Scanner Standby</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
              Click Start to open the live camera, aim at any barcode, and capture to read.
            </p>
          </div>
        )}

        {/* Camera Error View */}
        {cameraError && (
          <div className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
            <p className="text-sm font-semibold text-rose-300">Camera Unavailable</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{cameraError}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Barcode Photo
              </button>
              <button
                type="button"
                onClick={() => startCamera()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Retry Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. PROMINENT CAPTURE SHUTTER BUTTON & SCANNER CONTROLS */}
      {showControls && (
        <div className="flex flex-col border-t border-slate-800 bg-slate-900/95 p-3 space-y-2.5">
          {/* Main Shutter Row (Capture Button / Icon) */}
          {!capturedResult && isStreaming && (
            <div className="flex items-center justify-center py-1">
              <button
                type="button"
                id="camera-capture-shutter-btn"
                onClick={handleCapture}
                disabled={isCapturing || isAnalyzing}
                className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 px-7 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-950/60 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all cursor-pointer border border-emerald-400/40 disabled:opacity-50"
                title="Click to capture and read barcode number (or press Spacebar)"
              >
                {/* Circular Shutter Camera Icon */}
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-800 shadow-md group-hover:scale-110 transition-transform">
                  <Camera className="h-5 w-5 fill-emerald-800 text-emerald-800" />
                </span>

                <div className="text-left leading-tight">
                  <div className="text-sm font-black tracking-wide flex items-center gap-1.5">
                    <span>CAPTURE & READ BARCODE</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="text-[10px] text-emerald-100 font-normal">
                    Snaps photo and decodes barcode & S/N numbers
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Quick Utility Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800/80">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-2 w-2 rounded-full ${
                  isStreaming && !capturedResult ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="text-[11px] font-medium text-slate-300">
                {capturedResult
                  ? 'Snapshot Captured'
                  : isStreaming
                  ? 'Camera Ready — Align & Capture'
                  : 'Scanner Standby'}
              </span>
            </div>

            {/* Camera Controls & Utilities */}
            <div className="flex items-center gap-2">
              {/* Camera Switcher if multiple webcams */}
              {availableCameras.length > 1 && isStreaming && !capturedResult && (
                <div className="flex items-center gap-1">
                  <SwitchCamera className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-emerald-500 max-w-[130px] truncate"
                  >
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Torch / Flashlight */}
              {hasTorchCapability && isStreaming && !capturedResult && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs border transition-colors cursor-pointer ${
                    torchEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Toggle Flashlight"
                >
                  <Flashlight className="h-3 w-3" />
                  {torchEnabled ? 'Torch On' : 'Torch'}
                </button>
              )}

              {/* Image Upload fallback */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                title="Upload photo of barcode"
              >
                <Upload className="h-3 w-3" /> Upload Photo
              </button>

              {/* Close Button if onStop provided */}
              {onStop && (
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onStop();
                  }}
                  className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instant Demo Barcode Triggers */}
      {showQuickBarcodes && (
        <div className="border-t border-slate-800 bg-slate-900/60 p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
            <Sparkles className="h-3 w-3 text-amber-400" /> One-Click Barcode Test:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleTestCodes.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  playScanSuccessBeep();
                  onDetected(item.code, 'Quick-Test');
                }}
                className="rounded-md border border-slate-800 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-emerald-300 font-mono transition-colors cursor-pointer"
              >
                {item.label} ({item.code})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
