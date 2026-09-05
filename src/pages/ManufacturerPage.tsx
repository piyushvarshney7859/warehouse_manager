import React, { useState, useEffect } from 'react';
import {
  Factory,
  Warehouse,
  Package,
  Calendar,
  Truck,
  Plus,
  ArrowUpRight,
  MapPin,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Boxes,
  MessageSquare,
  Sparkles,
  Edit3,
  Trash2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  IWarehouseVacancy,
  IInboundShipment,
  IManufacturerProduct,
  IAuthUser,
} from '../types.js';
import { api } from '../services/api.js';
import { ManufacturerChatbot } from '../components/ManufacturerChatbot.js';
import { ManufacturerManualProductModal } from '../components/ManufacturerManualProductModal.js';

interface ManufacturerPageProps {
  currentUser?: IAuthUser | null;
}

export const ManufacturerPage: React.FC<ManufacturerPageProps> = ({ currentUser }) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'my-products' | 'chat'>('overview');

  // Core Data
  const [warehouses, setWarehouses] = useState<IWarehouseVacancy[]>([]);
  const [shipments, setShipments] = useState<IInboundShipment[]>([]);
  const [myProducts, setMyProducts] = useState<IManufacturerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IManufacturerProduct | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showFloatingChat, setShowFloatingChat] = useState(false);

  // Dispatch Form State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('WH-01');
  const [selectedProductSku, setSelectedProductSku] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [quantity, setQuantity] = useState<number>(50);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState<string>(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [carrierName, setCarrierName] = useState('BlueDart Freight Express');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filters
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [whRes, shipRes, prodRes] = await Promise.all([
        api.getWarehouseVacancies(),
        api.getInboundShipments(),
        api.getManufacturerProducts(),
      ]);

      if (whRes.success) setWarehouses(whRes.warehouses || []);
      if (shipRes.success) setShipments(shipRes.shipments || []);
      if (prodRes.success) setMyProducts(prodRes.products || []);
    } catch (err) {
      console.error('Failed to load manufacturer portal data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Total units physically present at factory
  const totalFactoryUnitsPresent = myProducts.reduce(
    (acc, curr) => acc + (curr.unitsPresent || 0),
    0
  );

  // Open Dispatch Modal with specific product pre-filled
  const handleOpenDispatchForProduct = (prod: IManufacturerProduct, targetWhId?: string) => {
    setProductName(prod.name);
    setSku(prod.sku);
    setBarcode(prod.barcode);
    setCategory(prod.category);
    setSelectedProductSku(prod.sku);

    // Pick target warehouse with largest vacancy if not specified
    if (targetWhId) {
      setSelectedWarehouseId(targetWhId);
    } else if (warehouses.length > 0) {
      const sortedByVacancy = [...warehouses].sort(
        (a, b) => b.availableVacancy - a.availableVacancy
      );
      setSelectedWarehouseId(sortedByVacancy[0].warehouseId);
    }

    // Default quantity capped to available present units
    const defaultQty = Math.min(Math.max(1, prod.unitsPresent), 50);
    setQuantity(defaultQty);
    setShowDispatchModal(true);
  };

  const handleOpenDispatch = (targetWhId?: string) => {
    if (targetWhId) {
      setSelectedWarehouseId(targetWhId);
    }
    if (myProducts.length > 0) {
      const first = myProducts[0];
      setProductName(first.name);
      setSku(first.sku);
      setBarcode(first.barcode);
      setCategory(first.category);
      setSelectedProductSku(first.sku);
      setQuantity(Math.min(Math.max(1, first.unitsPresent), 50));
    }
    setShowDispatchModal(true);
  };

  const handleSelectExistingProduct = (prodSku: string) => {
    const selected = myProducts.find((p) => p.sku === prodSku);
    if (selected) {
      setSelectedProductSku(selected.sku);
      setProductName(selected.name);
      setSku(selected.sku);
      setBarcode(selected.barcode);
      setCategory(selected.category);
      if (selected.unitsPresent < quantity) {
        setQuantity(Math.max(1, selected.unitsPresent));
      }
    }
  };

  const handleQuickAdjustStock = async (
    prod: IManufacturerProduct,
    delta: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!prod._id) return;
    try {
      const res = await api.adjustManufacturerProductStock(
        prod._id,
        delta,
        'Factory Batch Finished'
      );
      if (res.success && res.product) {
        setMyProducts((prev) =>
          prev.map((p) => (p._id === prod._id ? { ...p, unitsPresent: res.product!.unitsPresent } : p))
        );
        setActionSuccessMsg(
          `Updated factory stock for ${prod.name}: ${res.product.unitsPresent} units present (${delta >= 0 ? '+' : ''}${delta}).`
        );
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  const handleDeleteProduct = async (prod: IManufacturerProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!prod._id) return;
    if (!window.confirm(`Are you sure you want to remove "${prod.name}" from your factory catalog?`)) {
      return;
    }
    try {
      const res = await api.deleteManufacturerProduct(prod._id);
      if (res.success) {
        setMyProducts((prev) => prev.filter((p) => p._id !== prod._id));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const handleSaveProduct = async (prodData: IManufacturerProduct) => {
    try {
      if (editingProduct?._id) {
        const res = await api.updateManufacturerProduct(editingProduct._id, prodData);
        if (res.success) {
          setActionSuccessMsg(`Product ${res.product?.sku} updated in factory catalog.`);
          loadData();
        }
      } else {
        const res = await api.addManufacturerProduct(prodData);
        if (res.success) {
          setActionSuccessMsg(
            `Product ${res.product?.name} manually added with ${res.product?.unitsPresent} units present!`
          );
          loadData();
        }
      }
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleDispatchStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionSuccessMsg(null);

    // Validation: Check if factory has enough units present
    const matchedProduct = myProducts.find((p) => p.sku === sku);
    if (matchedProduct && matchedProduct.unitsPresent < Number(quantity)) {
      alert(
        `Insufficient factory inventory! You only have ${matchedProduct.unitsPresent} units of ${matchedProduct.name} present at your factory, but are trying to dispatch ${quantity} units.`
      );
      setSubmitting(false);
      return;
    }

    // Validation: Check target warehouse vacancy
    const targetWh = warehouses.find((w) => w.warehouseId === selectedWarehouseId);
    if (targetWh && targetWh.availableVacancy < Number(quantity)) {
      alert(
        `Destination warehouse ${targetWh.code} only has ${targetWh.availableVacancy} units available space. Please reduce quantity or choose a warehouse with higher vacancy.`
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.createInboundShipment({
        manufacturerName: currentUser?.companyName || 'Apex Industrial Manufacturing Ltd.',
        manufacturerContact: currentUser?.phone || '+91 98100 11223',
        targetWarehouseId: selectedWarehouseId,
        productName,
        sku,
        barcode,
        category,
        quantity: Number(quantity),
        expectedArrivalDate,
        carrierName,
        notes,
      });

      if (res.success) {
        setActionSuccessMsg(
          `Shipment ${res.shipment?.shipmentId} dispatched successfully to ${targetWh?.name}! Scheduled to arrive on ${new Date(
            expectedArrivalDate
          ).toLocaleDateString()}. Deducted ${quantity} units from your factory stock.`
        );
        setShowDispatchModal(false);
        setNotes('');
        loadData();
        setTimeout(() => setActionSuccessMsg(null), 6000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch stock');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.warehouseId === selectedWarehouseId);
  const selectedProduct = myProducts.find((p) => p.sku === selectedProductSku);

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    if (warehouseFilter !== 'ALL' && s.targetWarehouseId !== warehouseFilter) return false;
    if (
      searchQuery &&
      !s.productName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.shipmentId.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
              <Factory className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Manufacturer Stock Dispatch & Warehouse Vacancy Portal
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-medium">
            Monitor real-time warehouse vacancies, manage your factory stock present, dispatch goods as per vacancy, and coordinate pickup schedules directly with inventory desk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-950 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setShowManualProductModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 text-xs font-extrabold text-amber-950 transition-all shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 text-amber-900" /> List Factory Product
          </button>

          <button
            type="button"
            onClick={() => handleOpenDispatch()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-extrabold text-white transition-all shadow-md shadow-amber-900/20"
          >
            <Truck className="h-3.5 w-3.5" /> Dispatch to Warehouse
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold transition-all shadow-xs ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-md'
                : 'border border-blue-300 bg-blue-50 text-blue-950 hover:bg-blue-100'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-blue-700" /> Pickup Coordinator Chat
          </button>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-950 font-bold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-amber-100 text-amber-950 border border-amber-400 font-extrabold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <Warehouse className="h-3.5 w-3.5 text-amber-800" />
          Warehouse Details & Vacancies
          <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-mono font-bold text-slate-900">
            {warehouses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-products')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'my-products'
              ? 'bg-amber-100 text-amber-950 border border-amber-400 font-extrabold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <Boxes className="h-3.5 w-3.5 text-amber-800" />
          My Factory Stock (Manually Listed)
          <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-mono font-black text-amber-950 border border-amber-300">
            {totalFactoryUnitsPresent} units
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'chat'
              ? 'bg-blue-100 text-blue-950 border border-blue-400 font-extrabold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5 text-blue-700" />
          Pickup & Dock Coordination Chatbot
          <span className="ml-1 rounded-full bg-blue-200 px-1.5 py-0.2 text-[10px] font-black text-blue-950 border border-blue-300">
            Live
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW (Warehouse Details & Vacancies Matrix + Inbound Schedule) */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* SECTION 1: WAREHOUSE DETAILS & VACANCY MATRIX */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-amber-700" />
                  Warehouse Details & Live Storage Vacancy
                </h2>
                <p className="text-xs text-slate-700 font-medium">
                  Real-time storage vacancy per fulfillment center. Dispatch goods to warehouses with verified open capacity.
                </p>
              </div>
              <span className="text-xs text-slate-700 font-mono font-bold">
                {warehouses.length} Active Fulfillment Centers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {warehouses.map((wh) => {
                const isHighVacancy = wh.vacancyStatus === 'high';
                const isModerate = wh.vacancyStatus === 'moderate';

                return (
                  <div
                    key={wh.warehouseId}
                    className={`rounded-2xl border bg-white p-4 flex flex-col justify-between transition-all hover:border-slate-300 shadow-sm ${
                      isHighVacancy
                        ? 'border-emerald-300 hover:border-emerald-500'
                        : isModerate
                        ? 'border-blue-300 hover:border-blue-500'
                        : 'border-amber-300 hover:border-amber-500'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-950 border border-slate-300">
                              {wh.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">{wh.city}</span>
                          </div>
                          <h3 className="text-sm font-black text-slate-950 mt-1 leading-snug">{wh.name}</h3>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isHighVacancy
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isModerate
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          {isHighVacancy ? 'High Vacancy' : isModerate ? 'Moderate' : 'Near Full'}
                        </span>
                      </div>

                      {/* Vacancy Metric Card */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                            Available Vacancy
                          </span>
                          <span
                            className={`text-lg font-black tracking-tight ${
                              isHighVacancy
                                ? 'text-emerald-700'
                                : isModerate
                                ? 'text-blue-700'
                                : 'text-amber-800'
                            }`}
                          >
                            {wh.availableVacancy} <span className="text-xs font-semibold text-slate-600">units</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHighVacancy
                                ? 'bg-emerald-600'
                                : isModerate
                                ? 'bg-blue-600'
                                : 'bg-amber-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, wh.vacancyPercentage))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-700">
                          <span>Occupied: <strong className="font-bold text-slate-900">{wh.currentOccupancy}</strong> / {wh.totalCapacity}</span>
                          <span className="font-black text-slate-950">{wh.vacancyPercentage}% Free</span>
                        </div>
                      </div>

                      {/* Logistics Specs */}
                      <div className="space-y-1 text-[11px] text-slate-700">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{wh.address}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span>
                            Inbound Bays: <strong className="text-slate-950 font-bold">{wh.inboundDockCount} Docks</strong>
                          </span>
                          {wh.pendingInboundUnits > 0 && (
                            <span className="text-amber-800 font-bold">
                              +{wh.pendingInboundUnits} en route
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Send Stock Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(wh.warehouseId)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-1 rounded-lg border border-amber-400 bg-amber-50 hover:bg-amber-600 hover:text-white hover:border-amber-600 py-2 text-xs font-extrabold text-amber-950 transition-all shadow-xs"
                    >
                      Send Stock as per Vacancy <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: FAST SHORTCUT TO FACTORY PRODUCTS LIST */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-amber-700" />
                  Your Factory Products Ready to Send
                </h2>
                <p className="text-xs text-slate-700 font-medium">
                  Select any manufactured product below to dispatch directly into available warehouse vacancy.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setShowManualProductModal(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Manually List Product
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-products')}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline inline-flex items-center gap-1"
                >
                  View All ({myProducts.length}) <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myProducts.slice(0, 3).map((prod) => (
                <div
                  key={prod._id || prod.sku}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 flex flex-col justify-between hover:border-slate-300 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-900">
                        {prod.sku}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        {prod.unitsPresent} units present
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-950 mt-1.5 line-clamp-1">{prod.name}</h4>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                      Barcode: {prod.barcode} • {prod.category}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDispatchForProduct(prod)}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-500 py-1.5 text-xs font-bold text-white transition-all shadow-xs"
                  >
                    Send to Warehouse as per Vacancy <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: INBOUND SHIPMENTS & ARRIVAL SCHEDULE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-700" />
                  Inbound Dispatches & Confirmed Arrival Dates
                </h2>
                <p className="text-xs text-slate-700 font-medium">
                  Tracking sent batches, logistics lines, and warehouse receiving dock statuses.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-bold shadow-xs focus:outline-hidden"
                >
                  <option value="ALL">All Destination Hubs</option>
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.code} - {w.city}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search shipment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-36 sm:w-48 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 font-medium shadow-xs focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-800 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">Shipment & Carrier</th>
                      <th className="py-3 px-4">Destination Hub</th>
                      <th className="py-3 px-4">Product & SKU</th>
                      <th className="py-3 px-4">Units Sent</th>
                      <th className="py-3 px-4">Arrival Date (ETA)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredShipments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                          No matching inbound shipments found.
                        </td>
                      </tr>
                    ) : (
                      filteredShipments.map((s) => {
                        const arrivalDate = new Date(s.expectedArrivalDate);
                        const today = new Date();
                        const isToday = arrivalDate.toDateString() === today.toDateString();

                        return (
                          <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-mono font-black text-slate-950">{s.shipmentId}</div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                                <Truck className="h-3 w-3 text-slate-500" />
                                <span>{s.carrierName}</span>
                                <span className="text-slate-400">•</span>
                                <span className="font-mono text-slate-700">{s.trackingNumber}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-black text-slate-950">{s.targetWarehouseName}</div>
                              <div className="text-[11px] text-amber-800 font-mono font-bold">
                                {s.targetWarehouseId}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-950">{s.productName}</div>
                              <div className="text-[11px] text-slate-600 font-mono font-medium">
                                SKU: {s.sku} | Barcode: {s.barcode}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono font-black text-slate-950 text-sm">
                                {s.quantity}
                              </span>{' '}
                              <span className="text-slate-600 text-[11px] font-semibold">units</span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-amber-700" />
                                <span className="font-bold text-slate-950">
                                  {arrivalDate.toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="mt-0.5">
                                {isToday ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                                    Arriving Today
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-blue-800 font-bold">
                                    Scheduled Arrival
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  s.status === 'Received'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                    : s.status === 'In Transit'
                                    ? 'bg-amber-50 text-amber-900 border border-amber-300'
                                    : 'bg-blue-50 text-blue-800 border border-blue-300'
                                }`}
                              >
                                {s.status === 'Received' ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {s.status}
                              </span>
                              {s.assignedBin && (
                                <div className="text-[10px] text-emerald-800 font-mono font-bold mt-0.5">
                                  Slotted: {s.assignedBin}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY FACTORY STOCK (Feature: their own no. of products present that they list manually) */}
      {activeTab === 'my-products' && (
        <div className="space-y-4">
          {/* Header & Stats Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-amber-700" />
                Manufactured Products & Factory Stock Registry
              </h2>
              <p className="text-xs text-slate-700 font-medium">
                Manually record products manufactured at your plant, track exact units present in factory storage, and dispatch them to fulfillment warehouses based on live vacancies.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right">
                <div className="text-xs font-semibold text-slate-700">Total Factory Inventory</div>
                <div className="text-lg font-black text-amber-900 font-mono">
                  {totalFactoryUnitsPresent} <span className="text-xs font-semibold text-slate-600">units</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setShowManualProductModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-amber-900/20"
              >
                <Plus className="h-4 w-4" /> Add Manufactured Product
              </button>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myProducts.map((prod) => {
              const isLowStock = prod.unitsPresent < 50;

              return (
                <div
                  key={prod._id || prod.sku}
                  className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all shadow-sm"
                >
                  <div className="space-y-2.5">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-sm bg-amber-100 text-amber-950 border border-amber-300">
                          {prod.category}
                        </span>
                        <h3 className="text-sm font-black text-slate-950 mt-1.5 leading-snug">{prod.name}</h3>
                        <div className="text-[11px] font-mono text-slate-600 font-semibold mt-0.5">
                          SKU: {prod.sku} | Barcode: {prod.barcode}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setShowManualProductModal(true);
                          }}
                          title="Edit Product & Quantity"
                          className="p-1 rounded-md text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProduct(prod, e)}
                          title="Remove Product"
                          className="p-1 rounded-md text-slate-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Prominent Units Present Display */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          No. of Products Present (Factory)
                        </span>
                        <span
                          className={`text-xl font-black font-mono tracking-tight ${
                            isLowStock ? 'text-amber-800' : 'text-emerald-800'
                          }`}
                        >
                          {prod.unitsPresent}{' '}
                          <span className="text-xs font-semibold text-slate-600">{prod.unitOfMeasure || 'units'}</span>
                        </span>
                      </div>

                      {/* Fast adjust buttons */}
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[11px]">
                        <span className="text-slate-700 font-semibold">Quick adjust:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdjustStock(prod, 25, e)}
                            className="rounded-md border border-slate-300 bg-white hover:bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-900 font-bold shadow-xs"
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdjustStock(prod, 50, e)}
                            className="rounded-md border border-slate-300 bg-white hover:bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-900 font-bold shadow-xs"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdjustStock(prod, 100, e)}
                            className="rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 font-mono text-[10px] text-emerald-800 font-black shadow-xs"
                          >
                            +100
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Batch & Price */}
                    <div className="flex items-center justify-between text-[11px] text-slate-700 px-1 font-medium">
                      <span>Batch: <strong className="text-slate-950 font-mono font-bold">{prod.batchNumber || 'STANDARD'}</strong></span>
                      {prod.unitPrice ? (
                        <span>Wholesale: <strong className="text-slate-950 font-mono font-bold">${prod.unitPrice}</strong></span>
                      ) : null}
                    </div>
                  </div>

                  {/* Send to Warehouse as per Vacancy Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenDispatchForProduct(prod)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 py-2.5 text-xs font-bold text-white transition-all shadow-sm"
                  >
                    Send to Warehouse as per Vacancy <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CHATBOT: MANUFACTURER <-> INVENTORY LOGISTICS */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 text-xs text-blue-950 flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700 shrink-0" />
              <span>
                <strong className="font-black text-blue-950">Direct Inventory Coordinator Chat:</strong> Share conversations regarding pickup time and date for your manufactured products, request gate pass codes, and coordinate dock unloading.
              </span>
            </div>
          </div>

          <ManufacturerChatbot
            warehouses={warehouses}
            products={myProducts}
            onShipmentScheduled={loadData}
          />
        </div>
      )}

      {/* DISPATCH NEW STOCK MODAL (as per vacancy) */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                  <Factory className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950">Dispatch Stock as per Vacancy</h3>
                  <p className="text-[11px] text-slate-700 font-medium">
                    Route your manufactured goods to the warehouse with available receiving capacity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-600 hover:text-slate-950 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatchStock} className="space-y-3">
              {/* Target Warehouse Selector with Vacancies */}
              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Destination Warehouse (Live Vacancy)
                </label>
                <select
                  required
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.warehouseId} value={wh.warehouseId}>
                      {wh.code}: {wh.name} — ({wh.availableVacancy} units available / {wh.vacancyPercentage}% vacancy)
                    </option>
                  ))}
                </select>
                {selectedWarehouse && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-700 font-medium">
                    <span>
                      Free Space: <strong className="text-emerald-800 font-bold">{selectedWarehouse.availableVacancy} units</strong>
                    </span>
                    <span>City: {selectedWarehouse.city}</span>
                  </div>
                )}
              </div>

              {/* Quick Pick from My Factory Products */}
              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Select from Your Factory Stock:
                </label>
                <select
                  value={selectedProductSku}
                  onChange={(e) => handleSelectExistingProduct(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
                >
                  <option value="">-- Choose from your manufactured products --</option>
                  {myProducts.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} (SKU: {p.sku}) — {p.unitsPresent} units present at factory
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="mt-1 text-[11px] text-amber-900 font-bold flex items-center justify-between">
                    <span>Units present in your factory: <strong>{selectedProduct.unitsPresent} units</strong></span>
                    <span>Category: {selectedProduct.category}</span>
                  </div>
                )}
              </div>

              {/* Product Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-black text-slate-950 block mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Headphones"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-semibold focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-950 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APX-AUD-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-mono uppercase font-bold focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Barcode & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-black text-slate-950 block mb-1">Barcode (1D / 2D)</label>
                  <input
                    type="text"
                    placeholder="e.g. 8901001001"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-mono font-bold focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-950 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Audio">Audio</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
              </div>

              {/* Quantity & Arrival Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-950">Units to Send</label>
                    {selectedProduct && (
                      <span className="text-[10px] text-amber-900 font-mono font-bold">
                        Max: {selectedProduct.unitsPresent} units
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={
                      selectedProduct
                        ? selectedProduct.unitsPresent
                        : selectedWarehouse
                        ? selectedWarehouse.availableVacancy
                        : 500
                    }
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-black focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-950 block mb-1">
                    Expected Arrival Date (ETA)
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedArrivalDate}
                    onChange={(e) => setExpectedArrivalDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Carrier */}
              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Freight Carrier / Logistics Line
                </label>
                <input
                  type="text"
                  placeholder="BlueDart / Delhivery / Surface Cargo"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-semibold focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Handling Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Palletized shrink-wrap, Bay 2 unloading"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-semibold focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50 transition-all shadow-md"
                >
                  {submitting ? 'Scheduling Dispatch...' : 'Confirm & Dispatch Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Product Add / Edit Modal */}
      <ManufacturerManualProductModal
        isOpen={showManualProductModal}
        onClose={() => {
          setShowManualProductModal(false);
          setEditingProduct(null);
        }}
        onSaved={handleSaveProduct}
        initialProduct={editingProduct}
      />

      {/* Floating Chat Quick-Access Button when not in Chat tab */}
      {activeTab !== 'chat' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setShowFloatingChat(!showFloatingChat)}
            className="flex items-center gap-2 rounded-full bg-amber-600 hover:bg-amber-500 px-4 py-3 text-xs font-bold text-white shadow-2xl hover:shadow-amber-500/20 transition-all border border-amber-400/40"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Pickup Coordination Chat</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Floating Chat Window Modal */}
      {showFloatingChat && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[480px] z-50 p-4 sm:p-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFloatingChat(false)}
              className="absolute -top-3 -right-3 z-50 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:text-white border border-slate-600 shadow-lg text-xs font-bold"
            >
              ✕
            </button>
            <ManufacturerChatbot
              warehouses={warehouses}
              products={myProducts}
              onShipmentScheduled={loadData}
              isCompact
            />
          </div>
        </div>
      )}
    </div>
  );
};
