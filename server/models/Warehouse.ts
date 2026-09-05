import mongoose, { Schema, Model } from 'mongoose';

export interface IWarehouse {
  warehouseId: string;
  name: string;
  code: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  operatingHours?: string;
  contactPhone?: string;
  inboundDockCount?: number;
  totalCapacity: number;
  currentOccupancy: number;
  rowsCount: number;
  status: 'active' | 'maintenance';
  createdAt?: Date;
  updatedAt?: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    warehouseId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    city: { type: String, default: 'Central Logistics Zone' },
    address: { type: String, default: 'Plot 12-B, Industrial Freight Corridor, Bhiwandi, Mumbai' },
    latitude: { type: Number, default: 19.2965 },
    longitude: { type: Number, default: 73.0631 },
    googleMapsUrl: { type: String, default: 'https://maps.google.com/?q=19.2965,73.0631' },
    operatingHours: { type: String, default: '08:00 AM - 10:00 PM (Mon-Sun)' },
    contactPhone: { type: String, default: '+91 98200 44556' },
    inboundDockCount: { type: Number, default: 6 },
    totalCapacity: { type: Number, default: 1200 },
    currentOccupancy: { type: Number, default: 0 },
    rowsCount: { type: Number, default: 3 },
    status: { type: String, enum: ['active', 'maintenance'], default: 'active' },
  },
  { timestamps: true }
);

export const Warehouse: Model<IWarehouse> =
  (mongoose.models.Warehouse as Model<IWarehouse>) ||
  mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
