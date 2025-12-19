import { Router } from 'express';
import { authenticateStore } from '../middleware/auth';
import { UploadController, upload } from '../controllers/UploadController';

const router = Router();

// POST /api/upload/product-image - Subir una imagen
router.post(
  '/product-image',
  authenticateStore,
  upload.single('image'),
  UploadController.uploadProductImage
);

// POST /api/upload/product-images - Subir múltiples imágenes
router.post(
  '/product-images',
  authenticateStore,
  upload.array('images', 5), // Máximo 5 imágenes
  UploadController.uploadProductImages
);

export default router;
