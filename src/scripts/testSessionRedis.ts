import SessionManager from '../services/SessionManager';

async function test() {
  console.log('Testing SessionManager...');
  const userId = 123456;
  await SessionManager.ensureSession(userId, 1);
  await SessionManager.addToCart(userId, { productId: 11, quantity: 2, price: 9.99, name: 'Test Product' });
  const s = await SessionManager.getSession(userId);
  console.log('Session:', s);

  await SessionManager.removeFromCart(userId, 11);
  const s2 = await SessionManager.getSession(userId);
  console.log('After remove:', s2);

  await SessionManager.clearCart(userId);
  const s3 = await SessionManager.getSession(userId);
  console.log('After clear:', s3);

  await SessionManager.deleteSession(userId);
  const s4 = await SessionManager.getSession(userId);
  console.log('After delete (should be null):', s4);

  process.exit(0);
}

test().catch((err) => { console.error(err); process.exit(1); });
