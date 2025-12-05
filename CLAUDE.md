# ChefByte

**Turn your kitchen into an AI-powered nutrition lab.** ChefByte automates meal planning, inventory management, macro tracking, and price intelligence so you can stay focused on cooking and hitting your goals.

---

## Product Overview

### Problem & Mission
Traditional meal prep is manual, error-prone, and disconnected: inventory lives in spreadsheets, nutrition data is guessed, shopping lists are static, and grocery prices shift weekly. ChefByte fixes that loop by unifying inventory, recipes, macros, and shopping automation inside one intelligent system.

### Solution Snapshot
- Scan a barcode once and let OpenFoodFacts, GPT-4, and Walmart scraping backfill nutrition, storage, expiration, and price data automatically.
- Use manual product creation when a hardware scan is impossible but you still need full control over nutrition and inventory metadata.
- Rank recipes by macro density (protein/carbs per 100 calories), ingredient availability, and prep time to find the most efficient meals for your targets.
- Auto-build shopping lists from inventory gaps, meal plans, and Walmart matches, then import purchases straight into stock.
- Track macros in real time as meal-plan entries are marked done, temp items are logged, and automation scripts keep data fresh.
- Layer in LiquidTrack ESP8266 scales, Walmart scraping, and Supabase-powered automation to keep data synced without persistent servers.

### Signature Capabilities

| Capability | What it delivers | Automation / data sources |
|------------|------------------|---------------------------|
| AI-Enhanced Barcode Scanning | One scan pulls nutrition, storage, expiration, name cleanup | OpenFoodFacts API, GPT-4, Walmart scraping fallback |
| Manual Product Creation | Dedicated “New Product” modal for full control without a scan | Inventory UI, same schema as scanned items |
| Macro Density Recipe Search | Percentile rankings, protein/carbs per 100 cal sliders, “Can Be Made” filter | Uses stock levels, recipe metadata, macro recompute script |
| Intelligent Shopping Lists | Calculates gaps to minimum stock, respects what’s already queued, exports to Walmart links | Automation scripts, Walmart price manager |
| Automated Walmart Price Tracking | Batch searches (5 products, 4 results each), 5-worker scraper updates, manual price entry for non-Walmart | Vercel function `/api/walmart-scrape`, background job tracker |
| Integrated Macro Tracking | Combines meal-plan execution, temp items, progress bars, target macros editor | Dashboard widgets, `grocy_config` goals, Supabase data |
| LiquidTrack Smart Scales | ESP8266 events authenticate via API key, log consumption automatically | `/api/liquidtrack` function, `device_keys`, `liquid_events` tables |

### Real-World Workflows
- **Sunday Meal Prep Session**  
  1. Open recipe search, enable “Can Be Made”, set protein density 8–15 g/100 cal.  
  2. Pick five high-protein recipes, add to meal plan (Mon–Fri lunches).  
  3. Click “Add Below Min Stock” → 12 items flow into shopping list.  
  4. “Get Cart Links” copies Walmart URLs → paste, order, cost auto-estimated at **$87.34**.  
  5. After groceries arrive, click “Import Shopping List” to assign inventory.

- **Daily Macro Tracking Loop**  
  - Morning temp item (“Coffee + Protein Powder”: 150 cal / 25 g protein).  
  - Lunch meal plan entry (“Chicken Bowl”): +450 cal / 45 g protein.  
  - Snack barcode scan adds a protein bar as consumed.  
  - Dinner meal (“Salmon + Veggies”): +380 cal / 40 g protein.  
  - Dashboard shows **1680/2200 cal** and **165/180 g protein** (92 % to goal).

- **Walmart Price Management Sprint**  
  1. After scanning 30 products, open Walmart Price Manager.  
  2. Load 5 products × 4 search results, select best matches, mark “Not Walmart” when needed.  
  3. Click “Update All”; repeat 6 batches to finish the set.  
  4. Enable weekly “Auto Price Update” to keep totals current.

---

## Architecture & Roadmap

### Current Stack (Standalone)
- Frontend: React + Vite + TypeScript SPA.
- Backend: Node.js + Express API.
- Database: PostgreSQL via `pg`.

### Target Cloud Layout (Vercel × Supabase)
```
┌─────────────────────────────── VERCEL ───────────────────────────────┐
│ Landing page (static)  |  React SPA (Vite + Supabase SDK direct DB)  │
│                         └──────────────┬──────────────────────────────┘
│ Serverless functions: /api/walmart-scrape · /api/liquidtrack ·        │
│                       /api/analyze-product                            │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                   ┌────────────▼────────────┐
                   │        SUPABASE        │
                   │ Postgres + RLS (per    │
                   │ user_id), Auth, Store │
                   └────────────────────────┘
```

