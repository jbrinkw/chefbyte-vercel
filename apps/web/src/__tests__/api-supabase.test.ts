import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabaseClient } from './setup';

// We need to import after mocking
const { apiSupabase } = await import('../lib/api-supabase');

describe('apiSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // PRODUCTS
  // ============================================
  describe('Products', () => {
    it('getProducts returns formatted list with joins', async () => {
      const mockProducts = [
        { id: 1, name: 'Milk', location_id: 1, locations: { name: 'Fridge' } },
        { id: 2, name: 'Bread', location_id: 2, locations: { name: 'Pantry' } },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });

      const result = await apiSupabase.getProducts();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
      expect(result).toEqual(mockProducts);
    });

    it('getProductByBarcode returns product when found', async () => {
      const mockProduct = { id: 1, name: 'Milk', barcode: '123456789' };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
      });

      const result = await apiSupabase.getProductByBarcode('123456789');

      expect(result).toEqual(mockProduct);
    });

    it('getProductByBarcode throws when not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' }
        }),
      });

      await expect(apiSupabase.getProductByBarcode('999')).rejects.toThrow();
    });

    it('createProduct adds user_id automatically', async () => {
      const newProduct = { name: 'Test Product', barcode: '111' };
      const createdProduct = { id: 1, ...newProduct, user_id: 'test-user-id' };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdProduct, error: null }),
      });

      const result = await apiSupabase.createProduct(newProduct);

      expect(result).toEqual(createdProduct);
    });

    it('updateProduct updates and returns updated row', async () => {
      const updates = { name: 'Updated Name' };
      const updatedProduct = { id: 1, name: 'Updated Name', barcode: '123' };

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProduct, error: null }),
      });

      const result = await apiSupabase.updateProduct(1, updates);

      expect(result).toEqual(updatedProduct);
    });
  });

  // ============================================
  // RECIPES
  // ============================================
  describe('Recipes', () => {
    it('getRecipes returns sorted list', async () => {
      const mockRecipes = [
        { id: 1, name: 'Apple Pie', base_servings: 8 },
        { id: 2, name: 'Banana Bread', base_servings: 4 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRecipes, error: null }),
      });

      const result = await apiSupabase.getRecipes();

      expect(result).toEqual(mockRecipes);
    });

    it('getRecipe returns recipe with ingredients joined', async () => {
      const mockRecipe = { id: 1, name: 'Test Recipe', base_servings: 4 };
      const mockIngredients = [
        { id: 1, product_id: 1, amount: 2, products: { name: 'Flour' } },
      ];

      // First call for recipe
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecipe, error: null }),
      });

      // Second call for ingredients
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockIngredients, error: null }),
      });

      const result = await apiSupabase.getRecipe(1);

      expect(result).toEqual({ ...mockRecipe, ingredients: mockIngredients });
    });

    it('createRecipe adds user_id', async () => {
      const newRecipe = { name: 'New Recipe', base_servings: 4 };
      const createdRecipe = { id: 1, ...newRecipe, user_id: 'test-user-id' };

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdRecipe, error: null }),
      });

      const result = await apiSupabase.createRecipe(newRecipe);

      expect(result).toEqual(createdRecipe);
    });

    it('deleteRecipe deletes ingredients first then recipe', async () => {
      const deleteIngredientsMock = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const deleteRecipeMock = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from
        .mockReturnValueOnce(deleteIngredientsMock())
        .mockReturnValueOnce(deleteRecipeMock());

      const result = await apiSupabase.deleteRecipe(1);

      expect(result).toEqual({ success: true });
    });
  });

  // ============================================
  // MEAL PLAN
  // ============================================
  describe('Meal Plan', () => {
    it('getMealPlanToday uses correct date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockMeals = [{ id: 1, day: today, type: 'recipe' }];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockMeals, error: null }),
      });

      const result = await apiSupabase.getMealPlanToday();

      expect(result).toEqual(mockMeals);
    });

    it('getMealPlan filters by date range', async () => {
      const mockMeals = [{ id: 1, day: '2025-12-01', type: 'recipe' }];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockMeals, error: null }),
      });

      const result = await apiSupabase.getMealPlan('2025-12-01', '2025-12-07');

      expect(result).toEqual(mockMeals);
    });

    it('executeMeal marks as done', async () => {
      const updatedMeal = { id: 1, done: true };

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedMeal, error: null }),
      });

      const result = await apiSupabase.executeMeal(1);

      expect(result).toEqual(updatedMeal);
    });
  });

  // ============================================
  // SHOPPING LIST
  // ============================================
  describe('Shopping List', () => {
    it('getShoppingList returns with product joins', async () => {
      const mockItems = [
        { id: 1, product_id: 1, amount: 2, products: { name: 'Milk' } },
      ];

      // Create chainable mock for double .order() call
      const orderMock = vi.fn().mockResolvedValue({ data: mockItems, error: null });
      const firstOrderMock = vi.fn().mockReturnValue({ order: orderMock });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ order: firstOrderMock }),
      });

      const result = await apiSupabase.getShoppingList();

      expect(result).toEqual(mockItems);
    });

    it('addToShoppingList merges existing items', async () => {
      const existingItem = { id: 1, amount: 2 };

      // First call: check for existing with chained .eq().eq().single()
      const singleMock = vi.fn().mockResolvedValue({ data: existingItem, error: null });
      const secondEqMock = vi.fn().mockReturnValue({ single: singleMock });
      const firstEqMock = vi.fn().mockReturnValue({ eq: secondEqMock });
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ eq: firstEqMock }),
      });

      // Second call: update existing
      mockSupabaseClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, amount: 5 }, // 2 + 3 = 5
          error: null
        }),
      });

      const result = await apiSupabase.addToShoppingList({ product_id: 1, amount: 3 });

      expect(result.amount).toBe(5);
    });
  });

  // ============================================
  // INVENTORY
  // ============================================
  describe('Inventory', () => {
    it('getInventoryOverview aggregates stock per product', async () => {
      const mockProducts = [
        { id: 1, name: 'Milk', min_stock_amount: 2, locations: { name: 'Fridge' } },
      ];
      const mockStock = [
        { product_id: 1, amount: 3 },
        { product_id: 1, amount: 2 },
      ];

      // Products query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });

      // Stock query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ data: mockStock, error: null }),
      });

      const result = await apiSupabase.getInventoryOverview();

      expect(result).toHaveLength(1);
      expect(result![0].current_stock).toBe(5); // 3 + 2
    });

    it('consumeStock removes from oldest first (FIFO)', async () => {
      const mockStock = [
        { id: 1, product_id: 1, amount: 2, best_before_date: '2025-12-01' },
        { id: 2, product_id: 1, amount: 3, best_before_date: '2025-12-15' },
      ];

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStock, error: null }),
      });

      // Delete first entry (fully consumed)
      mockSupabaseClient.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Update second entry
      mockSupabaseClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await apiSupabase.consumeStock(1, 3); // Consume 3 (2 from first, 1 from second)

      expect(result.success).toBe(true);
    });

    it('purchaseStock creates with best-before date', async () => {
      const mockProduct = { location_id: 1, default_best_before_days: 7 };

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, product_id: 1, amount: 2 },
          error: null
        }),
      });

      const result = await apiSupabase.purchaseStock(1, 2);

      expect(result.id).toBe(1);
    });
  });

  // ============================================
  // MACROS
  // ============================================
  describe('Macros', () => {
    it('getMacrosSummary calculates totals correctly', async () => {
      const mockMeals = [
        {
          recipe_id: 1,
          product_id: null,
          recipes: { calories: 500, protein: 30, carbs: 50, fat: 20 },
          products: null,
        },
      ];
      const mockTempItems = [
        { calories: 200, protein: 10, carbs: 25, fat: 8 },
      ];
      const mockLiquidEvents: unknown[] = [];
      const mockConfig = [
        { key: 'goal_calories', value: '2500' },
        { key: 'goal_protein', value: '150' },
      ];

      // Meals query with chained .eq().eq()
      const secondEqMeals = vi.fn().mockResolvedValue({ data: mockMeals, error: null });
      const firstEqMeals = vi.fn().mockReturnValue({ eq: secondEqMeals });
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ eq: firstEqMeals }),
      });

      // Temp items query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockTempItems, error: null }),
      });

      // Liquid events query with chained .gte().lte().order()
      const orderMock = vi.fn().mockResolvedValue({ data: mockLiquidEvents, error: null });
      const lteMock = vi.fn().mockReturnValue({ order: orderMock });
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ gte: gteMock }),
      });

      // Config query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockConfig, error: null }),
      });

      const result = await apiSupabase.getMacrosSummary('2025-12-01');

      expect(result.consumed.calories).toBe(700); // 500 + 200
      expect(result.consumed.protein).toBe(40); // 30 + 10
    });
  });

  // ============================================
  // STATS
  // ============================================
  describe('Stats', () => {
    it('getStats returns all counts correctly', async () => {
      // Missing Walmart links - chained .is().eq()
      const eqMock1 = vi.fn().mockResolvedValue({ count: 5 });
      const isMock1 = vi.fn().mockReturnValue({ eq: eqMock1 });
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ is: isMock1 }),
      });

      // Missing prices - chained .is().eq()
      const eqMock2 = vi.fn().mockResolvedValue({ count: 3 });
      const isMock2 = vi.fn().mockReturnValue({ eq: eqMock2 });
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ is: isMock2 }),
      });

      // Placeholders
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 2 }),
      });

      // Mock getInventoryOverview for below min stock
      const mockProducts = [{ id: 1, name: 'Milk', min_stock_amount: 5, locations: null }];
      const mockStock = [{ product_id: 1, amount: 2 }];

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ data: mockStock, error: null }),
      });

      // Shopping cart value
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ amount: 2, products: { price: 5 } }],
          error: null
        }),
      });

      const result = await apiSupabase.getStats();

      expect(result.missingWalmartLinks).toBe(5);
      expect(result.missingPrices).toBe(3);
      expect(result.placeholderItems).toBe(2);
      expect(result.belowMinStock).toBe(1); // Milk: 2 < 5
      expect(result.shoppingCartValue).toBe(10); // 2 * 5
    });
  });

  // ============================================
  // CONFIG
  // ============================================
  describe('Config', () => {
    it('getConfig returns value when found', async () => {
      // Chain: .select().eq().single()
      const singleMock = vi.fn().mockResolvedValue({ data: { value: 'test-value' }, error: null });
      const eqMock = vi.fn().mockReturnValue({ single: singleMock });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      const result = await apiSupabase.getConfig('test_key');

      expect(result).toBe('test-value');
    });

    it('getConfig returns null when not found', async () => {
      // Chain: .select().eq().single()
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });
      const eqMock = vi.fn().mockReturnValue({ single: singleMock });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      const result = await apiSupabase.getConfig('nonexistent');

      expect(result).toBeUndefined();
    });

    it('setConfig upserts correctly', async () => {
      // Chain: .upsert().select().single()
      const singleMock = vi.fn().mockResolvedValue({
        data: { key: 'test', value: 'new-value' },
        error: null
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({ select: selectMock }),
      });

      const result = await apiSupabase.setConfig('test', 'new-value');

      expect(result.value).toBe('new-value');
    });
  });
  // ============================================
  // IMPORT / EXPORT
  // ============================================
  describe('Import / Export', () => {
    it('getAllRecipeIngredients returns all ingredients', async () => {
      const mockIngredients = [
        { id: 1, recipe_id: 1, product_id: 1, amount: 2 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockIngredients, error: null }),
      });

      const result = await apiSupabase.getAllRecipeIngredients();

      expect(result).toEqual(mockIngredients);
    });

    it('importData upserts all data types', async () => {
      const mockData = {
        locations: [{ id: 1, name: 'Fridge' }],
        products: [{ id: 1, name: 'Milk' }],
        recipes: [{ id: 1, name: 'Cake' }],
        recipeIngredients: [{ id: 1, recipe_id: 1, product_id: 1 }],
        stock: [{ id: 1, product_id: 1, amount: 1 }],
      };

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseClient.from.mockReturnValue({
        upsert: upsertMock,
      });

      const result = await apiSupabase.importData(mockData);

      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('locations');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('recipes');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('recipe_ingredients');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stock');
      expect(upsertMock).toHaveBeenCalledTimes(5);
    });
  });
});
