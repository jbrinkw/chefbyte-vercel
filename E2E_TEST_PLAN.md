# ChefByte Comprehensive E2E Test Plan

This document outlines full coverage Playwright E2E tests for all pages and features in ChefByte.

---

## 1. Authentication (`auth.spec.ts`)

### 1.1 Login Page (`/login`)
- [ ] **Display** - Page renders with ChefByte title, Sign In heading, email/password inputs, Sign In button
- [ ] **Valid Login** - Enter valid credentials → Click Sign In → Redirects to Scanner page (`/`)
- [ ] **Invalid Login** - Enter invalid credentials → Shows error message
- [ ] **Empty Fields** - Submit with empty fields → HTML validation prevents submission
- [ ] **Demo Button** - Click "Try Demo" → Creates/logs into demo account → Resets demo data → Redirects to Scanner
- [ ] **Navigation Link** - "Don't have an account? Sign Up" → Navigates to `/signup`
- [ ] **Loading State** - During submission, button shows "Signing in..." and is disabled

### 1.2 Signup Page (`/signup`)
- [ ] **Display** - Page renders with ChefByte title, Create Account heading, email/password/confirm password inputs
- [ ] **Valid Signup** - Fill valid credentials → Click Sign Up → Shows "Account Created!" → Redirects to `/login`
- [ ] **Password Mismatch** - Enter different passwords → Shows "Passwords do not match" error
- [ ] **Short Password** - Enter password < 6 characters → Shows "Password must be at least 6 characters" error
- [ ] **Existing Email** - Try to sign up with existing email → Shows error message
- [ ] **Loading State** - During submission, button shows "Creating account..." and is disabled
- [ ] **Navigation Link** - "Already have an account? Sign In" → Navigates to `/login`

### 1.3 Session Persistence
- [ ] **Refresh Persistence** - Log in → Refresh page → User remains logged in
- [ ] **Protected Routes** - Access protected route without auth → Redirects to `/login`

### 1.4 Logout
- [ ] **Logout Button** - Click Logout in header → Signs out → Redirects to `/login`

---

## 2. Scanner (`scanner.spec.ts`)

### 2.1 Mode Selection
- [ ] **Default Mode** - Page loads with "Purchase" mode selected
- [ ] **Switch to Consume** - Click Consume button → Mode changes, unit mode changes to "servings"
- [ ] **Switch to Shopping** - Click Shopping button → Mode changes, unit mode changes to "containers"
- [ ] **Mode Button Styling** - Active mode button has distinct styling

### 2.2 Purchase Mode
- [ ] **Scan New Barcode** - Enter barcode → Submit → Item added to queue with "NEW" badge, stock increases
- [ ] **Scan Existing Barcode** - Enter existing barcode → Submit → Item added to queue (no NEW badge), stock increases
- [ ] **Nutrition Editor Visible** - In Purchase mode, nutrition editor form is visible
- [ ] **Edit Servings/Container** - Select item → Use keypad to change servings → Auto-saves to product
- [ ] **Edit Calories** - Change calories → Carbs/Fats/Protein scale proportionally
- [ ] **Edit Macros** - Change any macro → Calories recalculates using 4-4-9 formula
- [ ] **Stock Display** - Queue item shows "Stock: X" after successful scan

### 2.3 Consume Mode
- [ ] **Consume Existing Item** - Scan existing barcode → Stock decreases
- [ ] **Stock Before/After** - Queue item shows "Stock: X → Y" transition
- [ ] **Unit Toggle** - Click unit toggle button → Switches between Servings/Containers
- [ ] **Quantity Conversion** - Toggle units → Quantity converts correctly (amount × servings/container)
- [ ] **Insufficient Stock** - Try to consume more than available → Handles gracefully

### 2.4 Meal Plan Integration
- [ ] **Toggle OFF by Default** - "Consume: Add to Meal Plan" toggle starts OFF (red)
- [ ] **Toggle ON** - Click toggle → Turns green, switches to Consume mode automatically
- [ ] **Add to Meal Plan** - With toggle ON, consume item → Item appears in today's meal plan
- [ ] **MP Badge** - Items added to meal plan show "MP" badge in queue

