import mongoose, { Schema, Model } from 'mongoose';

export interface IActivityLog {
  eventType:
    | 'PRODUCT_ADDED'
    | 'PRODUCT_SCANNED'
    | 'LOCATION_ASSIGNED'
    | 'ORDER_CREATED'
    | 'PRODUCT_PICKED'
    | 'WRONG_BARCODE_SCANNED'
    | 'INVENTORY_UPDATED'
    | 'ORDER_DISPATCHED'
    | 'ROW_ACTIVATED'
    | 'SYSTEM_ALERT';
  title: string;
  description: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
  timestamp?: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export const ActivityLog: Model<IActivityLog> =
  (mongoose.models.ActivityLog as Model<IActivityLog>) ||
  mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
