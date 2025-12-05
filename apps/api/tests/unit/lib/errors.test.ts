/**
 * Unit tests for errors module
 */

import { describe, it, expect } from 'vitest';
import {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    DatabaseError,
    ExternalServiceError,
    isAppError,
    getErrorMessage,
    getStatusCode
} from '../../../lib/errors';

describe('errors', () => {
    describe('AppError', () => {
        it('should create basic error', () => {
            const error = new AppError('Test error');
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.name).toBe('AppError');
        });

        it('should include custom status code', () => {
            const error = new AppError('Test', 400);
            expect(error.statusCode).toBe(400);
        });

        it('should serialize to JSON', () => {
            const error = new AppError('Test', 400, 'TEST_ERROR', { field: 'value' });
            const json = error.toJSON();

            expect(json.error).toBe('Test');
            expect(json.code).toBe('TEST_ERROR');
            expect(json.statusCode).toBe(400);
            expect(json.details).toEqual({ field: 'value' });
        });
    });

    describe('ValidationError', () => {
        it('should create validation error', () => {
            const error = new ValidationError('Invalid input', { field: 'email' });
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('NotFoundError', () => {
        it('should create not found error', () => {
            const error = new NotFoundError('Product', 123);
            expect(error.message).toBe('Product not found: 123');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
        });
    });

    describe('UnauthorizedError', () => {
        it('should create unauthorized error', () => {
            const error = new UnauthorizedError();
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('UNAUTHORIZED');
        });

        it('should accept custom message', () => {
            const error = new UnauthorizedError('Token expired');
            expect(error.message).toBe('Token expired');
        });
    });

    describe('ForbiddenError', () => {
        it('should create forbidden error', () => {
            const error = new ForbiddenError();
            expect(error.statusCode).toBe(403);
            expect(error.code).toBe('FORBIDDEN');
        });
    });

    describe('ConflictError', () => {
        it('should create conflict error', () => {
            const error = new ConflictError('Resource already exists');
            expect(error.statusCode).toBe(409);
            expect(error.code).toBe('CONFLICT');
        });
    });

    describe('DatabaseError', () => {
        it('should create database error', () => {
            const error = new DatabaseError('Connection failed');
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('DATABASE_ERROR');
        });
    });

    describe('ExternalServiceError', () => {
        it('should create external service error', () => {
            const error = new ExternalServiceError('OpenAI', 'Rate limit exceeded', true);
            expect(error.message).toContain('OpenAI');
            expect(error.statusCode).toBe(503);
        });

        it('should use 502 for non-temporary errors', () => {
            const error = new ExternalServiceError('API', 'Error', false);
            expect(error.statusCode).toBe(502);
        });
    });

    describe('utility functions', () => {
        it('isAppError should identify AppError instances', () => {
            const appError = new ValidationError('Test');
            const stdError = new Error('Test');

            expect(isAppError(appError)).toBe(true);
            expect(isAppError(stdError)).toBe(false);
            expect(isAppError('string')).toBe(false);
        });

        it('getErrorMessage should extract message', () => {
            expect(getErrorMessage(new Error('Test'))).toBe('Test');
            expect(getErrorMessage('String error')).toBe('String error');
            expect(getErrorMessage({ foo: 'bar' })).toBe('Unknown error occurred');
        });

        it('getStatusCode should extract status code', () => {
            expect(getStatusCode(new ValidationError('Test'))).toBe(400);
            expect(getStatusCode(new Error('Test'))).toBe(500);
            expect(getStatusCode('string')).toBe(500);
        });
    });
});
