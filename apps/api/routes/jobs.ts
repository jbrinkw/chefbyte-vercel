/**
 * Jobs Routes
 * Handles job status tracking
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// GET /api/jobs/:id - Get job status
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // For now, return a simple completed status
    // In a real implementation, this would check actual job status
    res.json({
        success: true,
        job: {
            id,
            status: 'completed',
            progress: 100
        }
    });
}));

export default router;
