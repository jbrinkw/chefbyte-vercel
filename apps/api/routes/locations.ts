/**
 * Location Routes
 * Handles location-related endpoints
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/locations - Get all locations
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const locations = await db.all('SELECT * FROM locations ORDER BY name');
    res.json(locations);
}));

export default router;
