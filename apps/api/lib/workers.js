/**
 * Worker pool for parallel processing
 */

/**
 * Process items with a worker pool
 * @param {array} items - Items to process
 * @param {function} processFn - Function to process each item (returns Promise)
 * @param {number} maxWorkers - Maximum parallel workers
 * @param {number} timeout - Timeout per item in milliseconds (default: 90000)
 * @returns {Promise<array>} Array of results
 */
async function processWithWorkerPool(items, processFn, maxWorkers = 5, timeout = 90000) {
  const results = [];
  const workers = [];
  let index = 0;

  // Wrap function with timeout
  async function withTimeout(fn, item, index, timeout) {
    return Promise.race([
      fn(item, index),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      try {
        const result = await withTimeout(processFn, item, currentIndex, timeout);
        results[currentIndex] = { success: true, result };
      } catch (error) {
        results[currentIndex] = { success: false, error: error.message };
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

module.exports = {
  processWithWorkerPool,
};
