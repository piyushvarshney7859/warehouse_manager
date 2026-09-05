import mongoose, { Schema, Document } from 'mongoose';

export interface IManufacturerProductDoc extends Document {
  manufacturerId: string;
  manufacturerName: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unitsPresent: number;
  unitOfMeasure: string;
  batchNumber?: string;
  unitPrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ManufacturerProductSchema = new Schema<IManufacturerProductDoc>(
  {
    manufacturerId: { type: String, default: 'apex_mfg', index: true },
    manufacturerName: { type: String, default: 'Apex Industrial Manufacturing Ltd.' },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, required: true, trim: true },
    category: { type: String, default: 'Electronics' },
    unitsPresent: { type: Number, required: true, default: 0, min: 0 },
    unitOfMeasure: { type: String, default: 'Units' },
    batchNumber: { type: String, default: '' },
    unitPrice: { type: Number, default: 49.99 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ManufacturerProduct = mongoose.model<IManufacturerProductDoc>(
  'ManufacturerProduct',
  ManufacturerProductSchema
);
