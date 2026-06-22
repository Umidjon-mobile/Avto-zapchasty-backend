/**
 * DB'SIZ TO'LIQ VERIFY:
 *  1) Modellar + app yuklanadi (barcha require zanjiri tekshiriladi)
 *  2) Routelar sanaladi
 *  3) Util va validatorlar unit-test qilinadi
 *  4) /health, 404 va validatsiya jonli (http) tekshiriladi — DB shart emas
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access';
process.env.JWT_REFRESH_SECRET = 'test-refresh';

const http = require('http');
const assert = require('assert');

let pass = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const die = (m, e) => { console.error('  ❌ ' + m, e ? '\n     ' + e.message : ''); process.exit(1); };

(async () => {
  // ---------- 1. Modellar + app ----------
  let app, models;
  try { models = require('./src/models'); ok(`Modellar yuklandi (${Object.keys(models).length} ta)`); }
  catch (e) { die('Modellar yuklanmadi', e); }
  try { app = require('./src/app'); ok('Express app yuklandi (barcha route/controller/service ulandi)'); }
  catch (e) { die('app.js yuklanmadi', e); }

  // ---------- 2. Routelar ----------
  function walk(stack, out) {
    for (const layer of stack) {
      if (layer.route) {
        for (const m of Object.keys(layer.route.methods)) out.push(m.toUpperCase() + ' ' + layer.route.path);
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        walk(layer.handle.stack, out);
      }
    }
  }
  const routes = [];
  walk(app._router.stack, routes);
  if (routes.length >= 25) ok(`Routelar ro'yxatga olindi: ${routes.length} ta endpoint`);
  else die(`Kutilganidan kam route: ${routes.length}`);

  // ---------- 3. Util va validatorlar ----------
  const slugify = require('./src/utils/slugify');
  assert.strictEqual(slugify('Шаровая опора'), 'sharovaya-opora');
  assert.strictEqual(slugify('LED фара'), 'led-fara');
  ok('slugify (Kirill→Lotin) to\'g\'ri');

  const { normalizePhone, isValidUzPhone } = require('./src/utils/phone');
  assert.strictEqual(normalizePhone('901234567'), '+998901234567');
  assert.strictEqual(normalizePhone('+998 90 123 45 67'), '+998901234567');
  assert.strictEqual(isValidUzPhone('+998901234567'), true);
  assert.strictEqual(isValidUzPhone('+7123'), false);
  ok('phone normalizatsiya + validatsiya to\'g\'ri');

  const { normalizeOem } = require('./src/utils/crypto');
  assert.strictEqual(normalizeOem('04465-33471'), '0446533471');
  assert.strictEqual(normalizeOem('mr-407 / a'), 'MR407A');
  ok('normalizeOem to\'g\'ri');

  const { looksLikeOem } = require('./src/services/search.service');
  assert.strictEqual(looksLikeOem('04465-33471'), true);
  assert.strictEqual(looksLikeOem('колодка'), false);
  assert.strictEqual(looksLikeOem('camry'), false); // raqamsiz → OEM emas
  ok('looksLikeOem (OEM aniqlash) to\'g\'ri');

  const { signAccess, verifyAccess } = require('./src/utils/jwt');
  const t = signAccess({ sub: 'abc', role: 'buyer', phone: '+998901234567' });
  assert.strictEqual(verifyAccess(t).role, 'buyer');
  ok('JWT sign/verify roundtrip to\'g\'ri');

  const lv = require('./src/validators/listing.validator');
  const good = lv.create.safeParse({
    partTypeId: '0123456789abcdef01234567',
    title: 'Camry old kolodka',
    condition: 'original',
    price: { amount: 350000 },
  });
  assert.strictEqual(good.success, true);
  const bad = lv.create.safeParse({ title: 'x', condition: 'wrong', price: {} });
  assert.strictEqual(bad.success, false);
  ok('listing validator (zod) to\'g\'ri ishlaydi');

  // ---------- 4. Jonli http (DB'siz yo'llar) ----------
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = server.address().port;

  const req = (method, path, body) => new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      { host: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } },
      (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null })); }
    );
    r.on('error', () => resolve({ status: 0 }));
    if (data) r.write(data);
    r.end();
  });

  const health = await req('GET', '/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.body.ok, true);
  ok('GET /health → 200');

  const nf = await req('GET', '/api/qwerty');
  assert.strictEqual(nf.status, 404);
  ok('Noma\'lum route → 404');

  const valErr = await req('POST', '/api/auth/verify-otp', { phone: '901234567', code: '12' });
  assert.strictEqual(valErr.status, 400);
  assert.ok(Array.isArray(valErr.body.details));
  ok('Validatsiya xatosi → 400 + details');

  const otpBadPhone = await req('POST', '/api/auth/send-otp', { phone: '123' });
  assert.strictEqual(otpBadPhone.status, 400);
  ok('send-otp noto\'g\'ri telefon → 400');

  server.close();

  console.log(`\n🎉 VERIFY MUVAFFAQIYATLI — ${pass} ta tekshiruv o'tdi, ${routes.length} ta endpoint ulangan`);
  process.exit(0);
})();
