// vim: ts=4:sw=4:expandtab
 
/*
 * jobQueue manages multiple queues indexed by device to serialize
 * session io ops on the database.
 */
'use strict';

const _queueAsyncBuckets = new Map();
// Sesuai rekomendasi: 1000 cukup untuk bot WA agar tidak overload RAM
const _gcLimit = 1000; 

async function _asyncQueueExecutor(queue, cleanup) {
    let offset = 0;
    
    try {
        while (true) {
            const remaining = queue.length;
            const limit = Math.min(remaining, _gcLimit); 
            
            for (let i = offset; i < limit; i++) {
                const job = queue[i];
                try {
                    const result = await job.awaitable();
                    job.resolve(result);
                } catch(e) {
                    job.reject(e);
                }
            }

            if (limit < queue.length) {
                if (limit >= _gcLimit) {
                    const droppedJobs = queue.slice(0, limit);
                    for (const droppedJob of droppedJobs) {
                        droppedJob.reject(new Error("Job queue full/GC: Task dropped to prevent memory leak"));
                    }
                    
                    queue.splice(0, limit);
                    offset = 0;
                } else {
                    offset = limit;
                }
            } else {
                break;
            }
        }
    } finally {
        cleanup();
    }
}

module.exports = function(bucket, awaitable) {
    /* Run the async awaitable only when all other async calls registered
     * here have completed (or thrown).  The bucket argument is a hashable
     * key representing the task queue to use. */

    let inactive = false;
    
    // Check if a queue exists for this bucket (Device ID)
    if (!_queueAsyncBuckets.has(bucket)) {
        _queueAsyncBuckets.set(bucket, []);
        inactive = true;
    }

    const queue = _queueAsyncBuckets.get(bucket);

    // Create a new Promise that will be resolved/rejected by the executor
    const jobPromise = new Promise((resolve, reject) => {
        queue.push({
            awaitable,
            resolve,
            reject
        });
    });

    // If no executor is running for this bucket, start one.
    if (inactive) {
        _asyncQueueExecutor(queue, () => {
            _queueAsyncBuckets.delete(bucket);
        });
    }

    return jobPromise;
};