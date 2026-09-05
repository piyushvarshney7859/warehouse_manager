import mongoose, { Schema, Model } from 'mongoose';

export interface IProductLocation {
  warehouseId: string;
  row: string;
  bin: string;
}

export interface IProduct {
  _id?: mongoose.Types.ObjectId;
  barcode: string;
  serialNumber?: string;
  serialNumbers?: string[];
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minimumStock: number;
  location: IProductLocation;
  unitPrice: number;
  description?: string;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductLocationSchema = new Schema<IProductLocation>(
  {
    warehouseId: { type: String, default: 'WH-01' },
    row: { type: String, required: true },
    bin: { type: String, required: true },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    barcode: { type: String, required: true, unique: true, index: true, trim: true },
    serialNumber: { type: String, trim: true, default: '', index: true },
    serialNumbers: [{ type: String, trim: true }],
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    minimumStock: { type: Number, required: true, default: 10, min: 0 },
    location: { type: ProductLocationSchema, required: true },
    unitPrice: { type: Number, default: 29.99 },
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProductSchema.virtual('stockStatus').get(function (this: IProduct) {
  if (this.quantity <= 0) return 'out_of_stock';
  if (this.quantity <= this.minimumStock) return 'low_stock';
  return 'in_stock';
});

export const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) || mongoose.model<IProduct>('Product', ProductSchema);