### Key Design Decisions
1. **Minimal serverless surface:** keep only `/api/walmart-scrape`, `/api/liquidtrack`, `/api/analyze-product`.
2. **LiquidTrack device auth:** users mint hashed API keys stored in `device_keys`; Vercel function validates and inserts with correct `user_id`.
3. **Multi-tenancy via RLS:** every table carries `user_id`; policies enforce `auth.uid() = user_id`.
4. **Free-tier friendly:** Supabase free limits + Vercel free invocations, no always-on servers → $0 for portfolio load.

### Migration Tracker (Phases 1–8)
- **Phase 1 – Local Supabase Setup**  
  - ✅ 1.1 Install CLI  
    ```bash
    npm install -g supabase
    supabase init
    supabase start
    ```  
  - ⬜ 1.2 Schema migration (`supabase/migrations/001_initial_schema.sql`). Tables to recreate in order:

    | Table | Key columns | Notes |
    |-------|-------------|-------|
    | `locations` | id, user_id, name | `user_id` refs `auth.users` |
    | `quantity_units` | id, user_id, name, name_plural |  |
    | `products` | id, user_id, name, description, location_id, qu_id_stock/purchase/consume/price, min_stock_amount, default_best_before_days, calories/carbs/protein/fat_per_serving, num_servings, barcode, walmart_link, is_walmart, is_meal_product, is_placeholder, price | Most complex table |
    | `stock` | id, user_id, product_id, amount, best_before_date, location_id |  |
    | `recipes` | id, user_id, name, description, base_servings, total_time, active_time, calories/carbs/protein/fat, product_id |  |
    | `recipe_ingredients` | id, user_id, recipe_id, product_id, amount, qu_id, note |  |
    | `meal_plan` | id, user_id, day, type, recipe_id, product_id, amount, qu_id, done, is_meal_prep, created_at |  |
    | `shopping_list` | id, user_id, product_id, amount, note, done |  |
    | `quantity_unit_conversions` | id, user_id, product_id, from_qu_id, to_qu_id, factor |  |
    | `stock_log` | id, user_id, product_id, amount, best_before_date, purchased_date, stock_id, transaction_type, timestamp |  |
    | `grocy_config` | id, user_id, key, value | User settings |
    | `temp_items` | id, user_id, name, calories, protein, carbs, fat, day, created_at | Macro tracking |
    | `device_keys` | id, user_id, key_hash, name, created_at | LiquidTrack |
    | `liquid_events` | id, user_id, scale_id, timestamp, weight_before/after, consumed, is_refill, product_name, calories, protein, carbs, fat, created_at | LiquidTrack |

  - ⬜ 1.3 RLS policies (`supabase/migrations/002_rls_policies.sql`):
    ```sql
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can only access own data" ON products
      FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Users manage own device keys" ON device_keys
      FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "Users read own liquid events" ON liquid_events
      FOR SELECT USING (auth.uid() = user_id);
    ```
  - ⬜ 1.4 Indexes (`supabase/migrations/003_indexes.sql`):
    ```sql
    CREATE INDEX idx_products_barcode ON products(barcode);
    CREATE INDEX idx_products_user_id ON products(user_id);
    CREATE INDEX idx_stock_product_id ON stock(product_id);
    CREATE INDEX idx_meal_plan_day ON meal_plan(day);
    CREATE INDEX idx_liquid_events_scale_timestamp
      ON liquid_events(scale_id, created_at);
    ```

- **Phase 2 – Frontend Supabase Client**  
  - ✅ 2.1 Install dependencies: `cd apps/web && npm install @supabase/supabase-js`.  
  - ✅ 2.2 Client (`apps/web/src/lib/supabase.ts`) uses `createClient` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.  
  - ✅ 2.3 `.env`:  
    ```env
    VITE_SUPABASE_URL=http://192.168.0.226:54321
    VITE_SUPABASE_ANON_KEY=<from supabase start output>
    ```  
  - ⬜ 2.4 Generate types:  
    ```bash
    supabase gen types typescript --local \
      > apps/web/src/lib/database.types.ts
    ```

