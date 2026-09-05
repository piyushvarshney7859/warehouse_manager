import mongoose, { Schema, Model } from 'mongoose';

export interface IDeliveryHandoverItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  barcode: string;
  serialNumbers?: string[];
  quantity: number;
  unitPrice: number;
  location: {
    row: string;
    bin: string;
  };
}

export interface IDeliveryHandover {
  _id?: mongoose.Types.ObjectId;
  handoverId: string;
  deliveryBoyName: string;
  deliveryBoyPhone: string;
  partner: string; // e.g. Zomato, Swiggy, Blinkit, Zepto, Delhivery, BlueDart, Shadowfax, Dunzo, Porter, In-House, Other
  vehicleNumber?: string;
  orderReference?: string; // e.g. SP1001, AWB-7739
  destination?: string;
  items: IDeliveryHandoverItem[];
  totalQuantity: number;
  totalValue: number;
  status: 'Out for Delivery' | 'Delivered' | 'Returned' | 'Cancelled';
  notes?: string;
  handedOverBy?: string;
  handedOverAt?: Date;
  deliveredAt?: Date;
  returnedAt?: Date;
  returnReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeliveryHandoverItemSchema = new Schema<IDeliveryHandoverItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    barcode: { type: String, required: true },
    serialNumbers: [{ type: String, trim: true }],
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, default: 0 },
    location: {
      row: { type: String, required: true },
      bin: { type: String, required: true },
    },
  },
  { _id: false }
);

const DeliveryHandoverSchema = new Schema<IDeliveryHandover>(
  {
    handoverId: { type: String, required: true, unique: true, index: true },
    deliveryBoyName: { type: String, required: true, trim: true, index: true },
    deliveryBoyPhone: { type: String, required: true, trim: true, index: true },
    partner: { type: String, required: true, trim: true, default: 'In-House' },
    vehicleNumber: { type: String, trim: true, default: '' },
    orderReference: { type: String, trim: true, default: '', index: true },
    destination: { type: String, trim: true, default: '' },
    items: { type: [DeliveryHandoverItemSchema], required: true },
    totalQuantity: { type: Number, required: true, min: 1 },
    totalValue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Out for Delivery', 'Delivered', 'Returned', 'Cancelled'],
      default: 'Out for Delivery',
      index: true,
    },
    notes: { type: String, default: '' },
    handedOverBy: { type: String, default: 'Warehouse Manager' },
    handedOverAt: { type: Date, default: Date.now, index: true },
    deliveredAt: { type: Date },
    returnedAt: { type: Date },
    returnReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const DeliveryHandover: Model<IDeliveryHandover> =
  (mongoose.models.DeliveryHandover as Model<IDeliveryHandover>) ||
  mongoose.model<IDeliveryHandover>('DeliveryHandover', DeliveryHandoverSchema);
