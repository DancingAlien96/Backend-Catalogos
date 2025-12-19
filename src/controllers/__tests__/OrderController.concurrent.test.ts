import { sequelize } from '../../config/sequelize';
import { Store } from '../../models/Store';
import { Product } from '../../models/Product';
import { Customer } from '../../models/Customer';
import { OrderController } from '../OrderController';

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

describe('OrderController concurrency', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });

    const user = await (await import('../../models/User')).User.create({ email: 'owner@test.com', password_hash: 'testhash', name: 'Owner' });
    await Store.create({ user_id: user.id, name: 'Test Store', slug: 'test', api_key: 'apikey', bot_token: null, is_active: true });
    await Customer.create({ store_id: 1, name: 'Cliente', telegram_id: '123' });
    await Product.create({ store_id: 1, name: 'Prod A', sku: 'PA-1', price: 10, current_stock: 5 });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('order creation uses row-level lock for product', async () => {
    const res = mockRes();
    const req = mockReq({ customer_id: 1, items: [{ product_id: 1, quantity: 3 }] });

    const spy = jest.spyOn(Product, 'findOne');

    await OrderController.create(req as any, res as any);

    expect(spy).toHaveBeenCalled();
    const calledWith = (spy.mock.calls as any[]).find(call => call[0] && (call[0] as any).where && (call[0] as any).where.id === 1);
    expect(calledWith).toBeDefined();
    // verify lock option exists (transaction.LOCK.UPDATE)
    const options: any = calledWith ? calledWith[0] : null;
    expect(options).not.toBeNull();
    expect(options.transaction).toBeDefined();
    expect(options.lock).toBeDefined();

    spy.mockRestore && spy.mockRestore();
  });

  test.skip('integration concurrent orders do not oversell (requires MySQL)', async () => {
    // This test is intended for an environment with MySQL to validate real concurrency.
  });
});
