# Guía para Configurar el Bot de Telegram

## 📱 Paso 1: Crear el Bot en Telegram

1. Abre Telegram y busca el bot **@BotFather**
2. Inicia una conversación y envía el comando `/newbot`
3. BotFather te pedirá:
   - **Nombre del bot** (ej: "MercySales Bot")
   - **Username del bot** (debe terminar en "bot", ej: "mercysales_bot")
4. Al finalizar, recibirás un **token** como este:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
   ```
5. **Guarda este token** - lo necesitarás para configurar tu tienda

## 🔧 Paso 2: Configurar el Bot Token en tu Tienda

### Opción A: Variables de Entorno (Recomendado)

1. Crea o edita el archivo `.env` en la carpeta `backend-catalogos.com`:
   ```bash
   TELEGRAM_BOT_TOKEN=tu_token_aqui
   ```

2. Ejecuta el seed para crear datos de prueba:
   ```bash
   npm run seed
   ```

### Opción B: Actualizar Directamente en la Base de Datos

Si ya tienes una tienda creada, actualiza el token:

```sql
UPDATE stores 
SET bot_token = 'tu_token_aqui'
WHERE slug = 'mercysales-demo';
```

## 🚀 Paso 3: Iniciar el Bot

### Modo Desarrollo (con recarga automática):

```bash
npm run dev:bots
```

### Modo Producción:

```bash
# Primero compila el TypeScript
npm run build

# Luego inicia los bots
npm run start:bots
```

## ✅ Paso 4: Probar el Bot

1. Busca tu bot en Telegram por su username (ej: `@mercysales_bot`)
2. Inicia la conversación con `/start`
3. Prueba los siguientes comandos:
   - `/catalogo` - Ver todos los productos
   - `/categorias` - Buscar por categoría
   - `/carrito` - Ver tu carrito de compras
   - `/orden` - Confirmar pedido
   - `/ayuda` - Obtener ayuda

## 🛒 Flujo de Compra

1. El usuario envía `/start` para iniciar
2. Explora productos con `/catalogo` o `/categorias`
3. Click en un producto para ver detalles
4. Click en "➕ Agregar al Carrito"
5. Revisa el carrito con `/carrito`
6. Confirma el pedido con "✅ Confirmar Pedido"
7. El sistema:
   - Registra al cliente (o lo encuentra si ya existe)
   - Crea la orden en la base de datos
   - Actualiza el inventario
   - Envía confirmación al usuario

## 🔐 Multi-Tenant

El sistema soporta **múltiples tiendas** con sus propios bots:

- Cada tienda tiene su propio `bot_token` en la tabla `stores`
- Al iniciar los bots, el sistema carga TODAS las tiendas activas
- Cada bot maneja su propia tienda independientemente
- Los pedidos y clientes se asocian automáticamente a cada tienda

## 🎨 Personalización

### Modificar Mensajes de Bienvenida

Edita el archivo: `src/services/TelegramBotService.ts`

Busca el método `setupCommands` y modifica los mensajes según necesites.

### Agregar Nuevos Comandos

1. En `TelegramBotService.ts`, agrega tu comando:
   ```typescript
   bot.command('micomando', async (ctx) => {
     await ctx.reply('Respuesta del comando');
   });
   ```

2. Reinicia el bot

### Configurar Webhook (para Producción)

Por defecto, el bot usa **long polling**. Para usar webhooks en producción:

1. Configura tu dominio con SSL
2. Modifica `initializeBot()` en `TelegramBotService.ts`:
   ```typescript
   await bot.telegram.setWebhook(`https://tudominio.com/bot/${store.id}`);
   ```

## 🐛 Solución de Problemas

### El bot no responde

- Verifica que el token sea correcto
- Confirma que el bot esté iniciado (`npm run dev:bots`)
- Revisa los logs en la consola

### Error "Bot token is invalid"

- El token está mal copiado
- Actualiza el token en `.env` o en la base de datos

### Los productos no se muestran

- Verifica que existan productos con `is_active = true`
- Confirma que los productos tengan stock disponible
- Revisa que las categorías estén activas

### El pedido no se crea

- Revisa los logs del backend
- Verifica la conexión a la base de datos
- Confirma que el usuario tenga productos en el carrito

## 📊 Monitoreo

Los bots registran actividad en la consola:

- `🤖 Bot initialized for store: {nombre}` - Bot iniciado
- `✅ Producto agregado al carrito` - Producto agregado
- `✅ Pedido Confirmado` - Pedido creado exitosamente

## 🔄 Actualizar el Bot

Si modificas el código del bot:

1. Detén los bots (Ctrl+C)
2. Guarda los cambios
3. En desarrollo, nodemon recargará automáticamente
4. En producción, ejecuta:
   ```bash
   npm run build
   npm run start:bots
   ```

## 📝 Notas Importantes

- **Un bot por tienda**: Cada tienda debe tener su propio bot de Telegram
- **Seguridad**: Nunca compartas tu bot token públicamente
- **Límites de Telegram**: Los bots tienen límites de mensajes por segundo
- **Sesiones**: Las sesiones del carrito se mantienen en memoria (se pierden al reiniciar)
- **Stock**: El inventario se actualiza automáticamente al confirmar pedidos
