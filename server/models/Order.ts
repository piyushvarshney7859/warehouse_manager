import mongoose, { Schema, Model } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  barcode: string;
  name: string;
  sku: string;
  quantity: number;
  location: {
    warehouseId: string;
    row: string;
    bin: string;
  };
  isPicked: boolean;
  pickedAt?: Date;
  scannedBarcode?: string;
}

export interface IOrder {
  _id?: mongoose.Types.ObjectId;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  destination: string;
  warehouseId?: string;
  warehouseName?: string;
  scheduledDeliveryDate?: Date;
  pickupTimeSlot?: string;
  assignedPartnerId?: string;
  assignedPartnerName?: string;
  items: IOrderItem[];
  status: 'Pending' | 'Picking' | 'Picked' | 'Ready for Dispatch' | 'Dispatched';
  priority: 'Standard' | 'High' | 'Express';
  createdAt?: Date;
  pickedAt?: Date;
  dispatchedAt?: Date;
  updatedAt?: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    barcode: { type: String, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    location: {
      warehouseId: { type: String, default: 'WH-01' },
      row: { type: String, required: true },
      bin: { type: String, required: true },
    },
    isPicked: { type: Boolean, default: false },
    pickedAt: { type: Date },
    scannedBarcode: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '+91 98201 12345' },
    customerEmail: { type: String, default: '' },
    destination: { type: String, default: 'Zone A - Domestic Shipping' },
    warehouseId: { type: String, default: 'WH-01' },
    warehouseName: { type: String, default: 'Central Logistics Hub' },
    scheduledDeliveryDate: { type: Date, default: Date.now },
    pickupTimeSlot: { type: String, default: '10:00 AM - 01:00 PM' },
    assignedPartnerId: { type: String, default: 'DP-101' },
    assignedPartnerName: { type: String, default: 'Ramesh Kumar' },
    items: [OrderItemSchema],
    status: {
      type: String,
      enum: ['Pending', 'Picking', 'Picked', 'Ready for Dispatch', 'Dispatched'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Standard', 'High', 'Express'],
      default: 'Standard',
    },
    pickedAt: { type: Date },
    dispatchedAt: { type: Date },
  },
  { timestamps: true }
);

export const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', OrderSchema);
