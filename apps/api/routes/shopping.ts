/**
 * Shopping List Routes
 * Handles shopping list management
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';
import type { ShoppingListItem } from '../types/database';
import type { UpdateShoppingItemRequest } from '../types/api';

const router = Router();

// GET /api/shopping-list - Get list
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const list = await db.all(`
    SELECT sl.*, p.name as product_name, l.name as location_name
    FROM shopping_list sl
    JOIN products p ON sl.product_id = p.id
    LEFT JOIN locations l ON p.location_id = l.id
    ORDER BY sl.done ASC, l.name, p.name
  `) as (ShoppingListItem & { product_name: string; location_name: string | null })[];

    res.json({ success: true, data: list });
}));

// POST /api/shopping-list - Add item
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { product_id, product_name, amount, note } = req.body;

    if (!amount) {
        throw new ValidationError('Amount is required');
    }

    let targetProductId = product_id;

    // If no ID but name provided, find or create product
    if (!targetProductId && product_name) {
        const existingProduct = await db.get('SELECT id FROM products WHERE name = $1', [product_name]) as { id: number } | undefined;

        if (existingProduct) {
            targetProductId = existingProduct.id;
        } else {
            // Create placeholder product
            const newProduct = await db.query(`
                INSERT INTO products (name, is_placeholder, user_id) 
                VALUES ($1, TRUE, (SELECT id FROM users LIMIT 1)) 
                RETURNING id
            `, [product_name]);
            targetProductId = newProduct.rows[0].id;
        }
    }

    if (!targetProductId) {
        throw new ValidationError('Product ID or Name required');
    }

    // Check if exists in list
    const existing = await db.get('SELECT * FROM shopping_list WHERE product_id = $1 AND done = FALSE', [targetProductId]) as ShoppingListItem | undefined;

    if (existing) {
        await db.query('UPDATE shopping_list SET amount = amount + $1 WHERE id = $2', [amount, existing.id]);
        res.json({ success: true, id: existing.id, message: 'Updated existing item' });
    } else {
        const result = await db.query('INSERT INTO shopping_list (product_id, amount, note, user_id, done) VALUES ($1, $2, $3, $4, FALSE) RETURNING id', [targetProductId, amount, note || null, req.userId || 1]);
        res.status(201).json({ success: true, id: result.rows[0].id });
    }
}));

// PUT /api/shopping-list/:id - Update item
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');
    const { amount, done, note } = req.body as UpdateShoppingItemRequest;

    if (!Number.isFinite(id)) throw new ValidationError('Invalid ID');

    const updates: string[] = [];
    const values: unknown[] = [];

    if (amount !== undefined) {
        updates.push(`amount = $${values.length + 1}`);
        values.push(amount);
    }
    if (done !== undefined) {
        updates.push(`done = $${values.length + 1}`);
        values.push(done ? true : false);
    }
    if (note !== undefined) {
        updates.push(`note = $${values.length + 1}`);
        values.push(note);
    }

    if (updates.length > 0) {
        values.push(id);
        await db.query(`UPDATE shopping_list SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    }

    res.json({ success: true, status: 'ok' });
}));

// DELETE /api/shopping-list/:id - Delete item
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');

    if (!Number.isFinite(id)) throw new ValidationError('Invalid ID');

    const result = await db.query('DELETE FROM shopping_list WHERE id = $1', [id]);

    if (result.rowCount === 0) {
        throw new NotFoundError('Shopping list item', id);
    }

    res.json({ success: true, message: 'Item deleted' });
}));

// POST /api/shopping-list/add-to-stock - Move to stock
router.post('/add-to-stock', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.body;
    if (!id) throw new ValidationError('ID required');

    const item = await db.get('SELECT * FROM shopping_list WHERE id = $1', [id]) as ShoppingListItem | undefined;
    if (!item) throw new NotFoundError('Item', id);

    await db.transaction(async (client) => {
        // Add to stock
        await client.query(`
      INSERT INTO stock (product_id, amount, location_id)
      SELECT id, $1, location_id FROM products WHERE id = $2
    `, [item.amount, item.product_id]);

        // Mark as done
        await client.query('UPDATE shopping_list SET done = TRUE WHERE id = $1', [id]);
    });

    res.json({ success: true, message: 'Added to stock' });
}));

// POST /api/shopping-list/auto-add-below-min - Add items below min stock
router.post('/auto-add-below-min', asyncHandler(async (_req: Request, res: Response) => {
    // Get products below min stock
    const belowMinProducts = await db.all(`
        SELECT 
            p.id as product_id,
            p.name,
            p.min_stock_amount,
            COALESCE(SUM(s.amount), 0) as current_stock,
            COALESCE(sl.shopping_amount, 0) as in_cart
        FROM products p
        LEFT JOIN stock s ON p.id = s.product_id
        LEFT JOIN (
            SELECT product_id, SUM(amount) as shopping_amount 
            FROM shopping_list 
            WHERE done = FALSE 
            GROUP BY product_id
        ) sl ON p.id = sl.product_id
        WHERE p.min_stock_amount > 0
        GROUP BY p.id, p.name, p.min_stock_amount, sl.shopping_amount
        HAVING (COALESCE(SUM(s.amount), 0) + COALESCE(sl.shopping_amount, 0)) < p.min_stock_amount
    `) as any[];

    let addedCount = 0;

    // Add each product to shopping list
    for (const product of belowMinProducts) {
        const amountNeeded = product.min_stock_amount - (parseFloat(product.current_stock) + parseFloat(product.in_cart));

        if (amountNeeded > 0) {
            // Check if already exists
            const existing = await db.get('SELECT * FROM shopping_list WHERE product_id = $1 AND done = FALSE', [product.product_id]) as ShoppingListItem | undefined;

            if (existing) {
                // Update existing
                await db.query('UPDATE shopping_list SET amount = amount + $1 WHERE id = $2', [amountNeeded, existing.id]);
            } else {
                // Add new
                await db.query('INSERT INTO shopping_list (product_id, amount, note) VALUES ($1, $2, $3)', [
                    product.product_id,
                    amountNeeded,
                    'Auto-added (below min stock)'
                ]);
            }
            addedCount++;
        }
    }

    res.json({ success: true, addedCount, message: `Added ${addedCount} item(s) to shopping list` });
}));

export default router;
