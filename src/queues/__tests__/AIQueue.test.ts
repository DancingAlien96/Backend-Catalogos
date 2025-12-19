import { addAIJob, aiQueueEvents, aiQueue, aiQueueScheduler } from '../../queues/AIQueue';
import { Worker } from 'bullmq';

jest.setTimeout(20000);

describe('AI Queue', () => {
  test('adds and processes job using a temporary worker', async () => {
    // Create a temporary worker that processes the job
    const worker = new Worker('ai-requests', async (job) => {
      // Return a simulated response
      return { response: 'simulated response' };
    }, { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') } });

    const job = await addAIJob({ type: 'test', payload: { foo: 'bar' } });

    const res = await job.waitUntilFinished(aiQueueEvents, 10000);
    expect(res).toBeDefined();
    expect(res.response).toBe('simulated response');

    await worker.close();
  });
});
