import { Queue, QueueScheduler, QueueEvents, Job } from 'bullmq';
import { redis } from '../config/redis';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const aiQueue = new Queue('ai-requests', { connection });
export const aiQueueScheduler = new QueueScheduler('ai-requests', { connection });
export const aiQueueEvents = new QueueEvents('ai-requests', { connection });

import { aiJobsAdded } from '../metrics';

export async function addAIJob(payload: any, opts: any = {}) {
  const job = await aiQueue.add('ai-job', payload, opts);
  try { aiJobsAdded.inc(); } catch (e) {}
  return job;
}

export default {
  aiQueue,
  aiQueueScheduler,
  aiQueueEvents,
  addAIJob,
};
