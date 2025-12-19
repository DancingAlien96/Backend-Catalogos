import { Router } from 'express';
import { authenticateStore } from '../middleware/auth';
import { CategoryController } from '../controllers/CategoryController';

const router = Router();

router.get('/', authenticateStore, CategoryController.getAll);
router.get('/:id', authenticateStore, CategoryController.getOne);
router.post('/', authenticateStore, CategoryController.create);
router.put('/:id', authenticateStore, CategoryController.update);
router.delete('/:id', authenticateStore, CategoryController.delete);

export default router;
