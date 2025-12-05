# API Reference

ChefByte uses Supabase for its backend, with custom serverless functions for specialized operations.

## Architecture

```
React Frontend → Supabase SDK → PostgreSQL
                    ↓
            Vercel Functions → External APIs
```

## Authentication

ChefByte uses Supabase Auth with email/password:

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});
```

### Session Management

Sessions are automatically managed by the Supabase client. Access the current user:

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

## Database Tables

All tables use Row Level Security (RLS) with `user_id` filtering.

### products

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner (FK to auth.users) |
| name | text | Product name |
| barcode | text | UPC barcode |
| location_id | uuid | FK to locations |
| min_stock_amount | numeric | Minimum stock trigger |
| calories_per_serving | numeric | Calories per serving |
| protein_per_serving | numeric | Protein grams |
| carbs_per_serving | numeric | Carb grams |
| fat_per_serving | numeric | Fat grams |
| num_servings | numeric | Servings per container |
| walmart_link | text | Walmart product URL |
| is_walmart | boolean | Available at Walmart |
| is_placeholder | boolean | Planning-only product |
| price | numeric | Current price |

### stock

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| product_id | uuid | FK to products |
| amount | numeric | Current quantity |
| best_before_date | date | Expiration date |
| location_id | uuid | Storage location |

### recipes

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| name | text | Recipe name |
| description | text | Instructions |
| base_servings | integer | Portions |
| active_time | integer | Prep minutes |
| total_time | integer | Total minutes |
| calories | numeric | Total calories |
| protein | numeric | Total protein |
| carbs | numeric | Total carbs |
| fat | numeric | Total fat |

### recipe_ingredients

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| recipe_id | uuid | FK to recipes |
| product_id | uuid | FK to products |
| amount | numeric | Quantity |
| qu_id | uuid | FK to quantity_units |
| note | text | Optional note |

### meal_plan

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| day | date | Planned date |
| type | text | Meal type |
| recipe_id | uuid | FK to recipes (nullable) |
| product_id | uuid | FK to products (nullable) |
| amount | numeric | Portion size |
| done | boolean | Completion status |
| is_meal_prep | boolean | Batch cooking flag |

### shopping_list

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| product_id | uuid | FK to products |
| amount | numeric | Quantity needed |
| note | text | Optional note |
| done | boolean | Purchased flag |

## Serverless Functions

### POST /api/analyze-product

AI-enhanced product analysis from barcode.

**Authentication:** Supabase JWT

**Request:**

```json
{
  "barcode": "012345678901",
  "openFoodFactsData": { ... }
}
```

**Response:**

```json
{
  "name": "Organic Whole Milk",
  "brand": "Horizon",
  "calories": 150,
  "protein": 8,
  "carbs": 12,
  "fat": 8,
  "servingSize": "1 cup",
  "storageInstructions": "Refrigerate after opening",
  "shelfLife": 14
}
```

### POST /api/walmart-scrape

Scrape current Walmart prices.

**Authentication:** Supabase JWT

**Request:**

```json
{
  "url": "https://www.walmart.com/ip/..."
}
```

**Response:**

```json
{
  "price": 4.99,
  "inStock": true,
  "title": "Great Value Milk"
}
```

### POST /api/walmart-update

Batch update Walmart prices.

**Authentication:** Supabase JWT

**Request:**

```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**

```json
{
  "updated": 3,
  "failed": 0,
  "results": [...]
}
```

### POST /api/liquidtrack

Log scale events (IoT).

**Authentication:** `x-api-key` header

**Request:**

```json
{
  "scale_id": "kitchen-coffee",
  "events": [
    {
      "timestamp": "2024-01-15T08:30:00Z",
      "weight_before": 500,
      "weight_after": 350,
      "is_refill": false
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "count": 1
}
```

## RPC Functions

### demo_reset()

Reset demo account data.

```typescript
const { error } = await supabase.rpc('demo_reset');
```

Only works for the designated demo user.

## Row Level Security

All tables enforce RLS:

```sql
CREATE POLICY "Users can only access own data"
  ON products FOR ALL
  USING (auth.uid() = user_id);
```

This ensures users can only read/write their own data.

## Environment Variables

### Frontend (VITE_*)

```env
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Serverless Functions

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
SERPAPI_KEY=...
SCRAPE_DO_API_KEY=...
```

## Error Handling

API responses follow consistent format:

**Success:**

```json
{
  "data": { ... },
  "error": null
}
```

**Error:**

```json
{
  "data": null,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Supabase queries | 500/min |
| /api/analyze-product | 60/hour |
| /api/walmart-scrape | 100/hour |
| /api/liquidtrack | 1000/hour |

## TypeScript Types

Generated from database schema:

```bash
supabase gen types typescript --project-id your-project > database.types.ts
```

Import in code:

```typescript
import { Database } from './database.types';

type Product = Database['public']['Tables']['products']['Row'];
type InsertProduct = Database['public']['Tables']['products']['Insert'];
```

