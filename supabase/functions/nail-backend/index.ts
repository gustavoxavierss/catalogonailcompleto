// Public verification key; the matching private key is never part of this source.
// No database/admin secret is exported by this function.
const PUBLIC_KEY = '3sy8lt8MoJuPw+ffPLlh3GFPiEk6EqVxR2AWvlsbODM=';
const tables = new Set(['profiles','admin_users','app_settings','catalogs','categories','services','assets','service_images','social_links','catalog_versions','orders','payments','webhook_events','pdf_files','pdf_jobs','analytics_events','subscriptions']);
const rpc = new Set(['save_catalog','begin_checkout','confirm_payment','take_rate_limit','claim_pdf_job','admin_summary','admin_payments','claim_checkout','begin_wiapy_checkout','confirm_wiapy_payment','monthly_catalog_order']);
const bytes = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const publicKey = crypto.subtle.importKey('raw', bytes(PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify']);
Deno.serve(async (req: Request) => {
  try {
    const path = req.headers.get('x-catalog-path') || '';
    const method = req.headers.get('x-catalog-method') || '';
    const time = req.headers.get('x-catalog-time') || '';
    const nonce = req.headers.get('x-catalog-nonce') || '';
    if (req.method !== 'POST' || !['GET','POST','PATCH','PUT','DELETE','HEAD'].includes(method) || !/^\d{13}$/.test(time) || Math.abs(Date.now() - Number(time)) > 30000 || !/^[0-9a-f-]{36}$/.test(nonce)) return new Response(null, { status: 401 });
    if (!path.startsWith('/') || path.includes('..') || path.includes('%') || path.includes('\\')) {
      // Encoded characters are allowed in query strings, never in resource paths.
      if (!path.startsWith('/') || /\.\.|%|\\/.test(path.split('?')[0])) return new Response(null, { status: 403 });
    }
    const pathname = path.split('?')[0];
    const parts = pathname.split('/').filter(Boolean);
    const allowed = (parts[0] === 'rest' && parts[1] === 'v1' && ((parts.length === 3 && tables.has(parts[2])) || (parts.length === 4 && parts[2] === 'rpc' && rpc.has(parts[3])))) || /^\/storage\/v1\/object\/(?:sign\/|authenticated\/)?catalog-(images|pdfs)(?:\/|$)/.test(pathname);
    if (!allowed) return new Response(null, { status: 403 });
    if (Number(req.headers.get('content-length')) > 55000000) return new Response(null, { status: 413 });
    const body = new Uint8Array(await req.arrayBuffer());
    if (body.length > 55000000) return new Response(null, { status: 413 });
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body))).map(b => b.toString(16).padStart(2,'0')).join('');
    const message = new TextEncoder().encode([method,path,time,nonce,digest].join('\n'));
    if (!await crypto.subtle.verify('Ed25519', await publicKey, bytes(req.headers.get('x-catalog-signature') || ''), message)) return new Response(null, { status: 401 });
    const base = Deno.env.get('SUPABASE_URL')!, secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const internal = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', 'Content-Profile': 'nail_catalog' };
    const claim = await fetch(`${base}/rest/v1/rpc/claim_backend_nonce`, { method: 'POST', headers: internal, body: JSON.stringify({ p_nonce: nonce }) });
    if (!claim.ok || await claim.json() !== true) return new Response(null, { status: 409 });
    const headers = new Headers({ apikey: secret, Authorization: `Bearer ${secret}`, 'Accept-Profile': 'nail_catalog', 'Content-Profile': 'nail_catalog' });
    for (const name of ['content-type','prefer','range','x-upsert','cache-control','accept']) { const value = req.headers.get(name); if (value) headers.set(name,value); }
    const result = await fetch(base + path, { method, headers, body: ['GET','HEAD'].includes(method) ? undefined : body, redirect: 'error' });
    const output = new Headers();
    for (const name of ['content-type','content-range']) { const value = result.headers.get(name); if (value) output.set(name,value); }
    output.set('cache-control','private, no-store');
    return new Response(result.body, { status: result.status, headers: output });
  } catch { return Response.json({ error: 'Request rejected' }, { status: 400 }); }
});
