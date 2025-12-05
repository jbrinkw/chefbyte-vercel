/**
 * Meal Plan Routes
 * Handles meal planning and execution
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';
import type { MealPlanEntry, RecipeIngredient } from '../types/database';
import type { CreateMealPlanRequest, ExecuteRecipeRequest } from '../types/api';

const router = Router();

// GET /api/meal-plan/today - Get today's meal plan
router.get('/today', asyncHandler(async (_req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];

    const plan = await db.all(`
      SELECT mp.*, 
             r.name as recipe_name, 
             p.name as product_name,
             qu.name as unit_name
      FROM meal_plan mp
      LEFT JOIN recipes r ON mp.recipe_id = r.id
      LEFT JOIN products p ON mp.product_id = p.id
      LEFT JOIN quantity_units qu ON mp.qu_id = qu.id
      WHERE mp.day = $1
      ORDER BY mp.day, mp.id
    `, [today]) as (MealPlanEntry & {
        recipe_name: string | null;
        product_name: string | null;
        unit_name: string | null;
    })[];

    // Transform to frontend structure
    const mealPrepRecipes = plan.filter(p => p.is_meal_prep && p.type === 'recipe');
    const regularRecipes = plan.filter(p => !p.is_meal_prep && p.type === 'recipe');
    const regularProducts = plan.filter(p => !p.is_meal_prep && p.type === 'product');

    res.json({
        mealPrepRecipes,
        regularMeals: {
            recipes: regularRecipes,
            products: regularProducts
        }
    });
}));

// GET /api/meal-plan - Get meal plan
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const start = req.query.start as string;
    const end = req.query.end as string;

    let query = `
    SELECT mp.*, 
           r.name as recipe_name, 
           p.name as product_name,
           qu.name as unit_name
    FROM meal_plan mp
    LEFT JOIN recipes r ON mp.recipe_id = r.id
    LEFT JOIN products p ON mp.product_id = p.id
    LEFT JOIN quantity_units qu ON mp.qu_id = qu.id
  `;

    const params: string[] = [];
    if (start && end) {
        query += ' WHERE mp.day BETWEEN $1 AND $2';
        params.push(start, end);
    }

    query += ' ORDER BY mp.day, mp.id';

    const plan = await db.all(query, params) as (MealPlanEntry & {
        recipe_name: string | null;
        product_name: string | null;
        unit_name: string | null;
    })[];

    res.json({ success: true, data: plan });
}));

// POST /api/meal-plan - Add entry
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateMealPlanRequest;

    if (!data.day || !data.type || !data.amount) {
        throw new ValidationError('Day, type, and amount are required');
    }

    if (data.type === 'recipe' && !data.recipe_id) {
        throw new ValidationError('Recipe ID required for recipe type');
    }
    if (data.type === 'product' && !data.product_id) {
        throw new ValidationError('Product ID required for product type');
    }

    const result = await db.query(`
    INSERT INTO meal_plan (
      day, type, recipe_id, product_id, amount, qu_id, is_meal_prep
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
        data.day,
        data.type,
        data.recipe_id || null,
        data.product_id || null,
        data.amount,
        data.qu_id || null,
        data.is_meal_prep ? 1 : 0
    ]);

    res.status(201).json({ success: true, id: result.rows[0].id });
}));

// POST /api/meal-plan/execute - Execute recipe/product
router.post('/execute', asyncHandler(async (req: Request, res: Response) => {
    const { meal_plan_id } = req.body as ExecuteRecipeRequest;

    if (!meal_plan_id) throw new ValidationError('Meal plan ID required');

    const entry = await db.get('SELECT * FROM meal_plan WHERE id = $1', [meal_plan_id]) as MealPlanEntry | undefined;
    if (!entry) throw new NotFoundError('Meal plan entry', meal_plan_id);

    if (entry.done) {
        res.json({ success: false, message: 'Already executed' });
        return;
    }

    // If it's a recipe, consume ingredients
    if (entry.type === 'recipe' && entry.recipe_id) {
        const ingredients = await db.all('SELECT * FROM recipe_ingredients WHERE recipe_id = $1', [entry.recipe_id]) as RecipeIngredient[];

        await db.transaction(async (client) => {
            for (const ing of ingredients) {
                // Simple consumption logic - reduce first available stock
                const stock = (await client.query('SELECT * FROM stock WHERE product_id = $1 LIMIT 1', [ing.product_id])).rows[0] as any;
                if (stock) {
                    const newAmount = Math.max(0, stock.amount - (ing.amount * entry.amount));
                    await client.query('UPDATE stock SET amount = $1 WHERE id = $2', [newAmount, stock.id]);
                }
            }
            await client.query('UPDATE meal_plan SET done = TRUE WHERE id = $1', [meal_plan_id]);
        });
    } else if (entry.type === 'product' && entry.product_id) {
        // Consume product directly
        await db.transaction(async (client) => {
            const stock = (await client.query('SELECT * FROM stock WHERE product_id = $1 LIMIT 1', [entry.product_id])).rows[0] as any;
            if (stock) {
                const newAmount = Math.max(0, stock.amount - entry.amount);
                await client.query('UPDATE stock SET amount = $1 WHERE id = $2', [newAmount, stock.id]);
            }
            await client.query('UPDATE meal_plan SET done = TRUE WHERE id = $1', [meal_plan_id]);
        });
    }

    res.json({ success: true, message: 'Executed successfully' });
}));

export default router;
