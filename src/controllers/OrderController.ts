import { Request, Response } from 'express';
import { Order, OrderItem, Customer, Product } from '../models';
import { AuthRequest } from '../middleware/auth';
import { sequelize } from '../config/sequelize';

export class OrderController {
  // GET /api/orders - Listar órdenes
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
      const offset = (page - 1) * limit;

      const { Op } = require('sequelize');
      const where: any = { store_id: req.storeId };
      if (req.query.status) where.status = req.query.status;
      if (req.query.q) {
        const q = (req.query.q as string).trim();
        where[Op.or] = [
          { order_number: { [Op.like]: `%${q}%` } },
          { '$customer.name$': { [Op.like]: `%${q}%` } },
        ];
      }

      const { rows, count } = await Order.findAndCountAll({
        where,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'telegram_id', 'phone'],
          },
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'sku'],
              },
            ],
          },
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      res.json({
        orders: rows,
        meta: { total: count, page, perPage: limit, totalPages: Math.ceil(count / limit) },
      });
    } catch (error) {
      console.error('Error al listar órdenes:', error);
      res.status(500).json({ error: 'Error al obtener órdenes' });
    }
  }

  // GET /api/orders/:id - Obtener una orden
  static async getOne(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const order = await Order.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
        include: [
          {
            model: Customer,
            as: 'customer',
          },
          {
            model: OrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
              },
            ],
          },
        ],
      });

      if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      res.json(order);
    } catch (error) {
      console.error('Error al obtener orden:', error);
      res.status(500).json({ error: 'Error al obtener orden' });
    }
  }

  // POST /api/orders - Crear orden
  static async create(req: AuthRequest, res: Response) {
    const transaction = await sequelize.transaction();

    try {
      const { customer_id, items, delivery_address, delivery_notes, payment_method } = req.body;

      // Validar items
      if (!items || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'La orden debe tener al menos un producto' });
      }

      // Calcular subtotal
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        // Lock the product row for update to avoid race conditions
        const product = await Product.findOne({
          where: {
            id: item.product_id,
            store_id: req.storeId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!product) {
          await transaction.rollback();
          return res.status(404).json({ error: `Producto ${item.product_id} no encontrado` });
        }

        if (product.current_stock < item.quantity) {
          await transaction.rollback();
          return res.status(400).json({
            error: `Stock insuficiente para ${product.name}. Disponible: ${product.current_stock}`,
          });
        }

        const itemSubtotal = product.price * item.quantity;
        subtotal += Number(itemSubtotal);

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          variant_info: item.variant_info || null,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal: itemSubtotal,
        });

        // Reducir stock
        await product.update(
          { current_stock: product.current_stock - item.quantity },
          { transaction }
        );
      }

      // Crear orden
      const orderNumber = `ORD-${Date.now()}`;
      const order = await Order.create(
        {
          store_id: req.storeId!,
          customer_id,
          order_number: orderNumber,
          subtotal,
          delivery_cost: 0,
          total: subtotal,
          delivery_address,
          delivery_notes,
          payment_method,
          status: 'pending',
          payment_status: 'pending',
        },
        { transaction }
      );

      // Crear items de la orden
      for (const item of orderItems) {
        await OrderItem.create(
          {
            order_id: order.id,
            ...item,
          },
          { transaction }
        );
      }

      await transaction.commit();

      res.status(201).json({
        message: 'Orden creada exitosamente',
        orderId: order.id,
        orderNumber: order.order_number,
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error al crear orden:', error);
      res.status(500).json({ error: 'Error al crear orden' });
    }
  }

  // PATCH /api/orders/:id/status - Actualizar estado de orden
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      await order.update({ status });

      res.json({ message: 'Estado actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      res.status(500).json({ error: 'Error al actualizar estado' });
    }
  }
}
