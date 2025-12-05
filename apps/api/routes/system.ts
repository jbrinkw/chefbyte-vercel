/**
 * System Routes
 * Handles system/config endpoints (locations, quantity units, health)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { getLocations } from '../lib/caches';
import { asyncHandler } from '../middleware/asyncHandler';
import type { QuantityUnit } from '../types/database';

const router = Router();

// GET /api/locations - Get all locations
router.get('/locations', asyncHandler(async (_req: Request, res: Response) => {
    const locations = await getLocations();
    res.json({ success: true, data: locations });
}));

// GET /api/quantity-units - Get all quantity units
router.get('/quantity-units', asyncHandler(async (_req: Request, res: Response) => {
    const units = await db.all('SELECT * FROM quantity_units ORDER BY name') as QuantityUnit[];
    res.json({ success: true, data: units });
}));

// GET /api/status/counts - Get system counts
router.get('/status/counts', asyncHandler(async (_req: Request, res: Response) => {
    const productCount = await db.get('SELECT COUNT(*) as count FROM products') as { count: number };
    const recipeCount = await db.get('SELECT COUNT(*) as count FROM recipes') as { count: number };
    const locationCount = await db.get('SELECT COUNT(*) as count FROM locations') as { count: number };
    const stockCount = await db.get('SELECT COUNT(*) as count FROM stock') as { count: number };

    res.json({
        success: true,
        data: {
            products: productCount.count,
            recipes: recipeCount.count,
            locations: locationCount.count,
            stock: stockCount.count
        }
    });
}));

// GET /api/status - System status
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
    const productCount = await db.get('SELECT COUNT(*) as count FROM products') as { count: number };
    const recipeCount = await db.get('SELECT COUNT(*) as count FROM recipes') as { count: number };
    const locationCount = await db.get('SELECT COUNT(*) as count FROM locations') as { count: number };

    res.json({
        success: true,
        data: {
            database: 'connected',
            products: productCount.count,
            recipes: recipeCount.count,
            locations: locationCount.count,
            server: 'TypeScript',
            uptime: process.uptime()
        }
    });
}));

export default router;
