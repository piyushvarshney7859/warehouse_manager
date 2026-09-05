import mongoose, { Schema, Model } from 'mongoose';

export interface IInventoryTransaction {
  product: mongoose.Types.ObjectId;
  productName: string;
  barcode: string;
  sku: string;
  type: 'INWARD' | 'PICK' | 'ADJUSTMENT' | 'TRANSFER' | 'OUTWARD';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  location: {
    row: string;
    bin: string;
  };
  referenceOrder?: string;
  timestamp?: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    barcode: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    type: {
      type: String,
      enum: ['INWARD', 'PICK', 'ADJUSTMENT', 'TRANSFER', 'OUTWARD'],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: { type: String, required: true },
    location: {
      row: { type: String, required: true },
      bin: { type: String, required: true },
    },
    referenceOrder: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const InventoryTransaction: Model<IInventoryTransaction> =
  (mongoose.models.InventoryTransaction as Model<IInventoryTransaction>) ||
  mongoose.model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
