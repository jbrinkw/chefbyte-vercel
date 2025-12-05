/**
 * Walmart Routes
 * Handles Walmart integration endpoints
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { asyncHandler } from '../middleware/asyncHandler';
import http from 'http';
import https from 'https';

const router = Router();

// Scrape.do API configuration (for individual product scraping)
const SCRAPE_DO_API_KEY = process.env.SCRAPE_DO_API_KEY;
const SCRAPE_DO_URL = 'http://api.scrape.do';

// SerpApi configuration (for Walmart search)
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_URL = 'https://serpapi.com/search.json';

interface WalmartProduct {
    url: string;
    title: string | null;
    price: number | null;
    price_per_unit: string | null;
    image_url: string | null;
}

// Scrape a Walmart product URL
async function scrapeWalmartProduct(productUrl: string): Promise<WalmartProduct> {
    if (!SCRAPE_DO_API_KEY) {
        throw new Error('SCRAPE_DO_API_KEY is not configured');
    }

    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            token: SCRAPE_DO_API_KEY,
            url: productUrl,
        });

        const requestUrl = `${SCRAPE_DO_URL}?${params.toString()}`;

        http.get(requestUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }

                const result: WalmartProduct = {
                    url: productUrl,
                    title: null,
                    price: null,
                    price_per_unit: null,
                    image_url: null,
                };

                // Extract title
                const titleMatch = data.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                                   data.match(/<title>([^<]+)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                    result.title = titleMatch[1].trim().replace(' - Walmart.com', '');
                }

                // Extract price from currentPrice JSON
                const currentPriceMatch = data.match(/"currentPrice":\s*\{\s*"price"\s*:\s*(\d+\.?\d*)/);
                if (currentPriceMatch && currentPriceMatch[1]) {
                    result.price = parseFloat(currentPriceMatch[1]);
                }

                // Fallback: linePrice
                if (!result.price) {
                    const linePriceMatch = data.match(/"linePrice"\s*:\s*"\$(\d+\.?\d*)"/);
                    if (linePriceMatch && linePriceMatch[1]) {
                        result.price = parseFloat(linePriceMatch[1]);
                    }
                }

                // Price per unit
                const unitPriceMatch = data.match(/"unitPrice"\s*:\s*"([^"]+)"/);
                if (unitPriceMatch && unitPriceMatch[1]) {
                    result.price_per_unit = unitPriceMatch[1];
                }

                // Image URL
                const imageMatch = data.match(/https:\/\/i5\.walmartimages\.com\/[^"'\s<>]+\.(?:jpeg|jpg|png)/);
                if (imageMatch) {
                    result.image_url = imageMatch[0];
                }

                resolve(result);
            });
        }).on('error', reject);
    });
}

// GET /api/walmart/counts - Get status counts
router.get('/counts', asyncHandler(async (_req: Request, res: Response) => {
    // Count products with missing links (exclude meal products and placeholders)
    const missingLinks = await db.get(`
        SELECT COUNT(*) as count
        FROM products
        WHERE (walmart_link IS NULL OR walmart_link = '')
        AND is_meal_product = FALSE
        AND is_placeholder = FALSE
    `) as { count: number };

    // Count products with links but missing price (the actual "missing prices" metric)
    const missingPrices = await db.get(`
        SELECT COUNT(*) as count
        FROM products
        WHERE walmart_link IS NOT NULL
        AND walmart_link != ''
        AND walmart_link != 'NOT_WALMART'
        AND (price IS NULL OR price = 0)
    `) as { count: number };

    res.json({
        success: true,
        missingLinks: missingLinks.count,
        missingPrices: missingPrices.count
    });
}));

// GET /api/walmart/missing-links - Get products missing links
router.get('/missing-links', asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;

    // Exclude meal products and placeholders - they don't need Walmart links
    const products = await db.all(`
        SELECT *
        FROM products
        WHERE (walmart_link IS NULL OR walmart_link = '')
        AND is_meal_product = FALSE
        AND is_placeholder = FALSE
        ORDER BY name
        LIMIT $1
    `, [limit]);

    res.json(products);
}));

// POST /api/walmart/scrape - Scrape a Walmart product URL
router.post('/scrape', asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url || !url.includes('walmart.com')) {
        res.status(400).json({ error: 'Invalid Walmart URL' });
        return;
    }

    try {
        const productData = await scrapeWalmartProduct(url);
        res.json({
            success: true,
            ...productData
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to scrape product',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// PUT /api/walmart/link/:productId - Update product's Walmart link and price
router.put('/link/:productId', asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { walmart_link, price } = req.body;

    if (!walmart_link) {
        res.status(400).json({ error: 'walmart_link is required' });
        return;
    }

    await db.query(`
        UPDATE products
        SET walmart_link = $1, price = $2
        WHERE id = $3
    `, [walmart_link, price || 0, productId]);

    res.json({ success: true, productId, walmart_link, price });
}));

// GET /api/walmart/product/:productId/image - Get product image from existing Walmart link
router.get('/product/:productId/image', asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const product = await db.get(`
        SELECT id, name, walmart_link
        FROM products
        WHERE id = $1
    `, [productId]) as { id: number; name: string; walmart_link: string | null } | undefined;

    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
    }

    if (!product.walmart_link) {
        res.status(404).json({ error: 'Product has no Walmart link' });
        return;
    }

    try {
        const productData = await scrapeWalmartProduct(product.walmart_link);
        res.json({
            success: true,
            productId: product.id,
            name: product.name,
            image_url: productData.image_url,
            price: productData.price,
            price_per_unit: productData.price_per_unit
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch product image',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// Search Walmart using SerpApi
async function searchWalmartSerpApi(searchQuery: string, storeId: string = '5879'): Promise<{options: WalmartProduct[], metadata: any}> {
    if (!SERPAPI_KEY) {
        throw new Error('SERPAPI_KEY is not configured');
    }

    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            api_key: SERPAPI_KEY,
            engine: 'walmart',
            query: searchQuery,
            store_id: storeId,
            sort: 'best_match',
        });

        const requestUrl = `${SERPAPI_URL}?${params.toString()}`;

        // Use https for SerpApi
        https.get(requestUrl, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`SerpApi HTTP ${res.statusCode}: ${data}`));
                    return;
                }

                try {
                    const jsonData = JSON.parse(data);
                    const options: WalmartProduct[] = [];
                    const metadata: any = {
                        search_parameters: jsonData.search_parameters,
                        search_information: jsonData.search_information
                    };

                    // Extract products from SerpApi response
                    const searchResults = jsonData.organic_results || [];

                    for (const item of searchResults.slice(0, 4)) {
                        // Extract price from primary_offer or direct price field
                        const primaryOffer = item.primary_offer || {};
                        const priceValue = primaryOffer.offer_price || item.price;

                        // Extract price per unit
                        const pricePerUnitObj = item.price_per_unit || {};
                        const pricePerUnit = typeof pricePerUnitObj === 'object' ? pricePerUnitObj.amount : null;

                        options.push({
                            url: item.product_page_url || item.link || '',
                            title: item.title || item.name || null,
                            price: priceValue ? parseFloat(priceValue) : null,
                            price_per_unit: pricePerUnit,
                            image_url: item.thumbnail || null,
                        });
                    }

                    resolve({ options, metadata });
                } catch (parseError) {
                    reject(new Error(`Failed to parse SerpApi response: ${parseError}`));
                }
            });
        }).on('error', reject);
    });
}

// POST /api/walmart/search - Search Walmart for product options
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
    const { query, store_id } = req.body;

    if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
    }

    try {
        const results = await searchWalmartSerpApi(query, store_id || '5879');
        res.json({
            success: true,
            options: results.options,
            metadata: results.metadata
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to search Walmart',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));

// POST /api/walmart/search-batch - Search Walmart for multiple products in parallel
router.post('/search-batch', asyncHandler(async (req: Request, res: Response) => {
    const { products, store_id } = req.body;

    if (!products || !Array.isArray(products)) {
        res.status(400).json({ error: 'Products array is required' });
        return;
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Process in parallel (limit to 5 concurrent)
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const promises = batch.map(async (product: any) => {
            try {
                const searchResults = await searchWalmartSerpApi(product.name, store_id || '5879');
                return {
                    product_id: product.id,
                    options: searchResults.options,
                    metadata: searchResults.metadata
                };
            } catch (error) {
                errors.push({
                    product_id: product.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                return null;
            }
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults.filter(r => r !== null));
    }

    res.json({
        success: true,
        results,
        errors
    });
}));

// POST /api/walmart/update-selections - Batch update multiple product links
router.post('/update-selections', asyncHandler(async (req: Request, res: Response) => {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
        res.status(400).json({ error: 'Updates array is required' });
        return;
    }

    let successCount = 0;
    for (const update of updates) {
        try {
            await db.query(`
                UPDATE products
                SET walmart_link = $1, price = $2
                WHERE id = $3
            `, [update.walmart_link, update.price || 0, update.product_id]);
            successCount++;
        } catch (error) {
            console.error(`Failed to update product ${update.product_id}:`, error);
        }
    }

    res.json({
        success: true,
        updated: successCount,
        total: updates.length
    });
}));

// POST /api/walmart/mark-not-walmart - Mark products as not available on Walmart
router.post('/mark-not-walmart', asyncHandler(async (req: Request, res: Response) => {
    const { product_ids } = req.body;

    if (!product_ids || !Array.isArray(product_ids)) {
        res.status(400).json({ error: 'product_ids array is required' });
        return;
    }

    let successCount = 0;
    for (const productId of product_ids) {
        try {
            // Set walmart_link to 'NOT_WALMART' to flag it
            await db.query(`
                UPDATE products
                SET walmart_link = 'NOT_WALMART'
                WHERE id = $1
            `, [productId]);
            successCount++;
        } catch (error) {
            console.error(`Failed to mark product ${productId} as not walmart:`, error);
        }
    }

    res.json({
        success: true,
        marked: successCount,
        total: product_ids.length
    });
}));

// GET /api/walmart/non-walmart-items - Get products marked as not from Walmart without prices
router.get('/non-walmart-items', asyncHandler(async (_req: Request, res: Response) => {
    const items = await db.all(`
        SELECT id, name, price
        FROM products
        WHERE walmart_link = 'NOT_WALMART'
        AND (price IS NULL OR price = 0)
        ORDER BY name
    `);

    res.json({
        success: true,
        items
    });
}));

// POST /api/walmart/update-manual-prices - Update prices for non-Walmart items
router.post('/update-manual-prices', asyncHandler(async (req: Request, res: Response) => {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
        res.status(400).json({ error: 'Updates array is required' });
        return;
    }

    let successCount = 0;
    for (const update of updates) {
        try {
            // Parse price string to number
            let price = update.price;
            if (typeof price === 'string') {
                price = parseFloat(price.replace(/[$,]/g, ''));
            }

            await db.query(`
                UPDATE products
                SET price = $1
                WHERE id = $2
            `, [price || 0, update.product_id]);
            successCount++;
        } catch (error) {
            console.error(`Failed to update price for product ${update.product_id}:`, error);
        }
    }

    res.json({
        success: true,
        updated: successCount,
        total: updates.length
    });
}));

// POST /api/walmart/update-prices-batch - Start batch price update for products with links
router.post('/update-prices-batch', asyncHandler(async (_req: Request, res: Response) => {
    // Get all products with Walmart links (excluding NOT_WALMART)
    const products = await db.all(`
        SELECT id, name, walmart_link
        FROM products
        WHERE walmart_link IS NOT NULL
        AND walmart_link != ''
        AND walmart_link != 'NOT_WALMART'
    `) as { id: number; name: string; walmart_link: string }[];

    if (products.length === 0) {
        res.json({
            success: true,
            message: 'No products with Walmart links to update',
            updated: 0,
            total: 0
        });
        return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const promises = batch.map(async (product) => {
            try {
                const productData = await scrapeWalmartProduct(product.walmart_link);
                if (productData.price !== null) {
                    await db.query(`
                        UPDATE products
                        SET price = $1
                        WHERE id = $2
                    `, [productData.price, product.id]);
                    return { success: true, product_id: product.id };
                }
                return { success: false, product_id: product.id, error: 'No price found' };
            } catch (error) {
                return {
                    success: false,
                    product_id: product.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });

        const results = await Promise.all(promises);
        for (const result of results) {
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
                errors.push(result);
            }
        }
    }

    res.json({
        success: true,
        updated: successCount,
        failed: errorCount,
        total: products.length,
        errors
    });
}));

export default router;
