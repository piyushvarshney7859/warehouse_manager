import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  RefreshCw,
  Package,
  Layers,
  Barcode as BarcodeIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { IWarehouseInventoryItem } from '../../types.js';

export const WarehouseInventoryList: React.FC = () => {
  const [products, setProducts] = useState<IWarehouseInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getWarehouseInventory({
        search: searchQuery,
        category: selectedCategory,
      });
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      console.error('Failed to load warehouse products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory]);

  const categories = [
    'all',
    ...Array.from(new Set(products.map((p) => p.category || 'General'))),
  ];

  const totalStockUnits = products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-bold">
              <Boxes className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              All Products Present in the Warehouse
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Complete inventory catalog currently stocked inside warehouse racks and bins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Stored Items</span>
            <strong className="text-slate-900 text-sm font-black">{totalStockUnits}</strong> units across {products.length} SKUs
          </div>
          <button
            type="button"
            onClick={fetchInventory}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh warehouse inventory"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchInventory();
            }}
            placeholder="Search by product name, SKU or barcode..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-xs text-slate-500">No warehouse products found matching your search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3">Product Name & SKU</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Barcode Number</th>
                <th className="px-3 py-3">Warehouse Location</th>
                <th className="px-3 py-3 text-right">Available Units</th>
                <th className="px-3.5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((prod) => {
                const isOutOfStock = prod.quantity === 0;
                const isLowStock = prod.quantity <= (prod.minimumStock || 5);

                return (
                  <tr key={prod._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{prod.sku}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {prod.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <BarcodeIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span>{prod.barcode}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-900">
                        {prod.location?.row || 'Row A'} → Bin {prod.location?.bin || 'A01'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-black text-slate-900 text-sm">
                      {prod.quantity}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
