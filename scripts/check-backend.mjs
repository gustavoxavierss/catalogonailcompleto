import { createHash, createPrivateKey, randomUUID, sign } from 'node:crypto';
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const path = '/rest/v1/app_settings?select=value';
const time = Date.now().toString(), nonce = randomUUID();
const message = ['GET', path, time, nonce, createHash('sha256').update('').digest('hex')].join('\n');
const key = createPrivateKey({ key: Buffer.from(process.env.SUPABASE_BRIDGE_PRIVATE_KEY, 'base64'), format: 'der', type: 'pkcs8' });
const headers = { 'x-catalog-path': path, 'x-catalog-method': 'GET', 'x-catalog-time': time, 'x-catalog-nonce': nonce, 'x-catalog-signature': sign(null, Buffer.from(message), key).toString('base64') };
const signed = await fetch(base + '/functions/v1/nail-backend', { method: 'POST', headers });
console.log('Signed configuration read:', signed.status);
if (signed.status !== 200) { console.log(await signed.text()); process.exit(1); }
const replay = await fetch(base + '/functions/v1/nail-backend', { method: 'POST', headers });
const unsigned = await fetch(base + '/functions/v1/nail-backend', { method: 'POST' });
console.log('Replay rejected:', replay.status === 409);
console.log('Unsigned rejected:', unsigned.status === 401);
const auth = await fetch(base + '/auth/v1/settings', { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } });
const settings = await auth.json();
console.log('Auth settings:', JSON.stringify({ status: auth.status, emailEnabled: settings.external?.email, signupDisabled: settings.disable_signup, emailAutoConfirm: settings.mailer_autoconfirm }));
if (replay.status !== 409 || unsigned.status !== 401 || auth.status !== 200) process.exit(1);
