import { Request, Response } from 'express';
import TelegramBotService from '../services/TelegramBotService';
import { Store } from '../models/Store';

export class BotManagementController {
  // Iniciar bot de una tienda
  static async startBot(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const result = await TelegramBotService.startBot(parseInt(storeId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Error in startBot:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Detener bot de una tienda
  static async stopBot(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const result = await TelegramBotService.stopBot(parseInt(storeId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Error in stopBot:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Reiniciar bot de una tienda
  static async restartBot(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const result = await TelegramBotService.restartBot(parseInt(storeId));

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Error in restartBot:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Obtener estado de todos los bots
  static async getAllBotsStatus(req: Request, res: Response) {
    try {
      const status = await TelegramBotService.getBotStatus();

      // Enriquecer con información de las tiendas
      const enrichedStatus = await Promise.all(
        status.map(async (botStatus) => {
          const store = await Store.findByPk(botStatus.storeId, {
            attributes: ['id', 'name', 'slug', 'bot_token'],
          });

          return {
            ...botStatus,
            storeName: store?.name || 'Unknown',
            storeSlug: store?.slug || 'unknown',
            hasBotToken: !!store?.bot_token,
          };
        })
      );

      return res.status(200).json({
        success: true,
        bots: enrichedStatus,
      });
    } catch (error: any) {
      console.error('Error in getAllBotsStatus:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Obtener estado de un bot específico
  static async getBotStatus(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const isRunning = TelegramBotService.isBotRunning(parseInt(storeId));

      const store = await Store.findByPk(storeId, {
        attributes: ['id', 'name', 'slug', 'bot_token', 'is_active'],
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found',
        });
      }

      return res.status(200).json({
        success: true,
        bot: {
          storeId: store.id,
          storeName: store.name,
          storeSlug: store.slug,
          isRunning,
          hasBotToken: !!store.bot_token,
          isStoreActive: store.is_active,
        },
      });
    } catch (error: any) {
      console.error('Error in getBotStatus:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // Actualizar bot_token de una tienda y reiniciar el bot
  static async updateBotToken(req: Request, res: Response) {
    try {
      const storeId = (req as any).storeId; // De authenticateStore middleware
      const { bot_token } = req.body;

      if (!bot_token) {
        return res.status(400).json({
          success: false,
          message: 'bot_token is required',
        });
      }

      const store = await Store.findByPk(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found',
        });
      }

      // Detener el bot actual si está corriendo
      if (TelegramBotService.isBotRunning(storeId)) {
        await TelegramBotService.stopBot(storeId);
      }

      // Actualizar el token
      await store.update({ bot_token });

      // Iniciar el bot con el nuevo token
      const result = await TelegramBotService.startBot(storeId);

      return res.status(200).json({
        success: true,
        message: 'Bot token updated successfully',
        bot: result,
      });
    } catch (error: any) {
      console.error('Error in updateBotToken:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}
