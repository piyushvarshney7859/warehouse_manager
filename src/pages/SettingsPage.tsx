import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Server,
  Layers,
  Sliders,
  ScanLine,
} from 'lucide-react';
import { api } from '../services/api.js';

interface SettingsPageProps {
  onRefreshAll: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshAll }) => {
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getHealth().then((res) => {
      if (res.database) setDbHealth(res.database);
    });
  }, []);

  const handleReset = async () => {
    if (confirm('Reset warehouse database to default baseline records? This will reseed products, storage bins, and sample orders.')) {
      setIsResetting(true);
      setResetMessage(null);
      try {
        const res = await api.resetDemoData();
        setResetMessage(res.message);
        onRefreshAll();
      } catch (err: any) {
        alert('Reset error: ' + err.message);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
            System Administration
          </span>
          <span className="text-xs text-slate-500 font-medium">Diagnostics & Preferences</span>
        </div>
        <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          Settings & System Diagnostics
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Database connection status, warehouse operational parameters, and maintenance utilities.
        </p>
      </div>

      {/* Database Diagnostics */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Database Connection & Health</h3>
              <p className="text-xs text-slate-500">Real-time persistence layer status</p>
            </div>
          </div>
          <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
            {dbHealth?.connected ? 'Connected (Healthy)' : 'Connecting...'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-slate-500 block text-[11px]">Database Driver</span>
            <strong className="text-slate-900 font-mono text-xs">Mongoose 8.x</strong>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-slate-500 block text-[11px]">Deployment Mode</span>
            <strong className="text-emerald-700 font-mono text-xs">
              {dbHealth?.isEmbedded ? 'Embedded Zero-Config MongoDB' : 'External MongoDB Atlas'}
            </strong>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <span className="text-slate-500 block text-[11px]">Database Target</span>
            <strong className="text-slate-900 font-mono text-xs">{dbHealth?.dbName || 'stockpilot'}</strong>
          </div>
        </div>

        {/* Database Reset Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900">Reset System Data</h4>
            <p className="text-[11px] text-slate-500">
              Restores products, storage aisles, and baseline order records.
            </p>
          </div>
          <button
            type="button"
            disabled={isResetting}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors shadow-xs"
          >
            <RotateCcw className={`h-3.5 w-3.5 text-emerald-400 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Resetting Collections...' : 'Reset Database Now'}
          </button>
        </div>

        {resetMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}
      </div>

      {/* Warehouse Operational Rules */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Warehouse Operational Parameters</h3>
            <p className="text-xs text-slate-500">Active allocation thresholds and scanning policies</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span>Bin Maximum Capacity</span>
              <span className="font-mono text-emerald-700 font-bold">50 Units</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Each storage bin cell supports up to 50 physical units before triggering auto-cascading.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span>Low Stock Alert Trigger</span>
              <span className="font-mono text-amber-700 font-bold">≤ 10 Units</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Items at or below minimum threshold are automatically highlighted across inventory lists.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-700 font-semibold">
              <span>Barcode Validation</span>
              <span className="font-mono text-emerald-700 font-bold">Strict 100%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Outbound pick verification blocks wrong SKU scans to prevent customer return errors.
            </p>
          </div>
        </div>
      </div>

      {/* Hardware & Scanner Compatibility */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <ScanLine className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Scanner & Device Support</h3>
            <p className="text-xs text-slate-500">Input protocols for warehouse floor operations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
            <strong className="text-slate-800 block mb-0.5">Camera Video Stream</strong>
            <p className="text-[11px] text-slate-500">WebRTC camera scanner with continuous autofocus and real-time feed.</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
            <strong className="text-slate-800 block mb-0.5">USB & Bluetooth Guns</strong>
            <p className="text-[11px] text-slate-500">Direct HID keyboard wedge listener with automatic Enter/Return key capture.</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
            <strong className="text-slate-800 block mb-0.5">Image File Drop & Inward</strong>
            <p className="text-[11px] text-slate-500">Supports PNG, JPG, and WEBP image uploads with multi-engine barcode recognition.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
