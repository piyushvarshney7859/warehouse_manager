import mongoose, { Schema, Model } from 'mongoose';

export interface IInboundShipment {
  _id?: mongoose.Types.ObjectId;
  shipmentId: string;
  manufacturerName: string;
  manufacturerContact?: string;
  targetWarehouseId: string;
  targetWarehouseName: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  quantity: number;
  dispatchDate: Date;
  expectedArrivalDate: Date;
  status: 'Scheduled' | 'In Transit' | 'Arrived' | 'Received' | 'Cancelled';
  trackingNumber: string;
  carrierName: string;
  notes?: string;
  assignedBin?: string;
  receivedAt?: Date;
  receivedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const InboundShipmentSchema = new Schema<IInboundShipment>(
  {
    shipmentId: { type: String, required: true, unique: true, index: true },
    manufacturerName: { type: String, required: true, trim: true },
    manufacturerContact: { type: String, trim: true, default: '' },
    targetWarehouseId: { type: String, required: true, index: true },
    targetWarehouseName: { type: String, required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, index: true },
    barcode: { type: String, required: true, trim: true },
    category: { type: String, default: 'General' },
    quantity: { type: Number, required: true, min: 1 },
    dispatchDate: { type: Date, default: Date.now },
    expectedArrivalDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Scheduled', 'In Transit', 'Arrived', 'Received', 'Cancelled'],
      default: 'In Transit',
      index: true,
    },
    trackingNumber: { type: String, default: '' },
    carrierName: { type: String, default: 'National Freight Cargo' },
    notes: { type: String, default: '' },
    assignedBin: { type: String, default: '' },
    receivedAt: { type: Date },
    receivedBy: { type: String },
  },
  { timestamps: true }
);

export const InboundShipment: Model<IInboundShipment> =
  (mongoose.models.InboundShipment as Model<IInboundShipment>) ||
  mongoose.model<IInboundShipment>('InboundShipment', InboundShipmentSchema);
