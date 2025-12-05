-- ChefByte Supabase Schema Migration
-- Initial schema with multi-tenant support via user_id and RLS

-- ============================================
-- CORE TABLES
-- ============================================

-- Locations (Fridge, Pantry, Freezer, etc.)
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantity Units (Serving, Container, g, oz, etc.)
CREATE TABLE IF NOT EXISTS quantity_units (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_plural TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (main product catalog)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
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
    is_placeholder BOOLEAN DEFAULT FALSE,
    price REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock (inventory entries)
CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    best_before_date TEXT,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_servings REAL DEFAULT 1,
    total_time INTEGER,
    active_time INTEGER,
    calories REAL,
    carbs REAL,
    protein REAL,
    fat REAL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe Ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    qu_id INTEGER REFERENCES quantity_units(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Plan
CREATE TABLE IF NOT EXISTS meal_plan (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    type TEXT CHECK(type IN ('recipe', 'product')),
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    amount REAL DEFAULT 1,
    qu_id INTEGER REFERENCES quantity_units(id),
    done BOOLEAN DEFAULT FALSE,
    is_meal_prep BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping List
CREATE TABLE IF NOT EXISTS shopping_list (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    note TEXT,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantity Unit Conversions
CREATE TABLE IF NOT EXISTS quantity_unit_conversions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    from_qu_id INTEGER NOT NULL REFERENCES quantity_units(id),
    to_qu_id INTEGER NOT NULL REFERENCES quantity_units(id),
    factor REAL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Log (transaction history)
CREATE TABLE IF NOT EXISTS stock_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    best_before_date TEXT,
    purchased_date TEXT,
    stock_id INTEGER,
    transaction_type TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONFIG & MACRO TRACKING
-- ============================================

-- User Config (key-value settings per user)
CREATE TABLE IF NOT EXISTS user_config (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- Temp Items (temporary macro entries not tied to products)
CREATE TABLE IF NOT EXISTS temp_items (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    calories REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    day TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LIQUIDTRACK (ESP8266 Smart Scales)
-- ============================================

-- Device Keys (API keys for ESP devices)
CREATE TABLE IF NOT EXISTS device_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Liquid Events (consumption data from scales)
CREATE TABLE IF NOT EXISTS liquid_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scale_id TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    weight_before REAL NOT NULL,
    weight_after REAL NOT NULL,
    consumed REAL NOT NULL,
    is_refill BOOLEAN NOT NULL DEFAULT FALSE,
    product_name TEXT NOT NULL,
    calories REAL NOT NULL DEFAULT 0,
    protein REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scale_id, timestamp)
);
