import { Router } from 'express';
import { PublicController } from '../controllers/PublicController';

const router = Router();

// Rutas públicas - NO requieren autenticación
router.get('/catalog/:slug', PublicController.getCatalog);
router.get('/catalog/:slug/product/:productId', PublicController.getProduct);
router.get('/catalog/:slug/category/:categorySlug', PublicController.getProductsByCategory);
router.post('/signup', PublicController.signup);
router.get('/plans', PublicController.getPlans);

export default router;
