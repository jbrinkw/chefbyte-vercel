/**
 * ChefByte TypeScript Server
 * Modern Express server with TypeScript type safety
 */

import express from 'express';
import path from 'path';
import { loadLocations } from './lib/caches';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import productRoutes from './routes/products';
import recipeRoutes from './routes/recipes';
import mealPlanRoutes from './routes/mealPlan';
import shoppingRoutes from './routes/shopping';
import macroRoutes from './routes/macros';
import automationRoutes from './routes/automation';
import systemRoutes from './routes/system';
import configRoutes from './routes/config';
import scanRoutes from './routes/scan';
import jobsRoutes from './routes/jobs';
import inventoryRoutes from './routes/inventory';
import walmartRoutes from './routes/walmart';
import locationsRoutes from './routes/locations';
import statsRoutes from './routes/stats';
import demoRoutes from './routes/demo';

const app = express();
const PORT = parseInt(process.env.PORT || '5175', 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
import cors from 'cors';
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/healthz', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: true,
        uptime: process.uptime()
    });
});

// Stub for LiquidTrack (disabled)
app.get('/liquid/scales/active', (_req, res) => {
    res.json([]);
});

// Auth imports
import authRoutes from './routes/auth';
import { auth } from './middleware/auth';

// API Routes
app.use('/api/auth', authRoutes);

// Protected Routes (Apply auth middleware to all other API routes)
app.use('/api', auth);

app.use('/api/config', configRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/walmart', walmartRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/meal-plan', mealPlanRoutes);
app.use('/api/shopping-list', shoppingRoutes);
app.use('/api/macros', macroRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api', systemRoutes);
app.use('/api/demo', demoRoutes);

// Test Routes (Only for non-production)
import testRoutes from './routes/test';
if (process.env.NODE_ENV !== 'production') {
    console.log('Loading test routes...');
    app.use('/api/test', testRoutes);
}

// Catch-all route for client-side routing (SPA)
// This must come AFTER all API routes but BEFORE error handler
app.use((req, res, next) => {
    // Skip API routes - let them fall through to error handler
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Serve index.html for all other routes (React Router will handle them)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling (must be last)
app.use(errorHandler);

// Initialize and start
async function start() {
    try {
        console.log('[TS Server] Initializing database...');
        // initDB(); // Moved to manual migration script

        console.log('[TS Server] Loading caches...');
        await loadLocations();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`[TS Server] Running on http://0.0.0.0:${PORT}`);
            console.log(`[TS Server] Health: http://localhost:${PORT}/healthz`);
        });
    } catch (error) {
        console.error('[TS Server] Failed to start:', error);
        process.exit(1);
    }
}

start();
