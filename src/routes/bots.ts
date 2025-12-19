import { Router } from 'express';
import { BotManagementController } from '../controllers/BotManagementController';
import { authenticateStore } from '../middleware/auth';

const router = Router();

// Rutas públicas de administración (sin autenticación - solo para admin)
// En producción deberías agregar un middleware de autenticación de admin

// Obtener estado de todos los bots
router.get('/status', BotManagementController.getAllBotsStatus);

// Obtener estado de un bot específico
router.get('/status/:storeId', BotManagementController.getBotStatus);

// Iniciar bot de una tienda
router.post('/start/:storeId', BotManagementController.startBot);

// Detener bot de una tienda
router.post('/stop/:storeId', BotManagementController.stopBot);

// Reiniciar bot de una tienda
router.post('/restart/:storeId', BotManagementController.restartBot);

// Rutas autenticadas por tienda

// Actualizar bot_token de la tienda autenticada
router.put('/token', authenticateStore, BotManagementController.updateBotToken);

export default router;
