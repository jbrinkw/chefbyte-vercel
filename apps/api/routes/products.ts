/**
 * Product Routes
 * Handles product-related endpoints
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../lib/db-supabase';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// POST /api/products/analyze - Analyze product from barcode (OpenFoodFacts)
router.post('/analyze', asyncHandler(async (req: Request, res: Response) => {
    const { barcode } = req.body;
    if (!barcode) throw new ValidationError('Barcode is required');

    console.log(`[Products] Analyzing barcode: ${barcode}`);

    try {
        // Fetch from OpenFoodFacts
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const offData: any = await offResponse.json();

        if (offData.status === 1) {
            res.json({
                success: true,
                product: offData.product,
                suggestion: {
                    location_label: 'Pantry' // Default suggestion
                }
            });
        } else {
            res.status(404).json({ success: false, error: 'Product not found in OpenFoodFacts' });
        }
    } catch (error: any) {
        console.error('OpenFoodFacts fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch external product data' });
    }
}));

// POST /api/products - Create product
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const data = req.body;
    console.log('[Products] Creating product:', data);

    if (!data.name) throw new ValidationError('Name is required');

    const userId = req.userId;
    if (!userId) throw new ValidationError('User ID required');

    const { data: newProduct, error } = await supabase
        .from('products')
        .insert({
            name: data.name,
            barcode: data.barcode || null,
            calories_per_serving: data.calories_per_serving || data.calories || 0,
            carbs_per_serving: data.carbs_per_serving || data.carbs || 0,
            protein_per_serving: data.protein_per_serving || data.protein || 0,
            fat_per_serving: data.fat_per_serving || data.fat || 0,
            num_servings: data.num_servings || 1,
            description: data.description || null,
            user_id: userId
        })
        .select()
        .single();

    if (error) {
        console.error('Supabase create error:', error);
        throw new Error('Failed to create product in Supabase');
    }

    res.status(201).json({ success: true, data: newProduct });
}));

// GET /api/products - Get all products
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) throw new ValidationError('User ID required');

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('name');

    if (error) throw error;
    res.json({ success: true, data: products });
}));

// GET /api/products/barcode/:barcode - Get product by barcode
router.get('/barcode/:barcode', asyncHandler(async (req: Request, res: Response) => {
    const barcode = req.params.barcode;
    const userId = req.userId;

    if (!barcode) throw new ValidationError('Barcode is required');
    if (!userId) throw new ValidationError('User ID required');

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('user_id', userId)
        .single();

    if (error || !product) {
        throw new NotFoundError('Product with barcode', barcode);
    }

    res.json({ success: true, data: product });
}));

// GET /api/products/:id - Get single product
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');
    const userId = req.userId;

    if (!Number.isFinite(id) || id <= 0) throw new ValidationError('Invalid product ID');
    if (!userId) throw new ValidationError('User ID required');

    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

    if (error || !product) {
        throw new NotFoundError('Product', id);
    }

    res.json({ success: true, data: product });
}));

// GET /api/products/summary/by-barcode/:barcode
router.get('/summary/by-barcode/:barcode', asyncHandler(async (req: Request, res: Response) => {
    const barcode = (req.params.barcode || '').trim();
    const userId = req.userId;

    if (!barcode) throw new ValidationError('Barcode is required');
    if (!userId) throw new ValidationError('User ID required');

    const { data: product, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('barcode', barcode)
        .eq('user_id', userId)
        .single();

    if (error || !product) {
        res.json({ exists: false });
        return;
    }

    res.json({ exists: true, product_id: product.id, name: product.name });
}));

// PUT /api/products/:id - Update product
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');
    const updates = req.body;
    const userId = req.userId;

    if (!Number.isFinite(id) || id <= 0) throw new ValidationError('Invalid product ID');
    if (!userId) throw new ValidationError('User ID required');

    // Check if product exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

    if (fetchError || !existing) {
        throw new NotFoundError('Product', id);
    }

    // Allowed fields to update
    const allowedFields = [
        'name',
        'barcode',
        'min_stock_amount',
        'default_best_before_days',
        'default_best_before_days_after_open',
        'default_best_before_days_after_freezing',
        'default_best_before_days_after_thawing',
        'location_id',
        'default_consume_location_id',
        'qu_id_stock',
        'qu_id_purchase',
        'qu_id_consume',
        'description',
        'calories_per_serving',
        'carbs_per_serving',
        'protein_per_serving',
        'fat_per_serving',
        'num_servings',
        'walmart_link',
        'is_walmart',
        'is_meal_product'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    }

    if (Object.keys(updateData).length === 0) {
        res.json({ success: true, message: 'No changes provided' });
        return;
    }

    const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Product updated' });
}));

export default router;
