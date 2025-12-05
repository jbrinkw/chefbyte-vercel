/**
 * Unit tests for workers module
 */

import { describe, it, expect } from 'vitest';
import { processWithWorkerPool, WorkerResult } from '../../../lib/workers';

describe('workers', () => {
    describe('processWithWorkerPool', () => {
        it('should process all items successfully', async () => {
            const items = [1, 2, 3, 4, 5];
            const processFn = async (item: number) => item * 2;

            const results = await processWithWorkerPool(items, processFn, 2);

            expect(results).toHaveLength(5);
            expect(results.every(r => r.success)).toBe(true);
            expect(results[0].result).toBe(2);
            expect(results[4].result).toBe(10);
        });

        it('should handle errors gracefully', async () => {
            const items = [1, 2, 3];
            const processFn = async (item: number) => {
                if (item === 2) throw new Error('Test error');
                return item * 2;
            };

            const results = await processWithWorkerPool(items, processFn, 2);

            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBe('Test error');
            expect(results[2].success).toBe(true);
        });

        it('should respect timeout', async () => {
            const items = [1, 2];
            const processFn = async (item: number) => {
                if (item === 2) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                return item;
            };

            const results = await processWithWorkerPool(items, processFn, 2, 100);

            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toContain('Timeout');
        });

        it('should process with correct worker count', async () => {
            const items = Array.from({ length: 10 }, (_, i) => i);
            let concurrentCount = 0;
            let maxConcurrent = 0;

            const processFn = async (item: number) => {
                concurrentCount++;
                maxConcurrent = Math.max(maxConcurrent, concurrentCount);
                await new Promise(resolve => setTimeout(resolve, 10));
                concurrentCount--;
                return item;
            };

            await processWithWorkerPool(items, processFn, 3);

            expect(maxConcurrent).toBeLessThanOrEqual(3);
        });
    });
});
