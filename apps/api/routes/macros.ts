/**
 * Macro Tracking Routes
 * Handles daily macro summaries and history
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { asyncHandler } from '../middleware/asyncHandler';
import type { DaySummaryResponse } from '../types/api';

const router = Router();

// GET /api/macros/day-summary - Get summary for a specific day
router.get('/day-summary', asyncHandler(async (req: Request, res: Response) => {
    const day = (req.query.day as any) || new Date().toISOString().split('T')[0];

    // Get all executed meal plan entries for the day
    const meals = await db.all(`
    SELECT mp.id, mp.type, mp.amount,
           r.name as recipe_name, r.calories as r_cal, r.carbs as r_carbs, r.protein as r_prot, r.fat as r_fat,
           p.name as product_name, p.calories_per_serving as p_cal, p.carbs_per_serving as p_carbs, 
           p.protein_per_serving as p_prot, p.fat_per_serving as p_fat
    FROM meal_plan mp
    LEFT JOIN recipes r ON mp.recipe_id = r.id
    LEFT JOIN products p ON mp.product_id = p.id
    WHERE mp.day = $1 AND mp.done = TRUE
  `, [day]) as any[];

    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;

    const mealDetails = meals.map(m => {
        let cal = 0, carbs = 0, prot = 0, fat = 0;
        let name = '';

        if (m.type === 'recipe') {
            name = m.recipe_name || 'Unknown Recipe';
            cal = (m.r_cal || 0) * m.amount;
            carbs = (m.r_carbs || 0) * m.amount;
            prot = (m.r_prot || 0) * m.amount;
            fat = (m.r_fat || 0) * m.amount;
        } else {
            name = m.product_name || 'Unknown Product';
            cal = (m.p_cal || 0) * m.amount;
            carbs = (m.p_carbs || 0) * m.amount;
            prot = (m.p_prot || 0) * m.amount;
            fat = (m.p_fat || 0) * m.amount;
        }

        totalCalories += cal;
        totalCarbs += carbs;
        totalProtein += prot;
        totalFat += fat;

        return {
            id: m.id,
            name,
            type: m.type,
            calories: Math.round(cal),
            carbs: Math.round(carbs),
            protein: Math.round(prot),
            fat: Math.round(fat)
        };
    });

    const response: DaySummaryResponse = {
        day,
        total_calories: Math.round(totalCalories),
        total_carbs: Math.round(totalCarbs),
        total_protein: Math.round(totalProtein),
        total_fat: Math.round(totalFat),
        meals: mealDetails
    };

    res.json({ success: true, data: response });
}));

// GET /api/macros/recent-days - Get summaries for last N days
router.get('/recent-days', asyncHandler(async (req: Request, res: Response) => {
    const daysParam = req.query.days;
    const days = parseInt(typeof daysParam === 'string' ? daysParam : '7');

    // Get distinct days from meal plan in range
    const recentDays = await db.all(`
    SELECT DISTINCT day 
    FROM meal_plan 
    WHERE done = TRUE 
    ORDER BY day DESC 
    LIMIT $1
  `, [days]) as { day: string }[];

    // For each day, calculate totals (simplified for now, ideally would be a single complex query)
    const summaries = recentDays.map(d => {
        return { day: d.day };
    });

    res.json({ success: true, data: summaries });
}));

export default router;
