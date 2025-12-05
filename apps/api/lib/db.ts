/**
 * PostgreSQL Database Layer (TypeScript)
 * Uses pg pool for connection pooling and environment variables for config.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Configuration
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'chefbyte',
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  // console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper to run queries
export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),

  // Helper to get a single result
  get: async (text: string, params?: any[]) => {
    const res = await pool.query(text, params);
    return res.rows[0];
  },

  // Helper to get all results
  all: async (text: string, params?: any[]) => {
    const res = await pool.query(text, params);
    return res.rows;
  },

  // Helper to run a transaction
  transaction: async (callback: (client: any) => Promise<any>) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

export async function initDB(): Promise<void> {
  console.log('[DB] Initializing database schema...');

  try {
    // Users Table
    await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // Locations
    await db.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL
            );
        `);

    // Quantity Units
    await db.query(`
            CREATE TABLE IF NOT EXISTS quantity_units (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                name_plural TEXT
            );
        `);

    // Seed default quantity units (Serving and Container)
    await db.query(`
            INSERT INTO quantity_units (name, name_plural)
            SELECT 'Serving', 'Servings'
            WHERE NOT EXISTS (SELECT 1 FROM quantity_units WHERE name = 'Serving');
        `);
    await db.query(`
            INSERT INTO quantity_units (name, name_plural)
            SELECT 'Container', 'Containers'
            WHERE NOT EXISTS (SELECT 1 FROM quantity_units WHERE name = 'Container');
        `);

    // Products
    await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                location_id INTEGER REFERENCES locations(id),
                qu_id_stock INTEGER REFERENCES quantity_units(id),
                qu_id_purchase INTEGER REFERENCES quantity_units(id),
                qu_id_consume INTEGER REFERENCES quantity_units(id),
                qu_id_price INTEGER REFERENCES quantity_units(id),
                min_stock_amount REAL DEFAULT 0,
                default_best_before_days INTEGER DEFAULT 0,
                calories_per_serving REAL DEFAULT 0,
                carbs_per_serving REAL DEFAULT 0,
                protein_per_serving REAL DEFAULT 0,
                fat_per_serving REAL DEFAULT 0,
                num_servings REAL DEFAULT 1,
                barcode TEXT,
                walmart_link TEXT,
                is_walmart BOOLEAN DEFAULT TRUE,
                is_meal_product BOOLEAN DEFAULT FALSE,
                price REAL DEFAULT 0,
                is_placeholder BOOLEAN DEFAULT FALSE
            );
        `);

    // Stock
    await db.query(`
            CREATE TABLE IF NOT EXISTS stock (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                amount REAL NOT NULL,
                best_before_date TEXT,
                location_id INTEGER REFERENCES locations(id)
            );
        `);

    // Recipes
    await db.query(`
            CREATE TABLE IF NOT EXISTS recipes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                base_servings REAL DEFAULT 1,
                total_time INTEGER,
                active_time INTEGER,
                calories REAL,
                carbs REAL,
                protein REAL,
                fat REAL,
                product_id INTEGER REFERENCES products(id)
            );
        `);

    // Recipe Ingredients
    await db.query(`
            CREATE TABLE IF NOT EXISTS recipe_ingredients (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id),
                amount REAL NOT NULL,
                qu_id INTEGER REFERENCES quantity_units(id),
                note TEXT
            );
        `);

    // Meal Plan
    await db.query(`
            CREATE TABLE IF NOT EXISTS meal_plan (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                day TEXT NOT NULL,
                type TEXT CHECK(type IN ('recipe', 'product')),
                recipe_id INTEGER REFERENCES recipes(id),
                product_id INTEGER REFERENCES products(id),
                amount REAL DEFAULT 1,
                qu_id INTEGER REFERENCES quantity_units(id),
                done BOOLEAN DEFAULT FALSE,
                is_meal_prep BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // Shopping List
    await db.query(`
            CREATE TABLE IF NOT EXISTS shopping_list (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                amount REAL NOT NULL,
                note TEXT,
                done BOOLEAN DEFAULT FALSE
            );
        `);

    // Quantity Unit Conversions
    await db.query(`
            CREATE TABLE IF NOT EXISTS quantity_unit_conversions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                from_qu_id INTEGER NOT NULL REFERENCES quantity_units(id),
                to_qu_id INTEGER NOT NULL REFERENCES quantity_units(id),
                factor REAL NOT NULL
            );
        `);

    // Stock Log
    await db.query(`
            CREATE TABLE IF NOT EXISTS stock_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                amount REAL NOT NULL,
                best_before_date TEXT,
                purchased_date TEXT,
                stock_id INTEGER,
                transaction_type TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    console.log('[DB] Initialization complete.');
  } catch (error) {
    console.error('[DB] Initialization failed:', error);
    throw error;
  }
}

export default pool;
