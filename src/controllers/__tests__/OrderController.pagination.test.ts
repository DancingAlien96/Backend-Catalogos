import { sequelize } from '../../config/sequelize';
import { Store } from '../../models/Store';
import { Product } from '../../models/Product';
import { Customer } from '../../models/Customer';
import { Order } from '../../models/Order';
import { OrderController } from '../OrderController';

function mockReq(query: any = {}, body: any = {}, storeId: number = 1) {
  return {
    query,
    body,
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

describe('OrderController pagination', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    const user = await (await import('../../models/User')).User.create({ email: 'owner@test.com', password_hash: 'testhash', name: 'Owner' });
    await Store.create({ user_id: user.id, name: 'Test Store', slug: 'test', api_key: 'apikey', bot_token: null, is_active: true });
    await Customer.create({ store_id: 1, name: 'Cliente1', telegram_id: '1111' });
    await Customer.create({ store_id: 1, name: 'Cliente2', telegram_id: '2222' });

    await Product.create({ store_id: 1, name: 'Prod A', sku: 'PA-1', price: 10, current_stock: 50 });

    for (let i = 0; i < 25; i++) {
      await Order.create({ store_id: 1, customer_id: 1, order_number: `ORD-${i}`, subtotal: 10, total: 10, status: 'pending' });
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('returns paginated orders', async () => {
    const req = mockReq({ page: '2', limit: '10' });
    const res = mockRes();

    await OrderController.getAll(req, res);

    expect(res._json).toBeDefined();
    expect(res._json.meta).toBeDefined();
    expect(res._json.meta.page).toBe(2);
    expect(res._json.orders.length).toBe(10);
    expect(res._json.meta.total).toBe(25);
  });
});
