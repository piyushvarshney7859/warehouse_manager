import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  ExternalLink,
  Building2,
  Copy,
  Check,
  Compass,
  Boxes,
  Sparkles,
  Package,
  Layers,
  Footprints,
  ChevronRight,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { IWarehouseLocationInfo, IPartnerPickupItem } from '../../types.js';
import { InsideWarehousePickupMap } from './InsideWarehousePickupMap.js';

interface WarehouseLocationCardProps {
  warehouse: IWarehouseLocationInfo | null;
  pickups?: IPartnerPickupItem[];
  selectedItemForMap?: IPartnerPickupItem | null;
  onSelectPickupItem?: (item: IPartnerPickupItem | null) => void;
  onQuickVerifyBarcode?: (barcode: string, orderId?: string) => void;
  activeTab?: 'navigation' | 'inside-map' | 'products';
  onTabChange?: (tab: 'navigation' | 'inside-map' | 'products') => void;
  onRefresh?: () => void;
}

export const WarehouseLocationCard: React.FC<WarehouseLocationCardProps> = ({
  warehouse,
  pickups = [],
  selectedItemForMap,
  onSelectPickupItem,
  onQuickVerifyBarcode,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [internalTab, setInternalTab] = useState<'navigation' | 'inside-map' | 'products'>('navigation');

  const currentTab = controlledTab ?? internalTab;
  const setTab = (tab: 'navigation' | 'inside-map' | 'products') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  if (!warehouse) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse">
        <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
        <div className="h-4 w-2/3 bg-slate-100 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
      </div>
    );
  }

  const lat = warehouse.latitude || 19.2965;
  const lng = warehouse.longitude || 73.0631;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(`${warehouse.name}, ${warehouse.address}, ${warehouse.city}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalAssignedUnits = pickups.reduce((acc, curr) => acc + curr.quantity, 0);
  const pendingPickups = pickups.filter((p) => !p.isPicked);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {warehouse.name}
                </h2>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Target Pickup Hub
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{warehouse.address}, {warehouse.city}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all shadow-xs"
              title="Copy full warehouse address"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Address</span>
                </>
              )}
            </button>

            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-sm shadow-emerald-900/30"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Live GPS Directions</span>
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>
          </div>
        </div>

        {/* Navigation Mode Tabs */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('navigation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'navigation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Compass className="h-3.5 w-3.5 text-emerald-500" />
            <span>Highway GPS & Road Navigation</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('inside-map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'inside-map'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Footprints className="h-3.5 w-3.5 text-emerald-300" />
            <span>Inside Warehouse Pickup Map</span>
            <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
              Bay 3 & Bins
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('products')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'products'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Package className="h-3.5 w-3.5 text-blue-400" />
            <span>Products to Pick Up ({pickups.length})</span>
            {pendingPickups.length > 0 && (
              <span className="rounded-full bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[10px] font-black">
                {pendingPickups.length} pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: HIGHWAY GPS & ROAD ROUTE NAVIGATION */}
      {currentTab === 'navigation' && (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
          {/* Location Visual & Road Navigation */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                      <Compass className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Live Warehouse Location & Easy Arrival Guide
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Follow live coordinates directly to commercial pickup bay and vehicle loading dock.
                  </p>
                </div>
                <span className="rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-mono font-bold text-slate-700 shadow-xs">
                  GPS: {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
                </span>
              </div>

              {/* Stylized Visual Map Route Representation */}
              <div className="relative rounded-xl border border-slate-200 bg-white p-3.5 overflow-hidden shadow-xs">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:14px_14px] opacity-60 pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Partner Starting Point */}
                  <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs w-full sm:w-auto">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-700 font-bold">
                      📍
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Your Current Location</div>
                      <div className="text-[10px] text-slate-700 font-medium">Within Delivery Zone</div>
                    </div>
                  </div>

                  {/* Transit Indicator */}
                  <div className="flex items-center gap-2 text-slate-700 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ETA: ~7–10 Mins • 2.8 km (Clear Traffic)</span>
                    <Navigation className="h-3 w-3 text-emerald-600 rotate-45" />
                  </div>

                  {/* Warehouse Destination */}
                  <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs w-full sm:w-auto">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white font-bold">
                      🏢
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{warehouse.name}</div>
                      <div className="text-[10px] text-emerald-700 font-bold">{warehouse.dockBays || 'Gate 3 • Dock 1-6'}</div>
                    </div>
                  </div>
                </div>

                {/* Address bar footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-medium truncate max-w-md">
                    Full Physical Address: <strong className="text-slate-900">{warehouse.address}, {warehouse.city}</strong>
                  </span>
                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Open in Navigation App</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* VISIBLE PRODUCTS TO PICK UP AT THIS PARTICULAR WAREHOUSE */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white">
                    <Package className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      Products to Pick Up at this Warehouse
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Assigned freight items waiting for loading into your vehicle from {warehouse.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-100 border border-blue-200 px-2 py-1 text-[11px] font-bold text-blue-900">
                    {pickups.length} Items ({totalAssignedUnits} Units)
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('inside-map')}
                    className="flex items-center gap-1 text-xs font-black text-blue-700 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
                  >
                    <span>View Inside Map</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {pickups.length === 0 ? (
                <div className="p-3 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
                  No assigned products pending pickup for this warehouse yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pickups.slice(0, 4).map((item) => (
                    <div
                      key={item.uniqueId}
                      onClick={() => {
                        onSelectPickupItem?.(item);
                        setTab('inside-map');
                      }}
                      className="cursor-pointer p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{item.sku}</span>
                          <span>•</span>
                          <span className="font-bold text-blue-700">{item.quantity} units</span>
                          <span>•</span>
                          <span className="truncate">To: {item.customerName}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 block">
                          {item.location.row}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                          Bin {item.location.bin}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pickups.length > 4 && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setTab('products')}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    + {pickups.length - 4} more products for this warehouse (View all)
                  </button>
                </div>
              )}
            </div>

            {/* Warehouse Contact & Operating Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <Phone className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-700 uppercase font-black tracking-wider">Warehouse Helpdesk / Dock Gate</div>
                  <a
                    href={`tel:${warehouse.contactPhone.replace(/\s+/g, '')}`}
                    className="text-xs font-black text-emerald-700 hover:underline truncate block"
                  >
                    {warehouse.contactPhone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-700 uppercase font-black tracking-wider">Pickup Bay Hours</div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {warehouse.operatingHours}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Live Warehouse Vacant Data Indicator */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-emerald-600" />
                  Warehouse Vacant Data
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Live Capacity
                </span>
              </div>
              <p className="text-xs text-slate-600">
                When you scan and pick up items, bin space is automatically restored to vacant data in real time.
              </p>

              {/* Vacancy Metric Card */}
              <div className="mt-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-emerald-900">Available Vacancy</span>
                  <span className="text-2xl font-black text-emerald-700">
                    {warehouse.availableVacancy} <span className="text-xs font-bold text-emerald-800">units free</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-emerald-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, warehouse.vacancyPercentage))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <span>Occupied: <strong>{warehouse.currentOccupancy}</strong> units</span>
                  <span>Total: <strong>{warehouse.totalCapacity}</strong> units</span>
                </div>
              </div>

              {/* Quick Arrival Gate Checklist */}
              <div className="mt-3.5 rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                  Arrival at Warehouse
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-blue-700">1.</span>
                    <span>Enter via <strong>Commercial Gate 3</strong>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-blue-700">2.</span>
                    <span>Park vehicle at <strong>Dock Bay 3</strong>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-blue-700">3.</span>
                    <span>Use <strong>Inside Warehouse Map</strong> to retrieve items from Aisles A, B, C.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-blue-700">4.</span>
                    <span>Scan barcode at <strong>Outbound Staging Desk</strong>.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Notice */}
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Every confirmed pickup restores bin occupancy and automatically synchronizes vacant space in the warehouse & manufacturer portal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: INSIDE WAREHOUSE PICKUP MAP & FLOORPLAN */}
      {currentTab === 'inside-map' && (
        <div className="p-4 sm:p-5 animate-in fade-in duration-200">
          <InsideWarehousePickupMap
            warehouse={warehouse}
            pickups={pickups}
            selectedItem={selectedItemForMap}
            onSelectItem={onSelectPickupItem}
            onQuickVerifyBarcode={onQuickVerifyBarcode}
          />
        </div>
      )}

      {/* TAB CONTENT 3: ASSIGNED PRODUCTS MANIFEST */}
      {currentTab === 'products' && (
        <div className="p-4 sm:p-5 animate-in fade-in duration-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Products Manifest for {warehouse.name}
              </h3>
              <p className="text-xs text-slate-500">
                All freight items scheduled for pickup on this trip, categorized by aisle and bin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab('inside-map')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all w-fit"
            >
              <Footprints className="h-3.5 w-3.5" />
              <span>Show Entire Pickup Route on Floorplan</span>
            </button>
          </div>

          {pickups.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Package className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">No Assigned Products</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                The warehouse operator has not assigned any pending products for this partner yet.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pickups.map((item) => (
                <div
                  key={item.uniqueId}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.orderId}
                      </span>
                      {item.isPicked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Picked & Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Pending Pickup
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-black text-slate-900 leading-snug">
                      {item.productName}
                    </h4>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>SKU: <strong className="font-mono text-slate-700">{item.sku}</strong></span>
                      <span>•</span>
                      <span>Qty: <strong className="text-slate-900 font-bold">{item.quantity} units</strong></span>
                    </div>

                    <div className="mt-2 text-xs text-slate-600 flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">
                        Customer: <strong>{item.customerName}</strong> ({item.destination})
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                        {item.location.row} • Bin {item.location.bin}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectPickupItem?.(item);
                        setTab('inside-map');
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Footprints className="h-3 w-3 text-blue-600" />
                      <span>Locate on Inside Map</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
