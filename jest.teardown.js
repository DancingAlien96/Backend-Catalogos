module.exports = async () => {
  try {
    const queues = require('./src/queues/AIQueue');
    if (queues.aiQueueEvents && queues.aiQueueEvents.close) {
      await queues.aiQueueEvents.close();
    }
    if (queues.aiQueueScheduler && queues.aiQueueScheduler.close) {
      await queues.aiQueueScheduler.close();
    }
    if (queues.aiQueue && queues.aiQueue.close) {
      await queues.aiQueue.close();
    }
  } catch (e) {
    // ignore
  }
};
