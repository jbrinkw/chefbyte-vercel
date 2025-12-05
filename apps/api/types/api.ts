/**
 * API Request/Response Type Definitions
 */

import type {
    Product,
    Recipe,
    Location,
    QuantityUnit
} from './database';

// ============================================================================
// Generic Response Types
// ============================================================================

export interface SuccessResponse<T = unknown> {
    success: true;
    data: T;
}

export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: unknown;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// Product Types
// ============================================================================

export interface CreateProductRequest {
    name: string;
    description?: string;
    location_id?: number;
    qu_id_stock?: number;
    qu_id_purchase?: number;
    min_stock_amount?: number;
    barcode?: string;
    walmart_link?: string;
    calories_per_serving?: number;
    carbs_per_serving?: number;
    protein_per_serving?: number;
    fat_per_serving?: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> { }

export interface ProductWithStock extends Product {
    current_stock?: number;
    location_name?: string;
}

// ============================================================================
// Recipe Types
// ============================================================================

export interface CreateRecipeRequest {
    name: string;
    description?: string;
    base_servings?: number;
    total_time?: number;
    active_time?: number;
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
}

export interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> { }

export interface RecipeWithIngredients extends Recipe {
    ingredients?: Array<{
        product_id: number;
        product_name: string;
        amount: number;
        unit_name?: string;
    }>;
}

// ============================================================================
// Meal Plan Types
// ============================================================================

export interface CreateMealPlanRequest {
    day: string; // ISO date string
    type: 'recipe' | 'product';
    recipe_id?: number;
    product_id?: number;
    amount: number;
    qu_id?: number;
    is_meal_prep?: boolean;
}

export interface UpdateMealPlanRequest extends Partial<CreateMealPlanRequest> { }

export interface ExecuteRecipeRequest {
    meal_plan_id: number;
    servings?: number;
}

// ============================================================================
// Shopping List Types
// ============================================================================

export interface AddToShoppingListRequest {
    product_id: number;
    amount: number;
    qu_id?: number;
    note?: string;
}

export interface UpdateShoppingItemRequest {
    amount?: number;
    done?: boolean;
    note?: string;
}

// ============================================================================
// Stock Types
// ============================================================================

export interface AddStockRequest {
    product_id: number;
    amount: number;
    best_before_date?: string;
    location_id?: number;
    price?: number;
}

export interface ConsumeStockRequest {
    product_id: number;
    amount: number;
}

// ============================================================================
// Macro Tracking Types
// ============================================================================

export interface DaySummaryResponse {
    day: string;
    total_calories: number;
    total_carbs: number;
    total_protein: number;
    total_fat: number;
    meals: Array<{
        id: number;
        name: string;
        type: string;
        calories: number;
        carbs: number;
        protein: number;
        fat: number;
    }>;
}

// ============================================================================
// System Types
// ============================================================================

export interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    database: boolean;
    uptime: number;
}

export interface LocationResponse extends Location { }

export interface QuantityUnitResponse extends QuantityUnit { }
