import { Router } from 'express';
import { authenticateStore } from '../middleware/auth';
import { ProductController } from '../controllers/ProductController';

const router = Router();

router.get('/', authenticateStore, ProductController.getAll);
router.get('/:id', authenticateStore, ProductController.getOne);
router.post('/', authenticateStore, ProductController.create);
router.put('/:id', authenticateStore, ProductController.update);
router.delete('/:id', authenticateStore, ProductController.delete);

export default router;
