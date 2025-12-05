/**
 * Unit tests for jobs module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    enqueueJob,
    getJob,
    updateJob,
    addJobLog,
    getRecentNewItems,
    addRecentNewItem,
    updateRecentNewItem,
    getModificationLogs,
    addModificationLog,
    isWorkerActive,
    setWorkerActive,
    getNextJob
} from '../../../lib/jobs';

describe('jobs', () => {
    describe('job queue', () => {
        it('should enqueue and retrieve job', () => {
            const jobId = enqueueJob({ op: 'test', barcode: '123' });
            const job = getJob(jobId);

            expect(job).toBeDefined();
            expect(job?.op).toBe('test');
            expect(job?.status).toBe('pending');
        });

        it('should update job status', () => {
            const jobId = enqueueJob({ op: 'test' });
            updateJob(jobId, 'running', { result: 'partial' });

            const job = getJob(jobId);
            expect(job?.status).toBe('running');
            expect(job?.result).toBe('partial');
        });

        it('should add job logs', () => {
            const jobId = enqueueJob({ op: 'test' });
            addJobLog(jobId, 'Starting...');
            addJobLog(jobId, 'Processing...');

            const job = getJob(jobId);
            expect(job?.logs).toHaveLength(2);
            expect(job?.logs[0]).toBe('Starting...');
        });

        it('should get next job from queue in FIFO order', () => {
            // Drain any existing jobs first
            while (getNextJob() !== null) { /* drain */ }

            const id1 = enqueueJob({ op: 'first' });
            const id2 = enqueueJob({ op: 'second' });

            expect(getNextJob()).toBe(id1);
            expect(getNextJob()).toBe(id2);
            expect(getNextJob()).toBeNull();
        });
    });

    describe('recent items', () => {
        it('should add and retrieve recent items', () => {
            addRecentNewItem({ product_id: 1, name: 'Test' });
            const items = getRecentNewItems();

            expect(items).toHaveLength(1);
            expect(items[0].name).toBe('Test');
        });

        it('should limit to 3 recent items', () => {
            addRecentNewItem({ product_id: 1, name: 'Item 1' });
            addRecentNewItem({ product_id: 2, name: 'Item 2' });
            addRecentNewItem({ product_id: 3, name: 'Item 3' });
            addRecentNewItem({ product_id: 4, name: 'Item 4' });

            const items = getRecentNewItems();
            expect(items).toHaveLength(3);
            expect(items[0].name).toBe('Item 4'); // Most recent first
        });

        it('should update recent item', () => {
            addRecentNewItem({ product_id: 1, name: 'Test' });
            const updated = updateRecentNewItem(1, { location_id: 5 });

            expect(updated).toBe(true);
            const items = getRecentNewItems();
            expect(items[0].location_id).toBe(5);
        });
    });

    describe('modification logs', () => {
        it('should add and retrieve logs', () => {
            addModificationLog('Created product');
            addModificationLog('Updated stock');

            const logs = getModificationLogs();
            expect(logs).toHaveLength(2);
            expect(logs[0]).toBe('Updated stock'); // Most recent first
        });

        it('should limit to 50 logs', () => {
            for (let i = 0; i < 60; i++) {
                addModificationLog(`Log ${i}`);
            }

            const logs = getModificationLogs();
            expect(logs).toHaveLength(50);
        });
    });

    describe('worker state', () => {
        it('should track worker active state', () => {
            expect(isWorkerActive()).toBe(false);

            setWorkerActive(true);
            expect(isWorkerActive()).toBe(true);

            setWorkerActive(false);
            expect(isWorkerActive()).toBe(false);
        });
    });
});
