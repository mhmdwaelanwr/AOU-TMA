import fs from 'node:fs';

const courses = JSON.parse(fs.readFileSync(new URL('./data/courses.json', import.meta.url), 'utf8'));
const paymentManifest = JSON.parse(fs.readFileSync(new URL('./data/payment_methods.json', import.meta.url), 'utf8'));
const branches = JSON.parse(fs.readFileSync(new URL('./data/branches.json', import.meta.url), 'utf8'));
const courseByCode = new Map(courses.map((c) => [String(c.code).toLowerCase(), c]));
const ALLOWED_CURRENCIES = new Set([...branches.map((branch) => branch.currency), 'USDT']);
const BRANCH_IDS = new Set(branches.map((branch) => branch.id));

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'no-store' : 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function listBranches() {
  return { count: branches.length, items: branches };
}

export function searchCourses(url) {
  const q = (url.searchParams.get('q') || '').trim().toLocaleLowerCase();
  const faculty = (url.searchParams.get('faculty') || 'all').trim();
  const type = (url.searchParams.get('type') || '').trim().toUpperCase();
  const items = courses.filter((course) => {
    if (faculty !== 'all' && course.faculty !== faculty) return false;
    if (type && course.type !== type) return false;
    if (!q) return true;
    const haystack = `${course.code} ${course.title || ''} ${course.description || ''} ${course.faculty} ${course.facultyAr}`.toLocaleLowerCase();
    return haystack.includes(q);
  });
  return { count: items.length, items };
}

export function publicPaymentMethods(env = process.env) {
  const items = paymentManifest.map((item) => {
    const destination = String(env[item.env] || '').trim();
    return {
      id: item.id,
      group: item.group,
      label: item.label,
      currency: item.currency,
      network: item.network || null,
      icon: item.icon,
      configured: Boolean(destination),
      destination: destination || null,
      instructions: destination
        ? item.group === 'crypto'
          ? `Send only ${item.currency} using ${item.network || 'the selected network'} to this address.`
          : item.id === 'instapay'
            ? 'Send the exact amount to the configured InstaPay address and keep the transfer reference.'
            : 'Send the exact EGP amount to this mobile wallet and keep the transfer reference.'
        : null,
    };
  });
  return { count: items.length, items };
}

export async function fx(currency) {
  const normalized = String(currency || 'EGP').toUpperCase();
  if (!ALLOWED_CURRENCIES.has(normalized)) return { error: 'unsupported_currency', status: 400 };
  if (normalized === 'EGP') {
    return { status: 200, body: { base:'EGP', currency:'EGP', rate:1, source:'base', cachedAt:new Date().toISOString(), status:'base' } };
  }
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/EGP', { headers: { 'user-agent': 'aou-tma-hub-serverless/4.1' } });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    const payload = await response.json();
    const rate = payload?.rates?.[normalized];
    if (!rate) return { error: 'rate_unavailable', status: 502 };
    return {
      status: 200,
      body: {
        base:'EGP', currency:normalized, rate, source:'open.er-api.com',
        cachedAt:new Date().toISOString(),
        providerUpdatedAt: payload.time_last_update_unix ? new Date(payload.time_last_update_unix * 1000).toISOString() : null,
        nextUpdateAt: payload.time_next_update_unix ? new Date(payload.time_next_update_unix * 1000).toISOString() : null,
        status:'fresh',
      },
    };
  } catch (error) {
    return { error: 'fx_unavailable', message: error?.message || 'fx_unavailable', status: 503 };
  }
}

function clean(value, max = 200) {
  return String(value || '').trim().slice(0, max);
}

export async function createServerlessOrder(payload, env = process.env) {
  const courseCode = clean(payload?.course_code, 32).toUpperCase();
  const customerName = clean(payload?.customer_name, 80);
  const contact = clean(payload?.contact, 80);
  const currency = clean(payload?.currency || 'EGP', 4).toUpperCase();
  const branch = clean(payload?.branch || 'egypt', 20);
  const serviceType = clean(payload?.service_type || 'TMA', 20).toUpperCase();
  if (!courseByCode.has(courseCode.toLowerCase())) return { status: 404, body: { detail: 'course_not_found' } };
  if (customerName.length < 2 || contact.length < 3 || !ALLOWED_CURRENCIES.has(currency) ||
      !BRANCH_IDS.has(branch) || !['TMA', 'ASSIGNMENT'].includes(serviceType)) {
    return { status: 422, body: { detail: 'invalid_order' } };
  }
  if (payload?.lms_username || payload?.lms_password) {
    return { status: 422, body: { detail: 'lms_credentials_not_accepted' } };
  }

  // A serverless function has no durable filesystem. Do not acknowledge a request
  // until a configured external receiver has accepted it.
  const webhook = clean(env.ORDER_WEBHOOK_URL, 1000);
  if (!webhook || !webhook.startsWith('https://')) {
    return { status: 503, body: { detail: 'order_storage_not_configured' } };
  }

  const course = courseByCode.get(courseCode.toLowerCase());
  const createdAt = new Date().toISOString();
  const orderId = `AOU-${createdAt.slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`;
  const order = {
    order_id: orderId,
    course_code: course.code,
    customer_name: customerName,
    contact,
    email: clean(payload?.email, 120) || null,
    notes: clean(payload?.notes, 1000) || null,
    currency,
    payment_method: clean(payload?.payment_method, 40) || null,
    promo_code: clean(payload?.promo_code, 20) || null,
    referral_code: clean(payload?.referral_code, 20) || null,
    deposit_tx_hash: clean(payload?.deposit_tx_hash, 128) || null,
    branch,
    service_type: serviceType,
    type: course.type === 'ONSITE' ? 'ONSITE_CLAIM' : 'TMA_ORDER',
    created_at: createdAt,
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(order),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return { status: 502, body: { detail: 'order_delivery_failed' } };
  } catch {
    return { status: 502, body: { detail: 'order_delivery_failed' } };
  }

  return {
    status: 201,
    body: { ok: true, order_id: orderId, status: 'received', created_at: createdAt,
            forwarded: true, deployment: 'serverless', type: course.type === 'ONSITE' ? 'onsite_claim' : 'tma_order' },
  };
}
