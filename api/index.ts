import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDBStatus } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';

import productRoutes from '../server/routes/productRoutes.js';
import orderRoutes from '../server/routes/orderRoutes.js';
import warehouseRoutes from '../server/routes/warehouseRoutes.js';
import scanRoutes from '../server/routes/scanRoutes.js';
import analyticsRoutes from '../server/routes/analyticsRoutes.js';
import activityRoutes from '../server/routes/activityRoutes.js';
import deliveryRoutes from '../server/routes/deliveryRoutes.js';
import demoRoutes from '../server/routes/demoRoutes.js';
import authRoutes from '../server/routes/authRoutes.js';
import manufacturerRoutes from '../server/routes/manufacturerRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Cache connection in serverless memory
let isConnected = false;
let isSeeded = false;

app.use(async (req, res, next) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    if (!isSeeded) {
      await seedDatabase(false);
      isSeeded = true;
    }
    next();
  } catch (err: any) {
    console.error('Database connection error in serverless:', err);
    res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGODB_URI is set in Vercel Environment Variables.',
      error: err?.message,
    });
  }
});

// Health check
const handleHealth = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    service: 'STOCKPILOT Serverless API',
    database: getDBStatus(),
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

// Unified API Router (handles both /api/path and /path)
const apiRouter = express.Router();
apiRouter.use('/products', productRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/warehouse', warehouseRoutes);
apiRouter.use('/scan', scanRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/activity', activityRoutes);
apiRouter.use('/deliveries', deliveryRoutes);
apiRouter.use('/demo', demoRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/manufacturer', manufacturerRoutes);

app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Serverless API Error:', err);
  res.status(500).json({
    success: false,
    message: err?.message || 'Internal Server Error',
  });
});

export default app;
