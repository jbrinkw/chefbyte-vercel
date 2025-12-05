/**
 * Job queue system for background processing
 */

export interface Job {
    id: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    op?: string;
    barcode?: string;
    logs: string[];
    result: unknown | null;
}

export interface RecentNewItem {
    product_id: number;
    name: string;
    barcode?: string;
    best_before_date?: string;
    location_id?: number;
    location_label?: string;
    booking_id?: string;
}

// In-memory job store (MVP)
const jobStore = new Map<number, Job>();
let nextJobId = 1;

// Simple FIFO queue; one worker at a time
const queue: number[] = [];
let isWorking = false;

// Recent newly created items (max 3)
const recentNewItems: RecentNewItem[] = [];

// Modification logs (last 50)
const modificationLogs: string[] = [];

/**
 * Enqueue a job
 */
export function enqueueJob(job: Partial<Job>): number {
    const id = nextJobId++;
    const record: Job = {
        id,
        status: 'pending',
        ...job,
        logs: job.logs || [],
        result: job.result || null
    };
    jobStore.set(id, record);
    queue.push(id);
    return id;
}

/**
 * Get job by ID
 */
export function getJob(id: number): Job | null {
    return jobStore.get(id) || null;
}

/**
 * Update job status
 */
export function updateJob(id: number, status: Job['status'], updates: Partial<Job> = {}): void {
    const job = jobStore.get(id);
    if (job) {
        job.status = status;
        Object.assign(job, updates);
    }
}

/**
 * Add log to job
 */
export function addJobLog(id: number, message: string): void {
    const job = jobStore.get(id);
    if (job) {
        job.logs.push(message);
    }
}

/**
 * Get recent new items
 */
export function getRecentNewItems(): RecentNewItem[] {
    return recentNewItems;
}

/**
 * Add recent new item
 */
export function addRecentNewItem(item: RecentNewItem): void {
    recentNewItems.unshift(item);
    if (recentNewItems.length > 3) recentNewItems.pop();
}

/**
 * Update recent new item
 */
export function updateRecentNewItem(productId: number, updates: Partial<RecentNewItem>): boolean {
    const item = recentNewItems.find((i) => i.product_id === productId);
    if (item) {
        Object.assign(item, updates);
        return true;
    }
    return false;
}

/**
 * Get modification logs
 */
export function getModificationLogs(): string[] {
    return modificationLogs;
}

/**
 * Add modification log
 */
export function addModificationLog(message: string): void {
    modificationLogs.unshift(message);
    if (modificationLogs.length > 50) modificationLogs.pop();
}

/**
 * Check if worker is active
 */
export function isWorkerActive(): boolean {
    return isWorking;
}

/**
 * Set worker active state
 */
export function setWorkerActive(active: boolean): void {
    isWorking = active;
}

/**
 * Get next job from queue
 */
export function getNextJob(): number | null {
    return queue.shift() || null;
}

/**
 * Clear all jobs (for testing)
 */
export function clearJobs(): void {
    jobStore.clear();
    queue.length = 0;
    nextJobId = 1;
    recentNewItems.length = 0;
    modificationLogs.length = 0;
    isWorking = false;
}
