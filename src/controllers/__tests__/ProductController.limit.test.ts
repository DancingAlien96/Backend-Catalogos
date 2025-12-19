import { sequelize } from '../../config/sequelize';
import { Store } from '../../models/Store';
import { Product } from '../../models/Product';
import { Plan } from '../../models/Plan';
import { ProductController } from '../ProductController';

// Minimal mock Request/Response
function mockReq(body: any = {}, params: any = {}, storeId: number = 1) {
  return {
    body,
    params,
    storeId,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.json = (payload: any) => {
    res._json = payload;
    return res;
  };
  return res;
}

describe('ProductController product limits', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });

    const user = await (await import('../../models/User')).User.create({ email: 'owner@test.com', password_hash: 'testhash', first_name: 'Owner', last_name: 'X' });
    const free = await Plan.create({ name: 'FreeTest', slug: 'free-test', price: 0, product_limit: 2 });

    await Store.create({ user_id: user.id, plan_id: free.id, name: 'Limit Store', slug: 'limit-store', api_key: 'apikey', bot_token: null, is_active: true });

    // Create two products to reach limit
    await Product.create({ store_id: 1, name: 'Prod A', sku: 'PA-1', price: 10, current_stock: 50 });
    await Product.create({ store_id: 1, name: 'Prod B', sku: 'PB-1', price: 20, current_stock: 50 });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('returns 403 when plan limit reached', async () => {
    const res = mockRes();
    const req = mockReq({ name: 'Prod C', sku: 'PC-1', price: 5 }, {}, 1);

    await ProductController.create(req as any, res as any);

    expect(res._status).toBe(403);
    expect(res._json).toBeDefined();
    expect(res._json.error).toMatch(/Límite de productos alcanzado/);
  });

  test('allows creation when under limit', async () => {
    // Create a new store with higher limit
    const pro = await Plan.create({ name: 'ProTest', slug: 'pro-test', price: 19.99, product_limit: 100 });
    const user = await (await import('../../models/User')).User.create({ email: 'owner2@test.com', password_hash: 'testhash', first_name: 'Owner2', last_name: 'Y' });
    await Store.create({ user_id: user.id, plan_id: pro.id, name: 'Pro Store', slug: 'pro-store', api_key: 'apikey2', bot_token: null, is_active: true });

    const res = mockRes();
    const req = mockReq({ name: 'Prod X', sku: 'PX-1', price: 15 }, {}, 2);

    await ProductController.create(req as any, res as any);

    expect(res._status).toBe(201);
    expect(res._json).toBeDefined();
    expect(res._json.productId).toBeDefined();
  });
});