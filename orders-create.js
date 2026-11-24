'use strict';
const { json, method, secrets, dbRequest } = require('../lib/pi');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://brpcjntuztqfkfmgiizk.supabase.co';

module.exports = async function handler(req, res) {
  if (!method(req, res)) return;
  try {
    const { serviceKey } = secrets();
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!accessToken || !anonKey) return json(res, 401, { error: 'Sign in is required.' });
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
    const authUser = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !authUser.id) return json(res, 401, { error: 'Your Isoko session could not be verified. Sign in again.' });

    const { items, piAccessToken } = req.body || {};
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) return json(res, 400, { error: 'Cart is empty or contains too many items.' });
    if (typeof piAccessToken !== 'string' || piAccessToken.length < 20 || piAccessToken.length > 4096) return json(res, 400, { error: 'Pi account verification is required.' });
    const piResponse = await fetch('https://api.minepi.com/v2/me', { headers: { Authorization: `Bearer ${piAccessToken}` } });
    const piUser = await piResponse.json().catch(() => ({}));
    if (!piResponse.ok || !piUser.uid || !piUser.username) return json(res, 401, { error: 'Pi account verification failed.' });

    const quantities = new Map();
    for (const item of items) {
      if (!item || typeof item.productId !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.productId)) return json(res, 400, { error: 'Invalid product in cart.' });
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return json(res, 400, { error: 'Invalid product quantity.' });
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + quantity);
    }
    const ids = [...quantities.keys()];
    const products = await dbRequest(`isoko_products?id=in.(${ids.join(',')})&active=eq.true&select=id,store_id,owner_id,name,price_pi`, serviceKey);
    if (!Array.isArray(products) || products.length !== ids.length) return json(res, 409, { error: 'One or more products are no longer available.' });
    let total = 0;
    const orderItems = products.map(product => {
      const quantity = quantities.get(product.id);
      const unitPrice = Number(product.price_pi);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('A product has an invalid price.');
      total += unitPrice * quantity;
      return { product_id: product.id, store_id: product.store_id, name: product.name, quantity, unit_price: unitPrice };
    });
    total = Number(total.toFixed(6));
    if (!Number.isFinite(total) || total <= 0) return json(res, 400, { error: 'Invalid order total.' });
    const rows = await dbRequest('isoko_orders?select=id,amount_pi,status', serviceKey, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ buyer_id: authUser.id, pi_uid: piUser.uid, pi_username: piUser.username, amount_pi: total, items: orderItems, status: 'pending' })
    });
    if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Could not create order.');
    return json(res, 201, { order: rows[0] });
  } catch (error) {
    console.error('Order creation error:', error);
    return json(res, error.status || 500, { error: error.message || 'Could not create order.' });
  }
};