- **Phase 3 – Auth Integration**  
  - Build `AuthContext` (wrap provider, expose `user`, `signIn`, `signUp`, `signOut`, subscribe to `onAuthStateChange`).  
  - Create `Login.tsx` & `Signup.tsx` (email/password + `supabase.auth.signInWithPassword`).  
  - Add `ProtectedRoute.tsx` to gate existing routes and redirect unauthenticated users to `/login`.

- **Phase 4 – API Migration (Express → Supabase SDK)**  
  - Map every Express route to Supabase queries (products CRUD, recipes, meal plan, shopping list, inventory, macros, locations, config).  
  - ✅ `apps/web/src/lib/api-supabase.ts` mirrors the legacy interface.  
  - ⬜ Port complex flows that may require RPC/functions: recipe execution, shopping list → stock transfer, auto add below minimum stock.

- **Phase 5 – Serverless Functions**  
  - ✅ Folder `apps/web/api/` contains `walmart-scrape.ts`, `liquidtrack.ts`, `analyze-product.ts`.  
  - Implementation pattern: verify Supabase JWT (or service-role key for `/api/liquidtrack`), run worker, return JSON.  
  - ⬜ Local verification via Vercel CLI:
    ```bash
    npm i -g vercel
    cd apps/web
    vercel dev
    ```

- **Phase 6 – Data Migration (personal data)**  
  - ⬜ Export current Postgres:
    ```bash
    pg_dump -h 192.168.0.239 -U postgres -d chefbyte --data-only > backup.sql
    ```  
  - ⬜ Transform dataset: inject Supabase `user_id` everywhere, re-map foreign keys if IDs change.  
  - ⬜ Import into Supabase local:
    ```bash
    psql -h localhost -p 54322 -U postgres -d postgres < backup.sql
    ```

- **Phase 7 – Testing Checklist**  
  - Auth (sign up, login, logout, session persistence).  
  - Products (create/read/update + barcode lookup).  
  - Recipes (create with ingredients, macro updates).  
  - Meal plan (add entries, mark done, execute recipe).  
  - Shopping list (add items, move to stock).  
  - Macro day summary accuracy.  
  - LiquidTrack ingestion associates correct `user_id`.  
  - Walmart scraping returns results via serverless function.

- **Phase 8 – Cloud Deployment**  
  - Create Supabase cloud project, run migrations, capture URL + anon key.  
  - Deploy to Vercel, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.  
  - Build landing page (static login CTA + docs).  
  - Migrate personal data (export → import with Supabase `user_id`).  
  - Verify full flow end to end.

### LiquidTrack Architecture
- **Request flow:** ESP8266 scale → `POST /api/liquidtrack` with header `x-api-key: lt_xxx` + body `{ scale_id, events[] }`. Serverless function validates key in `device_keys`, injects `user_id`, inserts into `liquid_events`, returns `{ success: true, count }`.
- **Consumer setup:**  
  1. User opens Settings → LiquidTrack → “Generate Device Key”.  
  2. App stores hashed key in `device_keys`.  
  3. Firmware gets `URL=https://chefbyte.vercel.app/api/liquidtrack` + `API_KEY=lt_abc123xyz`.  
  4. Device sends events; deleting the row revokes access immediately.
- **Security:** Keys hashed, RLS restricts reads (`auth.uid() = user_id`), service-role key required for writes.  
- **Tables:** `device_keys` (id, user_id, key_hash, name, created_at) and `liquid_events` (scale_id, timestamps, weight_before/after, consumed, is_refill, product_name, macros, created_at).

### Local & Production Environments
```bash
# Recommended local stack
npx supabase start   # Runs Postgres + Auth at http://localhost:54321
```
```env
# .env.local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>

# .env.production (Vercel)
VITE_SUPABASE_URL=https://<prod>.supabase.co
VITE_SUPABASE_ANON_KEY=<prod-anon>
SUPABASE_SERVICE_ROLE_KEY=<service-role>
```

---

## Feature Playbook

### Dashboard & Quick Actions
- **Status cards:** Missing Walmart Links, Missing Prices, Placeholder Items, Below Minimum Stock, Shopping Cart Value.  
- **Quick actions:**  
  - **🔄 Automation Settings** opens the automation modal (details below).  
  - **Import Shopping List** buys every non-placeholder item immediately.  
  - **🎯 Target Macros** edits `goal_carbs`, `goal_protein`, `goal_fats` (calories auto-calc).  
  - **📝 Taste Profile** stores dietary preferences/allergies.  
  - **Meal Plan → Cart** diff (next 7 days) that adds recipe ingredients + regular meal products, excludes meal prep outputs and `[MEAL]` products, rounds to whole containers, warns when placeholders were capped at one unit.  
