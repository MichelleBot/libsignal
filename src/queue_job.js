'use strict'

const _queueAsyncBuckets = new Map()
const _gcLimit = 1000

async function _asyncQueueExecutor(queue, cleanup) {
   let offset = 0
   try {
      while (true) {
         const remaining = queue.length
         const limit = Math.min(remaining, _gcLimit)
         for (let i = offset; i < limit; i++) {
            const job = queue[i]
            try {
               const result = await job.awaitable()
               job.resolve(result)
            } catch(e) {
               job.reject(e)
            }
         }
         if (limit < queue.length) {
            if (limit >= _gcLimit) {
               const droppedJobs = queue.slice(0, limit)
               for (const droppedJob of droppedJobs) {
                  droppedJob.reject(new Error("Job queue full/GC: Task dropped to prevent memory leak"))
               }
               queue.splice(0, limit)
               offset = 0
            } else {
               offset = limit
            }
         } else {
            break
         }
      }
   } finally {
      cleanup()
   }
}

module.exports = function(bucket, awaitable) {
   let inactive = false
   if (!_queueAsyncBuckets.has(bucket)) {
      _queueAsyncBuckets.set(bucket, [])
      inactive = true
   }
   const queue = _queueAsyncBuckets.get(bucket)
   const jobPromise = new Promise((resolve, reject) => {
      queue.push({
         awaitable,
         resolve,
         reject
      })
   })
   if (inactive) {
      _asyncQueueExecutor(queue, () => {
         _queueAsyncBuckets.delete(bucket)
      })
   }
   return jobPromise
}