import { Request, Response, NextFunction } from 'express';
import { Store } from '../models';

declare global {
  namespace Express {
    interface Request {
      storeId?: number;
      store?: any;
    }
  }
}

// Type export
export interface AuthRequest extends Request {
  storeId?: number;
  store?: any;
}

/**
 * Middleware de autenticación por API Key
 * Identifica la tienda y valida que esté activa
 */
export async function authenticateStore(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    console.log('📩 Headers recibidos:', req.headers);
    console.log('🔑 API Key extraído:', apiKey);

    if (!apiKey) {
      console.log('❌ No se encontró API key en el header');
      return res.status(401).json({ 
        error: 'API key requerida',
        message: 'Incluye el header X-API-Key con tu API key' 
      });
    }

    // Try to find store by API key
    let store = await Store.findOne({
      where: { 
        api_key: apiKey,
        is_active: true 
      },
      attributes: ['id', 'user_id', 'name', 'slug', 'subscription_status', 'is_active', 'settings'],
    });

    // Development fallback: if running locally and the provided API key is the default dev key
    // allow mapping to the demo store (helps frontend default key to work without seeding)
    const DEV_KEYS = [process.env.DEV_API_KEY, process.env.DEFAULT_API_KEY || 'mk_e8724f3186c5e7ce40f479b0420c14cfaf273cbaacb5c325'];
    if (!store && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) && DEV_KEYS.includes(apiKey)) {
      console.log('⚠️ No se encontró store por API key; aplicando fallback de desarrollo para demo store');
      store = await Store.findOne({ where: { slug: 'mercysales-demo', is_active: true }, attributes: ['id', 'user_id', 'name', 'slug', 'subscription_status', 'is_active', 'settings'] });
      if (store) console.log('🏪 Store fallback encontrado:', store.name);
    }
    
    console.log('🏪 Store encontrado:', store ? store.name : 'null');
    
    if (!store) {
      console.log('❌ API key inválida o tienda inactiva');
      return res.status(401).json({ 
        error: 'API key inválida'
      });
    }
    
    // Validar suscripción
    if (store.subscription_status === 'paused' || store.subscription_status === 'cancelled') {
      return res.status(403).json({
        error: 'Suscripción inactiva',
        message: 'Renueva tu plan para continuar'
      });
    }
    
    req.storeId = store.id;
    req.store = store.toJSON();
    
    next();
  } catch (error) {
    console.error('Error en authenticateStore:', error);
    return res.status(500).json({ error: 'Error de autenticación' });
  }
}
