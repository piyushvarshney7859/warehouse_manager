import React, { useState } from 'react';
import { Plus, Boxes, X, Hash, Barcode as BarcodeIcon, Tag, FileText } from 'lucide-react';
import { IManufacturerProduct } from '../types.js';

interface ManufacturerManualProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (product: IManufacturerProduct) => void;
  initialProduct?: IManufacturerProduct | null;
}

export const ManufacturerManualProductModal: React.FC<ManufacturerManualProductModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialProduct,
}) => {
  const isEditing = Boolean(initialProduct?._id);

  const [name, setName] = useState(initialProduct?.name || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [barcode, setBarcode] = useState(initialProduct?.barcode || '');
  const [category, setCategory] = useState(initialProduct?.category || 'Electronics');
  const [unitsPresent, setUnitsPresent] = useState(initialProduct?.unitsPresent ?? 100);
  const [unitOfMeasure, setUnitOfMeasure] = useState(initialProduct?.unitOfMeasure || 'Units');
  const [batchNumber, setBatchNumber] = useState(
    initialProduct?.batchNumber || `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [unitPrice, setUnitPrice] = useState(initialProduct?.unitPrice ?? 49.99);
  const [notes, setNotes] = useState(initialProduct?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    setBarcode(`890${Math.floor(1000000 + Math.random() * 9000000)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !sku.trim()) {
      setErrorMsg('Product name and SKU code are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<IManufacturerProduct> = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || `890${Math.floor(1000000 + Math.random() * 9000000)}`,
        category,
        unitsPresent: Math.max(0, Number(unitsPresent)),
        unitOfMeasure,
        batchNumber,
        unitPrice: Number(unitPrice),
        notes: notes.trim(),
      };

      onSaved(payload as IManufacturerProduct);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950">
                {isEditing ? 'Update Factory Stock & Product' : 'Manually List Manufactured Product'}
              </h3>
              <p className="text-[11px] text-slate-800 font-semibold">
                Track the exact number of units present at your factory floor ready for warehouse dispatch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-900 font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Product Name */}
          <div>
            <label className="text-xs font-black text-slate-950 block mb-1">
              Manufactured Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Industrial SoundCore Headset"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold placeholder:text-slate-500 focus:border-amber-600 focus:outline-hidden"
            />
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                SKU Identifier *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. APX-AUD-01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={isEditing}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-mono font-bold uppercase focus:border-amber-600 focus:outline-hidden disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-950">Barcode / EAN</label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-bold hover:underline"
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. 8901001001"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-mono font-bold placeholder:text-slate-500 focus:border-amber-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Quantity Present & Unit Of Measure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50 border border-amber-300 rounded-xl p-3">
            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                No. of Products Present (Factory Stock) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={unitsPresent}
                onChange={(e) => setUnitsPresent(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm text-slate-950 font-black focus:border-amber-600 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-900 font-bold mt-1 block">
                Total available units physically present in your plant
              </span>
            </div>

            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                Packaging / Measure Unit
              </label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
              >
                <option value="Units">Units (Pieces)</option>
                <option value="Boxes">Boxes</option>
                <option value="Cartons">Master Cartons</option>
                <option value="Pallets">Pallets</option>
              </select>
            </div>
          </div>

          {/* Category & Unit Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <option value="Automotive Parts">Automotive Parts</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                Batch / Lot Code
              </label>
              <input
                type="text"
                placeholder="e.g. BATCH-2026-X1"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-mono font-bold placeholder:text-slate-500 focus:border-amber-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Unit Price & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                Unit Wholesale Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                Quality / Handling Notes
              </label>
              <input
                type="text"
                placeholder="e.g. QC passed, pallet wrapped"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold placeholder:text-slate-500 focus:border-amber-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-black text-white transition-all shadow-md shadow-amber-900/20 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Factory Stock' : 'Save to Factory Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
