# Inventory Management

The Inventory page shows everything you have in stock, organized by location with expiration tracking.

<figure>
  <img src="../../assets/screenshots/inventory.png" alt="Inventory Page" class="screenshot">
  <figcaption class="screenshot-caption">Inventory view showing stock levels and locations</figcaption>
</figure>

## Overview

The inventory system tracks:

- **Current Stock**: How much of each product you have
- **Locations**: Where items are stored (Fridge, Pantry, Freezer, etc.)
- **Expiration Dates**: When items expire (with visual warnings)
- **Minimum Stock Levels**: Target amounts for auto-shopping

## Stock Display

Each inventory item shows:

| Field | Description |
|-------|-------------|
| Product Name | The item name (click to edit) |
| Amount | Current quantity in stock units |
| Location | Storage location |
| Best Before | Expiration date |
| Status | Visual indicator (green/yellow/red) |

### Status Colors

- 🟢 **Green**: More than 7 days until expiration
- 🟡 **Yellow**: 1-7 days until expiration
- 🔴 **Red**: Expired or expiring today

## Locations

Organize your inventory with custom locations:

- Fridge
- Freezer
- Pantry
- Spice Rack
- Counter
- Custom locations

### Managing Locations

1. Go to Settings then Products
2. Scroll to Locations section
3. Add, edit, or remove locations
4. Assign default location for new products

## Stock Operations

### Adding Stock

Multiple ways to add items:

1. **Scanner**: Scan barcode in Purchase mode
2. **Quick Add**: Click + on any product in inventory
3. **Shopping Import**: Import completed shopping list
4. **Manual**: Edit stock directly in inventory view

### Consuming Stock

Remove items when used:

1. **Scanner**: Scan barcode in Consume mode
2. **Meal Plan**: Mark meal as done (auto-deducts ingredients)
3. **Quick Consume**: Click - on inventory item
4. **Manual**: Edit stock quantity directly

### Stock Log

Every transaction is recorded:

- Purchase date
- Amount added/removed
- Transaction type
- Timestamp

## Minimum Stock Levels

Set minimum amounts to enable smart shopping:

1. Click on a product
2. Set "Min Stock Amount"
3. When stock falls below, item appears in "Below Min Stock"
4. Use "Add Below Min Stock" to auto-populate shopping list

<figure>
  <img src="../../assets/screenshots/below-min-stock.png" alt="Below Minimum Stock" class="screenshot">
  <figcaption class="screenshot-caption">Dashboard showing items below minimum stock</figcaption>
</figure>

## Filtering and Search

Find items quickly:

- **Search Box**: Filter by product name
- **Location Filter**: Show only items in specific location
- **Status Filter**: Show expiring, expired, or low stock items

## Best Practices

1. **Set Expiration Dates**: Always add best-before dates when purchasing
2. **Use Locations**: Organize for easy finding and rotation
3. **Configure Minimums**: Set min stock for staples to automate shopping
4. **Regular Audits**: Weekly check for expired items
5. **FIFO**: First In, First Out - use oldest items first

## Integration with Other Features

- **Recipes**: Ingredient availability affects "Can Be Made" filter
- **Meal Plan**: Executing recipes deducts from inventory
- **Shopping**: Below-minimum items auto-populate shopping list
- **Macros**: Consuming products can add to daily macro tracking


