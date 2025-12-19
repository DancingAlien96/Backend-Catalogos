import { Router } from 'express';
import { authenticateStore } from '../middleware/auth';
import { OrderController } from '../controllers/OrderController';

const router = Router();

router.get('/', authenticateStore, OrderController.getAll);
router.get('/:id', authenticateStore, OrderController.getOne);
router.post('/', authenticateStore, OrderController.create);
router.patch('/:id/status', authenticateStore, OrderController.updateStatus);

export default router;
