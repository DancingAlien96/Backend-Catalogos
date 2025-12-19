import { pool } from '../config/database';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Creando datos de prueba...\n');

  try {
    // 1. Crear usuario de prueba
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const [userResult] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name) 
       VALUES (?, ?, ?, ?)`,
      ['demo@catalogos.com', passwordHash, 'Demo', 'User']
    );
    
    const userId = (userResult as any).insertId;
    console.log('✅ Usuario creado: demo@catalogos.com / password123');

    // 2. Crear planes por defecto (si no existen)
    const [existingPlans] = await pool.query(`SELECT id FROM plans LIMIT 1`);
    let freePlanId: number | null = null;

    if (!((existingPlans as any[]).length > 0)) {
      console.log('🌱 Insertando planes por defecto...');
      const plans = [
        { name: 'Free', slug: 'free', description: 'Plan gratuito con límite de 15 productos', price: 0, product_limit: 15 },
        { name: 'Basic', slug: 'basic', description: 'Plan básico con límite de 100 productos', price: 9.99, product_limit: 100 },
        { name: 'Pro', slug: 'pro', description: 'Plan Pro sin límite de productos', price: 29.99, product_limit: null },
      ];

      for (const p of plans) {
        if (p.product_limit === null) {
          await pool.query(
            'INSERT INTO plans (name, slug, description, price, product_limit) VALUES (?, ?, ?, ?, NULL)',
            [p.name, p.slug, p.description, p.price]
          );
        } else {
          await pool.query(
            'INSERT INTO plans (name, slug, description, price, product_limit) VALUES (?, ?, ?, ?, ?)',
            [p.name, p.slug, p.description, p.price, p.product_limit]
          );
        }
      }

      const [rows] = await pool.query('SELECT id FROM plans WHERE slug = ?', ['free']);
      freePlanId = (rows as any[])[0].id;
    } else {
      const [rows] = await pool.query('SELECT id FROM plans WHERE slug = ?', ['free']);
      if ((rows as any[]).length > 0) freePlanId = (rows as any[])[0].id;
    }

    const apiKey = 'mk_' + randomBytes(24).toString('hex');
    const apiSecret = 'sk_' + randomBytes(24).toString('hex');
    
    // IMPORTANTE: Reemplaza este token con el token real de tu bot de Telegram
    // Obtenlo desde @BotFather en Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7 días trial
    
    const [storeResult] = await pool.query(
      `INSERT INTO stores (
        user_id, plan_id, name, slug, description, api_key, api_secret,
        bot_token, subscription_status, trial_ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        freePlanId,
        'MercySales Demo',
        'mercysales-demo',
        'Tienda de demostración',
        apiKey,
        apiSecret,
        botToken,
        'trial',
        trialEndsAt
      ]
    );
    
    const storeId = (storeResult as any).insertId;
    console.log('✅ Tienda creada: MercySales Demo');
    console.log(`   Slug: mercysales-demo`);
    console.log(`   API Key: ${apiKey}`);
    console.log(`   API Secret: ${apiSecret}`);
    console.log(`   Bot Token: ${botToken ? '***' + botToken.slice(-6) : 'No configurado'}\n`);

    // 3. Crear categorías
    const categories = [
      { name: 'Ropa', slug: 'ropa' },
      { name: 'Zapatos', slug: 'zapatos' },
      { name: 'Accesorios', slug: 'accesorios' }
    ];
    
    const categoryIds: any = {};
    
    for (const cat of categories) {
      const [result] = await pool.query(
        'INSERT INTO categories (store_id, name, slug) VALUES (?, ?, ?)',
        [storeId, cat.name, cat.slug]
      );
      categoryIds[cat.slug] = (result as any).insertId;
    }
    
    console.log('✅ Categorías creadas: Ropa, Zapatos, Accesorios\n');

    // 4. Crear productos de ejemplo
    const products = [
      {
        name: 'Camiseta BOSS',
        sku: 'BOSS-001',
        category: 'ropa',
        description: 'Camiseta blanca con logo bordado',
        cost_price: 50,
        price: 100,
        stock: 25,
        variants: [
          { size: 'S', stock: 5 },
          { size: 'M', stock: 10 },
          { size: 'L', stock: 7 },
          { size: 'XL', stock: 3 }
        ]
      },
      {
        name: 'Pantalón Baggy FUBU',
        sku: 'FUBU-001',
        category: 'ropa',
        description: 'Pantalón baggy estilo urbano',
        cost_price: 80,
        price: 150,
        stock: 15,
        variants: [
          { size: '28', stock: 3 },
          { size: '30', stock: 5 },
          { size: '32', stock: 4 },
          { size: '34', stock: 3 }
        ]
      },
      {
        name: 'Zapatillas Nike Air',
        sku: 'NIKE-001',
        category: 'zapatos',
        description: 'Zapatillas deportivas Nike Air',
        cost_price: 120,
        price: 250,
        stock: 20,
        variants: [
          { size: '7', stock: 4 },
          { size: '8', stock: 6 },
          { size: '9', stock: 5 },
          { size: '10', stock: 5 }
        ]
      },
      {
        name: 'Gorra New Era',
        sku: 'CAP-001',
        category: 'accesorios',
        description: 'Gorra ajustable New Era',
        cost_price: 25,
        price: 60,
        stock: 30,
        variants: []
      }
    ];

    for (const product of products) {
      await pool.query(
        `INSERT INTO products (
          store_id, category_id, name, sku, description,
          cost_price, price, initial_stock, current_stock,
          has_variants, variants
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          storeId,
          categoryIds[product.category],
          product.name,
          product.sku,
          product.description,
          product.cost_price,
          product.price,
          product.stock,
          product.stock,
          product.variants.length > 0,
          JSON.stringify(product.variants)
        ]
      );
      console.log(`✅ Producto creado: ${product.name}`);
    }

    console.log('\n🎉 Datos de prueba creados exitosamente!\n');
    console.log('📝 Guarda estas credenciales:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Usuario Web:');
    console.log('  Email: demo@catalogos.com');
    console.log('  Password: password123');
    console.log('');
    console.log('Credenciales API:');
    console.log(`  API Key: ${apiKey}`);
    console.log(`  API Secret: ${apiSecret}`);
    console.log('');
    console.log('Prueba la API:');
    console.log(`  curl -H "X-API-Key: ${apiKey}" http://localhost:3000/api/products`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando datos:', error);
    process.exit(1);
  }
}

seed();
