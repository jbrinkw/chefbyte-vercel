-- ChefByte Demo Reset Function
-- This function clears all data for the current user and populates comprehensive sample data

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

    -- ============================================
    -- CLEAR ALL EXISTING DATA FOR THIS USER
    -- ============================================
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

    -- ============================================
    -- CREATE LOCATIONS
    -- ============================================
    INSERT INTO locations (user_id, name) VALUES (v_user_id, 'Fridge') RETURNING id INTO v_loc_fridge;
    INSERT INTO locations (user_id, name) VALUES (v_user_id, 'Pantry') RETURNING id INTO v_loc_pantry;
    INSERT INTO locations (user_id, name) VALUES (v_user_id, 'Freezer') RETURNING id INTO v_loc_freezer;

    -- ============================================
    -- CREATE QUANTITY UNITS
    -- ============================================
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'Serving', 'Servings') RETURNING id INTO v_qu_serving;
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'Container', 'Containers') RETURNING id INTO v_qu_container;
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'g', 'g') RETURNING id INTO v_qu_gram;
    INSERT INTO quantity_units (user_id, name, name_plural) VALUES (v_user_id, 'oz', 'oz') RETURNING id INTO v_qu_oz;

    -- ============================================
    -- CREATE PRODUCTS WITH FULL NUTRITION DATA
    -- ============================================

    -- Proteins
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

    -- ============================================
    -- CREATE RECIPES
    -- ============================================

    -- Chicken and Rice Bowl
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Chicken Rice Bowl', 'High protein meal prep staple with seasoned chicken breast and jasmine rice', 4, 35, 20, 450, 45, 42, 8)
    RETURNING id INTO v_recipe_chicken_rice;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_chicken_rice, v_prod_chicken, 2, v_qu_serving, 'diced'),
        (v_user_id, v_recipe_chicken_rice, v_prod_rice, 2, v_qu_serving, NULL),
        (v_user_id, v_recipe_chicken_rice, v_prod_broccoli, 1, v_qu_serving, 'steamed'),
        (v_user_id, v_recipe_chicken_rice, v_prod_olive_oil, 1, v_qu_serving, NULL);

    -- Protein Shake
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Post-Workout Protein Shake', 'Quick recovery shake with protein and carbs', 1, 5, 5, 380, 42, 33, 9)
    RETURNING id INTO v_recipe_protein_shake;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_protein_shake, v_prod_protein_powder, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_protein_shake, v_prod_milk, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_protein_shake, v_prod_banana, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_protein_shake, v_prod_peanut_butter, 0.5, v_qu_serving, NULL);

    -- Scrambled Eggs with Toast
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Scrambled Eggs & Toast', 'Classic breakfast with fluffy eggs and whole wheat toast', 1, 10, 10, 350, 17, 20, 22)
    RETURNING id INTO v_recipe_scrambled_eggs;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_scrambled_eggs, v_prod_eggs, 3, v_qu_serving, 'scrambled'),
        (v_user_id, v_recipe_scrambled_eggs, v_prod_bread, 1, v_qu_serving, 'toasted'),
        (v_user_id, v_recipe_scrambled_eggs, v_prod_cheese, 0.5, v_qu_serving, 'shredded');

    -- Pasta Marinara
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Pasta Marinara', 'Simple Italian classic with homestyle marinara sauce', 2, 20, 10, 340, 62, 11, 5)
    RETURNING id INTO v_recipe_pasta_marinara;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_pasta_marinara, v_prod_pasta, 2, v_qu_serving, 'cooked'),
        (v_user_id, v_recipe_pasta_marinara, v_prod_tomato_sauce, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_pasta_marinara, v_prod_olive_oil, 0.5, v_qu_serving, NULL);

    -- Salmon Bowl
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Salmon Power Bowl', 'Omega-3 rich salmon with rice and veggies', 1, 25, 15, 520, 45, 32, 22)
    RETURNING id INTO v_recipe_salmon_bowl;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_salmon_bowl, v_prod_salmon, 1, v_qu_serving, 'baked'),
        (v_user_id, v_recipe_salmon_bowl, v_prod_rice, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_salmon_bowl, v_prod_spinach, 1, v_qu_serving, 'fresh'),
        (v_user_id, v_recipe_salmon_bowl, v_prod_avocado, 0.5, v_qu_serving, 'sliced');

    -- Beef Tacos
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Ground Beef Tacos', 'Classic seasoned beef tacos with fresh toppings', 3, 20, 15, 420, 28, 24, 24)
    RETURNING id INTO v_recipe_beef_tacos;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_beef_tacos, v_prod_ground_beef, 1, v_qu_serving, 'seasoned'),
        (v_user_id, v_recipe_beef_tacos, v_prod_tortilla, 2, v_qu_serving, 'warmed'),
        (v_user_id, v_recipe_beef_tacos, v_prod_cheese, 0.5, v_qu_serving, 'shredded');

    -- Overnight Oats
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Overnight Oats', 'No-cook breakfast prep with Greek yogurt and fruit', 1, 5, 5, 450, 58, 25, 12)
    RETURNING id INTO v_recipe_overnight_oats;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_overnight_oats, v_prod_oats, 1, v_qu_serving, NULL),
        (v_user_id, v_recipe_overnight_oats, v_prod_greek_yogurt, 0.5, v_qu_serving, NULL),
        (v_user_id, v_recipe_overnight_oats, v_prod_milk, 0.5, v_qu_serving, NULL),
        (v_user_id, v_recipe_overnight_oats, v_prod_banana, 0.5, v_qu_serving, 'sliced');

    -- Greek Salad
    INSERT INTO recipes (user_id, name, description, base_servings, total_time, active_time, calories, carbs, protein, fat)
    VALUES (v_user_id, 'Greek Protein Salad', 'Fresh salad with eggs and cheese for protein', 1, 10, 10, 320, 8, 18, 25)
    RETURNING id INTO v_recipe_greek_salad;

    INSERT INTO recipe_ingredients (user_id, recipe_id, product_id, amount, qu_id, note)
    VALUES
        (v_user_id, v_recipe_greek_salad, v_prod_spinach, 2, v_qu_serving, NULL),
        (v_user_id, v_recipe_greek_salad, v_prod_eggs, 2, v_qu_serving, 'hard boiled'),
        (v_user_id, v_recipe_greek_salad, v_prod_cheese, 0.5, v_qu_serving, 'crumbled'),
        (v_user_id, v_recipe_greek_salad, v_prod_olive_oil, 1, v_qu_serving, 'dressing');

    -- ============================================
    -- CREATE MEAL PRODUCTS (from recipes)
    -- ============================================
    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, is_meal_product)
    VALUES (v_user_id, '[MEAL] Chicken Rice Bowl', v_loc_fridge, v_qu_serving, v_qu_serving, v_qu_serving, 450, 45, 42, 8, 1, true)
    RETURNING id INTO v_meal_chicken_rice;

    UPDATE recipes SET product_id = v_meal_chicken_rice WHERE id = v_recipe_chicken_rice;

    INSERT INTO products (user_id, name, location_id, qu_id_stock, qu_id_purchase, qu_id_consume, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, num_servings, is_meal_product)
    VALUES (v_user_id, '[MEAL] Post-Workout Protein Shake', v_loc_fridge, v_qu_serving, v_qu_serving, v_qu_serving, 380, 42, 33, 9, 1, true)
    RETURNING id INTO v_meal_protein_shake;

    UPDATE recipes SET product_id = v_meal_protein_shake WHERE id = v_recipe_protein_shake;

    -- ============================================
    -- CREATE STOCK (INVENTORY)
    -- ============================================

    -- Good stock levels
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
        (v_user_id, v_prod_olive_oil, 1, to_char(NOW() + INTERVAL '365 days', 'YYYY-MM-DD'), v_loc_pantry);

    -- Low stock (below minimum)
    INSERT INTO stock (user_id, product_id, amount, best_before_date, location_id) VALUES
        (v_user_id, v_prod_banana, 1, to_char(NOW() + INTERVAL '3 days', 'YYYY-MM-DD'), v_loc_pantry),
        (v_user_id, v_prod_spinach, 0.5, to_char(NOW() + INTERVAL '3 days', 'YYYY-MM-DD'), v_loc_fridge);

    -- Freezer items
    INSERT INTO stock (user_id, product_id, amount, best_before_date, location_id) VALUES
        (v_user_id, v_prod_salmon, 2, to_char(NOW() + INTERVAL '60 days', 'YYYY-MM-DD'), v_loc_freezer),
        (v_user_id, v_prod_ground_beef, 1, to_char(NOW() + INTERVAL '90 days', 'YYYY-MM-DD'), v_loc_freezer);

    -- Meal preps in fridge
    INSERT INTO stock (user_id, product_id, amount, best_before_date, location_id) VALUES
        (v_user_id, v_meal_chicken_rice, 3, to_char(NOW() + INTERVAL '3 days', 'YYYY-MM-DD'), v_loc_fridge);

    -- ============================================
    -- CREATE MEAL PLAN
    -- ============================================

    -- Yesterday (some done)
    INSERT INTO meal_plan (user_id, day, type, recipe_id, amount, done)
    VALUES
        (v_user_id, v_yesterday, 'recipe', v_recipe_scrambled_eggs, 1, true),
        (v_user_id, v_yesterday, 'recipe', v_recipe_chicken_rice, 1, true),
        (v_user_id, v_yesterday, 'recipe', v_recipe_protein_shake, 1, true);

    -- Today
    INSERT INTO meal_plan (user_id, day, type, recipe_id, amount, done)
    VALUES
        (v_user_id, v_today, 'recipe', v_recipe_overnight_oats, 1, false),
        (v_user_id, v_today, 'recipe', v_recipe_chicken_rice, 1, false),
        (v_user_id, v_today, 'recipe', v_recipe_salmon_bowl, 1, false);

    -- Meal product entry for today (prepped meal)
    INSERT INTO meal_plan (user_id, day, type, product_id, amount, qu_id, done)
    VALUES (v_user_id, v_today, 'product', v_meal_chicken_rice, 1, v_qu_serving, false);

    -- Tomorrow
    INSERT INTO meal_plan (user_id, day, type, recipe_id, amount, done)
    VALUES
        (v_user_id, v_tomorrow, 'recipe', v_recipe_scrambled_eggs, 1, false),
        (v_user_id, v_tomorrow, 'recipe', v_recipe_pasta_marinara, 1, false),
        (v_user_id, v_tomorrow, 'recipe', v_recipe_greek_salad, 1, false);

    -- Day after (meal prep session)
    INSERT INTO meal_plan (user_id, day, type, recipe_id, amount, done, is_meal_prep)
    VALUES
        (v_user_id, v_day_after, 'recipe', v_recipe_chicken_rice, 4, false, true),
        (v_user_id, v_day_after, 'recipe', v_recipe_beef_tacos, 1, false, false);

    -- ============================================
    -- CREATE SHOPPING LIST
    -- ============================================
    INSERT INTO shopping_list (user_id, product_id, amount, note, done) VALUES
        (v_user_id, v_prod_banana, 3, 'For smoothies', false),
        (v_user_id, v_prod_spinach, 2, NULL, false),
        (v_user_id, v_prod_avocado, 4, 'Get ripe ones', false),
        (v_user_id, v_prod_tortilla, 1, NULL, false),
        (v_user_id, v_prod_ground_beef, 2, 'For taco night', false),
        (v_user_id, v_prod_milk, 1, NULL, true);

    -- ============================================
    -- CREATE TEMP ITEMS (quick macro entries)
    -- ============================================
    INSERT INTO temp_items (user_id, name, calories, carbs, protein, fat, day) VALUES
        (v_user_id, 'Morning Coffee with Cream', 50, 1, 0, 5, v_today),
        (v_user_id, 'Afternoon Protein Bar', 200, 22, 20, 6, v_today),
        (v_user_id, 'Pre-workout Energy Drink', 10, 2, 0, 0, v_yesterday);

    -- ============================================
    -- CREATE USER CONFIG
    -- ============================================
    INSERT INTO user_config (user_id, key, value) VALUES
        (v_user_id, 'goal_calories', '2200'),
        (v_user_id, 'goal_carbs', '220'),
        (v_user_id, 'goal_protein', '180'),
        (v_user_id, 'goal_fats', '75'),
        (v_user_id, 'taste_profile', 'High protein, moderate carbs. Prefer chicken and fish over red meat. Love Mediterranean flavors. Avoid excessive dairy. Enjoy spicy foods.'),
        (v_user_id, 'day_start_hour', '6');

    -- ============================================
    -- CREATE STOCK LOG (recent transactions)
    -- ============================================
    INSERT INTO stock_log (user_id, product_id, amount, transaction_type, timestamp) VALUES
        (v_user_id, v_prod_chicken, 1, 'purchase', NOW() - INTERVAL '2 days'),
        (v_user_id, v_prod_eggs, 1, 'purchase', NOW() - INTERVAL '3 days'),
        (v_user_id, v_prod_milk, 1, 'consume', NOW() - INTERVAL '1 day'),
        (v_user_id, v_prod_banana, 2, 'consume', NOW() - INTERVAL '1 day'),
        (v_user_id, v_prod_protein_powder, 1, 'consume', v_yesterday::TIMESTAMPTZ),
        (v_user_id, v_prod_greek_yogurt, 1, 'purchase', NOW() - INTERVAL '2 days');

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION demo_reset() TO authenticated;
