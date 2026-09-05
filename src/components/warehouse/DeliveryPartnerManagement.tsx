import React, { useState, useEffect } from 'react';
import {
  Truck,
  User,
  Phone,
  Mail,
  Car,
  ShieldCheck,
  Plus,
  Send,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Boxes,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Edit2,
  Save,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { IDeliveryPartner, IOrder, IWarehouseLocationInfo } from '../../types.js';

export const DeliveryPartnerManagement: React.FC = () => {
  const [partners, setPartners] = useState<IDeliveryPartner[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [warehouseLocation, setWarehouseLocation] = useState<IWarehouseLocationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');

  // Assign Order Modal / Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [pickupSlot, setPickupSlot] = useState('10:00 AM - 01:00 PM');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  // Register New Partner Modal State
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    phone: '',
    email: '',
    agency: 'Delhivery',
    vehicleNumber: '',
    vehicleType: 'Motorcycle / Bike',
    licenseNumber: '',
    emergencyContact: '',
    city: 'Mumbai Central Hub',
    address: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Edit Warehouse Location State
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLat, setEditLat] = useState<number>(19.2965);
  const [editLng, setEditLng] = useState<number>(73.0631);
  const [editHours, setEditHours] = useState('');
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [partnersRes, ordersRes, whRes] = await Promise.all([
        api.getDeliveryPartnersManagement(),
        api.getOrders(),
        api.getWarehouseLocation(),
      ]);

      if (partnersRes.success) setPartners(partnersRes.partners || []);
      if (ordersRes.success) setOrders(ordersRes.orders || []);
      if (whRes.success) {
        setWarehouseLocation(whRes.warehouse);
        setEditAddress(whRes.warehouse.address);
        setEditPhone(whRes.warehouse.contactPhone);
        setEditLat(whRes.warehouse.latitude);
        setEditLng(whRes.warehouse.longitude);
        setEditHours(whRes.warehouse.operatingHours);
      }
    } catch (err) {
      console.error('Error loading delivery partner management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle warehouse owner assigning an order to a delivery partner
  const handleAssignOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedPartnerId) return;

    setIsAssigning(true);
    setAssignSuccessMsg('');

    try {
      const partnerObj = partners.find((p) => p.partnerId === selectedPartnerId);
      const res = await api.assignOrderToDeliveryPartner({
        orderId: selectedOrderId,
        partnerId: selectedPartnerId,
        partnerName: partnerObj?.name || 'Delivery Partner',
        scheduledDeliveryDate: scheduledDate,
        pickupTimeSlot: pickupSlot,
      });

      if (res.success) {
        setAssignSuccessMsg(`✓ Order ${selectedOrderId} assigned to ${partnerObj?.name || 'Partner'} for daily pickup.`);
        setSelectedOrderId('');
        await loadData();
        setTimeout(() => setAssignSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert('Error assigning order: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle registering a new delivery partner
  const handleRegisterPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name || !newPartner.phone) return;

    setIsRegistering(true);
    try {
      const res = await api.createDeliveryPartner(newPartner);
      if (res.success) {
        setShowAddPartnerModal(false);
        setNewPartner({
          name: '',
          phone: '',
          email: '',
          agency: 'Delhivery',
          vehicleNumber: '',
          vehicleType: 'Motorcycle / Bike',
          licenseNumber: '',
          emergencyContact: '',
          city: 'Mumbai Central Hub',
          address: '',
        });
        await loadData();
      }
    } catch (err: any) {
      alert('Error registering partner: ' + err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  // Save updated warehouse physical address & coordinates
  const handleSaveLocation = async () => {
    setIsSavingLocation(true);
    try {
      const res = await api.updateWarehouseLocation({
        address: editAddress,
        contactPhone: editPhone,
        latitude: editLat,
        longitude: editLng,
        operatingHours: editHours,
      });
      if (res.success) {
        setIsEditingLocation(false);
        await loadData();
      }
    } catch (err: any) {
      alert('Error updating warehouse location: ' + err.message);
    } finally {
      setIsSavingLocation(false);
    }
  };

  const filteredPartners = partners.filter((p) => {
    const q = partnerSearch.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.agency.toLowerCase().includes(q) ||
      p.vehicleNumber.toLowerCase().includes(q)
    );
  });

  const pendingOrdersToAssign = orders.filter((o) => o.status !== 'Dispatched');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white font-bold">
              <Truck className="h-4.5 w-4.5" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              Delivery Partner Dispatch & Daily Order Assignments
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            View full personal details of all delivery partners, assign warehouse products/orders for daily pickup, and configure the live warehouse address so drivers easily reach the hub.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddPartnerModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Register Partner</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Warehouse Physical Address & Live Location Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">
              Warehouse Physical Address & Navigation Coordinates
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingLocation(!isEditingLocation)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Edit2 className="h-3 w-3" />
            <span>{isEditingLocation ? 'Cancel Edit' : 'Edit Location Details'}</span>
          </button>
        </div>

        {isEditingLocation ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Full Warehouse Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Gate / Warehouse Contact Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  GPS Latitude & Longitude
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={editLat}
                    onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                    placeholder="Latitude"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={editLng}
                    onChange={(e) => setEditLng(parseFloat(e.target.value) || 0)}
                    placeholder="Longitude"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Pickup Bay Operating Hours
                </label>
                <input
                  type="text"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  placeholder="e.g. 08:00 AM - 10:00 PM"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={isSavingLocation}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Location & Live GPS</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] uppercase font-bold text-slate-500">Physical Address</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {warehouseLocation?.address || 'Plot 12-B, Industrial Freight Corridor, Bhiwandi, Mumbai'}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">{warehouseLocation?.city}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] uppercase font-bold text-slate-500">Live GPS Coordinates</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {warehouseLocation?.latitude || 19.2965}° N, {warehouseLocation?.longitude || 73.0631}° E
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                <span>Google Maps navigation enabled</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] uppercase font-bold text-slate-500">Current Warehouse Vacancy</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">
                {warehouseLocation?.availableVacancy || 860} <span className="text-xs font-bold text-slate-600">units free</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Decrements when orders are placed; restored when delivery partners pick up items!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily Order Assignment Panel (Warehouse assigns products to delivery partner) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">
              Assign Daily Product Pickups to Delivery Partner
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Assignments sync immediately to the Delivery Partner's daily list
          </span>
        </div>

        <form onSubmit={handleAssignOrder} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Select Order */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Select Warehouse Order to Dispatch
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Choose Order --</option>
                {pendingOrdersToAssign.map((ord) => (
                  <option key={ord.orderId} value={ord.orderId}>
                    {ord.orderId} - {ord.customerName} ({ord.items.length} items)
                  </option>
                ))}
              </select>
            </div>

            {/* Select Delivery Partner */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Assign to Delivery Partner
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Choose Partner --</option>
                {partners.map((p) => (
                  <option key={p.partnerId} value={p.partnerId}>
                    {p.name} ({p.agency} • {p.vehicleNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Daily Pickup Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
              </input>
            </div>

            {/* Pickup Time Slot */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Pickup Time Slot
              </label>
              <select
                value={pickupSlot}
                onChange={(e) => setPickupSlot(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="09:00 AM - 11:00 AM">Morning (09:00 AM - 11:00 AM)</option>
                <option value="11:00 AM - 01:00 PM">Noon (11:00 AM - 01:00 PM)</option>
                <option value="02:00 PM - 04:00 PM">Afternoon (02:00 PM - 04:00 PM)</option>
                <option value="04:00 PM - 06:00 PM">Evening (04:00 PM - 06:00 PM)</option>
                <option value="Express Pickup (Immediate)">Express Pickup (Immediate)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {assignSuccessMsg ? (
              <span className="text-xs font-bold text-emerald-700">{assignSuccessMsg}</span>
            ) : (
              <span className="text-xs text-slate-500">
                The driver will see the items, warehouse bins, barcodes, and destination details in their portal.
              </span>
            )}

            <button
              type="submit"
              disabled={isAssigning || !selectedOrderId || !selectedPartnerId}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isAssigning ? 'Assigning...' : 'Send Daily Pickup Assignment'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Delivery Partners Personal Details Directory */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Delivery Partner Personal Details Directory
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Contact numbers, vehicle information, license credentials, and active dispatch stats.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={partnerSearch}
              onChange={(e) => setPartnerSearch(e.target.value)}
              placeholder="Search partner by name, vehicle, phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Partners Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPartners.map((p) => (
            <div
              key={p.partnerId}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Name & Agency Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 font-black text-sm border border-slate-200">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{p.name}</h4>
                        <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.partnerId}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">{p.agency}</span>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Active Driver
                  </span>
                </div>

                {/* Personal Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                    <a
                      href={`tel:${p.phone}`}
                      className="font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="h-3 w-3 text-emerald-600" />
                      <span>{p.phone}</span>
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                    <span className="font-medium text-slate-800 truncate block mt-0.5">
                      {p.email || 'partner@logistics.in'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle & Reg No</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Car className="h-3 w-3 text-slate-500" />
                      <span>{p.vehicleNumber} ({p.vehicleType})</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Driving License</span>
                    <span className="font-mono font-medium text-slate-800 mt-0.5 block">
                      {p.licenseNumber || 'MH02 20190048291'}
                    </span>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Emergency Contact</span>
                    <span className="font-medium text-slate-800 text-[11px]">
                      {p.emergencyContact || '+91 98201 99887 (Family)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Dispatch Stats */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    Pending Pickups: <strong className="text-amber-700 font-bold">{p.pendingPickupsCount || 0}</strong>
                  </span>
                  <span>•</span>
                  <span className="text-slate-600">
                    Pickups Done: <strong className="text-emerald-700 font-bold">{p.totalPickups || 0}</strong>
                  </span>
                </div>

                <span className="text-[11px] font-bold text-slate-500">
                  {p.city}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Register New Partner Modal */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Register New Delivery Partner (Personal Details)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPartnerModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterPartner} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Logistics Agency
                  </label>
                  <select
                    value={newPartner.agency}
                    onChange={(e) => setNewPartner({ ...newPartner, agency: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="Shadowfax">Shadowfax</option>
                    <option value="Blinkit">Blinkit</option>
                    <option value="Zepto">Zepto</option>
                    <option value="BlueDart">BlueDart</option>
                    <option value="In-House">In-House Fleet</option>
                    <option value="Other">Other Courier</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                    placeholder="e.g. ramesh@agency.in"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={newPartner.vehicleNumber}
                    onChange={(e) => setNewPartner({ ...newPartner, vehicleNumber: e.target.value })}
                    placeholder="e.g. MH 02 AB 4589"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={newPartner.vehicleType}
                    onChange={(e) => setNewPartner({ ...newPartner, vehicleType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  >
                    <option value="Motorcycle / Bike">Motorcycle / Bike</option>
                    <option value="Electric Scooter">Electric Scooter</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Three-Wheeler Auto">Three-Wheeler Auto</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Driving License No.
                  </label>
                  <input
                    type="text"
                    value={newPartner.licenseNumber}
                    onChange={(e) => setNewPartner({ ...newPartner, licenseNumber: e.target.value })}
                    placeholder="e.g. DL-04201100123"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={newPartner.emergencyContact}
                    onChange={(e) => setNewPartner({ ...newPartner, emergencyContact: e.target.value })}
                    placeholder="e.g. +91 98201 12345 (Spouse)"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  className="rounded-xl border border-slate-300 px-3.5 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-bold text-white transition-all"
                >
                  {isRegistering ? 'Registering...' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