### 2.5 Add to Shopping Mode
- [ ] **Add to Shopping List** - Scan barcode in Shopping mode → Item added to shopping list
- [ ] **Quantity Update** - Use keypad to change quantity → Shopping list amount updates

### 2.6 Queue Management
- [ ] **Queue Order** - New scans appear at top of queue
- [ ] **Item Selection** - Click item → Becomes active (highlighted), shows details
- [ ] **Filter All** - Click "All" → Shows all queue items
- [ ] **Filter New** - Click "New" → Shows only items with `isRed` flag (newly created products)
- [ ] **Clear isRed on Click** - Click NEW item → NEW badge disappears

### 2.7 Delete/Undo Actions
- [ ] **Delete Button First Click** - Click delete (trash icon) → Shows "Confirm?"
- [ ] **Delete Button Second Click** - Click again → Executes undo action
- [ ] **Undo Purchase** - Delete purchase → Stock decreases back
- [ ] **Undo Consume** - Delete consume → Stock restores
- [ ] **Undo Shopping** - Delete shopping → Item removed from shopping list

### 2.8 Keypad Functionality
- [ ] **Digit Entry** - Press 1-9 → Displays in screen/value field
- [ ] **Zero Entry** - Press 0 → Appends correctly
- [ ] **Decimal Entry** - Press . → Adds decimal point (only one allowed)
- [ ] **Backspace** - Press ← → Removes last character
- [ ] **Overwrite Logic** - After selecting item, first digit overwrites value
- [ ] **Disabled Unit Toggle** - In Purchase/Shopping mode, unit toggle is disabled

### 2.9 Barcode Input
- [ ] **Manual Entry** - Type barcode → Press Enter → Processes scan
- [ ] **Clear After Scan** - After successful scan, input clears
- [ ] **Screen Value Reset** - After scan, screen value resets to "1"

### 2.10 Error Handling
- [ ] **Invalid Barcode** - Scan barcode that fails → Shows error in queue, plays error sound
- [ ] **Error Display** - Failed items show red error message

---

## 3. Home Dashboard (`home.spec.ts`)

### 3.1 Macro Summary Display
- [ ] **Today's Macros** - Shows Calories/Carbs/Fats/Protein with consumed/planned/goal format
- [ ] **Time Period** - Shows "(6:00 AM - 5:59 AM)" indicator
- [ ] **Planned Macros Calculation** - Planned values calculated from all meal plan entries

### 3.2 Statistics Row
- [ ] **Missing Walmart Links** - Shows count of products without Walmart links
- [ ] **Missing Prices** - Shows count of products without prices
- [ ] **Placeholder Items** - Shows count of placeholder products
- [ ] **Below Min Stock** - Shows count of products below minimum stock
- [ ] **Shopping Cart Value** - Shows total value of shopping list items

### 3.3 Quick Action Buttons
- [ ] **Open Shopping List Links** - Generates Walmart cart deep link → Opens in new tab
- [ ] **Import Shopping List** - Confirmation dialog → Purchases items → Shows success alert
- [ ] **Meal Plan → Cart** - Syncs meal plan items to shopping list → Shows added count
- [ ] **Taste Profile Button** - Opens Taste Profile modal
- [ ] **Target Macros Button** - Opens Target Macros modal

### 3.4 Taste Profile Modal
- [ ] **Open Modal** - Click button → Modal appears with textarea
- [ ] **Load Saved Profile** - Modal loads previously saved profile from config
- [ ] **Edit Profile** - Type in textarea → Text updates
- [ ] **Save Profile** - Click Save Profile → Saves to Supabase → Modal closes
- [ ] **Cancel** - Click Cancel → Modal closes without saving

