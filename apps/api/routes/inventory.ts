/**
 * Inventory Routes
 * Stock overview and management
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/inventory/overview - Stock overview
router.get('/overview', asyncHandler(async (_req: Request, res: Response) => {
    const inventory = await db.all(`
        SELECT 
            p.id,
            p.name,
            p.barcode,
            COALESCE(SUM(s.amount), 0) as current_stock,
            p.min_stock_amount as min_stock,
            qu.name as unit_name,
            l.name as location_name
        FROM products p
        LEFT JOIN stock s ON p.id = s.product_id
        LEFT JOIN quantity_units qu ON p.qu_id_stock = qu.id
        LEFT JOIN locations l ON p.location_id = l.id
        GROUP BY p.id, p.name, p.barcode, p.min_stock_amount, qu.name, l.name
        ORDER BY p.name
    `);

    res.json({ success: true, data: inventory });
}));

// POST /api/inventory/consume - Remove from stock
router.post('/consume', asyncHandler(async (req: Request, res: Response) => {
    const { product_id, amount } = req.body;

    // Get current stock
    const stock = await db.get('SELECT * FROM stock WHERE product_id = $1 LIMIT 1', [product_id]) as any;

    if (stock) {
        const newAmount = Math.max(0, stock.amount - (amount || 1));
        await db.query('UPDATE stock SET amount = $1 WHERE id = $2', [newAmount, stock.id]);
    }

    res.json({ success: true, message: 'Stock consumed' });
}));

// POST /api/inventory/purchase - Add to stock
router.post('/purchase', asyncHandler(async (req: Request, res: Response) => {
    const { product_id, amount, location_id } = req.body;

    // Check if stock entry exists
    const existing = await db.get('SELECT * FROM stock WHERE product_id = $1', [product_id]) as any;

    if (existing) {
        // Update existing
        const newAmount = existing.amount + (amount || 1);
        await db.query('UPDATE stock SET amount = $1 WHERE id = $2', [newAmount, existing.id]);
    } else {
        // Insert new
        await db.query('INSERT INTO stock (user_id, product_id, amount, location_id) VALUES ($1, $2, $3, $4)', [
            req.userId,
            product_id,
            amount || 1,
            location_id || 1
        ]);
    }

    res.json({ success: true, message: 'Stock added' });
}));

export default router;
