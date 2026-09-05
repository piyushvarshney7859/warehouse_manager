import { Router } from 'express';
import { ActivityLog } from '../models/ActivityLog.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { eventType, severity, limit = 50 } = req.query;
    let query: any = {};

    if (eventType && eventType !== 'All') {
      query.eventType = eventType;
    }
    if (severity && severity !== 'All') {
      query.severity = severity;
    }

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
