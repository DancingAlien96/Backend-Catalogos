import OpenAI from 'openai';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Store } from '../models/Store';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProductRecommendation {
  productIds: number[];
  message: string;
}

class AIService {
  async suggestProducts(
    userMessage: string,
    storeId: number
  ): Promise<ProductRecommendation> {
    try {
      // Obtener store info
      const store = await Store.findByPk(storeId);
      if (!store) {
        throw new Error('Store not found');
      }

      // Obtener todos los productos activos de la tienda
      const products = await Product.findAll({
        where: { store_id: storeId, is_active: true },
        include: [{ model: Category, as: 'category' }],
      });

      if (products.length === 0) {
        return {
          productIds: [],
          message: 'Lo siento, no tenemos productos disponibles en este momento.',
        };
      }

      // Crear contexto con los productos
      const productsContext = products
        .map((p) => {
          const category = p.category ? p.category.name : 'Sin categoría';
          return `ID: ${p.id} | ${p.name} | Categoría: ${category} | Precio: $${p.price} | Descripción: ${p.description || 'Sin descripción'}`;
        })
        .join('\n');

      // Prompt para ChatGPT
      const systemPrompt = `Eres un asistente de ventas experto para ${store.name}.

Tu trabajo es ayudar a los clientes a encontrar los productos perfectos según sus necesidades.

PRODUCTOS DISPONIBLES:
${productsContext}

INSTRUCCIONES:
1. Analiza lo que el cliente necesita
2. Recomienda los productos más relevantes (máximo 3)
3. Explica brevemente por qué son una buena opción
4. Sé amigable y persuasivo pero natural
5. Si no hay productos que coincidan, ofrece alternativas
6. Responde en español de forma conversacional

FORMATO DE RESPUESTA:
Debes responder EXACTAMENTE en este formato JSON:
{
  "productIds": [id1, id2, id3],
  "message": "Tu mensaje amigable explicando por qué recomiendas estos productos"
}

Si no recomiendas ningún producto, usa productIds: []`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const response = JSON.parse(responseText);

      return {
        productIds: response.productIds || [],
        message: response.message || 'No pude procesar tu solicitud. ¿Podrías ser más específico?',
      };
    } catch (error) {
      console.error('Error en AIService.suggestProducts:', error);
      return {
        productIds: [],
        message: 'Disculpa, tuve un problema procesando tu solicitud. ¿Podrías intentar de nuevo?',
      };
    }
  }

  // New method to process prompts directly (used by worker)
  async processPrompt(prompt: { system?: string; user: string }, options?: any) {
    try {
      const messages = [] as any[];
      if (prompt.system) messages.push({ role: 'system', content: prompt.system });
      messages.push({ role: 'user', content: prompt.user });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 300,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error in processPrompt:', error);
      throw error;
    }
  }

  async answerQuestion(
    userQuestion: string,
    storeId: number,
    context?: string
  ): Promise<string> {
    try {
      const store = await Store.findByPk(storeId);
      if (!store) {
        return 'Lo siento, hubo un problema con la tienda.';
      }

      const systemPrompt = `Eres un asistente de servicio al cliente para ${store.name}.

Ayudas a los clientes con:
- Preguntas sobre productos
- Proceso de compra
- Políticas de la tienda
- Cualquier duda general

Sé amigable, profesional y conciso. Responde en español.

${context ? `CONTEXTO ADICIONAL:\n${context}` : ''}`;

      // Try to enqueue the request and wait for the worker to process it for a short time
      try {
        const { addAIJob, aiQueueEvents } = await import('../queues/AIQueue');
        const { aiJobsAdded, aiJobsCompleted, aiJobsFailed } = await import('../metrics');

        const job = await addAIJob({ type: 'answerQuestion', payload: { userQuestion, storeId, context } }, { attempts: 2 });
        try {
          aiJobsAdded.inc();
        } catch (e) {}

        // Wait for job completion with a timeout
        const res = await job.waitUntilFinished(aiQueueEvents, 10000);
        try { aiJobsCompleted.inc(); } catch (e) {}

        return res?.response || res;
      } catch (queueErr) {
        // If queueing fails or times out, fallback to direct call
        console.warn('Queueing AI request failed, falling back to direct call:', (queueErr as any)?.message || String(queueErr));
      }

      const response = await this.processPrompt({ system: systemPrompt, user: userQuestion }, { max_tokens: 300 });
      return response || 'No pude procesar tu pregunta.';
    } catch (error) {
      console.error('Error en AIService.answerQuestion:', error);
      return 'Disculpa, tuve un problema. ¿Podrías intentar de nuevo?';
    }
  }
}

export default new AIService();
