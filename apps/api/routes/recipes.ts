/**
 * Recipe Routes
 * Handles recipe management and ingredients
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';
import type { Recipe, RecipeIngredient } from '../types/database';
import type { CreateRecipeRequest, UpdateRecipeRequest } from '../types/api';
import { updateRecipeWithMacros } from '../lib/recipeMacros';
import { syncMealProducts } from '../lib/mealProducts';

const router = Router();

// GET /api/recipes/protein-densities - Get recipes by protein density
router.get('/protein-densities', asyncHandler(async (_req: Request, res: Response) => {
    const recipes = await db.all(`
    SELECT id, name, calories, protein, (protein * 4.0 / calories) as density 
    FROM recipes 
    WHERE calories > 0 
    ORDER BY density DESC
  `);
    res.json({ success: true, data: recipes });
}));

// GET /api/recipes/carbs-densities - Get recipes by carb density
router.get('/carbs-densities', asyncHandler(async (_req: Request, res: Response) => {
    const recipes = await db.all(`
    SELECT id, name, calories, carbs, (carbs * 4.0 / calories) as density 
    FROM recipes 
    WHERE calories > 0 
    ORDER BY density ASC
  `);
    res.json({ success: true, data: recipes });
}));

// GET /api/recipes - Get all recipes
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const recipes = await db.all('SELECT * FROM recipes ORDER BY name') as Recipe[];
    res.json({ success: true, data: recipes });
}));

// GET /api/recipes/:id - Get single recipe with ingredients
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');

    if (!Number.isFinite(id)) {
        throw new ValidationError('Invalid recipe ID');
    }

    const recipe = await db.get('SELECT * FROM recipes WHERE id = $1', [id]) as Recipe | undefined;

    if (!recipe) {
        throw new NotFoundError('Recipe', id);
    }

    const ingredients = await db.all(`
    SELECT ri.*, p.name as product_name, qu.name as unit_name 
    FROM recipe_ingredients ri
    JOIN products p ON ri.product_id = p.id
    LEFT JOIN quantity_units qu ON ri.qu_id = qu.id
    WHERE ri.recipe_id = $1
  `, [id]) as (RecipeIngredient & { product_name: string; unit_name: string | null })[];

    res.json({
        success: true,
        data: { ...recipe, ingredients }
    });
}));

// POST /api/recipes - Create recipe
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateRecipeRequest;

    if (!data.name?.trim()) {
        throw new ValidationError('Recipe name is required');
    }

    const result = await db.query(`
    INSERT INTO recipes (
      name, description, base_servings, total_time, active_time, calories, carbs, protein, fat, user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `, [
        data.name.trim(),
        data.description || null,
        data.base_servings || 1,
        data.total_time || null,
        data.active_time || null,
        data.calories || 0,
        data.carbs || 0,
        data.protein || 0,
        data.fat || 0,
        req.userId || 1 // Default to 1 if not set (though auth middleware should set it)
    ]);

    const recipeId = result.rows[0].id;
    const recipe = await db.get('SELECT * FROM recipes WHERE id = $1', [recipeId]) as Recipe;

    // Auto-sync meal products
    await syncMealProducts(recipe.id);

    res.status(201).json({ success: true, data: recipe });
}));

// PUT /api/recipes/:id - Update recipe
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');
    const data = req.body as UpdateRecipeRequest;

    if (!Number.isFinite(id)) {
        throw new ValidationError('Invalid recipe ID');
    }

    const existing = await db.get('SELECT id FROM recipes WHERE id = $1', [id]);
    if (!existing) {
        throw new NotFoundError('Recipe', id);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
        updates.push(`name = $${values.length + 1}`);
        values.push(data.name);
    }
    if (data.description !== undefined) {
        updates.push(`description = $${values.length + 1}`);
        values.push(data.description);
    }
    if (data.base_servings !== undefined) {
        updates.push(`base_servings = $${values.length + 1}`);
        values.push(data.base_servings);
    }
    if (data.calories !== undefined) {
        updates.push(`calories = $${values.length + 1}`);
        values.push(data.calories);
    }

    if (updates.length > 0) {
        values.push(id);
        await db.query(`UPDATE recipes SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    }

    const recipe = await db.get('SELECT * FROM recipes WHERE id = $1', [id]) as Recipe;

    // Auto-sync meal products if macros or servings changed
    if (data.base_servings !== undefined || data.calories !== undefined) {
        await syncMealProducts(id);
    }

    res.json({ success: true, data: recipe });
}));

// DELETE /api/recipes/:id - Delete recipe
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');

    if (!Number.isFinite(id)) {
        throw new ValidationError('Invalid recipe ID');
    }

    await db.transaction(async (client) => {
        await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
        const result = await client.query('DELETE FROM recipes WHERE id = $1', [id]);
        if (result.rowCount === 0) throw new NotFoundError('Recipe', id);
    });

    res.json({ success: true, message: 'Recipe deleted' });
}));

// POST /api/recipes/:id/ingredients - Add ingredient
router.post('/:id/ingredients', asyncHandler(async (req: Request, res: Response) => {
    const recipeId = parseInt(req.params.id || '0');
    const { product_id, amount, qu_id, note } = req.body;

    if (!Number.isFinite(recipeId)) throw new ValidationError('Invalid recipe ID');
    if (!product_id || !amount) throw new ValidationError('Product and amount required');

    const result = await db.query(`
    INSERT INTO recipe_ingredients (recipe_id, product_id, amount, qu_id, note, user_id)
    VALUES ($1, $2, $3, $4, $5, (SELECT id FROM users LIMIT 1))
    RETURNING id
  `, [recipeId, product_id, amount, qu_id || null, note || null]);

    // Auto-recalculate recipe macros and sync meal products
    await updateRecipeWithMacros(recipeId);

    res.status(201).json({ success: true, id: result.rows[0].id });
}));

// DELETE /api/recipes/:id/ingredients/:ingredientId - Delete ingredient
router.delete('/:id/ingredients/:ingredientId', asyncHandler(async (req: Request, res: Response) => {
    const recipeId = parseInt(req.params.id || '0');
    const ingredientId = parseInt(req.params.ingredientId || '0');

    if (!Number.isFinite(recipeId) || !Number.isFinite(ingredientId)) {
        throw new ValidationError('Invalid ID');
    }

    const result = await db.query('DELETE FROM recipe_ingredients WHERE id = $1 AND recipe_id = $2', [ingredientId, recipeId]);

    if (result.rowCount === 0) {
        throw new NotFoundError('Ingredient', ingredientId);
    }

    // Auto-recalculate recipe macros and sync meal products
    await updateRecipeWithMacros(recipeId);

    res.json({ success: true, message: 'Ingredient deleted' });
}));

export default router;
