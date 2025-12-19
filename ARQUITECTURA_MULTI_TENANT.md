# 🏪 Sistema Multi-Tenant: Cómo Funcionan los Bots por Tienda

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVIDOR BACKEND (Puerto 3000)                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │            TelegramBotService (Gestor Central)              │ │
│  │                                                              │ │
│  │  • Carga TODAS las tiendas activas de la BD                │ │
│  │  • Crea un bot independiente para CADA tienda              │ │
│  │  • Mantiene sesiones separadas por usuario/tienda          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │   Bot Tienda 1   │  │   Bot Tienda 2   │  │  Bot Tienda 3  │ │
│  │                  │  │                  │  │                │ │
│  │ Token: ABC123... │  │ Token: XYZ789... │  │ Token: DEF456..│ │
│  │ Store ID: 1      │  │ Store ID: 2      │  │ Store ID: 3    │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────┘ │
│           │                     │                     │          │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
   │ @mercysales_bot│   │ @zapateria_bot │   │  @ropa_bot     │
   │                │   │                │   │                │
   │ Clientes de    │   │ Clientes de    │   │ Clientes de    │
   │ MercySales     │   │ Zapatería Juan │   │ Ropa María     │
   └────────────────┘   └────────────────┘   └────────────────┘
```

## 🔐 Cómo se Identifica Cada Tienda

### 1️⃣ **Cada Tienda Tiene su Propio Bot**

**Tabla `stores` en la Base de Datos:**

| id | name           | slug            | bot_token              | is_active |
|----|----------------|-----------------|------------------------|-----------|
| 1  | MercySales     | mercysales-demo | 7782781847:AAET9fq...  | true      |
| 2  | Zapatería Juan | zapateria-juan  | 9988776655:BBF9gh...   | true      |
| 3  | Ropa María     | ropa-maria      | 5544332211:CCG8ij...   | true      |

### 2️⃣ **Cuando Inicias el Sistema**

```typescript
// src/scripts/startBots.ts
await TelegramBotService.initializeAllBots();
```

**Lo que sucede internamente:**

```typescript
// 1. Busca TODAS las tiendas activas
const stores = await Store.findAll({ where: { is_active: true } });

// 2. Para CADA tienda, crea su propio bot
for (const store of stores) {
  if (store.bot_token) {
    // Crea bot independiente con el token de ESA tienda
    const bot = new Telegraf(store.bot_token);
    
    // Guarda el storeId en la sesión del usuario
    bot.use((ctx, next) => {
      session.storeId = store.id; // ← AQUÍ se identifica la tienda
      return next();
    });
    
    // Registra comandos específicos para ESA tienda
    setupCommands(bot, store);
    
    // Inicia el bot
    await bot.launch();
  }
}
```

### 3️⃣ **Cuando un Cliente Usa el Bot**

**Ejemplo: Cliente habla con @mercysales_bot**

```
Cliente: /start
         ↓
Bot de MercySales (Token: 7782781847:AAET9fq...)
         ↓
session.storeId = 1 (MercySales)
         ↓
Busca productos WHERE store_id = 1
         ↓
Muestra solo productos de MercySales
```

**Ejemplo: Otro cliente habla con @zapateria_bot**

```
Cliente: /start
         ↓
Bot de Zapatería Juan (Token: 9988776655:BBF9gh...)
         ↓
session.storeId = 2 (Zapatería Juan)
         ↓
Busca productos WHERE store_id = 2
         ↓
Muestra solo productos de Zapatería Juan
```

### 4️⃣ **Cuando se Crea una Orden**

```typescript
// El sistema siempre usa el storeId de la sesión
const order = await Order.create({
  store_id: session.storeId,  // ← Asocia la orden a la tienda correcta
  customer_id: customer.id,
  total: total,
  // ...
});
```

## 🎯 Ventajas de Este Sistema

✅ **Aislamiento Total**
- Cada tienda tiene su propio bot
- Los productos, clientes y pedidos NUNCA se mezclan
- Cada dueño solo ve sus propios datos

✅ **Escalabilidad**
- Puedes tener 1 tienda o 1000 tiendas
- Cada una funciona independientemente
- El servidor maneja todos los bots desde un solo proceso

✅ **Personalización**
- Cada tienda puede tener su propio nombre de bot
- Mensajes personalizados (usando `store.name`)
- Catálogo completamente independiente

## 📝 Pasos para Agregar una Nueva Tienda

### Ejemplo: Juan quiere crear su zapatería

1. **Juan crea su bot en Telegram:**
   - Habla con @BotFather
   - Envía `/newbot`
   - Nombre: "Zapatería Juan Bot"
   - Username: `@zapateria_juan_bot`
   - Recibe token: `9988776655:BBF9gh1ps2...`

2. **Juan se registra en tu plataforma** (frontend web)

3. **El sistema crea su tienda** (tabla `stores`):
   ```sql
   INSERT INTO stores (user_id, name, slug, bot_token) 
   VALUES (2, 'Zapatería Juan', 'zapateria-juan', '9988776655:BBF9gh1ps2...');
   ```

4. **Juan agrega sus productos** usando el dashboard

5. **Reinicia el servidor de bots**:
   ```bash
   npm run dev:bots
   ```

6. **El sistema detecta automáticamente** la nueva tienda y crea su bot

7. **Los clientes de Juan** ahora pueden usar `@zapateria_juan_bot`

## 🔄 Flujo Completo de un Pedido

```
Usuario en Telegram                  Backend                      Base de Datos
──────────────────                  ───────                      ─────────────

/start en @mercysales_bot
         │
         ├─────────────────────►  Bot Token: 7782781847...
                                          │
                                  session.storeId = 1
                                          │
/catalogo                                 │
         │                                │
         ├─────────────────────►  Product.findAll({
                                    where: { store_id: 1 }
                                  })
                                          │
         ◄─────────────────────┤  Productos de MercySales
Muestra productos                         │
         │                                │
Click "Agregar al carrito"                │
         │                                │
         ├─────────────────────►  session.cart.push({
                                    productId: 5,
                                    storeId: 1,
                                    ...
                                  })
                                          │
/orden                                    │
         │                                │
         ├─────────────────────►  Order.create({
                                    store_id: 1,  ← MercySales
                                    customer_id: 123,
                                    total: 150
                                  })
                                          │
                                          ├────────────────►  INSERT INTO orders
                                          │                   (store_id=1, ...)
                                          │
         ◄─────────────────────┤  Orden #45 confirmada
Confirmación enviada
```

## 🚀 Tu Bot Está Configurado

**Token configurado:** `7782781847:AAET9fq1psU3V08s2TRU2ofXW0JfU3va6fo`

**Para iniciar tu bot:**

```powershell
cd "C:\Users\cristofer perez\Documents\backend-catalogos.com"
npm run dev:bots
```

**Luego busca tu bot en Telegram** y envía `/start` para probarlo!

## ⚠️ Importante

- **Cada tienda = Un bot diferente**: No intentes usar el mismo token para múltiples tiendas
- **Tokens son secretos**: Nunca los compartas públicamente (¡ups, ya lo hiciste! 😅 - considera regenerar el token en @BotFather)
- **Base de datos**: Todos los datos se separan automáticamente por `store_id`
