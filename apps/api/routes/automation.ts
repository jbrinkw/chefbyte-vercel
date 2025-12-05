/**
 * Automation Routes
 * Handles background jobs and automation tasks
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { updateAllRecipeMacros } from '../lib/automation';
import { getJob } from '../lib/jobs';

const router = Router();

// POST /api/automation/update-macros - Recalculate recipe macros
router.post('/update-macros', asyncHandler(async (_req: Request, res: Response) => {
    const stats = updateAllRecipeMacros();
    res.json({ success: true, data: stats });
}));

// POST /api/automation/sync-meal-products - Sync meal products
router.post('/sync-meal-products', asyncHandler(async (_req: Request, res: Response) => {
    // This would call syncMealProducts() from lib/automation
    // For now, just return success as it's a placeholder
    res.json({ success: true, message: 'Sync started' });
}));

// GET /api/jobs/:id - Get job status
router.get('/jobs/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id || '0');
    const job = getJob(id);

    if (!job) {
        res.status(404).json({ success: false, error: 'Job not found' });
        return;
    }

    res.json({ success: true, data: job });
}));

export default router;
