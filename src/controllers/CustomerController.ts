import { Request, Response } from 'express';
import { Customer } from '../models';
import { AuthRequest } from '../middleware/auth';

export class CustomerController {
  // GET /api/customers - Listar clientes
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const customers = await Customer.findAll({
        where: { store_id: req.storeId },
        order: [['created_at', 'DESC']],
      });

      res.json({ customers });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ error: 'Error al obtener clientes' });
    }
  }

  // GET /api/customers/:id - Obtener un cliente
  static async getOne(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const customer = await Customer.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json(customer);
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({ error: 'Error al obtener cliente' });
    }
  }

  // POST /api/customers - Crear o actualizar cliente
  static async createOrUpdate(req: AuthRequest, res: Response) {
    try {
      const { telegram_id, name, phone, address, email, notes } = req.body;

      if (!telegram_id) {
        return res.status(400).json({ error: 'telegram_id es requerido' });
      }

      // Buscar si existe
      const existingCustomer = await Customer.findOne({
        where: {
          store_id: req.storeId,
          telegram_id,
        },
      });

      if (existingCustomer) {
        // Actualizar
        await existingCustomer.update({
          name,
          phone,
          address,
          email,
          notes,
        });

        return res.json({
          message: 'Cliente actualizado',
          customerId: existingCustomer.id,
        });
      } else {
        // Crear nuevo
        const customer = await Customer.create({
          store_id: req.storeId!,
          telegram_id,
          name,
          phone,
          address,
          email,
          notes,
        });

        return res.status(201).json({
          message: 'Cliente creado',
          customerId: customer.id,
        });
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      res.status(500).json({ error: 'Error al guardar cliente' });
    }
  }

  // PUT /api/customers/:id - Actualizar cliente
  static async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, address, email, notes } = req.body;

      const customer = await Customer.findOne({
        where: {
          id,
          store_id: req.storeId,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      await customer.update({
        name,
        phone,
        address,
        email,
        notes,
      });

      res.json({ message: 'Cliente actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({ error: 'Error al actualizar cliente' });
    }
  }
}
