import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Create Supabase client for auth verification
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

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

    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    // 1. Fetch from OpenFoodFacts
    let offData = null;
    try {
      const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const offJson = await offResponse.json();
      if (offJson.status === 1 && offJson.product) {
        offData = offJson.product;
      }
    } catch (error) {
      console.error('OpenFoodFacts fetch error:', error);
      // Continue even if OFF fails, AI might struggle but we can try if we have some other info (unlikely here as we only have barcode)
    }

    if (!offData) {
      return res.status(404).json({ error: 'Product not found in OpenFoodFacts' });
    }

    // 2. Prepare data for OpenAI
    const brand = (offData.brand_name || '').toString().trim();
    const food = (offData.product_name || offData.generic_name || '').toString().trim();
    const proposed = (brand && food) ? `${brand} ${food}` : (food || brand || 'Open Food Facts Item');
    
    // 3. Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      // Fallback to just returning OFF data if no key
      return res.status(200).json({
        source: 'openfoodfacts',
        product: offData,
        suggestion: null,
        warning: 'OpenAI API key not configured'
      });
    }

    const openai = new OpenAI({ apiKey });

    const sys = [
      'You generate: 1) a product name, 2) a storage location label, 3) four due-day defaults.',
      'Return STRICT JSON only: {',
      '  "name": "<final name>",',
      '  "location_label": "fridge|freezer|pantry",',
      '  "default_best_before_days": <int>=0,',
      '  "default_best_before_days_after_open": <int>=0,',
      '  "default_best_before_days_after_freezing": <int>=0,',
      '  "default_best_before_days_after_thawing": <int>=0',
      '}',
      'Rules for name:',
      `- Base name must be "${proposed}" (brand + product).`,
      '- Do NOT change semantics; only fix formatting (spaces/casing/punctuation) if needed.',
    ].join('\n');

    const human = 'Open Food Facts JSON follows:\n' + JSON.stringify({
      product_name: offData.product_name,
      generic_name: offData.generic_name,
      brands: offData.brands,
      categories: offData.categories,
      ingredients_text: offData.ingredients_text
    }); // Send a subset to avoid token limits if full JSON is huge

    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // or gpt-3.5-turbo
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: human }
      ],
      temperature: 0,
    });

    const content = completion.choices[0].message.content;
    let suggestion = null;
    try {
      suggestion = JSON.parse(content || '{}');
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
    }

    return res.status(200).json({
      source: 'ai',
      product: offData,
      suggestion: suggestion
    });

  } catch (error: any) {
    console.error('Analyze product error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}


