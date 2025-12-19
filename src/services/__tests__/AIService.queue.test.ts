process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test';
import AIService from '../AIService';
import { addAIJob, aiQueueEvents } from '../../queues/AIQueue';
import { Worker } from 'bullmq';
import { Store } from '../../models/Store';

jest.setTimeout(20000);

describe('AIService with queue', () => {
  beforeAll(() => {
    jest.spyOn(Store, 'findByPk').mockImplementation(async (...args: any[]) => {
      const id = args[0];
      return { id, name: 'Test Store' } as any;
    });
  });

  afterAll(() => {
    (Store.findByPk as any).mockRestore && (Store.findByPk as any).mockRestore();
  });

  test('answerQuestion enqueues and returns worker response', async () => {
    // Temporary worker to process the queued job
    const worker = new Worker('ai-requests', async (job) => {
      const { type, payload } = job.data;
      if (type === 'answerQuestion') {
        return { response: 'Respuesta del worker' };
      }
      return { response: 'unknown' };
    }, { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '6379') } });

    const response = await AIService.answerQuestion('Hola, ¿tienes tallas?', 1);
    expect(response).toBe('Respuesta del worker');

    await worker.close();
    // cleanup
    await aiQueueEvents.close();
    await (await import('../../queues/AIQueue')).aiQueueScheduler.close();
    await (await import('../../queues/AIQueue')).aiQueue.close();
  });
});
