import { Html5Qrcode } from 'html5-qrcode';

export interface BarcodeDecodeResult {
  success: boolean;
  barcode?: string;
  serialNumber?: string;
  allCodes?: Array<{ value: string; format?: string; type: 'barcode' | 'serial' }>;
  format?: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
  message?: string;
  labelHint?: string;
}

/**
 * Distinguish between standard Product Barcodes (EAN, UPC, GTIN) and Serial Numbers (S/N)
 */
export function classifyCodes(rawCodes: Array<{ value: string; format?: string }>) {
  if (!rawCodes.length) return { barcode: '', serialNumber: '', allCodes: [] };

  const categorized: Array<{ value: string; format?: string; type: 'barcode' | 'serial' }> = [];
  let bestBarcode = '';
  let bestSerial = '';

  for (const item of rawCodes) {
    const val = item.value.trim();
    if (!val) continue;

    // Serial number indicators:
    // Starts with S/N, SN, SER, IMEI, MAC, LOT, or alphanumeric mix with letters and digits
    const isSerialHint =
      /^(SN|S\/N|SER|IMEI|MAC|REF|ID|LOT|SERIAL)/i.test(val) ||
      (/[a-zA-Z]/i.test(val) && /\d/.test(val) && val.length >= 6);

    // Barcode indicators:
    // Standard 8 to 14 numeric digits (EAN-13, EAN-8, UPC-A, GTIN)
    const isStandardBarcode = /^\d{8,14}$/.test(val) || (item.format && /ean|upc|itf/i.test(item.format));

    if (isSerialHint) {
      categorized.push({ value: val, format: item.format, type: 'serial' });
      if (!bestSerial) bestSerial = val;
    } else if (isStandardBarcode) {
      categorized.push({ value: val, format: item.format, type: 'barcode' });
      if (!bestBarcode) bestBarcode = val;
    } else {
      // General code
      categorized.push({ value: val, format: item.format, type: 'barcode' });
      if (!bestBarcode) bestBarcode = val;
      else if (!bestSerial) bestSerial = val;
    }
  }

  // If no pure barcode was found, default to first available
  if (!bestBarcode && rawCodes[0]) {
    bestBarcode = rawCodes[0].value.trim();
  }

  return {
    barcode: bestBarcode,
    serialNumber: bestSerial,
    allCodes: categorized,
  };
}

// Convert a File to base64 DataURL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Convert HTMLCanvasElement to a File
function canvasToFile(canvas: HTMLCanvasElement, filename: string, mimeType = 'image/jpeg', quality = 0.92): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const f = new File([blob], filename, { type: mimeType });
        resolve(f);
      },
      mimeType,
      quality
    );
  });
}

// Load Image element from data URL
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Robust multi-tier barcode extractor from an uploaded image file:
 * 1. Hardware BarcodeDetector API (fastest, supports smartphone camera photos)
 * 2. Pre-scaled Canvas with Hardware BarcodeDetector
 * 3. Html5Qrcode engine in non-hidden container (avoids display:none crash)
 * 4. Image pre-processing: Grayscale & Contrast enhancement for faded/dim photos
 * 5. 90-degree Rotation (for vertical barcode photos)
 * 6. Server-side Gemini AI Vision fallback
 */