### 3.5 Target Macros Modal
- [ ] **Open Modal** - Click button → Modal appears with macro inputs
- [ ] **Load Saved Goals** - Modal loads saved carbs/protein/fats values
- [ ] **Auto-Calculate Calories** - Calories field shows `(carbs×4) + (protein×4) + (fats×9)`
- [ ] **Edit Carbs** - Change carbs → Calories recalculates
- [ ] **Edit Protein** - Change protein → Calories recalculates
- [ ] **Edit Fats** - Change fats → Calories recalculates
- [ ] **Calories Read-Only** - Calories input is disabled (auto-calculated)
- [ ] **Save Goals** - Click Save Goals → Saves all values → Invalidates macros query → Modal closes
- [ ] **Cancel** - Click Cancel → Modal closes without saving

### 3.6 Today's Meal Prep Section
- [ ] **Display Meal Prep Items** - Shows items with `is_meal_prep=true`
- [ ] **Empty State** - Shows "No meal prep scheduled for today" when empty
- [ ] **Item Details** - Shows name, type badge (Recipe/Product), amount, unit, macros, price
- [ ] **Execute Button** - Click Execute → Marks as done, opacity decreases
- [ ] **Undo Button** - On completed item, shows Undo → Click to mark undone
- [ ] **Macro Display** - Shows calories, protein, carbs, fat for each item

### 3.7 Today's Meals Section
- [ ] **Display Regular Meals** - Shows items with `is_meal_prep=false`
- [ ] **Empty State** - Shows "No meals scheduled for today" when empty
- [ ] **Mark Done Button** - Click Mark Done → Item marked as consumed
- [ ] **Strike-through** - Completed items show strike-through text

### 3.8 Liquid Tracking
- [ ] **Add Liquid Button** - Click "+ Add Liquid" → Opens Liquid Modal
- [ ] **Liquid Modal Fields** - Product Name, Amount (ml/g), Calories, Refill checkbox
- [ ] **Validation** - Requires product name, either amount or calories (unless refill)
- [ ] **Save Liquid Log** - Click Save → Creates liquid event → Modal closes
- [ ] **Display Liquid Events** - Shows liquid events with time, calories, consumed amount
- [ ] **Refill Badge** - Refill events show green "REFILL" badge
- [ ] **Delete Liquid** - Click × → Confirmation → Deletes event

### 3.9 Consumed Items Section
- [ ] **Display Temp Items** - Shows temporary food logs (yellow border)
- [ ] **Display Liquid Events** - Shows liquid tracking events (blue border)
- [ ] **Empty State** - Shows "No extra items consumed today" when empty

---

## 4. Inventory (`inventory.spec.ts`)

### 4.1 Display
- [ ] **Table Structure** - Shows Product, Stock, Min, Location, Actions columns
- [ ] **Product Info** - Shows product name, barcode (if exists), servings/container
- [ ] **Stock Badge** - Shows current stock with color coding (red=0, orange=below min, green=ok)
- [ ] **Unit Display** - Shows stock in Containers (singular/plural based on amount)
- [ ] **Location Display** - Shows location name or "N/A"
- [ ] **Empty State** - Shows "No products in inventory" when empty

### 4.2 Container Actions
- [ ] **Add Container (+1)** - Click +1 → Stock increases by 1
- [ ] **Remove Container (-1)** - Click -1 → Stock decreases by 1
- [ ] **Disabled When Zero** - -1 button disabled when stock < 1

### 4.3 Serving Actions
- [ ] **Add Serving (+S)** - Click +S → Stock increases by (1/servingsPerContainer)
- [ ] **Remove Serving (-S)** - Click -S → Stock decreases by (1/servingsPerContainer)
- [ ] **Disabled When Zero** - -S button disabled when stock < serving size

### 4.4 Consume All
- [ ] **Consume All Button** - Shows "Consume All" button for each product
- [ ] **Confirmation Dialog** - Click → Shows confirmation alert
- [ ] **Execute Consume All** - Confirm → Stock becomes 0
- [ ] **Disabled When Zero** - Button disabled when stock = 0

### 4.5 Stock Color Coding
- [ ] **Red (0)** - Stock at 0 shows red badge
- [ ] **Orange (Below Min)** - Stock below min_stock shows orange badge
- [ ] **Green (OK)** - Stock at or above min shows green badge

---

## 5. Shopping List (`shopping-list.spec.ts`)

