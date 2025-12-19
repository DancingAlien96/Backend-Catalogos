# Backend Catalogos.com

Backend API para plataforma SaaS multi-tenant de tiendas online con bots de Telegram integrados.

## Características

- 🏪 Multi-tenant: Una instancia para miles de tiendas
- 🤖 Bot de Telegram por tienda con IA (GPT-4o Vision)
- 📦 Gestión completa de productos e inventario
- 📋 Sistema de pedidos en tiempo real
- 🔐 Autenticación con API Keys por tienda
- 💾 MySQL con triggers automáticos para stock

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env` y configura tus credenciales (usa `.env.example` como referencia)
2. Crea la base de datos MySQL: `catalogos_saas`
3. Ejecuta las migraciones: `npm run migrate`

### Dependencias adicionales
- **Redis**: Se usa para persistir sesiones y colas de trabajos. Puedes correrlo localmente con Docker:

```bash
# Desde la carpeta del backend
docker-compose up -d redis
```

- **Métricas**: El servidor expone `/metrics` para Prometheus (usa `prom-client`).

### Pruebas de sesión (local)
1. Arranca Redis (ver arriba)
2. Ejecuta:

```bash
npm run test:session
```

Esto probará la creación, adición y borrado de sesiones en Redis.

## Uso

```bash
# Servidor API
npm run dev

# Bot Manager (separado)
npm run dev:bots
```

## API Endpoints

### Productos
- `GET /api/products` - Listar productos (requiere API key)
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Pedidos
- `GET /api/orders` - Listar pedidos
- `POST /api/orders` - Crear pedido
- `PUT /api/orders/:id` - Actualizar pedido

### Clientes
- `GET /api/customers` - Listar clientes
- `POST /api/customers` - Crear cliente

## Estructura

```
src/
├── config/         # Configuración (DB, etc)
├── database/       # Schema SQL y migraciones
├── middleware/     # Auth y validaciones
├── routes/         # Rutas de API
├── controllers/    # Lógica de negocio
├── services/       # Servicios (OpenAI, etc)
├── types/          # TypeScript types
├── server.ts       # Servidor Express
└── bot-manager.ts  # Gestor de bots
```
