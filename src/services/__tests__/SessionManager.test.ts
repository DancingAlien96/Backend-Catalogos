import SessionManager from '../SessionManager';

// Mock redis client by mocking the config/redis module
jest.mock('../../../src/config/redis', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      get: async (k: string) => store.get(k) || null,
      set: async (k: string, v: string) => { store.set(k, v); return 'OK'; },
      del: async (...keys: string[]) => { keys.forEach(k => store.delete(k)); return keys.length; },
      keys: async (pattern: string) => {
        // naive '*' support
        return Array.from(store.keys()).filter(k => k.startsWith(pattern.replace('*', '')));
      }
    }
  };
});

describe('SessionManager', () => {
  const userId = 9999;

  afterEach(async () => {
    await SessionManager.deleteSession(userId);
  });

  test('ensureSession creates a session when none exists', async () => {
    const s = await SessionManager.ensureSession(userId, 1);
    expect(s).toBeDefined();
    expect(s.storeId).toBe(1);
    expect(s.cart).toEqual([]);
  });

  test('addToCart and getSession reflect the item', async () => {
    await SessionManager.ensureSession(userId, 1);
    await SessionManager.addToCart(userId, { productId: 11, quantity: 2, price: 5.0, name: 'X' });
    const s = await SessionManager.getSession(userId);
    expect(s?.cart.length).toBe(1);
    expect(s?.cart[0].productId).toBe(11);
  });

  test('removeFromCart removes item', async () => {
    await SessionManager.ensureSession(userId, 1);
    await SessionManager.addToCart(userId, { productId: 11, quantity: 2, price: 5.0, name: 'X' });
    await SessionManager.removeFromCart(userId, 11);
    const s = await SessionManager.getSession(userId);
    expect(s?.cart.length).toBe(0);
  });

  test('clearCart empties the cart', async () => {
    await SessionManager.ensureSession(userId, 1);
    await SessionManager.addToCart(userId, { productId: 11, quantity: 2, price: 5.0, name: 'X' });
    await SessionManager.clearCart(userId);
    const s = await SessionManager.getSession(userId);
    expect(s?.cart.length).toBe(0);
  });

  test('deleteSession removes the session', async () => {
    await SessionManager.ensureSession(userId, 1);
    await SessionManager.deleteSession(userId);
    const s = await SessionManager.getSession(userId);
    expect(s).toBeNull();
  });
});
