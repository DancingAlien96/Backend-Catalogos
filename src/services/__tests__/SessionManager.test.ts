import SessionManager from '../SessionManager';

// Mock redis client by mocking the config/redis module
jest.mock('../../../src/config/redis', () => {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    __esModule: true,
    default: {
      get: async (k: string) => store.get(k) || null,
      set: async (k: string, v: string) => { store.set(k, v); return 'OK'; },
      del: async (...keys: string[]) => { keys.forEach(k => store.delete(k)); return keys.length; },
      keys: async (pattern: string) => {
        return Array.from(store.keys()).filter(k => k.startsWith(pattern.replace('*', '')));
      },
      // set operations
      sadd: async (key: string, member: string) => {
        if (!sets.has(key)) sets.set(key, new Set<string>());
        sets.get(key)!.add(member);
        return 1;
      },
      srem: async (key: string, member: string) => {
        const s = sets.get(key);
        if (!s) return 0;
        const removed = s.delete(member) ? 1 : 0;
        if (s.size === 0) sets.delete(key);
        return removed;
      },
      smembers: async (key: string) => {
        return Array.from(sets.get(key) || []);
      },
      scard: async (key: string) => {
        return (sets.get(key) || new Set()).size;
      },
      expire: async (key: string, seconds: number) => {
        // noop for mock
        return 1;
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

  test('sessions are indexed by store and can be counted and listed', async () => {
    await SessionManager.ensureSession(1001, 5);
    await SessionManager.ensureSession(1002, 5);

    const ids = await SessionManager.getSessionUserIdsForStore(5);
    expect(ids).toContain(1001);
    expect(ids).toContain(1002);

    const count = await SessionManager.countSessionsForStore(5);
    expect(count).toBe(2);

    // cleanup
    await SessionManager.deleteSession(1001);
    await SessionManager.deleteSession(1002);
    const countAfter = await SessionManager.countSessionsForStore(5);
    expect(countAfter).toBe(0);
  });
});
