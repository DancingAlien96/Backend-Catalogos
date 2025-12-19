import { Worker } from 'bullmq';
import { aiQueueEvents } from '../queues/AIQueue';
import OpenAIService from '../services/AIService';
import { aiJobsCompleted, aiJobsFailed } from '../metrics';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Worker processes AI jobs
const worker = new Worker(
  'ai-requests',
  async (job) => {
    try {
      // job.data should contain { userId, prompt, options } or { type, payload }
      const { type, payload } = job.data;
      if (type === 'answerQuestion') {
        const { userQuestion, storeId, context } = payload;
        const store = await (await import('../models/Store')).Store.findByPk(storeId);
        const systemPrompt = `Eres un asistente de servicio al cliente para ${store?.name || 'la tienda'}.`;
        const response = await OpenAIService.processPrompt({ system: systemPrompt, user: userQuestion }, { max_tokens: 300 });
        try { aiJobsCompleted.inc(); } catch (e) {}
        return { ok: true, response };
      }

      // Generic processing: call processPrompt if provided
      const { prompt, options } = payload || {};
      if (prompt) {
        const response = await OpenAIService.processPrompt(prompt, options || {});
        try { aiJobsCompleted.inc(); } catch (e) {}
        return { ok: true, response };
      }

      return { ok: false };
    } catch (err) {
      console.error('AI worker error:', err);
      try { aiJobsFailed.inc(); } catch (e) {}
      throw err;
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log('AI job completed', job.id);
});

worker.on('failed', (job, err) => {
  console.error('AI job failed', job?.id, err?.message);
});

export default worker;
