# Barcode Scanner

The Scanner is ChefByte's primary tool for quickly adding products to your system with minimal manual entry.

<figure>
  <img src="../../../assets/screenshots/scanner.png" alt="Scanner Interface" class="screenshot">
  <figcaption class="screenshot-caption">The Scanner page with transaction modes and keypad</figcaption>
</figure>

## How It Works

1. **Scan or Enter Barcode**: Use a USB barcode scanner or type the number manually
2. **Auto-Lookup**: ChefByte searches OpenFoodFacts and Walmart for product data
3. **AI Enhancement**: GPT-4 cleans up product names and fills missing nutrition info
4. **Quick Edit**: Adjust quantities before committing the transaction

## Action Mode Selector

Choose what happens when you scan a barcode:

| Mode | What It Does |
|------|--------------|
| **Add to Grocy** | Add product to inventory |
| **Track Nutrition** | Log as consumed, add to daily totals |
| **Both** | Add to inventory AND track nutrition |

### When to Use Each Mode

- **Groceries coming home**: Use "Add to Grocy"
- **Eating something**: Use "Track Nutrition"  
- **Meal prep**: Use "Both"

## All vs Incomplete Tabs

Filter your scanned items:

| Tab | Shows |
|-----|-------|
| **All** | Everything you've scanned |
| **Incomplete** | Items missing nutrition data or Walmart links |

!!! tip "Use Case"
    Focus on "Incomplete" to clean up your database after bulk scanning sessions.

## Status Badges

Quick visual indicators on scanned items:

| Badge | Meaning |
|-------|---------|
| **NEW** | Product just added to Grocy by this scan |
| **MP** | "Missing Product" - not found in Grocy or Walmart databases |

### What to Do with MP Items

1. Manually add to Grocy first
2. Then rescan or link in Walmart Manager

## Transaction History

View past scans organized by date and time.

**Features:**

- Review yesterday's scans
- Check nutrition totals by day
- Undo accidental scans (coming soon)

## The Keypad

The on-screen keypad provides quick numeric entry:

### Features

- **Number Entry**: Tap digits to enter quantities
- **Clear/Backspace**: Fix mistakes quickly
- **Nutrition Display**: Shows macros for selected item
- **Unit Toggle**: Switch between Servings and Containers

### Smart Behaviors

- **First Digit Overwrites**: When you select an item, the first digit you tap replaces the current value
- **Subsequent Digits Append**: After the first tap, numbers append to build the full value
- **Auto-Scaling**: Editing calories proportionally adjusts all macros

## Global Scanner Detection

ChefByte listens for barcode scanners anywhere on the page:

- Rapid digit input (characters within 50ms) triggers scanner mode
- Works with any USB barcode scanner
- Buffer resets after 300ms to distinguish from typing
- Nutrition fields are protected from scanner input

!!! tip "Scanner Setup"
    Configure your USB barcode scanner to add an Enter key after the code. ChefByte will automatically process the scan.

## Behind the Scenes

When a new barcode is scanned:

1. **Database Check**: Look for existing product with this barcode
2. **OpenFoodFacts Query**: Fetch nutrition data from the open database
3. **Walmart Search**: Find matching products with prices
4. **AI Analysis**: GPT-4 normalizes the product name and fills gaps
5. **Product Creation**: Save to your product catalog with full metadata

## Recent Items

After scanning, products appear in the "Recent New Items" section on the Home page:

- Items show in red until acknowledged
- Click to edit name, location, or expiration
- Filter by "New" to see only unprocessed scans

## Best Practices

1. **Batch Scanning**: Scan all groceries at once after shopping
2. **Review New Items**: Check names and locations after bulk scanning
3. **Set Defaults**: Configure default location for faster processing
4. **Use Purchase Mode**: Always use Purchase mode when adding stock
5. **Meal Plan Integration**: Enable "Add to meal plan" in Consume mode for automatic tracking