export async function decodeBarcodeFromImageFile(file: File): Promise<BarcodeDecodeResult> {
  const fileName = file.name;
  const fileSize = file.size;

  let dataUrl = '';
  try {
    dataUrl = await fileToDataUrl(file);
  } catch (err: any) {
    return {
      success: false,
      dataUrl: '',
      fileName,
      fileSize,
      message: `Failed to read file: ${err.message}`,
    };
  }

  // --- PASS 1: Native Browser BarcodeDetector (Chromium / Chrome / Android / Edge) ---
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = [
        'code_128',
        'code_39',
        'code_93',
        'ean_13',
        'ean_8',
        'upc_a',
        'upc_e',
        'qr_code',
        'itf',
        'data_matrix',
        'codabar',
      ];
      const detector = new (window as any).BarcodeDetector({ formats });

      // Detect directly on ImageBitmap
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(file);
          const results = await detector.detect(bitmap);
          if (results && results.length > 0) {
            const rawList = results
              .map((r: any) => ({ value: r.rawValue?.trim(), format: r.format }))
              .filter((r: any) => Boolean(r.value));

            if (rawList.length > 0) {
              const classified = classifyCodes(rawList);
              return {
                success: true,
                barcode: classified.barcode,
                serialNumber: classified.serialNumber || undefined,
                allCodes: classified.allCodes,
                format: results[0].format || 'Native Barcode',
                dataUrl,
                fileName,
                fileSize,
                message: classified.serialNumber
                  ? `Extracted Barcode: ${classified.barcode} and S/N: ${classified.serialNumber}`
                  : 'Detected via hardware barcode scanner',
              };
            }
          }
        } catch (bitmapErr) {
          console.debug('BarcodeDetector bitmap failed:', bitmapErr);
        }
      }
    } catch (e) {
      console.debug('Native BarcodeDetector pass failed, continuing to canvas preprocessor:', e);
    }
  }

  // Load image into memory for multi-tier canvas processing
  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return {
      success: false,
      dataUrl,
      fileName,
      fileSize,
      message: 'Could not render image file into readable graphics.',
    };
  }

  const { naturalWidth: origW, naturalHeight: origH } = img;

  // --- PASS 2: Downscaled Canvas with Native BarcodeDetector if available ---
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const formats = ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'itf'];
      const detector = new (window as any).BarcodeDetector({ formats });

      // Resize huge smartphone photos (e.g. 4000x3000 down to 1200 max dimension)
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(origW, origH));
      const targetW = Math.round(origW * scale);
      const targetH = Math.round(origH * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const results = await detector.detect(canvas);
        if (results && results.length > 0) {
          const rawList = results
            .map((r: any) => ({ value: r.rawValue?.trim(), format: r.format }))
            .filter((r: any) => Boolean(r.value));

          if (rawList.length > 0) {
            const classified = classifyCodes(rawList);
            return {
              success: true,
              barcode: classified.barcode,
              serialNumber: classified.serialNumber || undefined,
              allCodes: classified.allCodes,
              format: results[0].format || 'Native Scaled',
              dataUrl,
              fileName,
              fileSize,
            };
          }
        }

        // Test rotated 90 degrees
        const rotCanvas = document.createElement('canvas');
        rotCanvas.width = targetH;
        rotCanvas.height = targetW;
        const rotCtx = rotCanvas.getContext('2d');
        if (rotCtx) {
          rotCtx.translate(targetH / 2, targetW / 2);
          rotCtx.rotate((90 * Math.PI) / 180);
          rotCtx.drawImage(canvas, -targetW / 2, -targetH / 2);
          const rotResults = await detector.detect(rotCanvas);
          if (rotResults && rotResults.length > 0) {
            const rotList = rotResults
              .map((r: any) => ({ value: r.rawValue?.trim(), format: r.format }))
              .filter((r: any) => Boolean(r.value));

            if (rotList.length > 0) {
              const classified = classifyCodes(rotList);
              return {
                success: true,
                barcode: classified.barcode,
                serialNumber: classified.serialNumber || undefined,
                allCodes: classified.allCodes,
                format: rotResults[0].format || 'Native Rotated',
                dataUrl,
                fileName,
                fileSize,
              };
            }
          }
        }
      }
    } catch (e) {
      console.debug('Pass 2 failed:', e);
    }
  }

  // --- PASS 3: Safe Html5Qrcode Scanner (Without display:none defect!) ---
  // Create an offscreen DOM container that is laid out properly by the browser
  const tempContainerId = `sp-decoder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const container = document.createElement('div');
  container.id = tempContainerId;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '640px';
  container.style.height = '640px';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-9999';
  document.body.appendChild(container);

  let html5QrCode: Html5Qrcode | null = null;
  try {
    html5QrCode = new Html5Qrcode(tempContainerId, { verbose: false });

    // Step 3a: Try original file
    try {
      const decoded = await html5QrCode.scanFile(file, false);
      if (decoded && decoded.trim()) {
        return {
          success: true,
          barcode: decoded.trim(),
          format: 'Standard Barcode',
          dataUrl,
          fileName,
          fileSize,
        };
      }
    } catch {
      // Continue to canvas preprocessing
    }

    // Step 3b: Preprocess optimal downscaled canvas (1000px max, sweet spot for ZXing 1D barcode scanner)
    try {
      const maxDim = 1000;
      const scale = Math.min(1, maxDim / Math.max(origW, origH));
      const targetW = Math.round(origW * scale);
      const targetH = Math.round(origH * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const scaledFile = await canvasToFile(canvas, 'scaled.jpg', 'image/jpeg', 0.95);
        const decodedScaled = await html5QrCode.scanFile(scaledFile, false);
        if (decodedScaled && decodedScaled.trim()) {
          return {
            success: true,
            barcode: decodedScaled.trim(),
            format: 'Scaled Barcode',
            dataUrl,
            fileName,
            fileSize,
          };
        }
      }
    } catch {
      // Continue to contrast pass
    }

    // Step 3c: High-Contrast Binarization Pass (Helps with low-contrast or glossy packaging)
    try {
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(origW, origH));
      const targetW = Math.round(origW * scale);
      const targetH = Math.round(origH * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;

        // Boost contrast and grayscale
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          // High-contrast threshold
          const val = avg > 128 ? Math.min(255, avg * 1.2) : Math.max(0, avg * 0.8);
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        ctx.putImageData(imgData, 0, 0);

        const contrastFile = await canvasToFile(canvas, 'contrast.jpg', 'image/jpeg', 0.95);
        const decodedContrast = await html5QrCode.scanFile(contrastFile, false);
        if (decodedContrast && decodedContrast.trim()) {
          return {
            success: true,
            barcode: decodedContrast.trim(),
            format: 'Contrast Enhanced',
            dataUrl,
            fileName,
            fileSize,
          };
        }
      }
    } catch {
      // Continue to rotation pass
    }

    // Step 3d: Rotated 90 degrees (ZXing 1D engine only scans horizontally)
    try {
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(origW, origH));
      const targetW = Math.round(origW * scale);
      const targetH = Math.round(origH * scale);

      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = targetH;
      rotCanvas.height = targetW;
      const rotCtx = rotCanvas.getContext('2d');
      if (rotCtx) {
        rotCtx.translate(targetH / 2, targetW / 2);
        rotCtx.rotate((90 * Math.PI) / 180);
        rotCtx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);

        const rotFile = await canvasToFile(rotCanvas, 'rotated.jpg', 'image/jpeg', 0.95);
        const decodedRot = await html5QrCode.scanFile(rotFile, false);
        if (decodedRot && decodedRot.trim()) {
          return {
            success: true,
            barcode: decodedRot.trim(),
            format: 'Vertical Rotated',
            dataUrl,
            fileName,
            fileSize,
          };
        }
      }
    } catch {
      // Continue to server fallback
    }
  } finally {
    if (html5QrCode) {
      try {
        html5QrCode.clear();
      } catch {
        // ignore clear error
      }
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  // --- PASS 4: Server-Side AI Vision Fallback (Gemini Multimodal) ---
  try {
    const res = await fetch('/api/scan/decode-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: dataUrl }),
    });

    if (res.ok) {
      const aiData = await res.json();
      if (aiData.success && (aiData.barcode || aiData.serialNumber)) {
        return {
          success: true,
          barcode: aiData.barcode || undefined,
          serialNumber: aiData.serialNumber || undefined,
          format: aiData.format || 'AI Vision Decoded',
          labelHint: aiData.labelHint || undefined,
          dataUrl,
          fileName,
          fileSize,
          message: aiData.serialNumber
            ? `Extracted Barcode: ${aiData.barcode || 'N/A'} and S/N: ${aiData.serialNumber}`
            : 'Decoded with Gemini AI vision',
        };
      }
    }
  } catch (err: any) {
    console.debug('AI server decode fallback error:', err.message);
  }

  return {
    success: false,
    dataUrl,
    fileName,
    fileSize,
    message: 'No barcode could be automatically recognized. Please ensure the barcode stripes and digits are clearly visible, or enter the code manually.',
  };
}