- **Recent New Items:** inline edit names, expirations, locations for latest scans.

### Automation Settings Modal
- **Scripts:**  
  1. `update_recipe_macros.py` – recompute recipe calories/protein/carbs/fats whenever ingredients change.  
  2. `add_below_min_to_shopping.py` – adds items required to reach each product’s `min_stock_amount`.  
  3. `create_meal_products.py` – generates `[MEAL] Recipe Name` products, links via `product_id`, sets macro userfields, one product per serving.
- **Controls:** toggle Auto-Run (every minute), choose scripts, hit “Run Now”, monitor real-time status (Idle/Running, last run, next run), view last 10 executions (status, timestamp, scripts, duration, trigger).  
- **Storage:** `ui/data/automation_config.json` (settings) & `ui/data/automation_log.json` (last 50 runs).  
- **Usage examples:** enable all scripts weekly via Auto-Run, or run “Meal Products” once without scheduling.

### Barcode Scanner
- Steps: open Scanner tab → pick mode (Purchase / Consume / Add to Shopping) → scan/enter barcode → system processes instantly → success toast → edit in “Recent New Items”.  
- **Global scanner detection:** rapid digits (~50 ms apart, 6–24 chars) captured anywhere on page, protects nutrition fields, auto-focus + submit on Enter, buffer resets after 300 ms to separate human typing.  
- **Transaction Types:**
  - **Purchase:** Adds to stock. Keypad edits `servingsPerContainer` (master data). Defaults to 'Containers'.
  - **Consume:** Removes from stock. Keypad edits consumed amount. Defaults to 'Servings' (if meal plan enabled) or 'Containers'. Auto-adds to meal plan if enabled.
  - **Add to Shopping:** Adds to shopping list. Keypad edits quantity. Defaults to 'Containers'.
- **Keypad Features:**
  - **Overwrite Logic:** First digit press on a selected item overwrites the value; subsequent presses append.
  - **Macro Loading:** Selecting an item in Purchase mode loads its nutrition data into the editor.
  - **Nutrition Logic:**
    - **Auto-Scaling:** Editing `Calories` automatically scales `Carbs`, `Fats`, and `Protein` proportionally.
    - **Recalculation:** Editing any macro (`Carbs`, `Fats`, `Protein`) automatically recalculates `Calories` using the 4-4-9 rule.
  - **Unit Toggle:** Switch between Servings/Containers in Consume mode.
- **Visual States:**
  - **Red Items:** Newly scanned items appear red (`isRed`) until clicked/acknowledged.
  - **Filter:** "New" filter shows only unacknowledged red items.
- **Behind the scenes:** tries to match existing barcode, otherwise queries Walmart, creates product with name/price/nutrition, links barcode for future scans.  
- **Example:** scan `012345678901`, app finds “Organic Milk”, creates product at $4.99 and default location.

### Macro Tracking
- **Day summary card:** progress bars for Calories/Protein/Carbs/Fats with green/red cues, shows percentage of goal, includes date selector.  
- **Consumed items:** every meal-plan entry marked “done” plus temp items; macros per item; delete temp entries.  
- **Planned items:** preview macros for today’s plan; meal prep entries excluded until execution.  
- **Meal prep vs regular:**  
  - `meal_prep = true` → Execute consumes ingredients and produces `[MEAL]` products for later consumption (not counted today).  
  - `meal_prep = false` → Mark Done consumes immediately, counts toward macros; toggle slider converts to meal prep.  
- **Temp items:** log off-inventory meals by name + macros.  
- **Recent days pagination:** browse prior history, track trends.  
- **Target Macros editor:** formula `(carbs×4) + (protein×4) + (fats×9)` recalculates calories live and persists to `grocy_config`.  
- **Taste Profile:** free-form preferences powering planning filters.  
- **Example:** log “Protein Shake” (200 cal / 30 g protein), mark “Chicken Breast” done (300 cal / 50 g protein), confirm dashboard hits 1500/2500 cal & 150/180 g protein before updating targets to 300 g carbs / 200 g protein / 80 g fats → 2720 cal.

