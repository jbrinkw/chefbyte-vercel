
import express from 'express';
import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

console.log('Loading test routes...');

const router = express.Router();

// POST /api/test/reset
// Resets the database for testing
router.post('/reset', async (_req, res): Promise<void> => {
    // Only allow in test or development
    if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ message: 'Forbidden in production' });
        return;
    }

    console.log('[Test] Resetting database...');
    try {
        await db.transaction(async (client) => {
            // 1. Truncate all data tables
            // We use CASCADE to handle foreign key constraints
            await client.query(`
                TRUNCATE TABLE 
                    stock_log,
                    shopping_list,
                    meal_plan,
                    recipe_ingredients,
                    recipes,
                    stock,
                    products,
                    quantity_unit_conversions,
                    quantity_units,
                    locations,
                    users
                RESTART IDENTITY CASCADE;
            `);

            // 2. Seed Default User
            const passwordHash = await bcrypt.hash('password123', 10);
            const userResult = await client.query(
                'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
                ['test@example.com', passwordHash, 'Test User']
            );
            const userId = userResult.rows[0].id;

            // 3. Seed Basic Data (Optional but helpful)
            // Locations
            await client.query(
                "INSERT INTO locations (user_id, name) VALUES ($1, 'Pantry'), ($1, 'Fridge'), ($1, 'Freezer')",
                [userId]
            );

            // Units - Include Serving and Container for recipe ingredients
            await client.query(
                "INSERT INTO quantity_units (user_id, name, name_plural) VALUES ($1, 'Serving', 'Servings'), ($1, 'Container', 'Containers'), ($1, 'g', 'g'), ($1, 'ml', 'ml'), ($1, 'pcs', 'pcs')",
                [userId]
            );
        });

        res.json({ message: 'Database reset successful' });
    } catch (error) {
        console.error('Reset failed:', error);
        res.status(500).json({ message: 'Reset failed', error: String(error) });
    }
});

export default router;
