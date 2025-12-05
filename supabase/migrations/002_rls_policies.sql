-- ChefByte Row Level Security Policies
-- Ensures users can only access their own data

-- ============================================
-- ENABLE RLS ON ALL TABLES
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
-- USER DATA ISOLATION POLICIES
-- ============================================

-- Locations
CREATE POLICY "Users can manage own locations" ON locations
    FOR ALL USING (auth.uid() = user_id);

-- Quantity Units (allow null user_id for system defaults)
CREATE POLICY "Users can manage own quantity units" ON quantity_units
    FOR ALL USING (user_id IS NULL OR auth.uid() = user_id);

-- Products
CREATE POLICY "Users can manage own products" ON products
    FOR ALL USING (auth.uid() = user_id);

-- Stock
CREATE POLICY "Users can manage own stock" ON stock
    FOR ALL USING (auth.uid() = user_id);

-- Recipes
CREATE POLICY "Users can manage own recipes" ON recipes
    FOR ALL USING (auth.uid() = user_id);

-- Recipe Ingredients
CREATE POLICY "Users can manage own recipe ingredients" ON recipe_ingredients
    FOR ALL USING (auth.uid() = user_id);

-- Meal Plan
CREATE POLICY "Users can manage own meal plan" ON meal_plan
    FOR ALL USING (auth.uid() = user_id);

-- Shopping List
CREATE POLICY "Users can manage own shopping list" ON shopping_list
    FOR ALL USING (auth.uid() = user_id);

-- Quantity Unit Conversions
CREATE POLICY "Users can manage own conversions" ON quantity_unit_conversions
    FOR ALL USING (auth.uid() = user_id);

-- Stock Log
CREATE POLICY "Users can manage own stock log" ON stock_log
    FOR ALL USING (auth.uid() = user_id);

-- User Config
CREATE POLICY "Users can manage own config" ON user_config
    FOR ALL USING (auth.uid() = user_id);

-- Temp Items
CREATE POLICY "Users can manage own temp items" ON temp_items
    FOR ALL USING (auth.uid() = user_id);

-- Device Keys
CREATE POLICY "Users can manage own device keys" ON device_keys
    FOR ALL USING (auth.uid() = user_id);

-- Liquid Events (read own, write via service role from Vercel function)
CREATE POLICY "Users can read own liquid events" ON liquid_events
    FOR SELECT USING (auth.uid() = user_id);

-- Note: INSERT for liquid_events is done via service_role key from Vercel function
-- This bypasses RLS and allows the serverless function to insert with the correct user_id
