import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  PackageSearch,
  ClipboardCheck,
  Grid3X3,
  BarChart3,
  History,
  Settings,
  Sparkles,
  Layers,
  Factory,
  Warehouse,
  Truck,
  MessageSquare,
  Boxes,
  ArrowRight,
  ArrowLeft,
  MapPin,
  QrCode,
} from 'lucide-react';

export type NavTab =
  | 'manufacturer'
  | 'dashboard'
  | 'scan'
  | 'products'
  | 'orders'
  | 'delivery-management'
  | 'warehouse'
  | 'analytics'
  | 'activity'
  | 'settings'
  | 'delivery';

export type ManufacturerSubTab = 'overview' | 'dispatch' | 'chat' | 'my-products';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  manufacturerSubTab?: ManufacturerSubTab;
  onSelectManufacturerSubTab?: (subTab: ManufacturerSubTab) => void;
  pendingOrdersCount?: number;
  lowStockCount?: number;
  isManufacturerRole?: boolean;
  isDeliveryRole?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  manufacturerSubTab = 'overview',
  onSelectManufacturerSubTab,
  pendingOrdersCount = 0,
  lowStockCount = 0,
  isManufacturerRole = false,
  isDeliveryRole = false,
}) => {
  const isManufacturerMode = currentTab === 'manufacturer';
  const isDeliveryMode = currentTab === 'delivery' || isDeliveryRole;

  // Specific features strictly for Delivery Partner
  const deliveryNavItems = [
    {
      id: 'gps-location',
      label: 'Warehouse GPS & Route',
      icon: <MapPin className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Live Map',
      badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold',
      onClick: () => {
        const el = document.getElementById('warehouse-location-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'daily-pickups',
      label: 'Daily Pickups & Scanner',
      icon: <QrCode className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Barcode',
      badgeColor: 'bg-blue-100 text-blue-950 border-blue-300 font-bold',
      onClick: () => {
        const el = document.getElementById('daily-pickups-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  // Specific features strictly for Manufacturer
  const manufacturerNavItems: {
    id: ManufacturerSubTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Warehouse Details & Vacancies',
      icon: <Warehouse className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Live Data',
      badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold',
    },
    {
      id: 'dispatch',
      label: 'Dispatch Stock as per Vacancy',
      icon: <Truck className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Send',
      badgeColor: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
    },
    {
      id: 'chat',
      label: 'Pickup Chat & Date Scheduler',
      icon: <MessageSquare className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Inventory Desk',
      badgeColor: 'bg-blue-100 text-blue-950 border-blue-300 font-bold',
    },
    {
      id: 'my-products',
      label: 'My Factory Stock (Manual List)',
      icon: <Boxes className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Listed by Me',
      badgeColor: 'bg-purple-100 text-purple-950 border-purple-300 font-bold',
    },
  ];

  // Standard Warehouse Staff Operations
  const warehouseNavItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5 text-slate-900" />,
    },
    {
      id: 'scan',
      label: 'Scan & Inward',
      icon: <ScanLine className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold',
    },
    {
      id: 'products',
      label: 'Products Catalog',
      icon: <PackageSearch className="h-4.5 w-4.5 text-slate-900" />,
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
      badgeColor: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
    },
    {
      id: 'orders',
      label: 'Orders & Picking',
      icon: <ClipboardCheck className="h-4.5 w-4.5 text-slate-900" />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: 'bg-blue-100 text-blue-950 border-blue-300 font-bold',
    },
    {
      id: 'delivery-management',
      label: 'Delivery Partners & Dispatch',
      icon: <Truck className="h-4.5 w-4.5 text-slate-900" />,
      badge: 'Daily Pickups',
      badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold',
    },
    {
      id: 'warehouse',
      label: 'Warehouse 2D & 3D Map',
      icon: <Grid3X3 className="h-4.5 w-4.5 text-slate-900" />,
      badge: '3D Model',
      badgeColor: 'bg-indigo-100 text-indigo-950 border-indigo-300 font-bold',
    },
    {
      id: 'analytics',
      label: 'Analytics & Insights',
      icon: <BarChart3 className="h-4.5 w-4.5 text-slate-900" />,
    },
    {
      id: 'activity',
      label: 'Activity Audit Log',
      icon: <History className="h-4.5 w-4.5 text-slate-900" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4.5 w-4.5 text-slate-900" />,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-300 bg-white hidden md:flex flex-col justify-between p-3.5">
      <div className="space-y-2">
        {/* Portal Switch Header Banner */}
        {isManufacturerMode ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 space-y-1 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                <Factory className="h-4 w-4 text-amber-700" />
                Manufacturer Portal
              </span>
              <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                Active
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-900 leading-tight">
              Warehouse vacancies, product dispatch, pickup chatbot & manual stock
            </p>
          </div>
        ) : isDeliveryMode ? (
          <div className="rounded-xl border border-blue-300 bg-blue-50 p-2.5 space-y-1 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-blue-700" />
                Delivery Partner
              </span>
              <span className="rounded bg-blue-200/70 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                Active Fleet
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-900 leading-tight">
              Warehouse live navigation, daily pickup manifest & dock barcode loading
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 space-y-1 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                <Warehouse className="h-4 w-4 text-emerald-700" />
                Warehouse Portal
              </span>
              <button
                type="button"
                onClick={() => onSelectTab('manufacturer')}
                className="rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white transition-all shadow-xs"
              >
                Go to Manufacturer
              </button>
            </div>
            <p className="text-[11px] font-bold text-slate-900 leading-tight">
              Inventory floor operations, 3D rack model & barcode scanning
            </p>
          </div>
        )}

        {/* Section Label in High Contrast Dark Color */}
        <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950">
          {isManufacturerMode
            ? 'Manufacturer Features'
            : isDeliveryMode
            ? 'Delivery Partner Features'
            : 'Warehouse Operations'}
        </div>

        {/* NAV ITEMS: When in Manufacturer mode, show ONLY manufacturer features; in Delivery mode, show ONLY delivery features */}
        {isManufacturerMode ? (
          <div className="space-y-1">
            {manufacturerNavItems.map((item) => {
              const isActive = manufacturerSubTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectManufacturerSubTab?.(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm ring-1 ring-slate-900'
                      : 'text-slate-950 hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-amber-400' : 'text-slate-900'}>
                      {item.icon}
                    </span>
                    <span className={`text-xs ${isActive ? 'font-black text-white' : 'font-extrabold text-slate-950'}`}>
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black border ${
                        isActive
                          ? 'bg-slate-800 text-amber-300 border-slate-700'
                          : item.badgeColor || 'bg-slate-200 text-slate-950 border-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : isDeliveryMode ? (
          <div className="space-y-1">
            {deliveryNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all text-left bg-white text-slate-950 hover:bg-blue-50/80 hover:text-blue-950 border border-slate-200 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-blue-600">{item.icon}</span>
                  <span className="text-xs font-extrabold text-slate-950">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-black border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {warehouseNavItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm ring-1 ring-slate-900'
                      : 'text-slate-950 hover:bg-slate-100 hover:text-black'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-emerald-400' : 'text-slate-900'}>
                      {item.icon}
                    </span>
                    <span className={`text-xs ${isActive ? 'font-black text-white' : 'font-extrabold text-slate-950'}`}>
                      {item.label}
                    </span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black border ${
                        isActive
                          ? 'bg-slate-800 text-white border-slate-700'
                          : item.badgeColor || 'bg-slate-200 text-slate-950 border-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Switcher & Footer Info Box */}
      <div className="space-y-2 pt-3 border-t border-slate-300">
        {isManufacturerMode ? (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 p-2.5 text-xs font-black text-slate-950 transition-all shadow-2xs"
          >
            <Warehouse className="h-4 w-4 text-emerald-700" />
            Switch to Warehouse Portal
          </button>
        ) : isDeliveryMode ? (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 p-2.5 text-xs font-black text-slate-950 transition-all shadow-2xs"
          >
            <Warehouse className="h-4 w-4 text-emerald-700" />
            Switch to Warehouse Portal
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('manufacturer')}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 p-2.5 text-xs font-black text-slate-950 transition-all shadow-2xs"
          >
            <Factory className="h-4 w-4 text-amber-700" />
            Switch to Manufacturer Portal
          </button>
        )}

        <div className="rounded-xl border border-slate-300 bg-slate-100 p-2.5 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-950 font-black text-[11px]">
            <span>Active Sync Status</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
          </div>
          <p className="text-[11px] font-bold text-slate-800 leading-snug">
            {isManufacturerMode
              ? 'Real-time vacancy tracking and pickup scheduling active.'
              : isDeliveryMode
              ? 'Live GPS warehouse navigation and barcode scanner active.'
              : 'Dynamic aisle allocation & 3D warehouse digital twin live.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
