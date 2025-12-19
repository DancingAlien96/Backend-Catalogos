import redis from '../config/redis';

export interface CartItem {
  productId: number;
  quantity: number;
  price: number;
  name: string;
}

export interface BotSession {
  storeId: number;
  cart: CartItem[];
  customerId?: number | null;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

class SessionManager {
  private key(userId: number) {
    return `session:user:${userId}`;
  }

  async ensureSession(userId: number, storeId: number): Promise<BotSession> {
    const existing = await this.getSession(userId);
    if (existing) return existing;

    const session: BotSession = { storeId, cart: [], customerId: null };
    await this.setSession(userId, session);
    return session;
  }

  async getSession(userId: number): Promise<BotSession | null> {
    const raw = await redis.get(this.key(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BotSession;
    } catch (err) {
      console.error('Error parsing session JSON', err);
      return null;
    }
  }

  async setSession(userId: number, session: BotSession): Promise<void> {
    const existed = await redis.get(this.key(userId));
    await redis.set(this.key(userId), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);

    // Maintain per-store index for efficient lookups
    if (session.storeId) {
      const storeSetKey = `sessions:store:${session.storeId}`;
      await redis.sadd(storeSetKey, userId.toString());
      // Optionally set TTL on the index key as well
      await redis.expire(storeSetKey, SESSION_TTL_SECONDS);
    }

    // If this was a new session, increment metric
    if (!existed) {
      try { (await import('../metrics')).activeSessionsGauge.inc(); } catch (e) {}
    }
  }

  async deleteSession(userId: number): Promise<void> {
    // Remove membership from any store set
    const raw = await redis.get(this.key(userId));
    if (raw) {
      try {
        const s = JSON.parse(raw) as BotSession;
        if (s.storeId) {
          const storeSetKey = `sessions:store:${s.storeId}`;
          await redis.srem(storeSetKey, userId.toString());
        }
      } catch (e) {
        // ignore parse errors
      }

      // Decrement active sessions metric
      try { (await import('../metrics')).activeSessionsGauge.dec(); } catch (e) {}
    }

    await redis.del(this.key(userId));
  }

  // New helper: list user ids for a store
  async getSessionUserIdsForStore(storeId: number): Promise<number[]> {
    const storeSetKey = `sessions:store:${storeId}`;
    const members = await redis.smembers(storeSetKey);
    return members.map((m: string) => parseInt(m, 10));
  }

  // New helper: count sessions for a store
  async countSessionsForStore(storeId: number): Promise<number> {
    const storeSetKey = `sessions:store:${storeId}`;
    const count = await redis.scard(storeSetKey);
    return count as number;
  }

  async addToCart(userId: number, item: CartItem): Promise<void> {
    const session = (await this.getSession(userId)) || { storeId: 0, cart: [], customerId: null };
    const existing = session.cart.find((c) => c.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      session.cart.push(item);
    }
    await this.setSession(userId, session);
  }

  async clearCart(userId: number): Promise<void> {
    const session = (await this.getSession(userId)) || { storeId: 0, cart: [], customerId: null };
    session.cart = [];
    await this.setSession(userId, session);
  }

  async removeFromCart(userId: number, productId: number): Promise<void> {
    const session = (await this.getSession(userId)) || { storeId: 0, cart: [], customerId: null };
    session.cart = session.cart.filter((item) => item.productId !== productId);
    await this.setSession(userId, session);
  }
}

export default new SessionManager();
