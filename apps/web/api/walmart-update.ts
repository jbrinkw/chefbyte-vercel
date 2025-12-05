/**
 * Walmart Price Update API
 * Verifies Supabase JWT (anon client) then uses service-role client to update prices.
 *
 * POST /api/walmart-update
 * Headers: Authorization: Bearer <supabase-jwt>
 * Body: { product_ids?: number[], store_id?: string }
 *
 * If product_ids is omitted, updates all of the user's products with a Walmart link and missing price.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

// Auth client (anon) for JWT verification
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Service client for privileged updates
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

const SCRAPE_DO_API_KEY = process.env.SCRAPE_DO_API_KEY;
const SCRAPE_DO_URL = 'http://api.scrape.do';

function ensureEnv(res: VercelResponse) {
  if (!SCRAPE_DO_API_KEY) {
    res.status(500).json({ error: 'SCRAPE_DO_API_KEY is not configured on the server' });
    return false;
  }
  if (!supabaseServiceKey) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' });
    return false;
  }
  return true;
}

async function scrapeWalmartProduct(productUrl: string) {
  const params = new URLSearchParams({
    token: SCRAPE_DO_API_KEY || '',
    url: productUrl,
  });

  const requestUrl = `${SCRAPE_DO_URL}?${params.toString()}`;
  const resp = await fetch(requestUrl);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`scrape.do HTTP ${resp.status}: ${text}`);
  }

  const html = await resp.text();

  // Price
  const currentPriceMatch = html.match(/"currentPrice":\s*\{\s*"price"\s*:\s*(\d+\.?\d*)/);
  const linePriceMatch = html.match(/"linePrice"\s*:\s*"\$(\d+\.?\d*)"/);
  const fallbackMatch = html.match(/\$([0-9]+(?:\.[0-9]{2})?)/);
  const price = currentPriceMatch?.[1]
    ? parseFloat(currentPriceMatch[1])
    : linePriceMatch?.[1]
    ? parseFloat(linePriceMatch[1])
    : fallbackMatch?.[1]
    ? parseFloat(fallbackMatch[1])
    : null;

  const imageMatch = html.match(/https:\/\/i5\.walmartimages\.com\/[^"'\s<>]+\.(?:jpeg|jpg|png)/);
  const titleMatch =
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/<title>([^<]+)<\/title>/i);

  return {
    price,
    image_url: imageMatch ? imageMatch[0] : null,
    title: titleMatch && titleMatch[1] ? titleMatch[1].replace(' - Walmart.com', '').trim() : null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!ensureEnv(res)) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { product_ids } = (req.body || {}) as { product_ids?: number[] };

    // Fetch target products
    let query = supabaseAuth
      .from('products')
      .select('id, name, walmart_link')
      .eq('user_id', user.id)
      .not('walmart_link', 'is', null);

    if (product_ids?.length) {
      query = query.in('id', product_ids);
    } else {
      query = query.or('price.is.null,price.eq.0');
    }

    const { data: products, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!products || products.length === 0) {
      return res.status(200).json({ success: true, updated: 0, results: [] });
    }

    const results: any[] = [];
    let updatedCount = 0;

    for (const product of products) {
      if (!product.walmart_link) continue;
      try {
        const scraped = await scrapeWalmartProduct(product.walmart_link);
        if (scraped.price !== null) {
          const { error: updateError } = await supabaseService
            .from('products')
            .update({ price: scraped.price })
            .eq('id', product.id)
            .eq('user_id', user.id);
          if (updateError) throw updateError;
          updatedCount++;
        }
        results.push({
          product_id: product.id,
          price: scraped.price,
          image_url: scraped.image_url,
          title: scraped.title,
          success: true,
        });
      } catch (err: any) {
        results.push({
          product_id: product.id,
          error: err.message || 'Failed to update',
          success: false,
        });
      }
    }

    return res.status(200).json({
      success: true,
      updated: updatedCount,
      total: products.length,
      results,
    });
  } catch (error: any) {
    console.error('Walmart update error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
