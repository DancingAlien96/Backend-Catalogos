import { Request, Response } from 'express';
import { Store, Product, Category } from '../models';

export class PublicController {
  // POST /api/public/signup - Crear tienda y usuario (public)
  static async signup(req: Request, res: Response) {
    try {
      const { email, password, store_name, slug } = req.body as {
        email: string;
        password: string;
        store_name: string;
        slug?: string;
      };

      if (!email || !password || !store_name) {
        return res.status(400).json({ error: 'email, password y store_name son requeridos' });
      }

      // Check existing user
      const { User, Plan } = await import('../models');
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      // Find or create free plan
      let freePlan = await Plan.findOne({ where: { slug: 'free' } });
      if (!freePlan) {
        freePlan = await Plan.create({
          name: 'Free',
          slug: 'free',
          description: 'Plan gratuito con límite de 15 productos',
          price: 0,
          product_limit: 15,
        });
      }

      // Create user
      const bcrypt = (await import('bcrypt')).default;
      const password_hash = await bcrypt.hash(password, 10);
      const user = await User.create({ email, password_hash, name: email.split('@')[0] });

      // Build slug and ensure unique
      const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let finalSlug = slug ? slugify(slug) : slugify(store_name);
      // Ensure unique by appending suffix if needed
      let suffix = 0;
      while (await Store.findOne({ where: { slug: finalSlug } })) {
        suffix += 1;
        finalSlug = `${slugify(store_name)}-${suffix}`;
      }

      // Generate API credentials
      const { randomBytes } = await import('crypto');
      const api_key = 'mk_' + randomBytes(24).toString('hex');
      const api_secret = 'sk_' + randomBytes(24).toString('hex');

      // Create store with free plan
      const store = await Store.create({
        user_id: user.id,
        plan_id: freePlan.id,
        name: store_name,
        slug: finalSlug,
        description: '',
        api_key,
        api_secret,
        subscription_status: 'trial',
        is_active: true,
      });

      res.status(201).json({
        message: 'Tienda creada',
        api_key,
        api_secret,
        store: { id: store.id, slug: store.slug, name: store.name },
      });
    } catch (error) {
      console.error('Error en signup público:', error);
      res.status(500).json({ error: 'Error al crear tienda' });
    }
  }

  // GET /api/public/plans - Listar planes disponibles
  static async getPlans(req: Request, res: Response) {
    try {
      const { Plan } = await import('../models');
      const plans = await Plan.findAll({ order: [['price', 'ASC']] });
      res.json({ plans });
    } catch (error) {
      console.error('Error al obtener planes:', error);
      res.status(500).json({ error: 'Error al obtener planes' });
    }
  }

  // GET /api/public/catalog/:slug - Obtener catálogo público por slug
  static async getCatalog(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      // Buscar tienda por slug
      const store = await Store.findOne({
        where: { slug },
        attributes: ['id', 'name', 'slug', 'description'],
      });

      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }

      // Obtener categorías activas
      const categories = await Category.findAll({
        where: {
          store_id: store.id,
          is_active: true,
        },
        attributes: ['id', 'name', 'slug', 'description', 'display_order'],
        order: [['display_order', 'ASC'], ['name', 'ASC']],
      });

      // Obtener productos activos
      const products = await Product.findAll({
        where: {
          store_id: store.id,
          is_active: true,
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      // Serializar productos para convertir JSON fields
      const serializedProducts = products.map(p => p.toJSON());

      res.json({
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          description: store.description,
        },
        categories,
        products: serializedProducts,
      });
    } catch (error) {
      console.error('Error al obtener catálogo público:', error);
      res.status(500).json({ error: 'Error al obtener catálogo' });
    }
  }

  // GET /api/public/catalog/:slug/product/:productId - Obtener producto público
  static async getProduct(req: Request, res: Response) {
    try {
      const { slug, productId } = req.params;

      // Buscar tienda por slug
      const store = await Store.findOne({
        where: { slug },
        attributes: ['id', 'name', 'slug'],
      });

      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }

      // Obtener producto
      const product = await Product.findOne({
        where: {
          id: productId,
          store_id: store.id,
          is_active: true,
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug'],
          },
        ],
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json({
        store: {
          name: store.name,
          slug: store.slug,
        },
        product: product.toJSON(),
      });
    } catch (error) {
      console.error('Error al obtener producto público:', error);
      res.status(500).json({ error: 'Error al obtener producto' });
    }
  }

  // GET /api/public/catalog/:slug/category/:categorySlug - Productos por categoría
  static async getProductsByCategory(req: Request, res: Response) {
    try {
      const { slug, categorySlug } = req.params;

      // Buscar tienda por slug
      const store = await Store.findOne({
        where: { slug },
        attributes: ['id', 'name', 'slug'],
      });

      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }

      // Buscar categoría por slug
      const category = await Category.findOne({
        where: {
          store_id: store.id,
          slug: categorySlug,
          is_active: true,
        },
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      // Obtener productos de la categoría
      const products = await Product.findAll({
        where: {
          store_id: store.id,
          category_id: category.id,
          is_active: true,
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      const serializedProducts = products.map(p => p.toJSON());

      res.json({
        store: {
          name: store.name,
          slug: store.slug,
        },
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
        },
        products: serializedProducts,
      });
    } catch (error) {
      console.error('Error al obtener productos por categoría:', error);
      res.status(500).json({ error: 'Error al obtener productos' });
    }
  }
}
