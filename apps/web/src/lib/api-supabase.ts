/**
 * Supabase API Module
 * Replaces Express API calls with direct Supabase SDK calls
 */

import { supabase } from './supabase';
import type { Tables, InsertTables } from './database.types';

// Helper to get current user ID
async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// Helper for hashing (browser compatible)
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Helper to get auth header
export async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

export const apiSupabase = {
  supabase,
  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*, locations(name), quantity_units!products_qu_id_stock_fkey(name, name_plural)')
      .order('name');
    if (error) throw error;
    return data;
  },

  async getProductByBarcode(barcode: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();
    if (error) throw error;
    return data;
  },

  async createProduct(productData: Partial<InsertTables<'products'>>) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('products')
      .insert({ ...productData, user_id: userId } as InsertTables<'products'>)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id: number, updates: Partial<Tables<'products'>>) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProduct(id: number) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // ============================================
  // RECIPES
  // ============================================

  async getRecipes() {
    // Fetch recipes with their ingredients and product nutrition data
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(amount, products(calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving))')
      .order('name');
    if (error) throw error;

    // Calculate macros from ingredients for each recipe
    return (recipes || []).map(recipe => {
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      for (const ing of recipe.recipe_ingredients || []) {
        const product = ing.products as { calories_per_serving: number | null; protein_per_serving: number | null; carbs_per_serving: number | null; fat_per_serving: number | null } | null;
        if (product) {
          const amount = ing.amount || 0;
          totalCalories += (product.calories_per_serving || 0) * amount;
          totalProtein += (product.protein_per_serving || 0) * amount;
          totalCarbs += (product.carbs_per_serving || 0) * amount;
          totalFat += (product.fat_per_serving || 0) * amount;
        }
      }

      const servings = recipe.base_servings || 1;

      return {
        ...recipe,
        calories: totalCalories / servings,
        protein: totalProtein / servings,
        carbs: totalCarbs / servings,
        fat: totalFat / servings,
      };
    });
  },

  async getRecipe(id: number) {
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    if (recipeError) throw recipeError;

    const { data: ingredients, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('*, products(name, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, num_servings)')
      .eq('recipe_id', id);
    if (ingredientsError) throw ingredientsError;

    // Calculate macros from ingredients
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const ing of ingredients || []) {
      const product = ing.products as { calories_per_serving: number | null; protein_per_serving: number | null; carbs_per_serving: number | null; fat_per_serving: number | null } | null;
      if (product) {
        // Amount is in servings, so multiply by per-serving values
        const amount = ing.amount || 0;
        totalCalories += (product.calories_per_serving || 0) * amount;
        totalProtein += (product.protein_per_serving || 0) * amount;
        totalCarbs += (product.carbs_per_serving || 0) * amount;
        totalFat += (product.fat_per_serving || 0) * amount;
      }
    }

    // Per serving (divide by base_servings)
    const servings = recipe.base_servings || 1;

    return {
      ...recipe,
      calories: totalCalories / servings,
      protein: totalProtein / servings,
      carbs: totalCarbs / servings,
      fat: totalFat / servings,
      ingredients
    };
  },

  async createRecipe(recipeData: Partial<InsertTables<'recipes'>>) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...recipeData, user_id: userId } as InsertTables<'recipes'>)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addRecipeIngredient(ingredientData: Partial<InsertTables<'recipe_ingredients'>>) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .insert({ ...ingredientData, user_id: userId } as InsertTables<'recipe_ingredients'>)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRecipe(id: number, updates: Partial<Tables<'recipes'>>) {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRecipe(id: number) {
    // Delete ingredients first
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
    // Then delete recipe
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async deleteRecipeIngredient(recipeId: number, ingredientId: number) {
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', ingredientId)
      .eq('recipe_id', recipeId);
    if (error) throw error;
    return { success: true };
  },

  async getAllRecipeIngredients() {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('*');
    if (error) throw error;
    return data;
  },

  // ============================================
  // MEAL PLAN
  // ============================================

  async getMealPlanToday() {
    const today = new Date().toLocaleDateString('en-CA');
    return this.getMealPlan(today, today);
  },

  async getMealPlan(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('meal_plan')
      .select('*, products(*), recipes(*, recipe_ingredients(*, products(*)))')
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true });

    if (error) throw error;
    return data;
  },



  async createMealPlan(mealData: Partial<InsertTables<'meal_plan'>>) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('meal_plan')
      .insert({ ...mealData, user_id: userId } as InsertTables<'meal_plan'>)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateMealPlan(id: number, updates: Partial<Tables<'meal_plan'>>) {
    const { data, error } = await supabase
      .from('meal_plan')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteMealPlan(id: number) {
    const { error } = await supabase
      .from('meal_plan')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async executeMeal(mealPlanId: number, done: boolean = true) {
    // 1. Get the meal plan entry with recipe details
    const { data: meal, error: fetchError } = await supabase
      .from('meal_plan')
      .select('*, recipes(*, recipe_ingredients(*))')
      .eq('id', mealPlanId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Update stock based on ingredients
    if (meal.type === 'recipe' && meal.recipes) {
      const recipe = meal.recipes;
      const scale = (meal.amount || 1) / (recipe.base_servings || 1);

      for (const ing of recipe.recipe_ingredients || []) {
        if (ing.product_id) {
          const amount = ing.amount * scale;
          if (done) {
            // Consume stock
            await this.consumeStock(ing.product_id, amount);
          } else {
            // Restore stock (Undo)
            await this.addStock({
              product_id: ing.product_id,
              amount: amount,
              user_id: await getUserId() // Helper to get ID
            });
          }
        }
      }
    } else if (meal.type === 'product' && meal.product_id) {
      // Handle single product meals
      if (done) {
        await this.consumeStock(meal.product_id, meal.amount || 1);
      } else {
        await this.addStock({
          product_id: meal.product_id,
          amount: meal.amount || 1,
          user_id: await getUserId()
        });
      }
    }

    // 3. Mark meal as done or not done
    const { data, error } = await supabase
      .from('meal_plan')
      .update({ done })
      .eq('id', mealPlanId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ============================================
  // SHOPPING LIST
  // ============================================

  async getShoppingList() {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*, products(*)')
      .order('done')
      .order('id');
    if (error) throw error;
    return data;
  },

  async addToShoppingList(itemData: Partial<InsertTables<'shopping_list'>>) {
    const userId = await getUserId();

    // Check if product already in list
    if (itemData.product_id) {
      const { data: existing } = await supabase
        .from('shopping_list')
        .select('id, amount')
        .eq('product_id', itemData.product_id)
        .eq('done', false)
        .single();

      if (existing) {
        // Update existing amount
        const { data, error } = await supabase
          .from('shopping_list')
          .update({ amount: (existing.amount || 0) + (itemData.amount || 1) })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    // Insert new item
    const { data, error } = await supabase
      .from('shopping_list')
      .insert({ ...itemData, user_id: userId } as InsertTables<'shopping_list'>)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateShoppingItem(id: number, updates: Partial<Tables<'shopping_list'>>) {
    const { data, error } = await supabase
      .from('shopping_list')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteShoppingItem(id: number) {
    const { error } = await supabase
      .from('shopping_list')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async purchaseShoppingItems(itemIds: number[]) {

    // 1. Get items to purchase
    const { data: items, error: fetchError } = await supabase
      .from('shopping_list')
      .select('*, products(*)')
      .in('id', itemIds);

    if (fetchError) throw fetchError;
    if (!items || items.length === 0) return { success: true, count: 0 };

    let count = 0;

    // 2. Process each item
    for (const item of items) {
      if (item.product_id) {
        // Add to stock
        await this.purchaseStock(item.product_id, item.amount || 1);
        count++;
      }

      // 3. Remove from shopping list
      await supabase
        .from('shopping_list')
        .delete()
        .eq('id', item.id);
    }

    return { success: true, count };
  },

  // ============================================
  // INVENTORY / STOCK
  // ============================================

  async getStock() {
    const { data, error } = await supabase
      .from('stock')
      .select('*, products(*), locations(name)')
      .order('best_before_date');
    if (error) throw error;
    return data;
  },

  async addStock(stockData: Partial<InsertTables<'stock'>>) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('stock')
      .insert({ ...stockData, user_id: userId } as InsertTables<'stock'>)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStock(id: number, updates: Partial<Tables<'stock'>>) {
    const { data, error } = await supabase
      .from('stock')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get inventory overview with aggregated stock per product
  async getInventoryOverview() {
    // Get all products with their stock unit and location
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, barcode, min_stock_amount, num_servings, location_id, qu_id_stock, locations(name), quantity_units!products_qu_id_stock_fkey(name, name_plural)')
      .order('name');
    if (productsError) throw productsError;

    // Get stock aggregated by product
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .select('product_id, amount');
    if (stockError) throw stockError;

    // Aggregate stock amounts per product
    const stockByProduct: Record<number, number> = {};
    stockData?.forEach((s) => {
      stockByProduct[s.product_id] = (stockByProduct[s.product_id] || 0) + (s.amount || 0);
    });

    // Combine products with stock info
    const inventory = products?.map((p) => {
      const currentStock = stockByProduct[p.id] || 0;
      const unitInfo = (p as any).quantity_units;
      // Use plural form for amounts != 1, singular for 1
      const unitName = unitInfo
        ? (currentStock === 1 ? unitInfo.name : unitInfo.name_plural)
        : 'containers';
      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        current_stock: currentStock,
        min_stock: p.min_stock_amount || 0,
        num_servings: p.num_servings || 1,
        location_name: (p.locations as any)?.name || null,
        unit_name: unitName,
      };
    });

    return inventory;
  },

  async consumeStock(productId: number, amount: number) {
    // Find stock entries for this product, ordered by expiration
    const { data: stockEntries, error: stockError } = await supabase
      .from('stock')
      .select('*')
      .eq('product_id', productId)
      .gt('amount', 0)
      .order('best_before_date');

    if (stockError) throw stockError;
    if (!stockEntries || stockEntries.length === 0) {
      throw new Error('No stock available');
    }

    let remaining = amount;
    for (const stock of stockEntries) {
      if (remaining <= 0) break;

      const toRemove = Math.min(remaining, stock.amount);
      const newAmount = stock.amount - toRemove;

      if (newAmount <= 0) {
        await supabase.from('stock').delete().eq('id', stock.id);
      } else {
        await supabase.from('stock').update({ amount: newAmount }).eq('id', stock.id);
      }
      remaining -= toRemove;
    }

    return { success: true, consumed: amount - remaining };
  },

  async consumeAllStock(productId: number) {
    const { error } = await supabase
      .from('stock')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
    return { success: true };
  },

  async purchaseStock(productId: number, amount: number) {
    const userId = await getUserId();

    // Get product for default location
    const { data: product } = await supabase
      .from('products')
      .select('location_id, default_best_before_days')
      .eq('id', productId)
      .single();

    // Calculate best before date
    let bestBeforeDate = null;
    if (product?.default_best_before_days) {
      const date = new Date();
      date.setDate(date.getDate() + product.default_best_before_days);
      bestBeforeDate = date.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('stock')
      .insert({
        user_id: userId,
        product_id: productId,
        amount,
        location_id: product?.location_id || null,
        best_before_date: bestBeforeDate,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async autoAddBelowMinStock() {
    // Get all products with stock info
    const inventory = await this.getInventoryOverview();

    // Get existing shopping list items
    const { data: existingItems } = await supabase
      .from('shopping_list')
      .select('product_id, amount')
      .eq('done', false);

    const existingByProduct: Record<number, number> = {};
    existingItems?.forEach((item) => {
      if (item.product_id) {
        existingByProduct[item.product_id] = (existingByProduct[item.product_id] || 0) + (item.amount || 0);
      }
    });

    const userId = await getUserId();
    let addedCount = 0;

    // Find items below min stock
    for (const item of inventory || []) {
      if (item.current_stock < item.min_stock) {
        const needed = item.min_stock - item.current_stock;
        const existing = existingByProduct[item.id] || 0;
        const toAdd = needed - existing;

        if (toAdd > 0) {
          await supabase.from('shopping_list').insert({
            user_id: userId,
            product_id: item.id,
            amount: toAdd,
            done: false,
          });
          addedCount++;
        }
      }
    }

    return { success: true, addedCount };
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getStats() {
    // Missing Walmart links
    const { count: missingWalmartLinks } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('walmart_link', null)
      .eq('is_walmart', true);

    // Missing prices
    const { count: missingPrices } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('price', null)
      .eq('is_walmart', true);

    // Placeholder items
    const { count: placeholderItems } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_placeholder', true);

    // Below min stock
    const inventory = await this.getInventoryOverview();
    const belowMinStock = inventory?.filter((i) => i.current_stock < i.min_stock).length || 0;

    // Shopping cart value
    const { data: shoppingItems } = await supabase
      .from('shopping_list')
      .select('amount, products(price)')
      .eq('done', false);

    let shoppingCartValue = 0;
    shoppingItems?.forEach((item) => {
      const price = (item.products as any)?.price || 0;
      shoppingCartValue += (item.amount || 1) * price;
    });

    return {
      missingWalmartLinks: missingWalmartLinks || 0,
      missingPrices: missingPrices || 0,
      placeholderItems: placeholderItems || 0,
      belowMinStock,
      shoppingCartValue,
    };
  },

  // ============================================
  // MACROS / TEMP ITEMS
  // ============================================

  async getMacrosSummary(date: string) {
    // Get consumed meals for the day
    const { data: meals, error: mealsError } = await supabase
      .from('meal_plan')
      .select('*, recipes(*), products(*)')
      .eq('day', date)
      .eq('done', true);
    if (mealsError) throw mealsError;

    // Get temp items for the day
    const { data: tempItems, error: tempError } = await supabase
      .from('temp_items')
      .select('*')
      .eq('day', date);
    if (tempError) throw tempError;

    // Get liquid events for the day
    // Use timestamp (epoch ms) for timezone-agnostic filtering
    // "date" is YYYY-MM-DD local time. We want 00:00:00 to 23:59:59 local time.
    const startMs = new Date(`${date}T00:00:00`).getTime();
    const endMs = new Date(`${date}T23:59:59.999`).getTime();

    // Get current user ID to verify context
    const { data: { user } } = await supabase.auth.getUser();
    console.log('DEBUG: getMacrosSummary', { date, startMs, endMs, userId: user?.id });

    const { data: liquidEvents, error: liquidError } = await supabase
      .from('liquid_events')
      .select('*')
      .gte('timestamp', startMs)
      .lte('timestamp', endMs)
      .order('timestamp', { ascending: false });

    console.log('DEBUG: liquidEvents result', { count: liquidEvents?.length, first: liquidEvents?.[0], error: liquidError });

    if (liquidError) throw liquidError;

    // Get user goals
    const { data: config } = await supabase
      .from('user_config')
      .select('key, value')
      .in('key', ['goal_calories', 'goal_protein', 'goal_carbs', 'goal_fats']);

    const goals: Record<string, number> = {};
    config?.forEach(c => {
      goals[c.key] = parseFloat(c.value) || 0;
    });

    // Calculate totals
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

    meals?.forEach(meal => {
      // Check by ID presence rather than type column for robustness
      if (meal.recipe_id && meal.recipes) {
        totalCalories += meal.recipes.calories || 0;
        totalProtein += meal.recipes.protein || 0;
        totalCarbs += meal.recipes.carbs || 0;
        totalFat += meal.recipes.fat || 0;
      } else if (meal.product_id && meal.products) {
        const servings = meal.amount || 1;
        totalCalories += (meal.products.calories_per_serving || 0) * servings;
        totalProtein += (meal.products.protein_per_serving || 0) * servings;
        totalCarbs += (meal.products.carbs_per_serving || 0) * servings;
        totalFat += (meal.products.fat_per_serving || 0) * servings;
      }
    });

    tempItems?.forEach(item => {
      totalCalories += item.calories || 0;
      totalProtein += item.protein || 0;
      totalCarbs += item.carbs || 0;
      totalFat += item.fat || 0;
    });

    liquidEvents?.forEach(event => {
      // Only count consumed events (not refills)
      if (event.consumed > 0) {
        totalCalories += event.calories || 0;
        totalProtein += event.protein || 0;
        totalCarbs += event.carbs || 0;
        totalFat += event.fat || 0;
      }
    });

    return {
      date,
      consumed: {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
      },
      goals: {
        calories: goals.goal_calories || 2500,
        protein: goals.goal_protein || 150,
        carbs: goals.goal_carbs || 300,
        fats: goals.goal_fats || 80,
      },
      meals,
      tempItems,
      liquidEvents,
    };
  },

  async getRecentDays(days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('meal_plan')
      .select('day')
      .gte('day', startDate.toISOString().split('T')[0])
      .lte('day', endDate.toISOString().split('T')[0])
      .order('day', { ascending: false });

    if (error) throw error;

    // Get unique days
    const uniqueDays = [...new Set(data?.map(d => d.day) || [])];
    return uniqueDays;
  },

  async createTempItem(itemData: Partial<InsertTables<'temp_items'>>) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('temp_items')
      .insert({ ...itemData, user_id: userId } as InsertTables<'temp_items'>)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTempItem(id: number) {
    const { error } = await supabase
      .from('temp_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // ============================================
  // LOCATIONS
  // ============================================

  async getLocations() {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async createLocation(name: string) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('locations')
      .insert({ name, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ============================================
  // QUANTITY UNITS
  // ============================================

  async getQuantityUnits() {
    const { data, error } = await supabase
      .from('quantity_units')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  // ============================================
  // USER CONFIG
  // ============================================

  async getConfig(key: string) {
    const { data, error } = await supabase
      .from('user_config')
      .select('value')
      .eq('key', key)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data?.value;
  },

  async setConfig(key: string, value: string) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('user_config')
      .upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ============================================
  // SCANNER (uses Open Food Facts for unknown barcodes)
  // ============================================



  async scanAdd(barcode: string, amount: number, _nutrition?: {
    name?: string;
    servings?: number;
    calories?: number;
    carbs?: number;
    fats?: number;
    protein?: number;
  }) {
    console.log(`DEBUG: scanAdd (Local API) barcode=${barcode}`);

    const userId = await getUserId();

    // 1. Try to find product in Supabase
    let product = null;
    const { data: existingProduct } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .eq('user_id', userId)
      .single();
    if (existingProduct) {
      product = existingProduct;
    }

    let created = false;
    let productData = null;

    // 2. If not found, Analyze & Create
    if (!product) {
      console.log('DEBUG: Product not found locally, entering creation flow');
      console.log('Product not found, analyzing...');

      // Analyze via OpenFoodFacts directly
      try {
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const offJson = await offResponse.json();
        if (offJson.status === 1 && offJson.product) {
          const off = offJson.product;
          const nutriments = off.nutriments || {};

          let calculatedServings = 1;
          if (off.product_quantity && off.serving_quantity) {
            const total = parseFloat(off.product_quantity);
            const servingSize = parseFloat(off.serving_quantity);
            if (total > 0 && servingSize > 0) {
              calculatedServings = Math.round((total / servingSize) * 10) / 10;
            }
          }

          productData = {
            name: off.product_name || `Product ${barcode}`,
            barcode,
            calories: nutriments['energy-kcal_serving'] || 0,
            carbs: nutriments.carbohydrates_serving || 0,
            fats: nutriments.fat_serving || 0,
            protein: nutriments.proteins_serving || 0,
            servings: calculatedServings,
            default_best_before_days: 0,
            location_id: null
          };
        }
      } catch (e) {
        console.error('Analyze failed:', e);
      }

      // Fallback Placeholder
      if (!productData) {
        productData = {
          name: `Unknown Product (${barcode})`,
          barcode,
          calories: 0,
          carbs: 0,
          fats: 0,
          protein: 0,
          servings: 1,
          default_best_before_days: 0,
          location_id: null
        };
      }

      // Create Product
      try {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            user_id: userId,
            name: productData.name,
            barcode: productData.barcode,
            calories_per_serving: productData.calories,
            carbs_per_serving: productData.carbs,
            fat_per_serving: productData.fats,
            protein_per_serving: productData.protein,
            num_servings: productData.servings,
            default_best_before_days: productData.default_best_before_days,
            location_id: productData.location_id
          })
          .select()
          .single();

        if (insertError) throw insertError;
        product = newProduct;
        created = true;
      } catch (e) {
        console.error('Create failed:', e);
        throw e;
      }
    }

    // 3. Add to Stock (using scan/add endpoint)
    if (product) {
      try {
        const { error: stockError } = await supabase
          .from('stock')
          .insert({
            user_id: userId,
            product_id: product.id,
            amount,
            location_id: product.location_id || null
          });

        if (stockError) throw stockError;

        return {
          created,
          product,
          stock: {
            amount: amount,
            location_id: product.location_id
          }
        };
      } catch (e) {
        console.error('Stock add failed:', e);
        throw e;
      }
    }

    throw new Error('Failed to process scan');
  },



  async scanRemove(barcode: string, amount: number) {
    console.log(`DEBUG: scanRemove (Local API) barcode=${barcode} amount=${amount}`);

    const userId = await getUserId();

    try {
      // Find product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('user_id', userId)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // Find a stock row
      const { data: stockRow, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('product_id', product.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (stockError || !stockRow) {
        throw new Error('No stock found for this product');
      }

      const newAmount = Math.max(0, (stockRow.amount || 0) - amount);

      if (newAmount === 0) {
        await supabase
          .from('stock')
          .delete()
          .eq('id', stockRow.id)
          .eq('user_id', userId);
      } else {
        const { error: updateError } = await supabase
          .from('stock')
          .update({ amount: newAmount })
          .eq('id', stockRow.id)
          .eq('user_id', userId);
        if (updateError) throw updateError;
      }

      return {
        product: { id: product.id, name: product.name },
        stock: { amount: newAmount }
      };
    } catch (e) {
      console.error('scanRemove failed:', e);
      throw e;
    }
  },

  async scanAddToShopping(barcode: string, amount: number) {
    const userId = await getUserId();

    // Find product by barcode
    const { data: productRow, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .eq('user_id', userId)
      .single();
    let product = productRow;

    if (productError) {
      // Product not found - try Open Food Facts API
      let offData: {
        name: string;
        servings: number;
        calories: number | null;
        carbs: number | null;
        fats: number | null;
        protein: number | null;
      } | null = null;

      try {
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const offJson = await offResponse.json();

        if (offJson.status === 1 && offJson.product) {
          const p = offJson.product;
          const nutriments = p.nutriments || {};

          offData = {
            name: p.product_name || p.generic_name || `Product ${barcode}`,
            servings: p.serving_quantity ? parseFloat(p.serving_quantity) : 1,
            calories: nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || null,
            carbs: nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || null,
            fats: nutriments.fat_serving || nutriments.fat_100g || null,
            protein: nutriments.proteins_serving || nutriments.proteins_100g || null,
          };
        }
      } catch (e) {
        console.error('Open Food Facts API error:', e);
      }

      // Create product with OFF data
      const { data: newProduct, error: createError } = await supabase
        .from('products')
        .insert({
          user_id: userId,
          name: offData?.name || `Product ${barcode}`,
          barcode,
          num_servings: offData?.servings || 1,
          calories_per_serving: offData?.calories || null,
          carbs_per_serving: offData?.carbs || null,
          fat_per_serving: offData?.fats || null,
          protein_per_serving: offData?.protein || null,
        } as InsertTables<'products'>)
        .select()
        .single();

      if (createError) throw createError;
      product = newProduct;
    }

    // Add to shopping list with product_id
    const { data, error } = await supabase
      .from('shopping_list')
      .insert({
        user_id: userId,
        product_id: product!.id,
        amount,
        note: product!.name,
      })
      .select()
      .single();

    if (error) throw error;
    return { product, shoppingItem: data, created: !!productError };
  },

  async getShoppingListForCart() {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*, products(walmart_link, is_placeholder, name)')
      .eq('done', false);

    if (error) throw error;
    return data;
  },

  async importShoppingList() {
    const userId = await getUserId();

    // 1. Get all pending items
    const { data: items, error: fetchError } = await supabase
      .from('shopping_list')
      .select('*, products(*)')
      .eq('done', false);

    if (fetchError) throw fetchError;
    if (!items || items.length === 0) return { imported: 0 };

    let importedCount = 0;

    // 2. Process each item
    for (const item of items) {
      try {
        // Skip placeholders
        if (item.products?.is_placeholder) continue;

        // Add to stock
        // Use limit(1) instead of single() to avoid 406 error if not found
        const { data: stockEntries, error: fetchStockError } = await supabase
          .from('stock')
          .select('*')
          .eq('product_id', item.product_id)
          .limit(1);

        if (fetchStockError) {
          console.error('Error fetching stock for import:', fetchStockError);
          continue;
        }

        const stockItem = stockEntries && stockEntries.length > 0 ? stockEntries[0] : null;

        if (stockItem) {
          const { error: updateError } = await supabase
            .from('stock')
            .update({ amount: stockItem.amount + item.amount })
            .eq('id', stockItem.id);

          if (updateError) {
            console.error('Error updating stock:', updateError);
            continue;
          }
        } else {
          const { error: insertError } = await supabase
            .from('stock')
            .insert({
              user_id: userId,
              product_id: item.product_id,
              amount: item.amount,
              location_id: item.products?.location_id
            });

          if (insertError) {
            console.error('Error inserting stock:', insertError);
            continue;
          }
        }

        // Log transaction
        const { error: logError } = await supabase.from('stock_log').insert({
          user_id: userId,
          product_id: item.product_id,
          amount: item.amount,
          transaction_type: 'purchase',
          timestamp: new Date().toISOString()
        });

        if (logError) console.error('Error logging stock transaction:', logError);

        // Remove from shopping list
        const { error: deleteError } = await supabase
          .from('shopping_list')
          .delete()
          .eq('id', item.id);

        if (deleteError) {
          console.error('Error deleting shopping list item:', deleteError);
          continue;
        }

        importedCount++;
      } catch (e) {
        console.error('Unexpected error importing item:', item, e);
      }
    }

    return { imported: importedCount };
  },

  async syncMealPlanToCart(days: number = 7) {
    const userId = await getUserId();
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    const startStr = today.toLocaleDateString('en-CA');
    const endStr = endDate.toLocaleDateString('en-CA');

    // 1. Fetch meal plan
    const { data: mealPlan, error: mpError } = await supabase
      .from('meal_plan')
      .select('*, products(*), recipes(*, recipe_ingredients(*, products(*)))')
      .gte('day', startStr)
      .lte('day', endStr);

    if (mpError) throw mpError;

    // 2. Calculate requirements
    const requirements: Record<number, number> = {};

    for (const entry of mealPlan || []) {
      // Skip if done
      if (entry.done) continue;

      // Skip meal prep entries (they produce food, don't consume it directly today)
      if (entry.is_meal_prep) continue;

      if (entry.type === 'product' && entry.product_id) {
        // Skip [MEAL] products (recipe outputs)
        if (entry.products?.is_meal_product) continue;

        const pid = entry.product_id;
        requirements[pid] = (requirements[pid] || 0) + (entry.amount || 0);
      } else if (entry.type === 'recipe' && entry.recipes) {
        // Expand recipe ingredients
        const recipe = entry.recipes;
        const scale = (entry.amount || 1) / (recipe.base_servings || 1);

        for (const ing of recipe.recipe_ingredients || []) {
          if (ing.product_id) {
            requirements[ing.product_id] = (requirements[ing.product_id] || 0) + (ing.amount * scale);
          }
        }
      }
    }

    // 3. Compare with stock and cart
    let addedCount = 0;

    for (const [pidStr, needed] of Object.entries(requirements)) {
      const pid = parseInt(pidStr);

      // Get current stock (sum of all entries)
      const { data: stockItems } = await supabase
        .from('stock')
        .select('amount')
        .eq('product_id', pid);

      const currentStock = stockItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      // Get current cart
      const { data: cart } = await supabase
        .from('shopping_list')
        .select('amount')
        .eq('product_id', pid)
        .eq('done', false);

      const currentCart = cart?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      // Calculate shortfall
      const shortfall = Math.max(0, needed - currentStock);

      if (shortfall > 0) {
        // Round up to whole units (containers)
        const targetCart = Math.ceil(shortfall);
        const toAdd = Math.max(0, targetCart - currentCart);

        if (toAdd > 0) {
          const { error: insertError } = await supabase.from('shopping_list').insert({
            user_id: userId,
            product_id: pid,
            amount: toAdd,
            note: 'Auto-added from Meal Plan'
          });
          if (insertError) console.error('Error inserting shopping list item:', insertError);
          else addedCount++;
        }
      }
    }

    return { added: addedCount };
  },

  // ============================================
  // WALMART (placeholder - needs serverless)
  // ============================================

  async getWalmartMissingLinks(limit: number = 999) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, barcode')
      .is('walmart_link', null)
      .eq('is_walmart', true)
      .limit(limit);
    if (error) throw error;
    return { data };
  },

  // ============================================
  // LIQUIDTRACK
  // ============================================

  async generateDeviceKey(name: string) {
    const userId = await getUserId();
    // Generate random key (32 chars hex)
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const key = 'lt_' + Array.from(array, dec => dec.toString(16).padStart(2, "0")).join('');

    // Hash it
    const keyHash = await sha256(key);

    const { data, error } = await supabase
      .from('device_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash
      })
      .select()
      .single();

    if (error) throw error;
    // Return the raw key so it can be shown to the user ONE TIME
    return { ...data, raw_key: key };
  },

  async listDeviceKeys() {
    const { data, error } = await supabase
      .from('device_keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async revokeDeviceKey(id: string) {
    const { error } = await supabase
      .from('device_keys')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async getLiquidEvents(date: string) {
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    const { data, error } = await supabase
      .from('liquid_events')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addManualLiquidEvent(data: {
    product_name: string;
    consumed: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    is_refill: boolean;
    scale_id?: string;
  }) {
    const userId = await getUserId();
    const timestamp = Date.now();

    const { data: event, error } = await supabase
      .from('liquid_events')
      .insert({
        user_id: userId,
        scale_id: data.scale_id || 'manual',
        product_name: data.product_name,
        consumed: data.consumed,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        is_refill: data.is_refill,
        timestamp: timestamp,
        weight_before: 0, // Not applicable for manual
        weight_after: 0   // Not applicable for manual
      })
      .select()
      .single();

    if (error) throw error;
    return event;
  },

  async deleteLiquidEvent(id: number) {
    const { error } = await supabase
      .from('liquid_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  async getActiveScales() {
    // Get events for today to find active scales
    const today = new Date().toISOString().split('T')[0];
    const startMs = new Date(`${today}T00:00:00`).getTime();
    const endMs = new Date(`${today}T23:59:59.999`).getTime();

    const { data: events, error } = await supabase
      .from('liquid_events')
      .select('scale_id, consumed, calories, protein, carbs, fat, timestamp, product_name')
      .gte('timestamp', startMs)
      .lte('timestamp', endMs)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Group by scale_id
    const scales: Record<string, any> = {};

    events?.forEach(e => {
      if (!scales[e.scale_id]) {
        scales[e.scale_id] = {
          scale_id: e.scale_id,
          today_consumption: 0,
          today_calories: 0,
          today_protein: 0,
          today_carbs: 0,
          today_fat: 0,
          today_events: 0,
          last_product: e.product_name, // Since ordered by desc, first one is last used
          last_active: e.timestamp
        };
      }

      if (e.consumed > 0) {
        scales[e.scale_id].today_consumption += e.consumed;
        scales[e.scale_id].today_calories += e.calories || 0;
        scales[e.scale_id].today_protein += e.protein || 0;
        scales[e.scale_id].today_carbs += e.carbs || 0;
        scales[e.scale_id].today_fat += e.fat || 0;
      }
      scales[e.scale_id].today_events++;
    });

    return Object.values(scales);
  },

  async getScaleEvents(scaleId: string, date: string) {
    const startMs = new Date(`${date}T00:00:00`).getTime();
    const endMs = new Date(`${date}T23:59:59.999`).getTime();

    const { data, error } = await supabase
      .from('liquid_events')
      .select('*')
      .eq('scale_id', scaleId)
      .gte('timestamp', startMs)
      .lte('timestamp', endMs)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },



  // ============================================
  // IMPORT / EXPORT
  // ============================================

  async importData(data: any) {
    const userId = await getUserId();

    // 1. Locations
    if (data.locations?.length) {
      const { error } = await supabase.from('locations').upsert(
        data.locations.map((l: any) => ({ ...l, user_id: userId }))
      );
      if (error) throw error;
    }

    // 2. Products
    if (data.products?.length) {
      const products = data.products.map((p: any) => {
        // Remove joined fields if any (though export should be clean)
        const { locations: _locations, quantity_units: _quantity_units, ...rest } = p;
        return { ...rest, user_id: userId };
      });
      const { error } = await supabase.from('products').upsert(products);
      if (error) throw error;
    }

    // 3. Recipes
    if (data.recipes?.length) {
      const recipes = data.recipes.map((r: any) => ({ ...r, user_id: userId }));
      const { error } = await supabase.from('recipes').upsert(recipes);
      if (error) throw error;
    }

    // 4. Recipe Ingredients
    if (data.recipeIngredients?.length) {
      const ingredients = data.recipeIngredients.map((i: any) => {
        const { products: _products, ...rest } = i; // Remove joined product data
        return { ...rest, user_id: userId };
      });
      const { error } = await supabase.from('recipe_ingredients').upsert(ingredients);
      if (error) throw error;
    }

    // 5. Stock
    if (data.stock?.length) {
      const stock = data.stock.map((s: any) => {
        const { products: _products, locations: _locations, ...rest } = s;
        return { ...rest, user_id: userId };
      });
      const { error } = await supabase.from('stock').upsert(stock);
      if (error) throw error;
    }

    return { success: true };
  },

  async addConsumedItemToMealPlan(barcode: string, amount: number, date: string, unitName: string = 'Serving') {
    const userId = await getUserId();

    // Find product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('barcode', barcode)
      .single();

    if (productError) throw productError;

    // Find unit ID
    const { data: unitData } = await supabase
      .from('quantity_units')
      .select('id')
      .ilike('name', unitName)
      .single();

    const quId = unitData?.id;

    // Add to meal plan
    const { data, error } = await supabase
      .from('meal_plan')
      .insert({
        user_id: userId,
        day: date,
        type: 'product',
        product_id: product.id,
        amount: amount,
        qu_id: quId,
        done: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMealPlanItem(id: number, updates: { amount?: number; unitName?: string }) {
    const updateData: any = {};

    if (updates.amount !== undefined) updateData.amount = updates.amount;

    if (updates.unitName) {
      const { data: unitData } = await supabase
        .from('quantity_units')
        .select('id')
        .ilike('name', updates.unitName)
        .single();
      if (unitData) updateData.qu_id = unitData.id;
    }

    const { data, error } = await supabase
      .from('meal_plan')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProductServings(productId: number, servings: number) {
    // Persist number of servings per container directly on products.num_servings
    // (matches Supabase schema and is already used elsewhere in the app).
    const { error } = await supabase
      .from('products')
      .update({ num_servings: servings })
      .eq('id', productId);

    if (error) {
      console.error('Failed to update num_servings', error);
      throw error;
    }
    return { success: true };
  }
};
