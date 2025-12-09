# Walmart Integration

The Walmart page manages product matching and price tracking for accurate shopping cost estimation.

<figure>
  <img src="/assets/screenshots/walmart.png" alt="Walmart Price Manager" class="screenshot">
  <figcaption class="screenshot-caption">Walmart product matching interface with search results</figcaption>
</figure>

## Overview

The Walmart integration provides:

- **Product Matching**: Link ChefByte products to Walmart items
- **Price Tracking**: Auto-update prices from Walmart.com
- **Manual Prices**: Enter prices for non-Walmart items
- **Cart Estimation**: Calculate shopping list costs

## Missing Links Count

Shows how many Grocy products don't have Walmart links yet.

**Why it matters:**

- Unlinked products won't have price data
- Shows how much work is left
- Click to filter unlinked products

## Not a Walmart Item Checkbox

Mark products that aren't sold at Walmart (homemade items, local produce).

**How to use:**

1. Check this box to mark as "not linkable"
2. Won't count against missing links
3. Keeps database organized

## URL Paste vs Product Suggestions

Two ways to link products:

| Method | How It Works |
|--------|--------------|
| **Paste Walmart URL** | Copy from walmart.com and paste directly |
| **Product Suggestions** | Type name and pick from autocomplete |

## Missing Links Workflow

For products without Walmart links:

### Process

1. Open Walmart page
2. System loads 5 products at a time
3. Each product shows 4 Walmart search results
4. Review options with images and prices
5. Click best match OR "Not Walmart"
6. Click "Update All" to save and load next batch

### Search Results Show

- Product image
- Product name
- Current Walmart price
- Link to Walmart page

### Options

- **Select Match**: Link this Walmart product
- **Not Walmart**: Mark as not available at Walmart
- **Skip**: Leave for later

## Missing Prices Workflow

For "Not Walmart" items:

1. Switch to "Missing Prices" tab
2. See items marked as non-Walmart
3. Enter manual prices
4. Save to enable cost tracking

## Automatic Price Updates

Keep prices current:

1. Click "Start Price Update"
2. System launches 5 parallel workers
3. Each worker scrapes current Walmart prices
4. Progress bar shows completion
5. Prices update in real-time

### Update Features

- Respects rate limits
- Handles variations gracefully
- Strips tracking parameters
- Logs update history

## Dashboard Integration

The Home dashboard shows:

| Card | Description |
|------|-------------|
| Missing Walmart Links | Products needing matching |
| Missing Prices | Items without price data |
| Shopping Cart Value | Estimated cost of current list |

## Price Sources

| Source | Priority | Notes |
|--------|----------|-------|
| Walmart Scrape | 1st | Auto-updated prices |
| Manual Entry | 2nd | For non-Walmart items |
| Search Result | Initial | From matching workflow |

## Best Practices

1. **Batch Processing**: Match products in batches after scanning
2. **Weekly Updates**: Run price refresh weekly
3. **Mark Non-Walmart**: Identify Costco/farmers market items
4. **Enter Manual Prices**: Don't leave items without prices
5. **Review Matches**: Verify matched products are correct

## Rate Limiting

The scraper respects Walmart's servers:

- Maximum 5 concurrent requests
- Built-in delays between batches
- Automatic retry on failures
- Graceful handling of blocks

!!! warning "Scraping Limits"
    Heavy usage may trigger temporary blocks. If scraping fails repeatedly, wait an hour before retrying.

## Non-Walmart Items

For products not sold at Walmart:

1. Click "Not Walmart" during matching
2. Switch to "Missing Prices" tab
3. Enter price from actual purchase location
4. Examples: Costco, farmers market, specialty stores

## Cart Link Generation

After matching products:

1. Add items to shopping list
2. Click "Get Cart Links"
3. URLs copied to clipboard
4. Paste links to quickly build Walmart cart

## Technical Details

The integration uses:

- **SerpApi**: Walmart search results
- **Scrape.do**: Price scraping proxy
- **Vercel Functions**: Serverless processing
- **Supabase**: Price storage

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No search results | Product may not exist at Walmart |
| Price update fails | Check API keys in environment |
| Slow updates | Normal - respects rate limits |
| Wrong matches | Re-match in Walmart page |
