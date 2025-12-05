-- ChefByte Database Indexes
-- Optimizes common queries

-- ============================================
-- USER_ID INDEXES (for RLS performance)
-- ============================================

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

-- ============================================
-- PRODUCT LOOKUPS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_is_meal_product ON products(is_meal_product);
CREATE INDEX IF NOT EXISTS idx_products_is_placeholder ON products(is_placeholder);

-- ============================================
-- STOCK & INVENTORY
-- ============================================

CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_best_before ON stock(best_before_date);

-- ============================================
-- RECIPES & INGREDIENTS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON recipe_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);

-- ============================================
-- MEAL PLAN
-- ============================================

CREATE INDEX IF NOT EXISTS idx_meal_plan_day ON meal_plan(day);
CREATE INDEX IF NOT EXISTS idx_meal_plan_done ON meal_plan(done);
CREATE INDEX IF NOT EXISTS idx_meal_plan_day_done ON meal_plan(day, done);

-- ============================================
-- SHOPPING LIST
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shopping_list_product_id ON shopping_list(product_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_done ON shopping_list(done);

-- ============================================
-- TEMP ITEMS (MACRO TRACKING)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_temp_items_day ON temp_items(day);

-- ============================================
-- LIQUIDTRACK
-- ============================================

CREATE INDEX IF NOT EXISTS idx_liquid_events_scale_id ON liquid_events(scale_id);
CREATE INDEX IF NOT EXISTS idx_liquid_events_created_at ON liquid_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_liquid_events_scale_created ON liquid_events(scale_id, created_at);
CREATE INDEX IF NOT EXISTS idx_device_keys_key_hash ON device_keys(key_hash);

-- ============================================
-- USER CONFIG
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_config_user_key ON user_config(user_id, key);