### 5.1 Display
- [ ] **Page Title** - Shows "Shopping List" heading
- [ ] **To Buy Section** - Shows pending items with count
- [ ] **Purchased Section** - Shows completed items with count (only if > 0)

### 5.2 Add Item
- [ ] **Manual Add Form** - Shows item name input, amount input, Add button
- [ ] **Add Item** - Enter name → Enter amount → Click Add → Creates placeholder product + adds to list
- [ ] **Enter Key Submit** - Press Enter in name field → Adds item
- [ ] **Clear After Add** - Inputs clear after successful add
- [ ] **Disabled Empty** - Add button disabled when name is empty

### 5.3 Auto-Add Below Min Stock
- [ ] **Button Display** - Shows "Auto-Add Below Min Stock" button
- [ ] **Execute** - Click → Adds items below minimum stock → Shows alert with count
- [ ] **Loading State** - Shows "Adding..." during operation

### 5.4 Item Actions
- [ ] **Checkbox Toggle** - Click checkbox → Moves item between To Buy / Purchased
- [ ] **Remove Item** - Click Remove → Deletes item from list
- [ ] **Display Product Name** - Shows product name or note

### 5.5 Purchased Section
- [ ] **Add to Inventory Button** - Shows "Add Checked to Inventory" button
- [ ] **Execute Purchase** - Click → Moves items to inventory → Shows success alert
- [ ] **Visual Distinction** - Purchased items show line-through, reduced opacity
- [ ] **Uncheck Item** - Click checkbox on purchased → Moves back to To Buy

---

## 6. Meal Plan (`meal-plan.spec.ts`)

### 6.1 Week View Display
- [ ] **7-Day Grid** - Shows Monday through Sunday columns
- [ ] **Day Header** - Shows day name (Mon, Tue...) and date (Dec 4)
- [ ] **Today Highlight** - Current day has blue border and "TODAY" label
- [ ] **Empty Day** - Shows "No meals planned" for days without meals

### 6.2 Navigation
- [ ] **Previous Week** - Click "← Previous Week" → Shows prior 7 days
- [ ] **Next Week** - Click "Next Week →" → Shows next 7 days
- [ ] **Today Button** - Click "Today" → Returns to current week

### 6.3 Add Meal Modal
- [ ] **Open Modal** - Click "Add Meal" → Opens modal
- [ ] **Type Toggle** - Radio buttons for Recipe/Product
- [ ] **Search Input** - Type to search recipes or products
- [ ] **Search Button** - Click Search → Shows matching results
- [ ] **Add Button** - Click Add on result → Adds to selected date
- [ ] **Cancel** - Click Cancel → Closes modal

### 6.4 Meal Display
- [ ] **Meal Card** - Shows name, type badge, amount, unit
- [ ] **Macro Display** - Shows calories, protein, carbs, fat with emojis
- [ ] **Price Display** - Shows price for products (if available)
- [ ] **Delete Button** - Shows × button on each meal

### 6.5 Delete Meal
- [ ] **Delete Button** - Click × → Removes meal from day
- [ ] **Query Invalidation** - Meal plan refreshes after deletion

---

## 7. Recipes (`recipes.spec.ts`)

### 7.1 Recipe List Page (`/recipes`)
- [ ] **Page Title** - Shows "Recipes" heading
- [ ] **Recipe Finder Link** - Button navigates to `/recipes/finder`
- [ ] **New Recipe Link** - Button navigates to `/recipes/create`
- [ ] **Recipe Cards** - Shows list of recipes with name, description, servings, time, macros
- [ ] **Macro Display** - Shows Cal, C (carbs), P (protein), F (fat) per serving
- [ ] **Click Navigation** - Click recipe → Navigates to `/recipes/edit/:id`
- [ ] **Empty State** - Shows "No recipes yet" with prompt when empty
- [ ] **Loading State** - Shows "Loading recipes..." during fetch

