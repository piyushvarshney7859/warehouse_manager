import { Router } from 'express';
import { seedDatabase } from '../seed.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

const router = Router();

// POST /api/demo/reset - re-seed MongoDB with fresh demo records
router.post('/reset', async (req, res) => {
  try {
    const result = await seedDatabase(true);
    res.json({
      success: true,
      message: 'Demo dataset successfully refreshed and re-seeded!',
      result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/demo/shortcuts - sample data for hackathon demo test buttons
router.get('/shortcuts', async (req, res) => {
  try {
    const [mouse, keyboard, hub, pendingOrder] = await Promise.all([
      Product.findOne({ barcode: '8901001001' }), // Wireless Mouse in Row B -> Bin B04
      Product.findOne({ barcode: '8901001002' }), // Mechanical Keyboard in Row B -> Bin B02
      Product.findOne({ barcode: '8901001003' }), // USB-C Hub in Row A -> Bin A01
      Order.findOne({ orderId: 'SP1001' }),
    ]);

    res.json({
      success: true,
      demoFlow: {
        correctProduct: mouse,
        wrongProductForOrder: keyboard,
        anotherProduct: hub,
        sampleOrder: pendingOrder,
        newProductToTestSlotAllocation: {
          name: '4K Ultra-Wide Monitor Arm',
          sku: 'ACC-ARM-99',
          barcode: '8901001099',
          category: 'Accessories',
          quantity: 25,
          unitPrice: 85.0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
