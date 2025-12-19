import { Response } from 'express';
import { Category } from '../models';
import { AuthRequest } from '../middleware/auth';

export class CategoryController {
  // GET /api/categories - Listar categorías
  static async getAll(req: AuthRequest, res: Response) {
    try {
      console.log('📂 CategoryController.getAll - storeId:', req.storeId);
      console.log('📂 CategoryController.getAll - store:', req.store);
      
      const categories = await Category.findAll({
        where: { store_id: req.storeId },
        order: [['display_order', 'ASC'], ['name', 'ASC']],
      });

      res.json({ categories });
    } catch (error) {
      console.error('Error al listar categorías:', error);
      res.status(500).json({ error: 'Error al listar categorías' });
    }
  }

  // GET /api/categories/:id - Obtener una categoría
  static async getOne(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const category = await Category.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      res.json({ category });
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      res.status(500).json({ error: 'Error al obtener categoría' });
    }
  }

  // POST /api/categories - Crear categoría
  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, description, slug, display_order } = req.body;

      const category = await Category.create({
        store_id: req.storeId!,
        name,
        description,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        display_order: display_order || 0,
      });

      res.status(201).json({ category, message: 'Categoría creada exitosamente' });
    } catch (error: any) {
      console.error('Error al crear categoría:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'El slug ya existe para esta tienda' });
      }
      res.status(500).json({ error: 'Error al crear categoría' });
    }
  }

  // PUT /api/categories/:id - Actualizar categoría
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, slug, display_order, is_active } = req.body;

      const category = await Category.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      await category.update({
        name,
        description,
        slug,
        display_order,
        is_active,
      });

      res.json({ category, message: 'Categoría actualizada exitosamente' });
    } catch (error: any) {
      console.error('Error al actualizar categoría:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'El slug ya existe para esta tienda' });
      }
      res.status(500).json({ error: 'Error al actualizar categoría' });
    }
  }

  // DELETE /api/categories/:id - Eliminar categoría (soft delete)
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const category = await Category.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      await category.update({ is_active: false });

      res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({ error: 'Error al eliminar categoría' });
    }
  }
}
