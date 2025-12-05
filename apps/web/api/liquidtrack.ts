/**
 * LiquidTrack API Endpoint
 * Receives consumption events from ESP8266 smart scales
 *
 * ESP sends:
 *   POST /api/liquidtrack
 *   Headers: x-api-key: lt_xxx
 *   Body: { scale_id, product_name, nutrition, events[] }
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface LiquidEvent {
  id: number;
  timestamp: number;
  weight_before: number;
  weight_after: number;
  consumed: number;
  is_refill: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface EventBatchRequest {
  scale_id: string;
  product_name: string;
  nutrition?: {
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  };
  events: LiquidEvent[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for ESP devices
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    // Hash the key to compare with stored hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Look up device key to get user_id
    const { data: deviceKey, error: keyError } = await supabase
      .from('device_keys')
      .select('user_id, name')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !deviceKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const userId = deviceKey.user_id;

    // Parse request body
    const body: EventBatchRequest = req.body;

    if (!body.scale_id || !body.events || !Array.isArray(body.events)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Insert events
    const eventsToInsert = body.events.map(event => ({
      user_id: userId,
      scale_id: body.scale_id,
      timestamp: event.timestamp,
      weight_before: event.weight_before,
      weight_after: event.weight_after,
      consumed: event.consumed,
      is_refill: event.is_refill,
      product_name: body.product_name,
      calories: event.calories,
      protein: event.protein,
      carbs: event.carbs,
      fat: event.fat,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('liquid_events')
      .insert(eventsToInsert)
      .select('id');

    if (insertError) {
      // Handle duplicate events gracefully
      if (insertError.code === '23505') {
        // Some events already exist, that's OK
        return res.status(200).json({
          success: true,
          message: 'Some events already recorded',
          acknowledged: body.events.map(e => e.id),
        });
      }
      throw insertError;
    }

    return res.status(200).json({
      success: true,
      count: inserted?.length || 0,
      acknowledged: body.events.map(e => e.id),
    });
  } catch (error: any) {
    console.error('LiquidTrack error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
