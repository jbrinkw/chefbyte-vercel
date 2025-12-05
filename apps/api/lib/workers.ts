/**
 * Worker pool for parallel processing
 */

export interface WorkerResult<T> {
    success: boolean;
    result?: T;
    error?: string;
}

type ProcessFn<T, R> = (item: T, index: number) => Promise<R>;

/**
 * Process items with a worker pool
 * @param items - Items to process
 * @param processFn - Function to process each item (returns Promise)
 * @param maxWorkers - Maximum parallel workers
 * @param timeout - Timeout per item in milliseconds (default: 90000)
 * @returns Array of results
 */
export async function processWithWorkerPool<T, R>(
    items: T[],
    processFn: ProcessFn<T, R>,
    maxWorkers: number = 5,
    timeout: number = 90000
): Promise<WorkerResult<R>[]> {
    const results: WorkerResult<R>[] = [];
    const workers: Promise<void>[] = [];
    let index = 0;

    // Wrap function with timeout
    async function withTimeout(
        fn: ProcessFn<T, R>,
        item: T,
        idx: number,
        timeoutMs: number
    ): Promise<R> {
        return Promise.race([
            fn(item, idx),
            new Promise<R>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    }

    async function worker(): Promise<void> {
        while (index < items.length) {
            const currentIndex = index++;
            if (currentIndex >= items.length) break;

            const item = items[currentIndex];
            if (!item) continue;

            try {
                const result = await withTimeout(processFn, item, currentIndex, timeout);
                results[currentIndex] = { success: true, result };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                results[currentIndex] = { success: false, error: message };
            }
        }
    }

    // Start workers
    for (let i = 0; i < Math.min(maxWorkers, items.length); i++) {
        workers.push(worker());
    }

    // Wait for all workers to complete (even if some timeout)
    await Promise.allSettled(workers);

    return results;
}
