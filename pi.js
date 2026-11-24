'use strict';

const PI_BASE = (process.env.PI_API_BASE || 'https://api.minepi.com/v2').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://brpcjntuztqfkfmgiizk.supabase.co';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
function method(req, res, expected = 'POST') {
  if (req.method !== expected) { json(res, 405, { error: 'Method not allowed' }); return false; }
  return true;
}
function secrets() {
  const piKey = process.env.PI_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!piKey || !serviceKey) throw new Error('Server configuration missing: set PI_API_KEY and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.');
  return { piKey, serviceKey };
}
async function piRequest(path, key, options = {}) {
  const response = await fetch(`${PI_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Key ${key}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || `Pi API returned HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
async function dbRequest(path, serviceKey, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `Database request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
async function getOrder(orderId, serviceKey) {
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error('Invalid order reference.');
  const rows = await dbRequest(`isoko_orders?id=eq.${encodeURIComponent(orderId)}&select=id,pi_uid,amount_pi,status`, serviceKey);
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Order not found.');
  return rows[0];
}
function verifyPaymentAgainstOrder(payment, order, orderId) {
  if (!payment || payment.identifier == null) throw new Error('Pi payment could not be verified.');
  if (Number(payment.amount) !== Number(order.amount_pi)) throw new Error('Payment amount does not match the order.');
  if (String(payment.user_uid || '') !== String(order.pi_uid || '')) throw new Error('Pi account does not match the order.');
  if (String(payment.metadata?.orderId || '') !== String(orderId)) throw new Error('Payment metadata does not match the order.');
  if (payment.metadata?.app !== 'isoko-online-rwanda') throw new Error('Payment was not created for Isoko Online Rwanda.');
}
module.exports = { json, method, secrets, piRequest, dbRequest, getOrder, verifyPaymentAgainstOrder };
