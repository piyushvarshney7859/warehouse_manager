import mongoose, { Schema, Document } from 'mongoose';

export interface IManufacturerChatDoc extends Document {
  conversationId: string;
  sender: 'manufacturer' | 'inventory_bot' | 'inventory_manager';
  senderName: string;
  text: string;
  timestamp: Date;
  pickupDetails?: {
    warehouseId?: string;
    warehouseName?: string;
    productName?: string;
    quantity?: number;
    pickupDate?: string;
    pickupTimeSlot?: string;
    dockBay?: string;
    gatePassNumber?: string;
    status?: 'proposed' | 'confirmed' | 'rescheduled';
  };
}

const ManufacturerChatSchema = new Schema<IManufacturerChatDoc>(
  {
    conversationId: { type: String, default: 'mfg-inv-desk', index: true },
    sender: {
      type: String,
      enum: ['manufacturer', 'inventory_bot', 'inventory_manager'],
      required: true,
    },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    pickupDetails: {
      warehouseId: String,
      warehouseName: String,
      productName: String,
      quantity: Number,
      pickupDate: String,
      pickupTimeSlot: String,
      dockBay: String,
      gatePassNumber: String,
      status: {
        type: String,
        enum: ['proposed', 'confirmed', 'rescheduled'],
      },
    },
  },
  { timestamps: true }
);

export const ManufacturerChat = mongoose.model<IManufacturerChatDoc>(
  'ManufacturerChat',
  ManufacturerChatSchema
);
