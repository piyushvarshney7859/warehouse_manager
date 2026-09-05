import React, { useState, useEffect } from 'react';
import {
  Database,
  RotateCcw,
  UserCheck,
  Layers,
  ChevronDown,
  Truck,
  Factory,
  LogOut,
  Building2,
  Boxes,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import { IAuthUser } from '../types.js';

interface NavbarProps {
  onRefreshAll: () => void;
  activeRole: 'Operator' | 'Manager';
  onToggleRole: (role: 'Operator' | 'Manager') => void;
  onOpenDeliveryPortal?: () => void;
  onOpenManufacturerPortal?: () => void;
  onSearchClick?: () => void;
  currentUser?: IAuthUser | null;
  onLogout?: () => void;
  onSwitchPortal?: (portal: 'manufacturer' | 'warehouse' | 'delivery') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefreshAll,
  activeRole,
  onToggleRole,
  onOpenDeliveryPortal,
  onOpenManufacturerPortal,
  currentUser,
  onLogout,
  onSwitchPortal,
}) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showPortalMenu, setShowPortalMenu] = useState(false);

  useEffect(() => {
    api
      .getHealth()
      .then((res) => {
        if (res.database) setDbStatus(res.database);
      })
      .catch((err) => console.warn('Health check error:', err));
  }, []);

  const handleResetDemo = async () => {
    if (confirm('Reset warehouse data to default records?')) {
      setIsResetting(true);
      try {
        await api.resetDemoData();
        onRefreshAll();
      } catch (err: any) {
        alert('Reset error: ' + err.message);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 shadow-xs">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
          <Layers className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-slate-900">STOCKPILOT</span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              v1.0
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-800 font-bold -mt-0.5">
            {currentUser?.role === 'delivery'
              ? 'Delivery Partner Dispatch & Route Portal'
              : currentUser?.role === 'manufacturer'
              ? 'Manufacturer & Factory Dispatch Portal'
              : 'Warehouse Operations & Inventory Ecosystem'}
          </p>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {onOpenDeliveryPortal && currentUser?.role !== 'delivery' && (
          <button
            type="button"
            onClick={onOpenDeliveryPortal}
            className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            title="Open Delivery Partner Portal"
          >
            <Truck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Delivery Portal</span>
          </button>
        )}

        {/* Active User / Portal Role Pill */}
        {currentUser ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPortalMenu(!showPortalMenu)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-1.5">
                {currentUser.role === 'manufacturer' ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 text-purple-900">
                    <Factory className="h-3.5 w-3.5" />
                  </span>
                ) : currentUser.role === 'delivery' ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-900">
                    <Truck className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-900">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className="text-left leading-tight hidden sm:block">
                  <div className="font-black text-slate-950 truncate max-w-[130px]">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-800 font-extrabold capitalize">
                    {currentUser.role === 'manufacturer' ? 'Manufacturer' : currentUser.role === 'delivery' ? 'Delivery Partner' : 'Warehouse'}
                  </div>
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-900" />
            </button>

            {/* Portal Switch Dropdown */}
            {showPortalMenu && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-300 bg-white p-2 text-xs shadow-xl z-50 space-y-1">
                <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950">
                  Switch Active Portal
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchPortal) onSwitchPortal('manufacturer');
                    setShowPortalMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    currentUser.role === 'manufacturer'
                      ? 'bg-purple-100 text-slate-950 font-black'
                      : 'hover:bg-slate-100 text-slate-900 font-bold'
                  }`}
                >
                  <Factory className="h-4 w-4 text-purple-700" />
                  <div>
                    <div className="text-slate-950 font-extrabold">Manufacturer Portal</div>
                    <div className="text-[11px] text-slate-800 font-medium">Warehouse Vacancies & Dispatch</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchPortal) onSwitchPortal('warehouse');
                    setShowPortalMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    currentUser.role === 'warehouse'
                      ? 'bg-emerald-100 text-slate-950 font-black'
                      : 'hover:bg-slate-100 text-slate-900 font-bold'
                  }`}
                >
                  <Building2 className="h-4 w-4 text-emerald-700" />
                  <div>
                    <div className="text-slate-950 font-extrabold">Warehouse & Inventory</div>
                    <div className="text-[11px] text-slate-800 font-medium">3D Model, Catalog & Stock Inward</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchPortal) onSwitchPortal('delivery');
                    setShowPortalMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    currentUser.role === 'delivery'
                      ? 'bg-blue-100 text-slate-950 font-black'
                      : 'hover:bg-slate-100 text-slate-900 font-bold'
                  }`}
                >
                  <Truck className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-slate-950 font-extrabold">Delivery Partner Portal</div>
                    <div className="text-[11px] text-slate-800 font-medium">Live Warehouse Location & QR Pickup</div>
                  </div>
                </button>

                <div className="pt-1 border-t border-slate-100">
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setShowPortalMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-bold transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Log Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* When not logged in */
          <div className="flex items-center gap-2">
            {onOpenManufacturerPortal && (
              <button
                type="button"
                onClick={onOpenManufacturerPortal}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 px-2.5 py-1.5 text-xs font-bold hover:bg-purple-100"
              >
                <Factory className="h-3.5 w-3.5" />
                <span>Manufacturer</span>
              </button>
            )}
            {onOpenDeliveryPortal && (
              <button
                type="button"
                onClick={onOpenDeliveryPortal}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 text-xs font-bold hover:bg-emerald-100"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Delivery</span>
              </button>
            )}
          </div>
        )}

        {/* Database Status Pill (Hidden for Delivery Partner) */}
        {currentUser?.role !== 'delivery' && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Database className="h-3 w-3 text-slate-500" />
            <span className="font-mono text-[11px] font-medium">
              MongoDB {dbStatus?.isEmbedded ? '(Live)' : '(Connected)'}
            </span>
          </div>
        )}

        {/* Reset Database Button (Hidden for Delivery Partner) */}
        {currentUser?.role !== 'delivery' && (
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={isResetting}
            title="Reset database to default seed data"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span className="hidden xl:inline">{isResetting ? 'Resetting...' : 'Reset Data'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