### 7.2 Recipe Create Page (`/recipes/create`)
- [ ] **Form Fields** - Recipe Name (required), Description, Servings, Active Time, Total Time
- [ ] **Save Button** - Click "Save Recipe" → Creates recipe → Navigates to edit page
- [ ] **Cancel Button** - Click Cancel → Returns to `/recipes`
- [ ] **Name Required** - Submit without name → Shows "Recipe name is required" error
- [ ] **Saving State** - Button shows "Saving..." during creation

### 7.3 Ingredient Management (Create)
- [ ] **Product Search** - Type to search products → Shows dropdown
- [ ] **Select Product** - Click product → Fills search field
- [ ] **Amount Input** - Number input with step 0.1
- [ ] **Unit Select** - Dropdown with Serving/Container options
- [ ] **Note Input** - Optional note text field
- [ ] **Add Button** - Click "+ Add" → Adds ingredient to list (disabled until product selected)
- [ ] **Ingredient Table** - Shows Product, Amount, Note columns
- [ ] **Remove Ingredient** - Click x → Removes from list
- [ ] **Empty State** - Shows "No ingredients added yet"

### 7.4 Recipe Edit Page (`/recipes/edit/:id`)
- [ ] **Load Recipe** - Fetches and displays existing recipe data
- [ ] **Edit Name** - Modify name input
- [ ] **Edit Description** - Modify description textarea
- [ ] **Edit Servings** - Modify servings number
- [ ] **Calculated Macros** - Shows "Nutrition (per serving, calculated from ingredients)"
- [ ] **Zero Macros for Empty** - Recipe with 0 ingredients shows 0 for all macros
- [ ] **Save Changes** - Click Save Changes → Updates recipe → Returns to list
- [ ] **Delete Recipe** - Click Delete → Confirmation → Deletes → Returns to list
- [ ] **Cancel** - Click Cancel → Returns to list

### 7.5 Ingredient Management (Edit)
- [ ] **Display Existing** - Shows current ingredients with amount and notes
- [ ] **Add Ingredient** - Same as create page, saves immediately
- [ ] **Remove Ingredient** - Click x → Removes and reloads recipe
- [ ] **Macro Recalculation** - Adding/removing ingredients updates calculated macros

### 7.6 Recipe Finder Page (`/recipes/finder`)
- [ ] **Filter: Can Be Made** - Checkbox to filter by availability
- [ ] **Filter: Carbs Percentile** - Slider 0-100%
- [ ] **Filter: Protein Percentile** - Slider 0-100%
- [ ] **Filter: Max Active Time** - Slider 0-45 min
- [ ] **Filter: Max Total Time** - Slider 0-45 min
- [ ] **Search Button** - Click "Search Recipes" → Applies filters
- [ ] **Results Display** - Shows filtered recipes with name, description, macros, times
- [ ] **Results Count** - Shows number of results
- [ ] **Empty Results** - Shows "No recipes found"

---

## 8. Walmart Integration (`walmart.spec.ts`)

### 8.1 Missing Links Section
- [ ] **Section Title** - Shows "Update Missing Walmart Links"
- [ ] **Missing Count** - Shows "Missing Links: X"
- [ ] **Load Products Button** - Click "Load Next 5 Products"
- [ ] **Initial State** - Shows instruction message before loading

### 8.2 Link Selection (When Products Loaded)
- [ ] **Product Display** - Shows product name and search results
- [ ] **Search Results** - Shows 4 Walmart options per product (with images, prices)
- [ ] **Select Option** - Click option → Marks as selected
- [ ] **Not Walmart Button** - Click "Not a Walmart Item" → Marks product as non-Walmart
- [ ] **Custom Link Input** - Option to enter custom Walmart URL
- [ ] **Update All Button** - Click "Update All" → Saves selections → Loads next batch

### 8.3 Missing Prices Section
- [ ] **Section Title** - Shows "Update Missing Prices"
- [ ] **Products Count** - Shows "Products with Links: X"
- [ ] **Start Price Update** - Click button → Initiates price fetch
- [ ] **Progress Display** - Shows current/total progress during update

### 8.4 Price Update Progress
- [ ] **Progress Bar** - Visual progress indicator
- [ ] **Current/Total** - Shows "X of Y" format
- [ ] **Completion** - Shows completion message when done

---