### Recipe Search & Planning
- Filters: “Can Be Made”, protein-per-100-cal slider, carbs-per-100-cal slider, Active Time limit, Total Time limit.  
- Cards show name, servings, per-serving + total macros, active/total time, macro-density percentiles, and “Add to Meal Plan”.  
- Example: enable “Can Be Made”, protein 10–15 g/100 cal, max active 15 min → pick “Grilled Chicken Salad” (25 min total, 40 g protein, 350 cal), add to tomorrow, ingredients auto-reserved.

### Shopping List Management
- **Meal Plan → Cart Sync:** runs 7-day diff; adds recipe ingredients + regular meal products, excludes meal-prep outputs and `[MEAL]` products, rounds to full containers, flags placeholders capped at one unit.  
- **Shopping cart links:** generates “Product Name: Walmart URL” list for quick cart creation.  
- **Import Shopping List:** purchases all non-placeholder items, updates stock, clears the list.  
- **Add Below Minimum Stock:** scans catalog for deficits, subtracts items already on the list, queues remaining amounts.  
- **Manual management:** agent tools add/remove/clear entries as needed.  
- **Example:** run “Add Below Minimum Stock” (8 items), review list, “Get Cart Links”, order, then “Import Shopping List” after delivery.

### Walmart Price Manager
- **Missing links workflow:** loads 5 products at a time, fetches 4 Walmart options each (with images + price), lets users pick best match or “Not Walmart”, bulk “Update All” stores choice and fetches next batch.  
- **Missing prices workflow:** shows “Not Walmart” items lacking price; user enters values and bulk updates.  
- **Automatic price updates:** “Start Price Update” fires 5 parallel workers to refresh prices on linked Walmart products, tracks progress, respects rate limits, strips tracking params, handles variations gracefully.  
- **Example:** after scanning 20 new items, iterate batches to map every link, then keep weekly auto-update on for cart accuracy.

---

## Operations & Tooling

### Agent Toolset Overview

| Category | Tools | Purpose |
|----------|-------|---------|
| Inventory | `GROCY_GET_Inventory`, `GROCY_UPDATE_AddProductQuantity`, `GROCY_UPDATE_ConsumeProduct` | Read stock, purchase/add quantity, consume/remove quantity (with macro logging) |
| Products | `GROCY_GET_Products`, `GROCY_ACTION_CreateProduct`, `GROCY_ACTION_CreatePlaceholder` | Inspect catalog, create real products, create planning placeholders |
| Shopping List | `GROCY_GET_ShoppingList`, `GROCY_ACTION_AddToShoppingList`, `GROCY_ACTION_RemoveFromShoppingList`, `GROCY_ACTION_ClearShoppingList`, `GROCY_ACTION_AddBelowMinStockToShoppingList` | Read, add, remove, clear, or bulk-add below-minimum items |
| Meal Plan | `GROCY_GET_MealPlan`, `GROCY_ACTION_AddMealToPlan`, `GROCY_ACTION_MarkMealDone`, `GROCY_ACTION_DeleteMealPlanEntry` | Inspect schedules, add entries (including `meal_prep` flag), mark done, delete |
| Recipes | `GROCY_GET_Recipes`, `GROCY_GET_Recipe`, `GROCY_ACTION_CreateRecipe`, `GROCY_ACTION_UpdateRecipe`, `GROCY_ACTION_AddRecipeIngredient`, `GROCY_GET_CookableRecipes` | Manage recipes and ingredients, find cookable options |
| Macro Tracking | `GROCY_GET_DayMacros`, `GROCY_ACTION_CreateTempItem`, `GROCY_ACTION_DeleteTempItem` | Review macro timeline, log/remove temp items |
| Price Management | `GROCY_ACTION_SetProductPrice` | Update manual prices (especially non-Walmart items) |

### Agent Conversation Patterns
1. **Inventory inquiry:** “What’s in my inventory?” → `GROCY_GET_Inventory` lists Milk (2 units, 3 days left), Eggs (12 units, 7 days), etc.  
2. **Shopping assistance:** “Add milk to my shopping list” → `GROCY_ACTION_AddToShoppingList` ensures minimum stock is reached.  
3. **Recipe suggestions:** “What recipes can I make right now?” → `GROCY_GET_CookableRecipes` replies with Protein Shake, Chicken Salad, etc.  
4. **Macro logging:** “I ate a protein bar (200 cal/20 g protein)” → `GROCY_ACTION_CreateTempItem`, confirms updated totals.  
5. **Meal planning:** “Add recipe 5 to tomorrow” or “Add recipe 12 to Sunday as meal prep” → `GROCY_ACTION_AddMealToPlan` with/without `meal_prep=true`.

