import mongoose, { Schema, Model } from 'mongoose';

export type UserRole = 'manufacturer' | 'warehouse' | 'delivery';

export interface IUser {
  _id?: mongoose.Types.ObjectId;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  companyName?: string; // For Manufacturer / Supplier
  warehouseId?: string; // For Warehouse Manager / Floor Staff
  partnerId?: string; // For Delivery Partner
  agency?: string; // For Delivery Partner
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, default: '' },
    password: { type: String, default: 'password123' },
    role: {
      type: String,
      enum: ['manufacturer', 'warehouse', 'delivery'],
      required: true,
      default: 'warehouse',
      index: true,
    },
    companyName: { type: String, trim: true, default: '' },
    warehouseId: { type: String, trim: true, default: 'WH-01' },
    partnerId: { type: String, trim: true, default: '' },
    agency: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
