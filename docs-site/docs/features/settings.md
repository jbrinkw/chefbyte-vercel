# Settings

The Settings page provides access to product management, LiquidTrack configuration, and data import/export.

<figure>
  <img src="../../assets/screenshots/settings.png" alt="Settings Page" class="screenshot">
  <figcaption class="screenshot-caption">Settings page with tabbed navigation</figcaption>
</figure>

## Overview

Settings contains three main sections:

1. **Products**: Manage your product catalog
2. **LiquidTrack**: Configure IoT scale integration
3. **Import/Export**: Backup and restore data

## Products Tab

### Product List

View and manage all products:

- Search by name
- Filter by location, category, or status
- Sort by various fields
- Click to edit any product

### Creating Products

Add products without scanning:

1. Click "New Product"
2. Fill in required fields:
   - Name
   - Category
   - Default location
3. Add nutrition info (optional but recommended)
4. Set minimum stock level
5. Save

### Product Fields

| Field | Purpose |
|-------|---------|
| Name | Product display name |
| Barcode | UPC for scanning |
| Location | Default storage location |
| Min Stock | Trigger for shopping alerts |
| Servings/Container | For macro calculations |
| Calories/Protein/Carbs/Fats | Per serving nutrition |
| Walmart Link | For price tracking |
| Is Walmart | Whether available at Walmart |
| Is Placeholder | Planning-only product |

### Placeholder Products

For meal planning before shopping:

- Cannot be purchased or consumed
- Capped at 1 unit in shopping lists
- Convert to real product when you have details
- Useful for recipe development

### Locations

Manage storage locations:

1. Scroll to Locations section
2. Add new locations (Fridge, Pantry, etc.)
3. Edit existing names
4. Delete unused locations
5. Set default for new products

### Quantity Units

Configure measurement units:

- Servings
- Containers
- Grams
- Ounces
- Custom units

## LiquidTrack Tab

Configure IoT smart scales:

<figure>
  <img src="../../assets/screenshots/liquidtrack.png" alt="LiquidTrack Settings" class="screenshot">
  <figcaption class="screenshot-caption">LiquidTrack device key management</figcaption>
</figure>

### Device Keys

Manage API keys for scales:

1. Click "Generate Device Key"
2. Copy the key (shown once!)
3. Configure your ESP8266 with the key
4. Scale starts sending data

### Features

- Generate new keys anytime
- Revoke keys by deleting
- Name keys for identification
- View key creation dates

See [LiquidTrack IoT](../advanced/liquidtrack.md) for full setup guide.

## Import/Export Tab

Backup and restore your data:

<figure>
  <img src="../../assets/screenshots/import-export.png" alt="Import/Export Settings" class="screenshot">
  <figcaption class="screenshot-caption">Data backup and restore interface</figcaption>
</figure>

### Export Data

Create a complete backup:

1. Click "Export Data"
2. JSON file downloads automatically
3. Includes all products, recipes, inventory, etc.

### Import Data

Restore from backup:

1. Click "Choose File" or drag and drop
2. Select previously exported JSON file
3. Click "Import"
4. Data restores to your account

!!! warning "Import Behavior"
    Import merges with existing data. It does not delete items not in the backup.

### What's Exported

| Data Type | Included |
|-----------|----------|
| Products | ✅ |
| Recipes | ✅ |
| Inventory | ✅ |
| Meal Plan | ✅ |
| Shopping List | ✅ |
| Locations | ✅ |
| Units | ✅ |
| Configuration | ✅ |

## Best Practices

1. **Regular Backups**: Export weekly
2. **Complete Products**: Fill in all nutrition fields
3. **Set Minimums**: Enable auto-shopping features
4. **Organize Locations**: Create logical storage areas
5. **Secure Keys**: Don't share LiquidTrack API keys

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save current form |
| Escape | Close modal |
| Enter | Submit form |


