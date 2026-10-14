import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { emptyCatalog } from "../src/lib/catalog";
let db: PGlite;
const uid = crypto.randomUUID();
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  await db.exec(
    readFileSync("schema.sql", "utf8").replace(
      "create extension if not exists pgcrypto;",
      "",
    ),
  );
  await db.exec(
    readFileSync("supabase/wiapy-payments.sql", "utf8").replaceAll(
      "nail_catalog.",
      "public.",
    ),
  );
  await db.query("insert into auth.users values($1)", [uid]);
});
afterAll(async () => {
  await db.close();
});
async function order(plan = "single") {
  const d = emptyCatalog();
  d.professional = "Teste";
  const c = await db.query<{ id: string }>(
    "insert into public.catalogs(user_id,document) values($1,$2) returning id",
    [uid, d],
  );
  const cat = c.rows[0].id;
  const args = [
    cat,
    uid,
    plan,
    plan === "single" ? "single-checkout" : "monthly-checkout",
  ];
  const r = await db.query<any>(
    "select * from public.begin_wiapy_checkout($1,$2,$3,$4)",
    args,
  );
  return { o: r.rows[0], args, cat };
}
async function confirm(
  o: any,
  status = "paid",
  transaction = crypto.randomUUID(),
  sub: string | null = null,
  until: string | null = null,
) {
  return db.query<{ confirm_wiapy_payment: string }>(
    "select public.confirm_wiapy_payment($1,$2,$3,$4,$5,$6,now(),$7,$8,$9,$10)",
    [
      transaction + ":" + status,
      o.id,
      transaction,
      o.checkout_id,
      o.amount,
      status,
      "hash",
      o.plan,
      sub,
      until,
    ],
  );
}
it("reutiliza pedido e confirma uma única vez; reembolso é terminal", async () => {
  const { o, args } = await order();
  const again = await db.query<any>(
    "select * from public.begin_wiapy_checkout($1,$2,$3,$4)",
    args,
  );
  expect(again.rows[0].id).toBe(o.id);
  const txn = crypto.randomUUID();
  await confirm(o, "paid", txn);
  await confirm(o, "paid", txn);
  expect(
    (
      await db.query<any>(
        "select count(*)::int n from public.webhook_events where order_id=$1",
        [o.id],
      )
    ).rows[0].n,
  ).toBe(1);
  await confirm(o, "refunded", txn);
  await confirm(o, "paid", txn);
  expect(
    (
      await db.query<any>("select status from public.orders where id=$1", [
        o.id,
      ])
    ).rows[0].status,
  ).toBe("refunded");
});
it("rejeita valor adulterado sem gerar trabalho de PDF", async () => {
  const { o } = await order();
  await expect(confirm({ ...o, amount: 1 })).rejects.toThrow(
    "PAYMENT_MISMATCH",
  );
  expect(
    (
      await db.query<any>(
        "select count(*)::int n from public.pdf_jobs where order_id=$1",
        [o.id],
      )
    ).rows[0].n,
  ).toBe(0);
});
it("mensal libera novas versões sem contabilizar nova cobrança; revogação bloqueia", async () => {
  const { o, cat } = await order("monthly");
  const sub = crypto.randomUUID(),
    txn = crypto.randomUUID(),
    until = new Date(Date.now() + 86400000 * 30).toISOString();
  await confirm(o, "paid", txn, sub, until);
  const r = await db.query<any>(
    "select public.monthly_catalog_order($1,$2) id",
    [cat, uid],
  );
  expect(r.rows[0].id).toBeTruthy();
  expect(
    (
      await db.query<any>("select amount from public.orders where id=$1", [
        r.rows[0].id,
      ])
    ).rows[0].amount,
  ).toBe(0);
  await confirm(o, "paid", crypto.randomUUID(), sub, until);
  expect(
    (
      await db.query<any>(
        "select count(*)::int n from public.orders where catalog_id=$1 and plan='monthly' and status='paid'",
        [cat],
      )
    ).rows[0].n,
  ).toBe(2);
  await confirm(o, "refunded", txn, sub, until);
  expect(
    (
      await db.query<any>("select public.monthly_catalog_order($1,$2) id", [
        cat,
        uid,
      ])
    ).rows[0].id,
  ).toBeNull();
});