### Configuration (`grocy_config`)
- `goal_calories`, `goal_carbs`, `goal_protein`, `goal_fats` – macro goals behind dashboard bars.  
- `taste_profile` – free-form dietary preferences.  
- `day_start_hour` – hour macro tracking resets (default 6 = 6 AM).  
- Edit via 🎯 Target Macros / 📝 Taste Profile modals.

### Tips & Best Practices
1. Keep automation enabled so recipe macros, shopping lists, and meal products update every minute.  
2. Define `min_stock_amount` for staples to unlock below-minimum automation.  
3. Use placeholder products during planning when inventory isn’t purchased yet.  
4. Run/auto-run Walmart price updates weekly for accurate cart values.  
5. Mark meal-plan entries done immediately after eating to protect macro history.  
6. Review “Recent New Items” after bulk scanning to correct names/locations.  
7. Batch Walmart link processing (5 products at a time) and mark non-Walmart sources to skip future scrapes.  
8. Track Costco/farmers-market goods as “Not Walmart” so automation ignores them.

### Troubleshooting & Support
- **Barcode scan fails:** confirm Walmart carries the product or create it manually.  
- **Macros missing:** ensure entries are marked “done” and temp items use today’s date.  
- **Walmart scraping errors:** heavy traffic may trigger throttling; retries occur automatically, but mark unavailable items as “Not Walmart”.  
- **Shopping list import fails:** placeholders can’t be purchased; verify quantity units and stock requirements.  
- **Logs:** inspect `logs/chefbyte_ui.log` for UI/runtime issues.

---

## Appendices

### Development Setup
1. **Prereqs:** Node.js v18+, npm.  
2. **Clone:**  
   ```bash
   git clone https://github.com/yourusername/chefbyte.git
   cd chefbyte
   ```  
3. **Install:**  
   ```bash
   npm install            # root
   cd frontend && npm install
   cd ../ui && npm install
   ```  
4. **Run dev server (preferred):**
   ```bash
   cd apps/web
   vercel dev
   ```
   - App: `http://localhost:3000`
   - Supabase: `http://localhost:54321` (run `npx supabase start` first)

### Supabase CLI & Types
- Initialize/start local services via commands in Phase 1.  
- Regenerate types whenever schema changes:
  ```bash
  supabase gen types typescript --local \
    > apps/web/src/lib/database.types.ts
  ```

### Serverless Functions
- `apps/web/api/walmart-scrape.ts` – validates Supabase JWT, scrapes Walmart, returns product data.  
- `apps/web/api/liquidtrack.ts` – validates `x-api-key`, fetches `user_id` from `device_keys`, inserts into `liquid_events` with service-role key.  
- `apps/web/api/analyze-product.ts` – authenticates user, fetches OpenFoodFacts, calls OpenAI to normalize metadata.  
- Test locally via `vercel dev`.

### Data Migration Script
1. Export from legacy Postgres:
   ```bash
   pg_dump -h 192.168.0.239 -U postgres -d chefbyte --data-only > backup.sql
   ```  
2. Transform CSV/SQL (inject Supabase `user_id`, fix foreign keys).  
3. Import into Supabase local:
   ```bash
   psql -h localhost -p 54322 -U postgres -d postgres < backup.sql
   ```
4. Repeat for production once Supabase cloud is provisioned.

### Testing Checklist
- Auth (sign up/login/logout/persistence).  
- Products CRUD + barcode.  
- Recipes CRUD + macro recompute.  
- Meal plan add/execute/done.  
- Shopping list add/import.  
- Macro dashboard accuracy.  
- LiquidTrack ingestion.  
- Walmart scraping success.
- Import/Export (JSON backup/restore).

### Deployment Checklist
1. Supabase cloud project: run `001`–`003` migrations, enable RLS.  
2. Vercel deploy: connect repo, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus any OpenAI/Walmart secrets.  
3. Landing page: static marketing + login CTA.  
4. Data migration: export from local, map to production `user_id`, import.  
5. Validate serverless functions (Walmart, LiquidTrack, Analyze Product).  
6. Execute full testing checklist against production.

### Automation Files
- `ui/data/automation_config.json` – automation preferences.  
- `ui/data/automation_log.json` – last 50 automation runs.

### Support
- Primary log file: `logs/chefbyte_ui.log`.  
- Reference this CLAUDE guide, Supabase Studio, and Vercel dashboards for incident triage.

---

*Last updated: November 2025*

