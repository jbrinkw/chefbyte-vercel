/**
 * Database Type Definitions
 * 
 * These types represent the PostgreSQL schema for ChefByte.
 * All types match the actual database schema defined in lib/db.ts
 */

// ============================================================================
// Core Entities
// ============================================================================

export interface Location {
    id: number;
    name: string;
    description: string | null;
    row_created_timestamp: string;
}

export interface QuantityUnit {
    id: number;
    name: string;
    name_plural: string | null;
    description: string | null;
    row_created_timestamp: string;
}

export interface Product {
    id: number;
    name: string;
    description: string | null;
    location_id: number;
    qu_id_purchase: number;
    qu_id_stock: number;
    qu_factor_purchase_to_stock: number;
    min_stock_amount: number;
    barcode: string | null;

    // Nutrition (userfields converted to columns)
    calories_per_serving: number | null;
    carbs_per_serving: number | null;
    fat_per_serving: number | null;
    protein_per_serving: number | null;
    num_servings: number | null;
    serving_weight_g: number | null;

    // Walmart integration
    walmart_link: string | null;
    is_walmart: number; // SQLite boolean (0 or 1)

    row_created_timestamp: string;
}

export interface Stock {
    id: number;
    product_id: number;
    amount: number;
    best_before_date: string | null;
    purchased_date: string | null;
    location_id: number | null;
    price: number | null;
    row_created_timestamp: string;
}

export interface Recipe {
    id: number;
    name: string;
    description: string | null;
    base_servings: number;
    desired_servings: number | null;

    // Nutrition
    calories: number | null;
    carbs: number | null;
    fat: number | null;
    protein: number | null;

    // Recipe metadata
    type: string | null;
    product_id: number | null; // For meal-prep recipes

    row_created_timestamp: string;
}

export interface RecipeIngredient {
    id: number;
    recipe_id: number;
    product_id: number;
    amount: number;
    qu_id: number | null;
    note: string | null;
    row_created_timestamp: string;
}

export interface MealPlanEntry {
    id: number;
    type: 'recipe' | 'product';
    day: string; // YYYY-MM-DD format
    recipe_id: number | null;
    product_id: number | null;
    amount: number; // servings for recipes, quantity for products
    qu_id: number | null;
    done: number; // SQLite boolean (0 or 1)
    is_meal_prep: number; // SQLite boolean (0 or 1)
    row_created_timestamp: string;
}

export interface ShoppingListItem {
    id: number;
    product_id: number;
    amount: number;
    qu_id: number | null;
    done: number; // SQLite boolean (0 or 1)
    note: string | null;
    row_created_timestamp: string;
}

export interface QuantityUnitConversion {
    id: number;
    product_id: number;
    from_qu_id: number;
    to_qu_id: number;
    factor: number;
    row_created_timestamp: string;
}

export interface StockLog {
    id: number;
    product_id: number;
    amount: number;
    transaction_type: 'purchase' | 'consume' | 'inventory-correction' | 'product-opened';
    best_before_date: string | null;
    purchased_date: string | null;
    location_id: number | null;
    price: number | null;
    undone: number; // SQLite boolean (0 or 1)
    transaction_id: string | null;
    row_created_timestamp: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ConfigEntry {
    key: string;
    value: string;
}

// ============================================================================
// Helper Types
// ============================================================================

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Partial types for inserts (omit generated fields)
 */
export type NewLocation = Omit<Location, 'id' | 'row_created_timestamp'>;
export type NewProduct = Omit<Product, 'id' | 'row_created_timestamp'>;
export type NewStock = Omit<Stock, 'id' | 'row_created_timestamp'>;
export type NewRecipe = Omit<Recipe, 'id' | 'row_created_timestamp'>;
export type NewRecipeIngredient = Omit<RecipeIngredient, 'id' | 'row_created_timestamp'>;
export type NewMealPlanEntry = Omit<MealPlanEntry, 'id' | 'row_created_timestamp'>;
export type NewShoppingListItem = Omit<ShoppingListItem, 'id' | 'row_created_timestamp'>;
