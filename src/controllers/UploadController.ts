import { Request, Response } from 'express';
import multer from 'multer';
import { uploadImage } from '../services/CloudinaryService';
import { AuthRequest } from '../middleware/auth';

// Configurar multer para memoria (no guardamos en disco)
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

export class UploadController {
  /**
   * POST /api/upload/product-image
   * Sube una imagen de producto a Cloudinary
   */
  static async uploadProductImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
      }

      // Obtener el slug de la tienda
      const store = req.store;
      if (!store) {
        return res.status(401).json({ error: 'Store no encontrada' });
      }

      // Folder: store-slug/products
      const folder = `${store.slug}/products`;
      
      // Subir a Cloudinary
      const imageUrl = await uploadImage(req.file, { folder });

      res.json({
        message: 'Imagen subida exitosamente',
        url: imageUrl,
      });
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      res.status(500).json({ 
        error: 'Error al subir imagen',
        message: error.message 
      });
    }
  }

  /**
   * POST /api/upload/product-images
   * Sube múltiples imágenes de producto
   */
  static async uploadProductImages(req: AuthRequest, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron imágenes' });
      }

      const store = req.store;
      if (!store) {
        return res.status(401).json({ error: 'Store no encontrada' });
      }

      const folder = `${store.slug}/products`;
      
      // Subir todas las imágenes en paralelo
      const uploadPromises = files.map(file => uploadImage(file, { folder }));
      const urls = await Promise.all(uploadPromises);

      res.json({
        message: `${urls.length} imágenes subidas exitosamente`,
        urls,
      });
    } catch (error: any) {
      console.error('Error al subir imágenes:', error);
      res.status(500).json({ 
        error: 'Error al subir imágenes',
        message: error.message 
      });
    }
  }
}
