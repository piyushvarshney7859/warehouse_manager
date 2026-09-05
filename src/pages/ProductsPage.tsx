import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  MapPin,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Scan,
  RefreshCw,
  Calendar,
  Truck,
} from 'lucide-react';
import { IProduct } from '../types.js';
import { api } from '../services/api.js';
import { BarcodeRenderer } from '../components/BarcodeRenderer.js';
import { AddProductModal } from '../components/AddProductModal.js';
import { InboundArrivalsModal } from '../components/InboundArrivalsModal.js';

interface ProductsPageProps {
  onNavigateToWarehouse?: (binCode?: string) => void;
  onNavigateToScan?: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onNavigateToWarehouse,
  onNavigateToScan,
}) => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(10);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Barcode Preview Modal
  const [viewBarcodeProduct, setViewBarcodeProduct] = useState<IProduct | null>(null);

  // Add Product Modal with Camera Barcode Scanner
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Incoming Stock Arrivals Modal (Manufacturer Connection Portal)
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.getProducts({
        search: searchTerm,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
        sortBy,
      });
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error('Failed fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedStatus, sortBy]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleOpenEdit = (p: IProduct) => {
    setEditingProduct(p);
    setEditQty(p.quantity);
    setEditMinStock(p.minimumStock);
    setEditPrice(p.unitPrice);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsUpdating(true);
    try {
      const res = await api.updateProduct(editingProduct._id, {
        quantity: editQty,
        minimumStock: editMinStock,
        unitPrice: editPrice,
      });
      if (res.success) {
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (err: any) {
      alert('Failed updating product: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      try {
        await api.deleteProduct(id);
        fetchProducts();
      } catch (err: any) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  const categories = ['All', 'Electronics', 'Audio', 'Accessories', 'Office', 'Hardware', 'Home'];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Inventory Master Catalog
            </span>
            <span className="text-xs text-slate-500 font-medium">{products.length} registered SKUs</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Product Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, edit, and view barcode labels for all products stored across warehouse bins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInboundModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-xs"
          >
            <Calendar className="h-4 w-4 text-blue-600" /> Incoming Stock Schedule
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Product (Scan Barcode)
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, SKU, barcode, serial number (S/N)..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full md:w-36 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="All">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-36 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="name">Sort by Name</option>
              <option value="quantity">Highest Quantity</option>
              <option value="newest">Newest Added</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Catalog Table / Cards */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center text-slate-500 text-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 mr-2" />
            Loading catalog...
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-1.5">
            <Package className="h-8 w-8 mx-auto text-slate-400" />
            <p className="font-semibold text-slate-800">No products match your filters</p>
            <p className="text-slate-400">Try clearing search keywords or adding new inventory</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 uppercase tracking-wider text-[10px] font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Product & SKU</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Barcode</th>
                  <th className="px-3 py-2.5">Warehouse Location</th>
                  <th className="px-3 py-2.5">Quantity</th>
                  <th className="px-3 py-2.5">Unit Price</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & SKU */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-xs text-slate-900">{prod.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        SKU: <span className="text-slate-600 font-semibold">{prod.sku}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {prod.category}
                      </span>
                    </td>

                    {/* Barcode & Serial representation */}
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setViewBarcodeProduct(prod)}
                        className="group flex flex-col items-start hover:opacity-80 transition-opacity"
                        title="Click to expand barcode and details"
                      >
                        <span className="font-mono text-xs font-semibold text-emerald-700 group-hover:underline">
                          {prod.barcode}
                        </span>
                        {prod.serialNumber && (
                          <span className="font-mono text-[10px] text-slate-500 font-medium">
                            S/N: {prod.serialNumber}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">View Label</span>
                      </button>
                    </td>

                    {/* Location */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{prod.location.row}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-emerald-700 font-semibold">Bin {prod.location.bin}</span>
                      </div>
                    </td>

                    {/* Quantity & Status Badge */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{prod.quantity}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                            prod.quantity <= 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : prod.quantity <= prod.minimumStock
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {prod.quantity <= 0
                            ? 'Out of Stock'
                            : prod.quantity <= prod.minimumStock
                            ? 'Low'
                            : 'Optimal'}
                        </span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3 font-mono font-medium text-slate-700">
                      ${prod.unitPrice.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Edit product stock"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(prod._id, prod.name)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Adjust Product: {editingProduct.name}</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Available Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editQty}
                  onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  min="1"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Expanded Preview Modal */}
      {viewBarcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 text-center text-slate-800 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900">{viewBarcodeProduct.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SKU: {viewBarcodeProduct.sku} • Location: {viewBarcodeProduct.location.row} → {viewBarcodeProduct.location.bin}
            </p>

            <div className="my-5 flex justify-center p-3 rounded-lg border border-slate-100 bg-slate-50">
              <BarcodeRenderer value={viewBarcodeProduct.barcode} width={240} height={70} showText={true} />
            </div>

            <button
              onClick={() => setViewBarcodeProduct(null)}
              className="w-full rounded-lg bg-slate-100 border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Close Barcode
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal with Camera Barcode Scanner */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductCreated={(prod) => {
          fetchProducts();
        }}
      />

      {/* Incoming Stock Arrival Schedule Modal */}
      <InboundArrivalsModal
        isOpen={isInboundModalOpen}
        onClose={() => setIsInboundModalOpen(false)}
        onStockReceived={() => {
          fetchProducts();
        }}
      />
    </div>
  );
};
