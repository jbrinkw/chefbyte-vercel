/**
 * Application Error Classes
 * Provides type-safe, structured error handling for ChefByte
 */

/**
 * Base application error
 * All custom errors should extend this class
 */
export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 500,
        public readonly code?: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to JSON for API responses
     */
    toJSON() {
        const result: Record<string, unknown> = {
            error: this.message,
            code: this.code,
            statusCode: this.statusCode
        };
        if (this.details) {
            result.details = this.details;
        }
        return result;
    }
}

/**
 * Validation error (400)
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

/**
 * Not found error (404)
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
    constructor(resource: string, identifier: number | string) {
        super(
            `${resource} not found: ${identifier}`,
            404,
            'NOT_FOUND',
            { resource, identifier }
        );
        this.name = 'NotFoundError';
    }
}

/**
 * Unauthorized error (401)
 * Used when authentication is required but not provided
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

/**
 * Forbidden error (403)
 * Used when user doesn't have permission for the requested action
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

/**
 * Conflict error (409)
 * Used when request conflicts with current state
 */
export class ConflictError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 409, 'CONFLICT', details);
        this.name = 'ConflictError';
    }
}

/**
 * Database error (500)
 * Used for database-specific errors
 */
export class DatabaseError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 500, 'DATABASE_ERROR', details);
        this.name = 'DatabaseError';
    }
}

/**
 * External service error (502/503)
 * Used when external API or service fails
 */
export class ExternalServiceError extends AppError {
    constructor(
        service: string,
        message: string,
        isTemporary: boolean = true,
        details?: unknown
    ) {
        const errorDetails = details && typeof details === 'object'
            ? { service, ...(details as object) }
            : { service };

        super(
            `${service} error: ${message}`,
            isTemporary ? 503 : 502,
            'EXTERNAL_SERVICE_ERROR',
            errorDetails
        );
        this.name = 'ExternalServiceError';
    }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Extract error message safely from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Unknown error occurred';
}

/**
 * Extract status code from error (default to 500)
 */
export function getStatusCode(error: unknown): number {
    if (isAppError(error)) {
        return error.statusCode;
    }
    return 500;
}
