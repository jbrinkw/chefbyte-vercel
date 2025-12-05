import { Router, Request, Response } from 'express';
import { db } from '../lib/db';

const router = Router();

import { asyncHandler } from '../middleware/asyncHandler';

// GET /api/stats - Get dashboard statistics
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    try {
        // Missing Walmart Links (exclude meal products and placeholders - they don't need Walmart links)
        const missingLinks = await db.get(`
            SELECT COUNT(*) as count
            FROM products
            WHERE (walmart_link IS NULL OR walmart_link = '')
            AND is_meal_product = FALSE
            AND is_placeholder = FALSE
        `) as { count: number };

        // Missing Prices (products with Walmart links but no price set)
        const missingPrices = await db.get(`
            SELECT COUNT(*) as count
            FROM products
            WHERE walmart_link IS NOT NULL
            AND walmart_link != ''
            AND walmart_link != 'NOT_WALMART'
            AND (price IS NULL OR price = 0)
        `) as { count: number };

        // Placeholder Items (using is_placeholder userfield)
        const placeholders = await db.get(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE is_placeholder = TRUE
        `) as { count: number };

        // Below Min Stock
        const belowMinStock = await db.get(`
            SELECT COUNT(*) as count 
            FROM products p
            LEFT JOIN (
                SELECT product_id, SUM(amount) as total_amount
                FROM stock
                GROUP BY product_id
            ) s ON p.id = s.product_id
            WHERE p.min_stock_amount > 0 
            AND (s.total_amount IS NULL OR s.total_amount < p.min_stock_amount)
        `) as { count: number };

        // Shopping Cart Value
        const cartValue = await db.get(`
            SELECT COALESCE(SUM(p.price * sl.amount), 0) as total
            FROM shopping_list sl
            LEFT JOIN products p ON sl.product_id = p.id
            WHERE p.price IS NOT NULL AND p.price > 0
        `) as { total: number };

        res.json({
            missingWalmartLinks: missingLinks.count,
            missingPrices: missingPrices.count,
            placeholderItems: placeholders.count,
            belowMinStock: belowMinStock.count,
            shoppingCartValue: Math.round(cartValue.total * 100) / 100 // Round to 2 decimals
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
}));

export default router;
