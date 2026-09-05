import mongoose, { Schema, Model } from 'mongoose';

export interface IDeliveryPartner {
  _id?: mongoose.Types.ObjectId;
  partnerId: string;
  name: string;
  phone: string;
  email?: string;
  agency: string; // Delhivery, Zomato, Blinkit, Zepto, BlueDart, Shadowfax, Porter, In-House, Other
  pin: string; // 4-digit PIN for quick mobile auth
  vehicleNumber: string;
  vehicleType: string; // Bike, Scooter, Van, Auto, Bicycle, Other
  city?: string;
  address?: string;
  licenseNumber?: string;
  emergencyContact?: string;
  active: boolean;
  totalPickups: number;
  totalUnitsDelivered: number;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    partnerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, trim: true, default: '' },
    agency: { type: String, required: true, trim: true, default: 'In-House' },
    pin: { type: String, required: true, default: '1234' },
    vehicleNumber: { type: String, trim: true, default: '' },
    vehicleType: { type: String, trim: true, default: 'Motorcycle / Bike' },
    city: { type: String, trim: true, default: 'Mumbai Central Hub' },
    address: { type: String, trim: true, default: '' },
    licenseNumber: { type: String, trim: true, default: '' },
    emergencyContact: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    totalPickups: { type: Number, default: 0 },
    totalUnitsDelivered: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const DeliveryPartner: Model<IDeliveryPartner> =
  (mongoose.models.DeliveryPartner as Model<IDeliveryPartner>) ||
  mongoose.model<IDeliveryPartner>('DeliveryPartner', DeliveryPartnerSchema);
