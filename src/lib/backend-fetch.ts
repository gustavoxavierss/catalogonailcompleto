import "server-only";
import { createHash, createPrivateKey, randomUUID, sign } from "node:crypto";

// The private signing key stays in Vercel. Supabase's service key stays in Supabase.
// Only the backend can authorize requests to this narrow service bridge.
export const backendFetch: typeof fetch = async (input, init) => {
  const req = new Request(input, init);
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (url.origin !== new URL(base).origin)
    throw new Error("BACKEND_ORIGIN_MISMATCH");
  const body = Buffer.from(await req.arrayBuffer());
  const path = url.pathname + url.search;
  const timestamp = Date.now().toString(),
    nonce = randomUUID();
  const digest = createHash("sha256").update(body).digest("hex");
  const message = [req.method, path, timestamp, nonce, digest].join("\n");
  const key = createPrivateKey({
    key: Buffer.from(process.env.SUPABASE_BRIDGE_PRIVATE_KEY!, "base64"),
    format: "der",
    type: "pkcs8",
  });
  const signature = sign(null, Buffer.from(message), key).toString("base64");
  const headers = new Headers({
    "x-catalog-path": path,
    "x-catalog-method": req.method,
    "x-catalog-time": timestamp,
    "x-catalog-nonce": nonce,
    "x-catalog-signature": signature,
  });
  for (const name of [
    "content-type",
    "prefer",
    "range",
    "x-upsert",
    "cache-control",
    "accept",
  ]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  return fetch(`${base}/functions/v1/nail-backend`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    signal: req.signal,
  });
};
