/**
 * Global Error Handler Middleware
 * Catches all errors and returns properly formatted responses
 */

import type { Request, Response, NextFunction } from 'express';
import { isAppError, getErrorMessage, getStatusCode } from '../lib/errors';

/**
 * Express error handling middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log all errors
    console.error('[Error Handler]', {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: err.stack
    });

    // Handle known application errors
    if (isAppError(err)) {
        res.status(err.statusCode).json(err.toJSON());
        return;
    }

    // Handle unknown errors
    const statusCode = getStatusCode(err);
    const message = getErrorMessage(err);

    res.status(statusCode).json({
        success: false,
        error: message,
        code: 'INTERNAL_SERVER_ERROR'
    });
}
