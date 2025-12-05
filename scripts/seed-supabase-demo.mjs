/**
 * Seed Supabase demo data with user_id injected.
 *
 * Usage:
 *   USER_ID=<uuid> SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<service-role> node scripts/seed-supabase-demo.mjs
 *
 * Reads apps/api/seed/demo_data.json and inserts:
 *   locations -> quantity_units -> products -> recipes -> recipe_ingredients -> stock
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
};

const USER_ID = required('USER_ID');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || required('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || required('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const dataPath = path.resolve('apps/api/seed/demo_data.json');
const seed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const legacyToNew = {
  locations: new Map(),
  units: new Map(),
  products: new Map(),
  recipes: new Map(),
};

async function insertAndMap(table, rows, map, transform) {
  for (const row of rows) {
    const payload = transform(row);
    const { data, error } = await supabase.from(table).insert(payload).select('id').single();
    if (error) {
      throw new Error(`Insert failed for ${table}: ${error.message}`);
    }
    map.set(row.legacy_id, data.id);
  }
}

async function main() {
  console.log('Seeding demo data for user:', USER_ID);

  // Locations
  if (seed.locations?.length) {
    console.log('Inserting locations...');
    await insertAndMap(
      'locations',
      seed.locations,
      legacyToNew.locations,
      (loc) => ({
        user_id: USER_ID,
        name: loc.name,
      })
    );
  }

  // Units
  if (seed.units?.length) {
    console.log('Inserting quantity_units...');
    await insertAndMap(
      'quantity_units',
      seed.units,
      legacyToNew.units,
      (u) => ({
        user_id: USER_ID,
        name: u.name,
        name_plural: u.name_plural,
      })
    );
  }

  // Products
  if (seed.products?.length) {
    console.log('Inserting products...');
    await insertAndMap(
      'products',
      seed.products,
      legacyToNew.products,
      (p) => ({
        user_id: USER_ID,
        name: p.name,
        description: p.description,
        location_id: p.location_id ? legacyToNew.locations.get(p.location_id) : null,
        qu_id_stock: p.qu_id_stock ? legacyToNew.units.get(p.qu_id_stock) : null,
        qu_id_purchase: p.qu_id_purchase ? legacyToNew.units.get(p.qu_id_purchase) : null,
        qu_id_consume: p.qu_id_consume ? legacyToNew.units.get(p.qu_id_consume) : null,
        qu_id_price: p.qu_id_price ? legacyToNew.units.get(p.qu_id_price) : null,
        min_stock_amount: p.min_stock_amount ?? 0,
        default_best_before_days: p.default_best_before_days ?? 0,
        calories_per_serving: p.calories_per_serving ?? 0,
        carbs_per_serving: p.carbs_per_serving ?? 0,
        protein_per_serving: p.protein_per_serving ?? 0,
        fat_per_serving: p.fat_per_serving ?? 0,
        num_servings: p.num_servings ?? 1,
        barcode: p.barcode || null,
        walmart_link: p.walmart_link || null,
        is_walmart: p.is_walmart ?? true,
        is_placeholder: p.is_placeholder ?? false,
        is_meal_product: p.is_meal_product ?? false,
        price: p.price ?? 0,
      })
    );
  }

  // Recipes
  if (seed.recipes?.length) {
    console.log('Inserting recipes...');
    await insertAndMap(
      'recipes',
      seed.recipes,
      legacyToNew.recipes,
      (r) => ({
        user_id: USER_ID,
        name: r.name,
        description: r.description,
        base_servings: r.base_servings ?? 1,
        total_time: r.total_time ?? null,
        active_time: r.active_time ?? null,
        calories: r.calories ?? null,
        carbs: r.carbs ?? null,
        protein: r.protein ?? null,
        fat: r.fat ?? null,
        product_id: r.product_id ? legacyToNew.products.get(r.product_id) : null,
      })
    );
  }

  // Recipe ingredients
  if (seed.recipe_ingredients?.length) {
    console.log('Inserting recipe_ingredients...');
    for (const ing of seed.recipe_ingredients) {
      const { error } = await supabase.from('recipe_ingredients').insert({
        user_id: USER_ID,
        recipe_id: legacyToNew.recipes.get(ing.recipe_id),
        product_id: legacyToNew.products.get(ing.product_id),
        amount: ing.amount,
        qu_id: ing.qu_id ? legacyToNew.units.get(ing.qu_id) : null,
        note: ing.note || null,
      });
      if (error) throw new Error(`Insert failed for recipe_ingredients: ${error.message}`);
    }
  }

  // Stock
  if (seed.stock?.length) {
    console.log('Inserting stock...');
    for (const s of seed.stock) {
      const { error } = await supabase.from('stock').insert({
        user_id: USER_ID,
        product_id: legacyToNew.products.get(s.product_id),
        amount: s.amount,
        best_before_date: s.best_before_date || null,
        location_id: s.location_id ? legacyToNew.locations.get(s.location_id) : null,
      });
      if (error) throw new Error(`Insert failed for stock: ${error.message}`);
    }
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
