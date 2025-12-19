import { Request, Response } from 'express';
import { Store, Product, Category } from '../models';

export class PublicController {
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