## 9. Settings (`settings.spec.ts`)

### 9.1 Page Structure
- [ ] **Tab Navigation** - Shows tabs for different settings sections
- [ ] **Default Tab** - Loads first tab by default

### 9.2 Import/Export Tab
- [ ] **Export JSON Button** - Click → Downloads JSON backup file
- [ ] **Import JSON** - File upload input → Imports data from JSON
- [ ] **Import Confirmation** - Shows success/failure message

---

## 10. Navigation (`navigation.spec.ts`)

### 10.1 Header Navigation
- [ ] **All Links Present** - Scanner, Home, Inventory, Shopping, Meal Plan, Recipes, Walmart, Settings
- [ ] **Active Link Styling** - Current page link shows active state
- [ ] **Click Navigation** - Each link navigates to correct route

### 10.2 Route Protection
- [ ] **Unauthenticated Access** - All routes redirect to `/login` when not authenticated
- [ ] **Authenticated Access** - All routes accessible when authenticated

---

## 11. Cross-Feature Integration (`integration.spec.ts`)

### 11.1 Scanner → Inventory
- [ ] **Purchase Updates Inventory** - Scan purchase → Check inventory page shows increased stock

### 11.2 Scanner → Meal Plan
- [ ] **Consume with MP Toggle** - Enable MP toggle → Consume item → Check Home page shows meal

### 11.3 Scanner → Shopping List
- [ ] **Add to Shopping** - Scan in Shopping mode → Check Shopping List page shows item

### 11.4 Shopping List → Inventory
- [ ] **Import Shopping List** - Add items → Mark purchased → Import → Check inventory updated

### 11.5 Meal Plan → Shopping List
- [ ] **Meal Plan to Cart** - Add meal plan entry → Click "Meal Plan → Cart" → Shopping list updated

### 11.6 Recipe → Meal Plan
- [ ] **Add Recipe to Plan** - Create recipe → Add to meal plan → Shows on meal plan page

### 11.7 Macro Tracking Flow
- [ ] **Complete Flow** - Set target macros → Consume items → Check Home shows accurate consumed values

---

## 12. Data Validation (`validation.spec.ts`)

### 12.1 Form Validation
- [ ] **Required Fields** - All required fields enforce validation
- [ ] **Number Fields** - Number inputs accept only valid numbers
- [ ] **Decimal Handling** - Decimal inputs round appropriately

### 12.2 API Error Handling
- [ ] **Network Errors** - Graceful handling of network failures
- [ ] **Server Errors** - User-friendly error messages displayed
- [ ] **Loading States** - All async operations show loading indicators

---

## Test Setup Requirements

### Prerequisites
```bash
# Install Playwright
cd apps/web
npm install -D @playwright/test

# Install browsers
npx playwright install
```

### Configuration (`playwright.config.ts`)
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Utilities
- **Auth Helper** - Reusable login/logout functions
- **Demo Data Reset** - Call `/api/demo/reset` before tests
- **Page Object Models** - Create POMs for each major page
- **Test Data Fixtures** - Consistent test data for reproducible tests

---

## Test Execution

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test scanner.spec.ts

# Run in UI mode
npx playwright test --ui

# Run with headed browser
npx playwright test --headed

# Generate report
npx playwright show-report
```

---

## Coverage Checklist

| Page | Tests | Status |
|------|-------|--------|
| Login | 7 | ⬜ |
| Signup | 7 | ⬜ |
| Scanner | 35 | ⬜ |
| Home | 30 | ⬜ |
| Inventory | 13 | ⬜ |
| Shopping List | 14 | ⬜ |
| Meal Plan | 13 | ⬜ |
| Recipes | 22 | ⬜ |
| Recipe Create | 12 | ⬜ |
| Recipe Edit | 10 | ⬜ |
| Recipe Finder | 8 | ⬜ |
| Walmart | 10 | ⬜ |
| Settings | 3 | ⬜ |
| Navigation | 4 | ⬜ |
| Integration | 7 | ⬜ |
| Validation | 5 | ⬜ |
| **TOTAL** | **~190** | ⬜ |
