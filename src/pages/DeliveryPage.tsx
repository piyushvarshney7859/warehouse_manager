import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  QrCode,
  Barcode as BarcodeIcon,
  UserCheck,
  Phone,
  Car,
  ChevronDown,
  Building2,
  Boxes,
  Compass,
  LogOut,
  Factory,
} from 'lucide-react';
import { api } from '../services/api.js';
import { IDeliveryPartner, IWarehouseLocationInfo, IAuthUser, IPartnerPickupItem } from '../types.js';
import { WarehouseLocationCard } from '../components/delivery/WarehouseLocationCard.js';
import { DailyPickupScannerList } from '../components/delivery/DailyPickupScannerList.js';

interface DeliveryPageProps {
  currentUser?: IAuthUser | null;
  onLogout?: () => void;
  onSwitchPortal?: (targetRole: 'manufacturer' | 'warehouse' | 'delivery') => void;
}

export const DeliveryPage: React.FC<DeliveryPageProps> = ({ currentUser, onLogout, onSwitchPortal }) => {
  // Current active delivery partner
  const [partner, setPartner] = useState<IDeliveryPartner | null>(null);
  const [availablePartners, setAvailablePartners] = useState<IDeliveryPartner[]>([]);
  const [warehouseLocation, setWarehouseLocation] = useState<IWarehouseLocationInfo | null>(null);
  const [pickups, setPickups] = useState<IPartnerPickupItem[]>([]);
  const [selectedItemForMap, setSelectedItemForMap] = useState<IPartnerPickupItem | null>(null);
  const [mapActiveTab, setMapActiveTab] = useState<'navigation' | 'inside-map' | 'products'>('navigation');
  const [isLoading, setIsLoading] = useState(true);
  const [showPartnerSwitcher, setShowPartnerSwitcher] = useState(false);

  // Load initial partner data and warehouse location
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [partnersRes, whRes] = await Promise.all([
        api.getDeliveryPartnersManagement(),
        api.getWarehouseLocation(),
      ]);

      let activePartner: IDeliveryPartner | null = null;
      if (partnersRes.success && partnersRes.partners.length > 0) {
        setAvailablePartners(partnersRes.partners);
        // Default to logged-in user or first active partner
        const matched = partnersRes.partners.find(
          (p) => p.phone === currentUser?.phone || p.name === currentUser?.name
        );
        activePartner = matched || partnersRes.partners[0];
        setPartner(activePartner);
      }

      if (whRes.success) {
        setWarehouseLocation(whRes.warehouse);
      }

      // Pre-load assigned pickups for the active delivery partner
      if (activePartner) {
        const pickupsRes = await api.getAssignedPickups({
          partnerId: activePartner.partnerId,
          phone: activePartner.phone,
        });
        if (pickupsRes.success) {
          setPickups(pickupsRes.pickups || []);
        }
      }
    } catch (err) {
      console.error('Failed to load delivery portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  // Navigate to and highlight an item inside the warehouse floorplan
  const handleLocateInsideWarehouse = (item: IPartnerPickupItem) => {
    setSelectedItemForMap(item);
    setMapActiveTab('inside-map');
    const el = document.getElementById('warehouse-location-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Callback when a barcode pickup is confirmed
  const handlePickupConfirmed = async (resultData: any) => {
    // Refresh warehouse location/vacancy
    try {
      const whRes = await api.getWarehouseLocation();
      if (whRes.success) {
        setWarehouseLocation(whRes.warehouse);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Delivery Partner Top Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  Delivery Partner Portal
                </h1>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Pickup & Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Warehouse live GPS navigation, dock bay loading instructions, and daily pickup barcode confirmation.
              </p>
            </div>
          </div>

          {/* Active Partner Profile, Portal Switcher & Logout */}
          <div className="flex items-center gap-2">
            {partner && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPartnerSwitcher(!showPartnerSwitcher)}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 px-3 py-2 text-xs transition-all text-left shadow-xs"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-[11px]">
                    {partner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-black text-slate-900 flex items-center gap-1">
                      <span>{partner.name}</span>
                      <ChevronDown className="h-3 w-3 text-slate-500" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {partner.agency} • {partner.vehicleNumber}
                    </div>
                  </div>
                </button>

                {/* Partner Switcher Dropdown */}
                {showPartnerSwitcher && (
                  <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-white border border-slate-200 shadow-xl p-2 z-30 divide-y divide-slate-100">
                    <div>
                      <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                        Switch Delivery Partner Profile
                      </div>
                      <div className="pt-1 space-y-1 max-h-48 overflow-y-auto">
                        {availablePartners.map((p) => (
                          <button
                            key={p.partnerId}
                            type="button"
                            onClick={() => {
                              setPartner(p);
                              setShowPartnerSwitcher(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              p.partnerId === partner.partnerId
                                ? 'bg-blue-50 text-blue-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{p.name}</div>
                              <div className="text-[10px] text-slate-500">{p.agency} • {p.phone}</div>
                            </div>
                            {p.partnerId === partner.partnerId && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Portal Switch Links */}
                    {onSwitchPortal && (
                      <div className="pt-2 mt-1 space-y-1">
                        <div className="px-2 py-0.5 text-[10px] uppercase font-bold text-slate-400">
                          Switch Active Portal
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPartnerSwitcher(false);
                            onSwitchPortal('warehouse');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-emerald-50 text-slate-800 font-bold"
                        >
                          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Warehouse & Inventory</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPartnerSwitcher(false);
                            onSwitchPortal('manufacturer');
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-purple-50 text-slate-800 font-bold"
                        >
                          <Factory className="h-3.5 w-3.5 text-purple-600" />
                          <span>Manufacturer Portal</span>
                        </button>
                      </div>
                    )}

                    {onLogout && (
                      <div className="pt-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPartnerSwitcher(false);
                            onLogout();
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-bold transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Log Out to Login Portal</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Direct Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Log Out & Switch User"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 px-3 py-2 text-xs font-bold text-slate-700 transition-all shadow-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION 1: Warehouse Address, Road GPS & Inside Warehouse Pickup Map */}
        <div id="warehouse-location-section">
          <WarehouseLocationCard
            warehouse={warehouseLocation}
            pickups={pickups}
            selectedItemForMap={selectedItemForMap}
            onSelectPickupItem={setSelectedItemForMap}
            activeTab={mapActiveTab}
            onTabChange={setMapActiveTab}
            onRefresh={loadInitialData}
          />
        </div>

        {/* SECTION 2: Daily Products to Pick Up with Barcode / QR Confirmation */}
        <div id="daily-pickups-section">
          <DailyPickupScannerList
            partner={partner}
            onPickupConfirmed={handlePickupConfirmed}
            onLocateInsideWarehouse={handleLocateInsideWarehouse}
            onPickupsLoaded={setPickups}
          />
        </div>
      </div>
    </div>
  );
};
