-- Base de datos Catalogos.com
-- Multi-tenant con una sola instancia
DROP DATABASE IF EXISTS catalogos_bd;
CREATE DATABASE catalogos_bd;
USE catalogos_bd;
-- Usuarios de la plataforma
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Planes
CREATE TABLE IF NOT EXISTS plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  product_limit INT DEFAULT NULL,
  features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tiendas
CREATE TABLE IF NOT EXISTS stores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plan_id INT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  
  -- API credentials
  api_key VARCHAR(64) UNIQUE NOT NULL,
  api_secret VARCHAR(64) NOT NULL,
  
  -- Bot de Telegram
  bot_token VARCHAR(255),
  bot_username VARCHAR(100),
  
  -- Suscripción
  subscription_status ENUM('trial', 'active', 'paused', 'cancelled') DEFAULT 'trial',
  trial_ends_at TIMESTAMP NULL,
  
  -- Configuraciones
  settings JSON,
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_slug (slug),
  INDEX idx_api_key (api_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categorías
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL,
  parent_id INT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE KEY unique_store_slug (store_id, slug),
  INDEX idx_store (store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Productos (basado en tu Notion)
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  category_id INT NULL,
  
  -- Información básica
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  description TEXT,
  
  -- Precios
  cost_price DECIMAL(10, 2) DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  
  -- Inventario
  initial_stock INT DEFAULT 0,
  current_stock INT DEFAULT 0,
  min_stock_alert INT DEFAULT 5,
  
  -- Multimedia
  images JSON,
  
  -- Variantes (tallas, colores)
  has_variants BOOLEAN DEFAULT FALSE,
  variants JSON,
  
  -- Estadísticas
  total_sold INT DEFAULT 0,
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE KEY unique_store_sku (store_id, sku),
  INDEX idx_store (store_id),
  INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clientes
CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  telegram_id BIGINT,
  name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  UNIQUE KEY unique_store_telegram (store_id, telegram_id),
  INDEX idx_store (store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  customer_id INT NULL,
  order_number VARCHAR(50) NOT NULL,

  status ENUM('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_cost DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  shipping DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  delivery_address TEXT,
  delivery_phone VARCHAR(50),
  delivery_name VARCHAR(255),
  delivery_notes TEXT,
  
  payment_method VARCHAR(50),
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  UNIQUE KEY unique_store_order (store_id, order_number),
  INDEX idx_store (store_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items de pedidos
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NULL,
  
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  variant_info JSON,
  
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversaciones del bot
CREATE TABLE IF NOT EXISTS conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  customer_id INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_store_customer (store_id, customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers para actualizar stock
DELIMITER $$

CREATE TRIGGER after_order_item_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE products 
  SET 
    current_stock = current_stock - NEW.quantity,
    total_sold = total_sold + NEW.quantity
  WHERE id = NEW.product_id;
END$$

CREATE TRIGGER after_order_cancelled
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE products p
    INNER JOIN order_items oi ON oi.product_id = p.id
    SET 
      p.current_stock = p.current_stock + oi.quantity,
      p.total_sold = p.total_sold - oi.quantity
    WHERE oi.order_id = NEW.id;
  END IF;
END$$

DELIMITER ;
