-- ============================================
-- ChefByte Complete Database Setup
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: CORE TABLES
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

-- ============================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantity_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantity_unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquid_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: RLS POLICIES (User Data Isolation)
-- ============================================

CREATE POLICY "Users can manage own locations" ON locations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own quantity units" ON quantity_units
    FOR ALL USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage own products" ON products
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own stock" ON stock
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recipes" ON recipes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recipe ingredients" ON recipe_ingredients
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal plan" ON meal_plan
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own shopping list" ON shopping_list
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversions" ON quantity_unit_conversions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own stock log" ON stock_log
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own config" ON user_config
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own temp items" ON temp_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own device keys" ON device_keys
    FOR ALL USING (auth.uid() = user_id);

-- Liquid Events policies
CREATE POLICY "Users can read own liquid events" ON liquid_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liquid events" ON liquid_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liquid events" ON liquid_events
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PART 4: INDEXES (Performance)
-- ============================================

-- User ID indexes (for RLS performance)
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON locations(user_id);
CREATE INDEX IF NOT EXISTS idx_quantity_units_user_id ON quantity_units(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_user_id ON stock(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_user_id ON recipe_ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_user_id ON meal_plan(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_user_id ON shopping_list(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_items_user_id ON temp_items(user_id);
CREATE INDEX IF NOT EXISTS idx_liquid_events_user_id ON liquid_events(user_id);

-- Product lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_is_meal_product ON products(is_meal_product);
CREATE INDEX IF NOT EXISTS idx_products_is_placeholder ON products(is_placeholder);

-- Stock & Inventory
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_best_before ON stock(best_before_date);

-- Recipes & Ingredients
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON recipe_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);

-- Meal Plan
CREATE INDEX IF NOT EXISTS idx_meal_plan_day ON meal_plan(day);
CREATE INDEX IF NOT EXISTS idx_meal_plan_done ON meal_plan(done);
CREATE INDEX IF NOT EXISTS idx_meal_plan_day_done ON meal_plan(day, done);

-- Shopping List
CREATE INDEX IF NOT EXISTS idx_shopping_list_product_id ON shopping_list(product_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_done ON shopping_list(done);

-- Temp Items
CREATE INDEX IF NOT EXISTS idx_temp_items_day ON temp_items(day);

-- LiquidTrack
CREATE INDEX IF NOT EXISTS idx_liquid_events_scale_id ON liquid_events(scale_id);
CREATE INDEX IF NOT EXISTS idx_liquid_events_created_at ON liquid_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_events_scale_created ON liquid_events(scale_id, created_at);
CREATE INDEX IF NOT EXISTS idx_device_keys_key_hash ON device_keys(key_hash);

-- User Config
CREATE INDEX IF NOT EXISTS idx_user_config_user_key ON user_config(user_id, key);

-- ============================================
-- PART 5: PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================
-- PART 6: DEMO RESET FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION demo_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today TEXT := to_char(NOW(), 'YYYY-MM-DD');
    v_tomorrow TEXT := to_char(NOW() + INTERVAL '1 day', 'YYYY-MM-DD');
    v_day_after TEXT := to_char(NOW() + INTERVAL '2 days', 'YYYY-MM-DD');
    v_yesterday TEXT := to_char(NOW() - INTERVAL '1 day', 'YYYY-MM-DD');

    -- Location IDs
    v_loc_fridge INTEGER;
    v_loc_pantry INTEGER;
    v_loc_freezer INTEGER;

    -- Quantity Unit IDs
    v_qu_serving INTEGER;
    v_qu_container INTEGER;
    v_qu_gram INTEGER;
    v_qu_oz INTEGER;

    -- Product IDs
    v_prod_chicken INTEGER;
    v_prod_rice INTEGER;
    v_prod_broccoli INTEGER;
    v_prod_eggs INTEGER;
    v_prod_milk INTEGER;
    v_prod_bread INTEGER;
    v_prod_cheese INTEGER;
    v_prod_salmon INTEGER;
    v_prod_pasta INTEGER;
    v_prod_tomato_sauce INTEGER;
    v_prod_protein_powder INTEGER;
    v_prod_oats INTEGER;
    v_prod_banana INTEGER;
    v_prod_peanut_butter INTEGER;
    v_prod_greek_yogurt INTEGER;
    v_prod_spinach INTEGER;
    v_prod_olive_oil INTEGER;
    v_prod_ground_beef INTEGER;
    v_prod_tortilla INTEGER;
    v_prod_avocado INTEGER;

    -- Recipe IDs
    v_recipe_chicken_rice INTEGER;
    v_recipe_protein_shake INTEGER;
    v_recipe_scrambled_eggs INTEGER;
    v_recipe_pasta_marinara INTEGER;
    v_recipe_salmon_bowl INTEGER;
    v_recipe_beef_tacos INTEGER;
    v_recipe_overnight_oats INTEGER;
    v_recipe_greek_salad INTEGER;

    -- Meal product IDs
    v_meal_chicken_rice INTEGER;
    v_meal_protein_shake INTEGER;
BEGIN
    -- Validate user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- CLEAR ALL EXISTING DATA FOR THIS USER
    DELETE FROM liquid_events WHERE user_id = v_user_id;
    DELETE FROM device_keys WHERE user_id = v_user_id;
    DELETE FROM temp_items WHERE user_id = v_user_id;
    DELETE FROM user_config WHERE user_id = v_user_id;
    DELETE FROM stock_log WHERE user_id = v_user_id;
    DELETE FROM quantity_unit_conversions WHERE user_id = v_user_id;
    DELETE FROM shopping_list WHERE user_id = v_user_id;
    DELETE FROM meal_plan WHERE user_id = v_user_id;
    DELETE FROM recipe_ingredients WHERE user_id = v_user_id;
    DELETE FROM recipes WHERE user_id = v_user_id;
    DELETE FROM stock WHERE user_id = v_user_id;
    DELETE FROM products WHERE user_id = v_user_id;
    DELETE FROM quantity_units WHERE user_id = v_user_id;
    DELETE FROM locations WHERE user_id = v_user_id;

    -- CREATE LOCATIONS
    INSERT INTO locations (user_id, name) VALUES (v_user_id, 'Fridge') RETURNING id INTO v_loc_fridge;
    INSERT INTO locations (user_id, name) VALUES (v_user_id, 'Pantry') RETURNING id INTO v_loc_pantry;
    INSERT INTO locations (user_id, name) VALUES (v_user_id, 'Freezer') RETURNING id INTO v_loc_freezer;

    -- CREATE QUANTITY UNITS
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'Serving', 'Servings') RETURNING id INTO v_qu_serving;
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'Container', 'Containers') RETURNING id INTO v_qu_container;
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'g', 'g') RETURNING id INTO v_qu_gram;
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'oz', 'oz') RETURNING id INTO v_qu_oz;

    -- CREATE PRODUCTS (Proteins)
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Chicken Breast', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 2, 5, 165, 0, 31, 3.6, 4, 9.99, '012345678901', 'https://www.walmart.com/ip/Boneless-Skinless-Chicken-Breast/123456', true)
    RETURNING id INTO v_prod_chicken;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Salmon Fillet', v_loc_freezer, v_qu_container, v_qu_container, v_qu_serving, 1, 30, 208, 0, 20, 13, 2, 12.99, '012345678902', 'https://www.walmart.com/ip/Salmon-Fillet/123457', true)
    RETURNING id INTO v_prod_salmon;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Ground Beef 80/20', v_loc_freezer, v_qu_container, v_qu_container, v_qu_serving, 1, 90, 287, 0, 19, 23, 4, 7.99, '012345678903', 'https://www.walmart.com/ip/Ground-Beef/123458', true)
    RETURNING id INTO v_prod_ground_beef;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Large Eggs', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 1, 21, 72, 0.4, 6, 5, 12, 4.29, '012345678904', 'https://www.walmart.com/ip/Large-Eggs/123459', true)
    RETURNING id INTO v_prod_eggs;

    -- Dairy
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Whole Milk', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 1, 10, 149, 12, 8, 8, 8, 3.99, '012345678905', 'https://www.walmart.com/ip/Whole-Milk/123460', true)
    RETURNING id INTO v_prod_milk;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Cheddar Cheese', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 1, 30, 113, 0.4, 7, 9, 8, 5.49, '012345678906', 'https://www.walmart.com/ip/Cheddar-Cheese/123461', true)
    RETURNING id INTO v_prod_cheese;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Greek Yogurt', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 2, 14, 100, 6, 17, 0.7, 4, 5.99, '012345678907', 'https://www.walmart.com/ip/Greek-Yogurt/123462', true)
    RETURNING id INTO v_prod_greek_yogurt;

    -- Carbs/Grains
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Jasmine Rice', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 365, 205, 45, 4, 0.4, 20, 8.99, '012345678908', 'https://www.walmart.com/ip/Jasmine-Rice/123463', true)
    RETURNING id INTO v_prod_rice;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Whole Wheat Bread', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 7, 80, 15, 4, 1, 20, 3.49, '012345678909', 'https://www.walmart.com/ip/Whole-Wheat-Bread/123464', true)
    RETURNING id INTO v_prod_bread;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Spaghetti Pasta', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 730, 200, 42, 7, 1, 8, 1.99, '012345678910', 'https://www.walmart.com/ip/Spaghetti/123465', true)
    RETURNING id INTO v_prod_pasta;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Old Fashioned Oats', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 365, 150, 27, 5, 3, 30, 4.99, '012345678911', 'https://www.walmart.com/ip/Oats/123466', true)
    RETURNING id INTO v_prod_oats;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Flour Tortillas', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 30, 140, 24, 4, 3, 10, 3.29, '012345678912', 'https://www.walmart.com/ip/Tortillas/123467', true)
    RETURNING id INTO v_prod_tortilla;

    -- Vegetables
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Broccoli', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 1, 7, 55, 11, 4, 0.6, 4, 2.99, '012345678913', 'https://www.walmart.com/ip/Broccoli/123468', true)
    RETURNING id INTO v_prod_broccoli;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Baby Spinach', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 1, 7, 7, 1, 1, 0.1, 6, 4.49, '012345678914', 'https://www.walmart.com/ip/Baby-Spinach/123469', true)
    RETURNING id INTO v_prod_spinach;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Avocado', v_loc_fridge, v_qu_container, v_qu_container, v_qu_serving, 2, 5, 240, 12, 3, 22, 1, 1.50, '012345678915', NULL, false)
    RETURNING id INTO v_prod_avocado;

    -- Fruits
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Banana', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 3, 7, 105, 27, 1, 0.4, 6, 0.99, '012345678916', 'https://www.walmart.com/ip/Bananas/123470', true)
    RETURNING id INTO v_prod_banana;

    -- Sauces & Condiments
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Marinara Sauce', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 365, 70, 10, 2, 2, 6, 3.49, '012345678917', 'https://www.walmart.com/ip/Marinara-Sauce/123471', true)
    RETURNING id INTO v_prod_tomato_sauce;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Peanut Butter', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 180, 190, 7, 7, 16, 15, 4.99, '012345678918', 'https://www.walmart.com/ip/Peanut-Butter/123472', true)
    RETURNING id INTO v_prod_peanut_butter;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Olive Oil', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 730, 120, 0, 0, 14, 50, 8.99, '012345678919', 'https://www.walmart.com/ip/Olive-Oil/123473', true)
    RETURNING id INTO v_prod_olive_oil;

    -- Supplements
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, min_stock_amount, default_best_before_days, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, price, barcode, walmart_link, is_walmart)
    VALUES (v_user_id, 'Whey Protein Powder', v_loc_pantry, v_qu_container, v_qu_container, v_qu_serving, 1, 365, 120, 3, 24, 1, 30, 29.99, '012345678920', 'https://www.walmart.com/ip/Whey-Protein/123474', true)
    RETURNING id INTO v_prod_protein_powder;

    -- CREATE RECIPES
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Chicken Rice Bowl', 'High protein meal prep staple with seasoned chicken breast and jasmine rice', 4, 35, 20, 450, 45, 42, 8)
    RETURNING id INTO v_recipe_chicken_rice;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_chicken_rice, v_prod_chicken, 2, v_qu_serving, 'diced'),
        (v_user_id, v_recipe_chicken_rice, v_prod_rice, 2, v_qu_serving, NULL),
        (v_user_id, v_recipe_chicken_rice, v_prod_broccoli, 1, v_qu_serving, 'steamed'),
        (v_user_id, v_recipe_chicken_rice, v_prod_olive_oil, 1, v_qu_serving, NULL);

    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Post-Workout Protein Shake', 'Quick recovery shake with protein and carbs', 1, 5, 5, 380, 42, 33, 9)
    RETURNING id INTO v_recipe_protein_shake;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_protein_shake, v_prod_protein_powder, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_protein_shake, v_prod_milk, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_protein_shake, v_prod_banana, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_protein_shake, v_prod_peanut_butter, 0.5, v_qu_serving, NULL);

    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Scrambled Eggs & Toast', 'Classic breakfast with fluffy eggs and whole wheat toast', 1, 10, 10, 350, 17, 20, 22)
    RETURNING id INTO v_recipe_scrambled_eggs;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_scrambled_eggs, v_prod_eggs, 3, v_qu_serving, 'scrambled'),
        (v_user_id, v_recipe_scrambled_eggs, v_prod_bread, 1, v_qu_serving, 'toasted'),
        (v_user_id, v_recipe_scrambled_eggs, v_prod_cheese, 0.5, v_qu_serving, 'shredded');

    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Pasta Marinara', 'Simple Italian classic with homestyle marinara sauce', 2, 20, 10, 340, 62, 11, 5)
    RETURNING id INTO v_recipe_pasta_marinara;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_pasta_marinara, v_prod_pasta, 2, v_qu_serving, 'cooked'),
        (v_user_id, v_recipe_pasta_marinara, v_prod_tomato_sauce, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_pasta_marinara, v_prod_olive_oil, 0.5, v_qu_serving, NULL);

    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Salmon Power Bowl', 'Omega-3 rich salmon with rice and veggies', 1, 25, 15, 520, 45, 32, 22)
    RETURNING id INTO v_recipe_salmon_bowl;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_salmon_bowl, v_prod_salmon, 1, v_qu_serving, 'baked'),
        (v_user_id, v_recipe_salmon_bowl, v_prod_rice, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_salmon_bowl, v_prod_spinach, 1, v_qu_serving, 'fresh'),
        (v_user_id, v_recipe_salmon_bowl, v_prod_avocado, 0.5, v_qu_serving, 'sliced');

    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Ground Beef Tacos', 'Classic seasoned beef tacos with fresh toppings', 3, 20, 15, 420, 28, 24, 24)
    RETURNING id INTO v_recipe_beef_tacos;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_beef_tacos, v_prod_ground_beef, 1, v_qu_serving, 'seasoned'),
        (v_user_id, v_recipe_beef_tacos, v_prod_tortilla, 2, v_qu_serving, 'warmed'),
        (v_user_id, v_recipe_beef_tacos, v_prod_cheese, 0.5, v_qu_serving, 'shredded');

    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Overnight Oats', 'No-cook breakfast prep with Greek yogurt and fruit', 1, 5, 5, 450, 58, 25, 12)
    RETURNING id INTO v_recipe_overnight_oats;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_overnight_oats, v_prod_oats, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_overnight_oats, v_prod_greek_yogurt, 0.5, v_qu_serving, NULL),
        (v_user_id, v_recipe_overnight_oats, v_prod_milk, 0.5, v_qu_serving, NULL),
        (v_user_id, v_recipe_overnight_oats, v_prod_banana, 0.5, v_qu_serving, 'sliced');

    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Greek Protein Salad', 'Fresh salad with eggs and cheese for protein', 1, 10, 10, 320, 8, 18, 25)
    RETURNING id INTO v_recipe_greek_salad;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_greek_salad, v_prod_spinach, 2, v_qu_serving, NULL),
        (v_user_id, v_recipe_greek_salad, v_prod_eggs, 2, v_qu_serving, 'hard boiled'),
        (v_user_id, v_recipe_greek_salad, v_prod_cheese, 0.5, v_qu_serving, 'crumbled'),
        (v_user_id, v_recipe_greek_salad, v_prod_olive_oil, 1, v_qu_serving, 'dressing');

    -- CREATE MEAL PRODUCTS (from recipes)
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, is_meal_product)
    VALUES (v_user_id, '[MEAL] Chicken Rice Bowl', v_loc_fridge, v_qu_serving, v_qu_serving, v_qu_serving, 450, 45, 42, 8, 1, true)
    RETURNING id INTO v_meal_chicken_rice;

    UPDATE recipes SET product_id = v_meal_chicken_rice WHERE id = v_recipe_chicken_rice;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, is_meal_product)
    VALUES (v_user_id, '[MEAL] Post-Workout Protein Shake', v_loc_fridge, v_qu_serving, v_qu_serving, v_qu_serving, 380, 42, 33, 9, 1, true)
    RETURNING id INTO v_meal_protein_shake;

    UPDATE recipes SET product_id = v_meal_protein_shake WHERE id = v_recipe_protein_shake;

    -- CREATE STOCK (INVENTORY)
    INSERT INTO stock (user_id, product_id, amount, best_before_date, location_id) VALUES
        (v_user_id, v_prod_chicken, 3, to_char(NOW() + INTERVAL '4 days', 'YYYY-MM-DD'), v_loc_fridge),
        (v_user_id, v_prod_rice, 1, to_char(NOW() + INTERVAL '180 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_broccoli, 2, to_char(NOW() + INTERVAL '5 days', 'YYYY-MM-DD'), v_loc_fridge),
        (v_user_id, v_prod_eggs, 2, to_char(NOW() + INTERVAL '14 days', 'YYYY-MM-DD'), v_loc_fridge),
        (v_user_id, v_prod_milk, 1, to_char(NOW() + INTERVAL '7 days', 'YYYY-MM-DD'), v_loc_fridge),
        (v_user_id, v_prod_bread, 1, to_char(NOW() + INTERVAL '5 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_cheese, 1, to_char(NOW() + INTERVAL '21 days', 'YYYY-MM-DD'), v_loc_fridge),
        (v_user_id, v_prod_pasta, 2, to_char(NOW() + INTERVAL '365 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_tomato_sauce, 1, to_char(NOW() + INTERVAL '365 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_protein_powder, 1, to_char(NOW() + INTERVAL '180 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_oats, 1, to_char(NOW() + INTERVAL '180 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_peanut_butter, 1, to_char(NOW() + INTERVAL '90 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_greek_yogurt, 3, to_char(NOW() + INTERVAL '10 days', 'YYYY-MM-DD'), v_loc_fridge),
        (v_user_id, v_prod_olive_oil, 1, to_char(NOW() + INTERVAL '365 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_banana, 1, to_char(NOW() + INTERVAL '3 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_spinach, 0.5, to_char(NOW() + INTERVAL '3 days', 'YYYY-MM-DD'), v_loc_fridge),
        (v_user_id, v_prod_salmon, 2, to_char(NOW() + INTERVAL '60 days', 'YYYY-MM-DD'), v_loc_freezer),
        (v_user_id, v_prod_ground_beef, 1, to_char(NOW() + INTERVAL '90 days', 'YYYY-MM-DD'), v_loc_freezer),
        (v_user_id, v_meal_chicken_rice, 3, to_char(NOW() + INTERVAL '3 days', 'YYYY-MM-DD'), v_loc_fridge);

    -- CREATE MEAL PLAN
    INSERT INTO meal_plan (user_id, day, type, recipe_id, amount, done)
    VALUES
        (v_user_id, v_yesterday, 'recipe', v_recipe_scrambled_eggs, 1, true),
        (v_user_id, v_yesterday, 'recipe', v_recipe_chicken_rice, 1, true),
        (v_user_id, v_yesterday, 'recipe', v_recipe_protein_shake, 1, true),
        (v_user_id, v_today, 'recipe', v_recipe_overnight_oats, 1, false),
        (v_user_id, v_today, 'recipe', v_recipe_chicken_rice, 1, false),
        (v_user_id, v_today, 'recipe', v_recipe_salmon_bowl, 1, false),
        (v_user_id, v_tomorrow, 'recipe', v_recipe_scrambled_eggs, 1, false),
        (v_user_id, v_tomorrow, 'recipe', v_recipe_pasta_marinara, 1, false),
        (v_user_id, v_tomorrow, 'recipe', v_recipe_greek_salad, 1, false);

    INSERT INTO meal_plan (user_id, day, type, product_id, amount, qu_id, done)
    VALUES (v_user_id, v_today, 'product', v_meal_chicken_rice, 1, v_qu_serving, false);

    INSERT INTO meal_plan (user_id, day, type, recipe_id, amount, done, is_meal_prep)
    VALUES
        (v_user_id, v_day_after, 'recipe', v_recipe_chicken_rice, 4, false, true),
        (v_user_id, v_day_after, 'recipe', v_recipe_beef_tacos, 1, false, false);

    -- CREATE SHOPPING LIST
    INSERT INTO shopping_list (user_id, product_id, amount, note, done) VALUES
        (v_user_id, v_prod_banana, 3, 'For smoothies', false),
        (v_user_id, v_prod_spinach, 2, NULL, false),
        (v_user_id, v_prod_avocado, 4, 'Get ripe ones', false),
        (v_user_id, v_prod_tortilla, 1, NULL, false),
        (v_user_id, v_prod_ground_beef, 2, 'For taco night', false),
        (v_user_id, v_prod_milk, 1, NULL, true);

    -- CREATE TEMP ITEMS
    INSERT INTO temp_items (user_id, name, calories, carbs, protein, fat, day) VALUES
        (v_user_id, 'Morning Coffee with Cream', 50, 1, 0, 5, v_today),
        (v_user_id, 'Afternoon Protein Bar', 200, 22, 20, 6, v_today),
        (v_user_id, 'Pre-workout Energy Drink', 10, 2, 0, 0, v_yesterday);

    -- CREATE USER CONFIG
    INSERT INTO user_config (user_id, key, value) VALUES
        (v_user_id, 'goal_calories', '2200'),
        (v_user_id, 'goal_carbs', '220'),
        (v_user_id, 'goal_protein', '180'),
        (v_user_id, 'goal_fats', '75'),
        (v_user_id, 'taste_profile', 'High protein, moderate carbs. Prefer chicken and fish over red meat. Love Mediterranean flavors. Avoid excessive dairy. Enjoy spicy foods.'),
        (v_user_id, 'day_start_hour', '6');

    -- CREATE STOCK LOG
    INSERT INTO stock_log (user_id, product_id, amount, transaction_type, timestamp) VALUES
        (v_user_id, v_prod_chicken, 1, 'purchase', NOW() - INTERVAL '2 days'),
        (v_user_id, v_prod_eggs, 1, 'purchase', NOW() - INTERVAL '3 days'),
        (v_user_id, v_prod_milk, 1, 'consume', NOW() - INTERVAL '1 day'),
        (v_user_id, v_prod_banana, 2, 'consume', NOW() - INTERVAL '1 day'),
        (v_user_id, v_prod_protein_powder, 1, 'consume', v_yesterday::TIMESTAMPTZ),
        (v_user_id, v_prod_greek_yogurt, 1, 'purchase', NOW() - INTERVAL '2 days');

END;
$$;

GRANT EXECUTE ON FUNCTION demo_reset() TO authenticated;

-- ============================================
-- DONE! Your database is ready.
-- ============================================
