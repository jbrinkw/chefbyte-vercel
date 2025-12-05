# ChefByte Vercel Deployment Plan

## Overview

This document outlines the steps to deploy ChefByte to Vercel with Supabase as the backend.

## Pre-Deployment Checklist

### Completed
- [x] Production build passes (`npm run build` in `apps/web`)
- [x] Database types updated for Supabase SDK v2.86
- [x] Invalid dependencies removed (canvas, cors, express)
- [x] All TypeScript errors resolved
- [x] `.env.example` created for reference

### Remaining Steps

## Phase 1: Supabase Cloud Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note down:
     - Project URL: `https://<project-id>.supabase.co`
     - Anon/public key
     - Service role key (keep secret!)

2. **Run Database Migrations**
   
   **Option A (Recommended):** Run the combined setup file:
   ```
   supabase/complete_setup.sql
   ```
   This single file includes all tables, RLS policies, indexes, and the demo_reset function.

   **Option B:** Apply migrations individually in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_indexes.sql
   supabase/migrations/004_fix_liquid_events_rls.sql
   supabase/migrations/005_fix_permissions.sql
   supabase/migrations/006_add_delete_policy.sql
   supabase/migrations/007_demo_reset_function.sql
   ```

3. **Verify RLS Policies**
   Ensure Row Level Security is enabled on all tables with `auth.uid() = user_id` policies.

## Phase 2: Vercel Deployment

1. **Connect Repository**
   - Import project from GitHub to Vercel
   - Set root directory to `apps/web`

2. **Configure Build Settings**
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Set Environment Variables**
   In Vercel project settings, add:

   **Required:**
   ```
   VITE_SUPABASE_URL=https://<project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

   **Optional (for full functionality):**
   ```
   OPENAI_API_KEY=<your-openai-key>      # AI product analysis (/api/analyze-product)
   SERPAPI_KEY=<your-serpapi-key>        # Walmart search (/api/walmart-scrape)
   SCRAPE_DO_API_KEY=<your-scrape-do-key> # Walmart price updates (/api/walmart-update)
   ```

   See `apps/web/.env.example` for full documentation.

4. **Deploy**
   - Trigger deployment
   - Verify build succeeds
   - Test the live URL

## Phase 3: Serverless Functions

The following API routes are deployed as Vercel serverless functions:

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/api/walmart-scrape` | Search Walmart products | JWT |
| `/api/walmart-update` | Update product prices | JWT |
| `/api/liquidtrack` | IoT scale events | API Key |
| `/api/analyze-product` | AI product analysis | JWT |

### Function Configuration
Functions are in `apps/web/api/` and auto-deploy with Vercel.

## Phase 4: Data Migration (Optional)

If migrating existing data from local PostgreSQL:

1. **Export local data**
   ```bash
   pg_dump -h localhost -U postgres -d chefbyte --data-only > backup.sql
   ```

2. **Transform data**
   - Add Supabase `user_id` to all records
   - Update foreign key references if needed

3. **Import to Supabase**
   Use Supabase SQL Editor or connect directly via psql.

## Phase 5: Configure Supabase Auth

After deployment, configure authentication URLs in Supabase:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL**: `https://your-app.vercel.app`
3. Add **Redirect URLs**: `https://your-app.vercel.app/**`

This enables proper login/signup redirects.

## Phase 6: Post-Deployment Verification

### Test Checklist
- [ ] User signup/login works
- [ ] Products CRUD operations
- [ ] Recipe creation with ingredients
- [ ] Meal plan add/execute
- [ ] Shopping list management
- [ ] Macro tracking dashboard
- [ ] Demo mode resets data properly
- [ ] Walmart search (if configured)
- [ ] Import/Export functionality

### Monitoring
- Check Vercel function logs for errors
- Monitor Supabase dashboard for query performance
- Review RLS policy denials in logs

## Rollback Plan

If issues occur:
1. Revert to previous Vercel deployment
2. Check environment variables are correct
3. Verify database migrations ran successfully
4. Review function logs for API errors

## Security Notes

- Never commit `.env` files with real secrets
- Service role key is only for server-side operations
- All client queries go through RLS policies
- Device keys for LiquidTrack are hashed before storage

## Architecture Reference

```
Vercel
├── Static SPA (React + Vite)
├── /api/walmart-scrape (Serverless)
├── /api/walmart-update (Serverless)
├── /api/liquidtrack (Serverless)
└── /api/analyze-product (Serverless)
         │
         ▼
Supabase Cloud
├── PostgreSQL + RLS
├── Auth (email/password)
└── Realtime (future)
```
