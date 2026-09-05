import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB, getDBStatus } from './server/db.js';
import { seedDatabase } from './server/seed.js';

import productRoutes from './server/routes/productRoutes.js';
import orderRoutes from './server/routes/orderRoutes.js';
import warehouseRoutes from './server/routes/warehouseRoutes.js';
import scanRoutes from './server/routes/scanRoutes.js';
import analyticsRoutes from './server/routes/analyticsRoutes.js';
import activityRoutes from './server/routes/activityRoutes.js';
import deliveryRoutes from './server/routes/deliveryRoutes.js';
import demoRoutes from './server/routes/demoRoutes.js';
import authRoutes from './server/routes/authRoutes.js';
import manufacturerRoutes from './server/routes/manufacturerRoutes.js';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Connect to MongoDB
  try {
    const mongoUri = await connectDB();
    console.log(`StockPilot connected to MongoDB (${mongoUri})`);
    // Auto-seed if database is empty
    await seedDatabase(false);
  } catch (err: any) {
    console.error('Database connection error on start:', err.message);
  }

  // API Health & DB status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'STOCKPILOT API',
      version: '1.0.0',
      database: getDBStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Routes
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/warehouse', warehouseRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/demo', demoRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/manufacturer', manufacturerRoutes);

  // Fallback error middleware to handle database offline gracefully
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (
      err.name === 'MongooseError' ||
      err.name === 'MongoNetworkError' ||
      err.message?.includes('buffering timed out')
    ) {
      console.warn('[AI Studio] Database offline — returning mock empty response');
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    next(err);
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StockPilot running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
