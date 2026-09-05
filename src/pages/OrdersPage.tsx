import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Scan,
  AlertCircle,
  MapPin,
  ArrowRight,
  Package,
  RefreshCw,
  X,
  Send,
} from 'lucide-react';
import { IOrder, IProduct } from '../types.js';
import { api } from '../services/api.js';
import { PickOrderModal } from '../components/PickOrderModal.js';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Active Pick Modal
  const [pickingOrder, setPickingOrder] = useState<IOrder | null>(null);

  // Create Order Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [destination, setDestination] = useState('Zone A - Domestic Shipping');
  const [priority, setPriority] = useState('Standard');
  const [selectedSku, setSelectedSku] = useState('');
  const [orderQty, setOrderQty] = useState<number>(1);
  const [cartItems, setCartItems] = useState<{ product: IProduct; quantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await api.getOrders({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        search: searchTerm,
      });
      if (res.success) setOrders(res.orders);
    } catch (err) {
      console.error('Failed fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductsForOrder = async () => {
    try {
      const res = await api.getProducts();
      if (res.success) {
        setProducts(res.products.filter((p) => p.quantity > 0));
        if (res.products.length > 0 && !selectedSku) {
          setSelectedSku(res.products[0].sku);
        }
      }
    } catch (err) {
      console.warn('Failed fetching products for order:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleOpenCreate = () => {
    fetchProductsForOrder();
    setCartItems([]);
    setCustName('');
    setIsCreateOpen(true);
  };

  const handleAddItemToCart = () => {
    const prod = products.find((p) => p.sku === selectedSku);
    if (!prod) return;
    if (orderQty > prod.quantity) {
      alert(`Only ${prod.quantity} units available for ${prod.name}`);
      return;
    }

    // Check if already in cart
    const existingIndex = cartItems.findIndex((c) => c.product.sku === prod.sku);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += orderQty;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { product: prod, quantity: orderQty }]);
    }
  };

  const handleRemoveFromCart = (sku: string) => {
    setCartItems(cartItems.filter((c) => c.product.sku !== sku));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || cartItems.length === 0) {
      alert('Please enter customer name and at least 1 line item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = cartItems.map((c) => ({
        productId: c.product._id,
        quantity: c.quantity,
      }));

      const res = await api.createOrder({
        customerName: custName.trim(),
        customerEmail: custEmail.trim(),
        destination,
        priority,
        items: itemsPayload,
      });

      if (res.success && res.order) {
        setIsCreateOpen(false);
        fetchOrders();
        // Prompt to start pick
        setPickingOrder(res.order);
      }
    } catch (err: any) {
      alert('Failed creating order: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (orderId: string) => {
    try {
      await api.dispatchOrder(orderId);
      fetchOrders();
    } catch (err: any) {
      alert('Dispatch failed: ' + err.message);
    }
  };

  const statuses = ['All', 'Pending', 'Picking', 'Ready for Dispatch', 'Dispatched'];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Outbound Fulfillment Bay
            </span>
            <span className="text-xs text-slate-500 font-medium">{orders.length} active orders</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Orders & Picking Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pick orders with barcode-verified location guidance to eliminate mispicks before dispatch.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Create New Order
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 text-xs">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors shrink-0 ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Order # or Customer..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex h-56 items-center justify-center text-slate-500 text-xs">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 mr-2" />
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 text-xs shadow-xs">
          <ClipboardList className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-slate-800">No orders found</p>
          <p className="mt-0.5 text-slate-400">Click "Create New Order" to initiate a warehouse pick</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {orders.map((order) => {
            const pickedCount = order.items.filter((i) => i.isPicked).length;
            const totalCount = order.items.length;
            const isAllPicked = pickedCount === totalCount;

            return (
              <div
                key={order._id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                      <ClipboardList className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">ORDER #{order.orderId}</h3>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                            order.status === 'Ready for Dispatch'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.status === 'Picking'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : order.status === 'Dispatched'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {order.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer: <strong className="text-slate-800">{order.customerName}</strong> • {order.destination}
                      </p>
                    </div>
                  </div>

                  {/* Pick / Dispatch action buttons */}
                  <div className="flex items-center gap-2">
                    {order.status !== 'Dispatched' && (
                      <button
                        type="button"
                        onClick={() => setPickingOrder(order)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs ${
                          isAllPicked
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                        }`}
                      >
                        <Scan className="h-3.5 w-3.5" />
                        {isAllPicked ? 'Review Pick Details' : 'Guided Pick Workflow'}
                      </button>
                    )}

                    {order.status === 'Ready for Dispatch' && (
                      <button
                        type="button"
                        onClick={() => handleDispatch(order.orderId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-xs"
                      >
                        <Truck className="h-3.5 w-3.5" /> Dispatch Order
                      </button>
                    )}

                    {order.status === 'Dispatched' && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                        <Truck className="h-3.5 w-3.5 text-emerald-600" /> Carrier Staged
                      </span>
                    )}
                  </div>
                </div>

                {/* Line items checklist */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>
                      Items to Pick: <strong className="text-slate-800">{pickedCount} of {totalCount} picked</strong>
                    </span>
                    <span className="font-mono text-[11px]">
                      Created: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={item.barcode + idx}
                        className={`rounded-lg border p-2.5 flex items-center justify-between transition-colors ${
                          item.isPicked
                            ? 'border-emerald-200 bg-emerald-50/50 text-slate-700'
                            : 'border-slate-200 bg-slate-50/70 text-slate-800'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{item.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span>Qty: {item.quantity}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-mono font-medium">
                              {item.location.row} → {item.location.bin}
                            </span>
                          </div>
                        </div>

                        {item.isPicked ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Unpicked
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Guided Pick Modal */}
      {pickingOrder && (
        <PickOrderModal
          order={pickingOrder}
          isOpen={!!pickingOrder}
          onClose={() => setPickingOrder(null)}
          onOrderUpdated={fetchOrders}
        />
      )}

      {/* Create Order Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Create Outbound Pick Order</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Standard">Standard</option>
                    <option value="High">High</option>
                    <option value="Express">Express</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Destination Shipping Zone</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Cart / Line items builder */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <span className="font-bold text-slate-800 block">Add Warehouse Products</span>
                <div className="flex gap-2">
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
                  >
                    {products.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.name} ({p.quantity} avail in {p.location.row}→{p.location.bin})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900 text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500"
                  >
                    Add
                  </button>
                </div>

                {/* Items in Cart */}
                {cartItems.length > 0 && (
                  <div className="mt-2 space-y-1 divide-y divide-slate-200 border-t border-slate-200 pt-2">
                    {cartItems.map((c) => (
                      <div key={c.product.sku} className="flex items-center justify-between pt-1">
                        <span className="text-slate-800">
                          {c.product.name} (x{c.quantity})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(c.product.sku)}
                          className="text-rose-600 hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || cartItems.length === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Creating Order...' : 'Generate Pick Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
