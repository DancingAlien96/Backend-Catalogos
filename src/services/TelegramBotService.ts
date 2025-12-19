import { Telegraf, Context, Markup } from 'telegraf';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { OrderItem } from '../models/OrderItem';
import { sequelize } from '../config/sequelize';
import AIService from './AIService';
import SessionManager from './SessionManager';
import * as client from 'prom-client';

// Metrics
const cartAddsCounter = new client.Counter({ name: 'telegram_cart_add_total', help: 'Total cart additions' });
const ordersCounter = new client.Counter({ name: 'telegram_orders_total', help: 'Total orders created' });
const botErrorsCounter = new client.Counter({ name: 'telegram_bot_errors_total', help: 'Total bot errors' });
const activeSessionsGauge = new client.Gauge({ name: 'telegram_active_sessions', help: 'Active sessions in Redis' });

interface BotSession {
  storeId: number;
  cart: CartItem[];
  customerId?: number;
}

interface CartItem {
  productId: number;
  quantity: number;
  price: number;
  name: string;
}

class TelegramBotService {
  private bots: Map<number, Telegraf> = new Map();
  // Sessions persisted in Redis via SessionManager
  private sessionManager = SessionManager;

  async initializeAllBots() {
    try {
      const stores = await Store.findAll({
        where: { is_active: true },
      });

      for (const store of stores) {
        if (store.bot_token) {
          await this.startBot(store.id);
        }
      }

      console.log(`✅ Initialized ${this.bots.size} Telegram bots`);
    } catch (error) {
      console.error('Error initializing bots:', error);
    }
  }

