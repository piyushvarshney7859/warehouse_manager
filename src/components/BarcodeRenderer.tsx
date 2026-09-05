import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  width = 180,
  height = 48,
  showText = true,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, String(value), {
        format: 'CODE128',
        width: Math.max(1.2, width / 120),
        height: Math.max(28, height - (showText ? 16 : 0)),
        displayValue: showText,
        fontSize: 11,
        textMargin: 3,
        margin: 4,
        background: '#ffffff',
        lineColor: '#0f172a',
        font: 'monospace',
      });
    } catch (err) {
      console.warn('JsBarcode rendering error for value:', value, err);
    }
  }, [value, width, height, showText]);

  return (
    <div className={`inline-flex flex-col items-center bg-white p-1.5 rounded border border-slate-200 shadow-xs ${className}`}>
      <svg ref={svgRef} className="max-w-full overflow-hidden" />
    </div>
  );
};
