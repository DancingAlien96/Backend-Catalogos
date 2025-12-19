import { Router } from 'express';
import { authenticateStore } from '../middleware/auth';
import { CustomerController } from '../controllers/CustomerController';

const router = Router();

router.get('/', authenticateStore, CustomerController.getAll);
router.get('/:id', authenticateStore, CustomerController.getOne);
router.post('/', authenticateStore, CustomerController.createOrUpdate);
router.put('/:id', authenticateStore, CustomerController.update);

export default router;
