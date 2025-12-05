# Shopping Lists

The Shopping page manages your grocery lists with Walmart price integration and inventory import.

<figure>
  <img src="../../assets/screenshots/shopping.png" alt="Shopping List" class="screenshot">
  <figcaption class="screenshot-caption">Shopping list with prices and Walmart links</figcaption>
</figure>

## Overview

The shopping system provides:

- **Unified Shopping List**: One place for all items you need
- **Price Tracking**: Walmart prices for cost estimation
- **Quick Actions**: Add below-min items, sync from meal plan
- **Import to Inventory**: Convert purchases to stock

## Adding Items

### Manual Add

1. Click "Add Item" on Shopping page
2. Select product from dropdown
3. Set quantity needed
4. Item appears in list

### Add Below Minimum Stock

Automatically add items running low:

1. Go to Home dashboard
2. Click "Add Below Min Stock"
3. System calculates gaps between current stock and minimums
4. Items added to shopping list (minus already-listed amounts)

### Meal Plan to Cart

Sync your meal plan to shopping:

1. Click "Meal Plan → Cart" on Home page
2. System analyzes next 7 days of planned meals
3. Calculates required ingredients
4. Adds missing items to shopping list

!!! note "Smart Exclusions"
    The sync excludes:
    
    - Items already in stock
    - Meal prep outputs (the meals themselves)
    - Products marked with [MEAL] prefix
    - Placeholder products (capped at 1 unit)

## Shopping List Features

### Price Display

Each item shows:

- Product name
- Quantity needed
- Unit price (from Walmart or manual entry)
- Line total
- Cart total at bottom

### Walmart Links

For items with Walmart links:

1. Click "Get Cart Links"
2. Links copied to clipboard
3. Paste into browser to add to Walmart cart
4. Prices auto-update when items are matched

### Marking Complete

- Check items as you shop
- Checked items move to bottom
- Clear all checked with one click

## Importing to Inventory

After shopping, convert list to stock:

1. Click **Import Shopping List** on the Home page
2. Review the items that will be imported to inventory
3. Adjust quantities if needed
4. Confirm to add to inventory
5. Shopping list clears imported items after import

!!! warning "Placeholder Products"
    Placeholder products cannot be imported. Convert them to real products first in Settings → Products.

## Cart Value Tracking

The system tracks estimated cart value:

- Sum of all quantities times Walmart prices
- Shows on Shopping page and dashboard
- Updates when prices refresh

## Best Practices

1. **Weekly Sync**: Run "Meal Plan → Cart" every week
2. **Price Updates**: Run Walmart price refresh monthly
3. **Check Stock First**: Review inventory before manual adds
4. **Use Minimums**: Configure min stock for auto-population
5. **Import Same Day**: Add to inventory while receipts are fresh

## Integration Points

| Feature | Integration |
|---------|-------------|
| Products | Items sourced from product catalog |
| Inventory | Stock levels affect "Add Below Min" calculations |
| Meal Plan | "Meal Plan → Cart" syncs planned recipes |
| Walmart | Prices and links from Walmart integration |
| Dashboard | Cart value and count displayed |

