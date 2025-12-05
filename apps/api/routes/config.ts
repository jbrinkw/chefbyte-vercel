/**
 * Config Routes
 * Handles client configuration
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/config/client - Get client config
router.get('/client', asyncHandler(async (_req: Request, res: Response) => {
    // Return default config for now
    res.json({
        success: true,
        data: {
            features: {
                scanning: true,
                mealPlanning: true,
                macros: true
            },
            theme: 'dark'
        }
    });
}));

// GET /api/config/taste-profile - Get taste profile
router.get('/taste-profile', asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: {} });
}));

// GET /api/config/taste-profile - Get taste profile
router.get('/taste-profile', asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: {} });
}));

export default router;
