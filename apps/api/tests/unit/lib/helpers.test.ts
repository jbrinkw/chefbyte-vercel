/**
 * Unit tests for helpers module
 */

import { describe, it, expect } from 'vitest';
import { cleanWalmartUrl, findLastJson, findLastData } from '../../../lib/helpers';

describe('helpers', () => {
    describe('cleanWalmartUrl', () => {
        it('should remove query params from URL', () => {
            const url = 'https://www.walmart.com/ip/123?foo=bar&baz=qux';
            const cleaned = cleanWalmartUrl(url);
            expect(cleaned).toBe('https://www.walmart.com/ip/123');
        });

        it('should handle URLs without query params', () => {
            const url = 'https://www.walmart.com/ip/123';
            const cleaned = cleanWalmartUrl(url);
            expect(cleaned).toBe('https://www.walmart.com/ip/123');
        });

        it('should handle null/undefined', () => {
            expect(cleanWalmartUrl(null)).toBeNull();
            expect(cleanWalmartUrl(undefined)).toBeUndefined();
        });

        it('should handle invalid URLs', () => {
            const invalid = 'not a url';
            expect(cleanWalmartUrl(invalid)).toBe(invalid);
        });
    });

    describe('findLastJson', () => {
        it('should find JSON object in text', () => {
            const text = 'Some text\n{"foo": "bar"}\nMore text';
            const json = findLastJson(text);
            expect(json).toEqual({ foo: 'bar' });
        });

        it('should find JSON array in text', () => {
            const text = 'Some text\n[1, 2, 3]\n';
            const json = findLastJson(text);
            expect(json).toEqual([1, 2, 3]);
        });

        it('should return last JSON if multiple', () => {
            const text = '{"first": 1}\n{"second": 2}';
            const json = findLastJson(text);
            expect(json).toEqual({ second: 2 });
        });

        it('should return null if no JSON found', () => {
            const text = 'No JSON here';
            const json = findLastJson(text);
            expect(json).toBeNull();
        });

        it('should handle null/undefined', () => {
            expect(findLastJson(null)).toBeNull();
            expect(findLastJson(undefined)).toBeNull();
        });
    });

    describe('findLastData', () => {
        it('should extract data property from JSON', () => {
            const text = '{"data": {"value": 123}}';
            const data = findLastData(text);
            expect(data).toEqual({ value: 123 });
        });

        it('should return json if no data property', () => {
            const text = '{"value": 123}';
            const data = findLastData(text);
            expect(data).toEqual({ value: 123 });
        });

        it('should return null if no JSON', () => {
            const text = 'No JSON';
            const data = findLastData(text);
            expect(data).toBeNull();
        });
    });
});
