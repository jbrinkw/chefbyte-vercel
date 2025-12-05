/**
 * Walmart Scrape / Search API Endpoint
 * Verifies Supabase JWT, uses SerpApi to fetch Walmart search results.
 *
 * User sends:
 *   POST /api/walmart-scrape
 *   Headers: Authorization: Bearer <supabase-jwt>
 *   Body: { barcode?: string, search_term?: string, store_id?: string }
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create Supabase client for auth verification
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_URL = 'https://serpapi.com/search.json';

function requireEnv(res: VercelResponse) {
  if (!SERPAPI_KEY) {
    res.status(500).json({ error: 'SERPAPI_KEY is not configured on the server' });
    return false;
  }
  return true;
}

async function searchWalmart(query: string, storeId?: string) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY || '',
    engine: 'walmart',
    query,
    sort: 'best_match',
  });

  if (storeId) params.set('store_id', storeId);

  const requestUrl = `${SERPAPI_URL}?${params.toString()}`;
  const resp = await fetch(requestUrl);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`SerpApi HTTP ${resp.status}: ${text}`);
  }

  const json = await resp.json();
  const results = (json.organic_results || []).slice(0, 6).map((item: any) => {
    const primaryOffer = item.primary_offer || {};
    const priceValue = primaryOffer.offer_price || item.price;
    const pricePerUnitObj = item.price_per_unit || {};
    const pricePerUnit = typeof pricePerUnitObj === 'object' ? pricePerUnitObj.amount : null;

    return {
      url: item.product_page_url || item.link || '',
      title: item.title || item.name || null,
      price: priceValue ? parseFloat(priceValue) : null,
      price_per_unit: pricePerUnit,
      image_url: item.thumbnail || null,
    };
  });

  return {
    search_parameters: json.search_parameters,
    search_information: json.search_information,
    results,
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
    // Verify JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!requireEnv(res)) return;

    // Parse request body
    const { barcode, search_term, store_id } = req.body || {};

    if (!barcode && !search_term) {
      return res.status(400).json({ error: 'barcode or search_term required' });
    }

    const term = barcode ? String(barcode) : String(search_term);
    const search = await searchWalmart(term, store_id);

    return res.status(200).json({
      success: true,
      query: term,
      store_id: store_id || null,
      results: search.results,
      metadata: {
        search_parameters: search.search_parameters,
        search_information: search.search_information,
      },
    });
  } catch (error: any) {
    console.error('Walmart scrape error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
