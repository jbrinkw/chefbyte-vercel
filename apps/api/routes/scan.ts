/**
 * Scan Routes
 * Handles barcode scanning endpoints
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../lib/db-supabase';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../lib/errors';

const router = Router();

// POST /api/scan/add - Handle scan action
router.post('/add', asyncHandler(async (req: Request, res: Response) => {
    const { barcode, amount, nutrition } = req.body;
    const userId = req.userId;

    if (!barcode) throw new ValidationError('Barcode is required');
    if (!userId) throw new ValidationError('User ID required');

    // Check if product exists for this user
    const { data: productData, error: _productError } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('user_id', userId)
        .single();

    let product = productData;

    // If not found but nutrition provided, create it
    if (!product && nutrition) {
        const { data: newProduct, error: createError } = await supabase
            .from('products')
            .insert({
                name: `Scanned Item (${barcode})`, // Default name, user can edit later
                barcode,
                calories_per_serving: nutrition.calories || 0,
                carbs_per_serving: nutrition.carbs || 0,
                protein_per_serving: nutrition.protein || 0,
                fat_per_serving: nutrition.fats || 0,
                num_servings: nutrition.servings || 1,
                user_id: userId
            })
            .select()
            .single();

        if (createError) {
            console.error('Supabase create error:', createError);
            throw new Error('Failed to create product in Supabase');
        }
        product = newProduct;
    }

    if (!product) {
        res.json({ success: false, error: 'Product not found and no nutrition data provided', code: 'PRODUCT_NOT_FOUND' });
        return;
    }

    // Add to stock
    const { error: stockError } = await supabase
        .from('stock')
        .insert({
            user_id: userId,
            product_id: product.id,
            amount: amount || 1,
            location_id: product.location_id || 1
        });

    if (stockError) {
        console.error('Supabase stock add error:', stockError);
        throw new Error('Failed to add stock in Supabase');
    }

    res.json({
        success: true,
        message: `Added ${product.name} to stock`,
        product: {
            id: product.id,
            name: product.name
        }
    });
}));

// POST /api/scan/remove - Handle consume/remove action
router.post('/remove', asyncHandler(async (req: Request, res: Response) => {
    const { barcode, amount } = req.body;
    const userId = req.userId;

    if (!barcode) throw new ValidationError('Barcode is required');
    if (!userId) throw new ValidationError('User ID required');

    // Check if product exists for this user
    const { data: product, error: _productError2 } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('user_id', userId)
        .single();

    if (!product) {
        res.json({ success: false, error: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
        return;
    }

    // Remove from stock
    // Find stock for this product and user
    const { data: stock, error: _stockFetchError } = await supabase
        .from('stock')
        .select('*')
        .eq('product_id', product.id)
        .eq('user_id', userId)
        .limit(1)
        .single();

    if (stock) {
        const amountToRemove = amount || 1;
        const newAmount = Math.max(0, stock.amount - amountToRemove);

        const { error: updateError } = await supabase
            .from('stock')
            .update({ amount: newAmount })
            .eq('id', stock.id)
            .eq('user_id', userId);

        if (updateError) {
            console.error('Supabase stock update error:', updateError);
            throw new Error('Failed to update stock in Supabase');
        }

        res.json({
            success: true,
            message: `Consumed ${product.name}`,
            product: {
                id: product.id,
                name: product.name
            },
            removed: amountToRemove
        });
    } else {
        res.json({
            success: false,
            error: 'No stock found for this product',
            code: 'NO_STOCK'
        });
    }
}));

export default router;
