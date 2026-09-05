import mongoose, { Schema, Model } from 'mongoose';

export interface IAssignedProduct {
  productId?: mongoose.Types.ObjectId;
  sku: string;
  barcode: string;
  name: string;
  quantity: number;
}

export interface IBin {
  warehouseId: string;
  rowCode: string;
  binCode: string;
  orderIndex: number;
  capacity: number;
  currentOccupancy: number;
  status: 'empty' | 'available' | 'nearly_full' | 'full';
  assignedProducts: IAssignedProduct[];
  createdAt?: Date;
  updatedAt?: Date;
}

const AssignedProductSchema = new Schema<IAssignedProduct>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, required: true },
    barcode: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const BinSchema = new Schema<IBin>(
  {
    warehouseId: { type: String, required: true, index: true },
    rowCode: { type: String, required: true, index: true },
    binCode: { type: String, required: true, index: true },
    orderIndex: { type: Number, required: true },
    capacity: { type: Number, default: 50 },
    currentOccupancy: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['empty', 'available', 'nearly_full', 'full'],
      default: 'empty',
    },
    assignedProducts: [AssignedProductSchema],
  },
  { timestamps: true }
);

BinSchema.index({ warehouseId: 1, binCode: 1 }, { unique: true });

export const Bin: Model<IBin> =
  (mongoose.models.Bin as Model<IBin>) || mongoose.model<IBin>('Bin', BinSchema);
