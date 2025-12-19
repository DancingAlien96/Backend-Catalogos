import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadOptions {
  folder: string;
  public_id?: string;
  transformation?: any[];
}

/**
 * Sube una imagen a Cloudinary
 * @param file Buffer de la imagen
 * @param options Opciones de upload (folder, public_id, etc)
 */
export const uploadImage = async (
  file: Express.Multer.File,
  options: UploadOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: options.folder,
      resource_type: 'auto',
      // Transformaciones automáticas para optimizar
      transformation: options.transformation || [
        { width: 800, height: 800, crop: 'limit' }, // Máximo 800x800
        { quality: 'auto:good' }, // Calidad automática
        { fetch_format: 'auto' }, // Formato automático (WebP en navegadores compatibles)
      ],
    };

    if (options.public_id) {
      uploadOptions.public_id = options.public_id;
    }

    // Upload desde buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result!.secure_url);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * Elimina una imagen de Cloudinary
 * @param publicId El public_id de la imagen (sin extensión)
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error);
    throw error;
  }
};

/**
 * Extrae el public_id de una URL de Cloudinary
 * @param url URL completa de Cloudinary
 */
export const getPublicIdFromUrl = (url: string): string | null => {
  try {
    // Ejemplo: https://res.cloudinary.com/dxcj3eztn/image/upload/v1234567890/mercysales-demo/products/imagen.jpg
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Obtener todo después de 'upload/vXXXXXXXXX/'
    const pathParts = parts.slice(uploadIndex + 2); // Salta 'upload' y la versión
    const fullPath = pathParts.join('/');
    
    // Remover extensión
    return fullPath.replace(/\.[^/.]+$/, '');
  } catch (error) {
    console.error('Error al extraer public_id:', error);
    return null;
  }
};

export default cloudinary;