  // HOT RELOAD: Iniciar bot de una tienda específica
  async startBot(storeId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar si el bot ya está corriendo
      if (this.bots.has(storeId)) {
        return {
          success: false,
          message: `Bot for store ${storeId} is already running`,
        };
      }

      // Cargar la tienda
      const store = await Store.findByPk(storeId);
      if (!store) {
        return {
          success: false,
          message: `Store ${storeId} not found`,
        };
      }

      if (!store.bot_token) {
        return {
          success: false,
          message: `Store ${storeId} has no bot_token configured`,
        };
      }

      if (!store.is_active) {
        return {
          success: false,
          message: `Store ${storeId} is not active`,
        };
      }

      // Inicializar el bot
      await this.initializeBot(store);

      return {
        success: true,
        message: `Bot for store ${store.name} started successfully`,
      };
    } catch (error: any) {
      console.error(`Error starting bot for store ${storeId}:`, error);
      return {
        success: false,
        message: error.message || 'Unknown error',
      };
    }
  }

  // HOT RELOAD: Detener bot de una tienda específica
  async stopBot(storeId: number): Promise<{ success: boolean; message: string }> {
    try {
      const bot = this.bots.get(storeId);
      if (!bot) {
        return {
          success: false,
          message: `Bot for store ${storeId} is not running`,
        };
      }

      // Detener el bot
      await bot.stop();
      this.bots.delete(storeId);

      // Limpiar sesiones de este bot (Redis-backed)
      const sessionsToDelete: number[] = [];
      // NOTE: key scan; for large deployments use a Redis set to index sessions per store
      const keys = await (await import('../config/redis')).redis.keys('session:user:*');
      for (const k of keys) {
        const raw = await (await import('../config/redis')).redis.get(k);
        if (!raw) continue;
        try {
          const s = JSON.parse(raw);
          if (s.storeId === storeId) {
            const uid = parseInt(k.split(':').pop() || '0', 10);
            sessionsToDelete.push(uid);
          }
        } catch (err) {
          // ignore parse errors
        }
      }
      for (const userId of sessionsToDelete) {
        await this.sessionManager.deleteSession(userId);
      }

      return {
        success: true,
        message: `Bot for store ${storeId} stopped successfully`,
      };
    } catch (error: any) {
      console.error(`Error stopping bot for store ${storeId}:`, error);
      return {
        success: false,
        message: error.message || 'Unknown error',
      };
    }
  }

  // HOT RELOAD: Reiniciar bot de una tienda específica
  async restartBot(storeId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Detener el bot si está corriendo
      if (this.bots.has(storeId)) {
        const stopResult = await this.stopBot(storeId);
        if (!stopResult.success) {
          return stopResult;
        }
      }

      // Iniciar el bot nuevamente
      return await this.startBot(storeId);
    } catch (error: any) {
      console.error(`Error restarting bot for store ${storeId}:`, error);
      return {
        success: false,
        message: error.message || 'Unknown error',
      };
    }
  }

  // Obtener estado de todos los bots
  async getBotStatus(): Promise<Array<{ storeId: number; isRunning: boolean; sessionCount: number }>> {
    const status: Array<{ storeId: number; isRunning: boolean; sessionCount: number }> = [];

    // Count sessions per running bot (NOTE: for large scale implement an index per store)
    const redisClient = (await import('../config/redis')).redis;
    const keys = await redisClient.keys('session:user:*');

    for (const [storeId] of this.bots) {
      let sessionCount = 0;
      for (const k of keys) {
        const raw = await redisClient.get(k);
        if (!raw) continue;
        try {
          const s = JSON.parse(raw);
          if (s.storeId === storeId) sessionCount++;
        } catch (err) {}
      }

      status.push({
        storeId,
        isRunning: true,
        sessionCount,
      });
    }

    return status;
  }

  // Verificar si un bot está corriendo
  isBotRunning(storeId: number): boolean {
    return this.bots.has(storeId);
  }

  private async initializeBot(store: Store) {
    try {
      const bot = new Telegraf(store.bot_token);

      // Session middleware (persisted in Redis)
      bot.use(async (ctx, next) => {
        const userId = ctx.from?.id;
        if (userId) {
          const existing = await this.sessionManager.getSession(userId);
          if (!existing) {
            await this.sessionManager.ensureSession(userId, store.id);
            activeSessionsGauge.inc();
          }
        }
        return next();
      });

      // Commands
      this.setupCommands(bot, store);

      // Start bot
      await bot.launch();
      this.bots.set(store.id, bot);

      console.log(`🤖 Bot initialized for store: ${store.name}`);
    } catch (error) {
      console.error(`Error initializing bot for ${store.name}:`, error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  private setupCommands(bot: Telegraf, store: Store) {
    // /start command
    bot.command('start', async (ctx) => {
      const welcomeMessage = `
🛍️ ¡Bienvenido a ${store.name}!

Aquí puedes explorar nuestro catálogo y realizar pedidos de forma sencilla.

*Comandos disponibles:*
/catalogo - Ver catálogo completo
/categorias - Buscar por categoría
/carrito - Ver tu carrito de compras
/orden - Realizar pedido
/ayuda - Obtener ayuda

¡Comienza explorando nuestros productos! 👇
      `.trim();

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📱 Ver Catálogo', 'show_catalog')],
          [Markup.button.callback('🗂️ Categorías', 'show_categories')],
          [Markup.button.url('🌐 Ver en Web', `${process.env.FRONTEND_URL || 'http://localhost:3001'}/catalogo/${store.slug}`)],
        ]),
      });
    });

    // /catalogo command
    bot.command('catalogo', async (ctx) => {
      await this.showCatalog(ctx, store);
    });

    // /categorias command
    bot.command('categorias', async (ctx) => {
      await this.showCategories(ctx, store);
    });

    // /carrito command
    bot.command('carrito', async (ctx) => {
      await this.showCart(ctx);
    });

    // /orden command
    bot.command('orden', async (ctx) => {
      await this.createOrder(ctx);
    });

    // /ayuda command
    bot.command('ayuda', async (ctx) => {
      const helpMessage = `
📖 *Ayuda - ${store.name}*

*Explorar productos:*
• /catalogo - Muestra todos los productos disponibles
• /categorias - Busca productos por categoría

*Realizar compra:*
1. Explora los productos
2. Agrega productos al carrito
3. Usa /carrito para revisar tu pedido
4. Usa /orden para confirmar tu pedido

*Gestionar carrito:*
• /carrito - Ver productos en tu carrito
• Desde el carrito puedes modificar cantidades o eliminar productos

¿Necesitas más ayuda? Usa el botón de contacto en nuestro catálogo web.
      `.trim();

      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    // Callback query handlers
    bot.action('show_catalog', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showCatalog(ctx, store);
    });

    bot.action('show_categories', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showCategories(ctx, store);
    });

    bot.action(/^category_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const categoryId = parseInt(ctx.match[1]);
      await this.showProductsByCategory(ctx, store, categoryId);
    });

    bot.action(/^product_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const productId = parseInt(ctx.match[1]);
      await this.showProductDetail(ctx, store, productId);
    });

    bot.action(/^add_to_cart_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery('✅ Producto agregado al carrito');
      const productId = parseInt(ctx.match[1]);
      await this.addToCart(ctx, productId);
    });

    bot.action('view_cart', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showCart(ctx);
    });

    bot.action(/^remove_from_cart_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery('🗑️ Producto eliminado del carrito');
      const productId = parseInt(ctx.match[1]);
      await this.removeFromCart(ctx, productId);
    });

    bot.action('confirm_order', async (ctx) => {
      await ctx.answerCbQuery();
      await this.createOrder(ctx);
    });

    bot.action('clear_cart', async (ctx) => {
      await ctx.answerCbQuery('🗑️ Carrito vaciado');
      await this.clearCart(ctx);
    });

    // Manejo de mensajes de texto (preguntas con IA)
    bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      
      // Ignorar comandos
      if (text.startsWith('/')) return;

      // Responder con IA
      await this.handleAIQuestion(ctx, store, text);
    });
  }

  private async showCatalog(ctx: Context, store: Store) {
    const products = await Product.findAll({
      where: { store_id: store.id, is_active: true },
      include: [{ model: Category, as: 'category' }],
      limit: 10,
    });

    if (products.length === 0) {
      await ctx.reply('No hay productos disponibles en este momento.');
      return;
    }

    const buttons = products.map((product) => [
      Markup.button.callback(
        `${product.name} - $${product.price}`,
        `product_${product.id}`
      ),
    ]);

    buttons.push([Markup.button.callback('🗂️ Ver por Categorías', 'show_categories')]);
    buttons.push([Markup.button.callback('🛒 Ver Carrito', 'view_cart')]);

    await ctx.reply('📱 *Catálogo de Productos*\n\nSelecciona un producto para ver detalles:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  private async showCategories(ctx: Context, store: Store) {
    const categories = await Category.findAll({
      where: { store_id: store.id, is_active: true },
      order: [['display_order', 'ASC']],
    });

    if (categories.length === 0) {
      await ctx.reply('No hay categorías disponibles.');
      return;
    }

    const buttons = categories.map((category) => [
      Markup.button.callback(category.name, `category_${category.id}`),
    ]);

    buttons.push([Markup.button.callback('📱 Ver Todo el Catálogo', 'show_catalog')]);

    await ctx.reply('🗂️ *Categorías*\n\nSelecciona una categoría:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  private async showProductsByCategory(ctx: Context, store: Store, categoryId: number) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      await ctx.reply('Categoría no encontrada.');
      return;
    }

    const products = await Product.findAll({
      where: { store_id: store.id, category_id: categoryId, is_active: true },
    });

    if (products.length === 0) {
      await ctx.reply(`No hay productos en la categoría "${category.name}".`);
      return;
    }

    const buttons = products.map((product) => [
      Markup.button.callback(
        `${product.name} - $${product.price}`,
        `product_${product.id}`
      ),
    ]);

    buttons.push([Markup.button.callback('⬅️ Volver a Categorías', 'show_categories')]);

    await ctx.reply(`🗂️ *${category.name}*\n\n${category.description || 'Selecciona un producto:'}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  private async showProductDetail(ctx: Context, store: Store, productId: number) {
    const product = await Product.findOne({
      where: { id: productId, store_id: store.id },
      include: [{ model: Category, as: 'category' }],
    });

    if (!product) {
      await ctx.reply('Producto no encontrado.');
      return;
    }

    const images = Array.isArray(product.images) ? product.images : [];
    const mainImage = images[0];

    let message = `
🛍️ *${product.name}*
${product.sku ? `SKU: ${product.sku}` : ''}

${product.description || ''}

💰 *Precio:* $${product.price}
📦 *Stock:* ${product.current_stock > 0 ? `${product.current_stock} disponibles` : 'Sin stock'}
    `.trim();

    if (product.category) {
      message += `\n🗂️ *Categoría:* ${product.category.name}`;
    }

    const buttons = [];

    if (product.current_stock > 0) {
      buttons.push([Markup.button.callback('➕ Agregar al Carrito', `add_to_cart_${product.id}`)]);
    }

    buttons.push([Markup.button.callback('⬅️ Volver al Catálogo', 'show_catalog')]);
    buttons.push([Markup.button.callback('🛒 Ver Carrito', 'view_cart')]);

    if (mainImage) {
      await ctx.replyWithPhoto(mainImage, {
        caption: message,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      });
    }
  }

  private async addToCart(ctx: Context, productId: number) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = await this.sessionManager.getSession(userId);
    if (!session) {
      await ctx.reply('No se encontró la sesión. Por favor abre el catálogo con /catalogo.');
      return;
    }

    const product = await Product.findOne({
      where: { id: productId, store_id: session.storeId },
    });

    if (!product) {
      await ctx.reply('Producto no encontrado.');
      return;
    }

    if (product.current_stock <= 0) {
      await ctx.reply('Lo sentimos, este producto no tiene stock disponible.');
      return;
    }

    await this.sessionManager.addToCart(userId, {
      productId: product.id,
      quantity: 1,
      price: parseFloat(product.price.toString()),
      name: product.name,
    });

    // Metrics
    try { cartAddsCounter.inc(); } catch (e) { }

    const updated = await this.sessionManager.getSession(userId);
    const cartLen = updated?.cart.length || 0;
    const total = (updated?.cart || []).reduce((sum, item) => sum + item.price * item.quantity, 0);

    await ctx.reply(
      `✅ *${product.name}* agregado al carrito.\n\n🛒 Carrito: ${cartLen} producto(s)\n💰 Total: $${total.toFixed(2)}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🛒 Ver Carrito', 'view_cart')],
          [Markup.button.callback('📱 Continuar Comprando', 'show_catalog')],
        ]),
      }
    );
  }

  private async showCart(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = await this.sessionManager.getSession(userId);
    if (!session || session.cart.length === 0) {
      await ctx.reply('Tu carrito está vacío. Explora nuestro catálogo para agregar productos.', {
        ...Markup.inlineKeyboard([[Markup.button.callback('📱 Ver Catálogo', 'show_catalog')]]),
      });
      return;
    }

    let message = '🛒 *Tu Carrito*\n\n';

    session.cart.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   Cantidad: ${item.quantity}\n`;
      message += `   Precio: $${item.price.toFixed(2)} c/u\n`;
      message += `   Subtotal: $${(item.price * item.quantity).toFixed(2)}\n\n`;
    });

    const total = session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    message += `💰 *Total: $${total.toFixed(2)}*`;

    const buttons = session.cart.map((item, index) => [
      Markup.button.callback(`🗑️ Eliminar ${item.name}`, `remove_from_cart_${item.productId}`),
    ]);

    buttons.push([Markup.button.callback('✅ Confirmar Pedido', 'confirm_order')]);
    buttons.push([Markup.button.callback('🗑️ Vaciar Carrito', 'clear_cart')]);
    buttons.push([Markup.button.callback('📱 Seguir Comprando', 'show_catalog')]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  private async removeFromCart(ctx: Context, productId: number) {
    const userId = ctx.from?.id;
    if (!userId) return;

    await this.sessionManager.removeFromCart(userId, productId);

    await this.showCart(ctx);
  }

  private async clearCart(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    await this.sessionManager.clearCart(userId);

    await ctx.reply('🗑️ Carrito vaciado.', {
      ...Markup.inlineKeyboard([[Markup.button.callback('📱 Ver Catálogo', 'show_catalog')]]),
    });
  }

  private async createOrder(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = await this.sessionManager.getSession(userId);
    if (!session || session.cart.length === 0) {
      await ctx.reply('Tu carrito está vacío. Agrega productos antes de realizar un pedido.');
      return;
    }

    const telegramUser = ctx.from;
    const telegramUsername = telegramUser.username || '';
    const telegramName = `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim();

    try {
      // Start transaction
      const result = await sequelize.transaction(async (t: any) => {
        // Find or create customer
        let customer = await Customer.findOne({
          where: { telegram_id: userId.toString(), store_id: session.storeId },
          transaction: t,
        });

        if (!customer) {
          customer = await Customer.create(
            {
              store_id: session.storeId,
              name: telegramName || 'Cliente Telegram',
              telegram_id: userId.toString(),
              telegram_username: telegramUsername,
              phone: '',
              email: '',
            },
            { transaction: t }
          );
        }

        // Persist customer reference in session
        session.customerId = customer.id;
        await this.sessionManager.setSession(userId, session);

        // Calculate total
        const subtotal = session.cart.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        // Create order
        const order = await Order.create(
          {
            store_id: session.storeId,
            customer_id: customer.id,
            subtotal,
            delivery_cost: 0,
            total: subtotal,
            status: 'pending',
            delivery_notes: `Pedido desde Telegram - @${telegramUsername || userId}`,
          },
          { transaction: t }
        );

        // Create order items
        for (const cartItem of session.cart) {
          await OrderItem.create(
            {
              order_id: order.id,
              product_id: cartItem.productId,
              quantity: cartItem.quantity,
              unit_price: cartItem.price,
              subtotal: cartItem.price * cartItem.quantity,
            },
            { transaction: t }
          );

          // Update product stock
          const product = await Product.findByPk(cartItem.productId, { transaction: t });
          if (product) {
            await product.update(
              { current_stock: product.current_stock - cartItem.quantity },
              { transaction: t }
            );
          }
        }

        return { order, customer };
      });

      // Clear cart
      await this.sessionManager.clearCart(userId);

      // Metrics
      try { ordersCounter.inc(); } catch (e) { }

      const confirmMessage = `
✅ *¡Pedido Confirmado!*

📦 *Número de Pedido:* #${result.order.id}
💰 *Total:* $${result.order.total}
📍 *Estado:* Pendiente

Nos pondremos en contacto contigo pronto para confirmar los detalles de entrega.

¡Gracias por tu compra!
      `.trim();

      await ctx.reply(confirmMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📱 Ver Catálogo', 'show_catalog')],
        ]),
      });
    } catch (error) {
      console.error('Error creating order:', error);
      try { botErrorsCounter.inc(); } catch (e) {}
      await ctx.reply(
        '❌ Hubo un error al procesar tu pedido. Por favor intenta nuevamente o contacta con soporte.'
      );
    }
  }

  private async handleAIQuestion(ctx: Context, store: Store, question: string) {
    try {
      // Indicar que está escribiendo
      await ctx.sendChatAction('typing');

      // Usar AIService para sugerir productos
      const recommendation = await AIService.suggestProducts(question, store.id);

      // Enviar el mensaje de respuesta
      await ctx.reply(recommendation.message, { parse_mode: 'Markdown' });

      // Si hay productos recomendados, mostrarlos
      if (recommendation.productIds.length > 0) {
        const products = await Product.findAll({
          where: { id: recommendation.productIds, store_id: store.id },
          include: [{ model: Category, as: 'category' }],
        });

        for (const product of products) {
          await this.showProductDetail(ctx, store, product.id);
        }
      } else {
        // Si no hay productos, ofrecer ver el catálogo completo
        await ctx.reply('¿Te gustaría ver nuestro catálogo completo?', {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📱 Ver Catálogo', 'show_catalog')],
            [Markup.button.callback('🗂️ Ver por Categorías', 'show_categories')],
          ]),
        });
      }
    } catch (error) {
      console.error('Error with AI response:', error);
      try { botErrorsCounter.inc(); } catch (e) {}
      await ctx.reply(
        'Disculpa, tuve un problema al procesar tu pregunta. Usa /catalogo para ver nuestros productos o /ayuda para más información.',
        {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📱 Ver Catálogo', 'show_catalog')],
          ]),
        }
      );
    }
  }

  async stopAllBots() {
    for (const [storeId, bot] of this.bots) {
      await bot.stop();
      console.log(`🛑 Bot stopped for store ID: ${storeId}`);
    }
    this.bots.clear();
    // Clear sessions in Redis (careful: this removes all user sessions)
    const keys = await (await import('../config/redis')).redis.keys('session:user:*');
    if (keys.length > 0) {
      await (await import('../config/redis')).redis.del(...keys);
    }
  }
}

export default new TelegramBotService();
