import { Request, Response } from 'express';
import { Product, Category, Store, Plan } from '../models';
import { AuthRequest } from '../middleware/auth';

export class ProductController {
  // GET /api/products - Listar productos
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const products = await Product.findAll({
        where: { store_id: req.storeId },
        order: [['created_at', 'DESC']],
        raw: false,
      });

      // Serializar productos para asegurar que JSON se parsee correctamente
      const serialized = products.map(p => p.toJSON());

      res.json({ products: serialized });
    } catch (error) {
      console.error('Error al listar productos:', error);
      res.status(500).json({ error: 'Error al obtener productos' });
    }
  }

  // GET /api/products/:id - Obtener un producto
  static async getOne(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const product = await Product.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
        include: [
          {
            model: Category,
            as: 'category',
          },
        ],
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json(product);
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({ error: 'Error al obtener producto' });
    }
  }

  // POST /api/products - Crear producto
  static async create(req: AuthRequest, res: Response) {
    try {
      const {
        name,
        sku,
        description,
        cost_price,
        price,
        category_id,
        variants,
        images,
        current_stock,
        min_stock_alert,
      } = req.body;

      // Obtener tienda y plan para validar límite de productos
      const store = await Store.findByPk(req.storeId!, { include: [Plan] });
      if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

      const plan: any = (store as any).plan;
      if (plan && plan.product_limit !== null && typeof plan.product_limit !== 'undefined') {
        const currentCount = await Product.count({ where: { store_id: req.storeId } });
        if (currentCount >= plan.product_limit) {
          return res.status(403).json({ error: `Límite de productos alcanzado para el plan actual (${plan.product_limit})` });
        }
      }

      const product = await Product.create({
        store_id: req.storeId!,
        name,
        sku,
        description,
        cost_price: cost_price || 0,
        price,
        category_id,
        variants,
        images,
        current_stock: current_stock || 0,
        min_stock_alert: min_stock_alert || 5,
      });

      res.status(201).json({
        message: 'Producto creado exitosamente',
        productId: product.id,
      });
    } catch (error: any) {
      console.error('Error al crear producto:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'El SKU ya existe' });
      }
      
      res.status(500).json({ error: 'Error al crear producto' });
    }
  }

  // PUT /api/products/:id - Actualizar producto
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        cost_price,
        price,
        category_id,
        variants,
        images,
        current_stock,
        min_stock_alert,
        is_active,
      } = req.body;

      const product = await Product.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      await product.update({
        name,
        description,
        cost_price,
        price,
        category_id,
        variants,
        images,
        current_stock,
        min_stock_alert,
        is_active,
      });

      res.json({ message: 'Producto actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({ error: 'Error al actualizar producto' });
    }
  }

  // DELETE /api/products/:id - Eliminar producto (soft delete)
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const product = await Product.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      await product.update({ is_active: false });

      res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error al eliminar producto' });
    }
  }
}
