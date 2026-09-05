import mongoose, { Schema, Model } from 'mongoose';

export interface IRow {
  warehouseId: string;
  rowCode: string;
  orderIndex: number;
  capacity: number;
  currentOccupancy: number;
  status: 'active' | 'full' | 'inactive';
  binsCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const RowSchema = new Schema<IRow>(
  {
    warehouseId: { type: String, required: true, index: true },
    rowCode: { type: String, required: true, index: true },
    orderIndex: { type: Number, required: true },
    capacity: { type: Number, default: 400 },
    currentOccupancy: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'full', 'inactive'], default: 'active' },
    binsCount: { type: Number, default: 6 },
  },
  { timestamps: true }
);

RowSchema.index({ warehouseId: 1, rowCode: 1 }, { unique: true });

export const Row: Model<IRow> =
  (mongoose.models.Row as Model<IRow>) || mongoose.model<IRow>('Row', RowSchema);
