import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { emptyCatalog } from "../src/lib/catalog";
let db: PGlite;
const a = crypto.randomUUID(),
  b = crypto.randomUUID();
let catalog: string;
let order: any;
const document = emptyCatalog();
document.professional = "Ana";
document.services = [
  {
    id: crypto.randomUUID(),
    name: "Alongamento",
    description: "Gel natural",
    price: 12000,
    promotion: null,
    categoryId: document.categories[0].id,
    duration: "90 min",
    note: "",
    images: [],
  },
];
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  await db.exec(
    readFileSync("schema.sql", "utf8").replace(
      "create extension if not exists pgcrypto;",
      "",
    ),
  );
  await db.query("insert into auth.users values ($1),($2)", [a, b]);
  await db.query(
    "insert into public.profiles(id,name,email) values($1,$2,$3)",
    [a, "Ana", "ana@example.test"],
  );
  const r = await db.query<{ id: string }>(
    "insert into public.catalogs(user_id,document) values($1,$2) returning id",
    [a, document],
  );
  catalog = r.rows[0].id;
});
afterAll(async () => {
  await db.close();
});
describe("Banco real PostgreSQL isolado: isolamento e pagamento", () => {
  it("habilita RLS em todas as tabelas públicas", async () => {
    const r = await db.query(
      "select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
    );
    expect(r.rows).toHaveLength(0);
  });
  it("salva categorias e serviços atomicamente", async () => {
    await db.query("select public.save_catalog($1,$2,1,$3)", [
      catalog,
      a,
      document,
    ]);
    const r = await db.query("select * from public.services");
    expect(r.rows).toHaveLength(1);
  });
  it("detecta edição concorrente sem sobrescrever", async () => {
    await expect(
      db.query("select public.save_catalog($1,$2,1,$3)", [
        catalog,
        a,
        document,
      ]),
    ).rejects.toThrow("REVISION_CONFLICT");
  });
  it("não permite salvar catálogo de outra usuária", async () => {
    await expect(
      db.query("select public.save_catalog($1,$2,2,$3)", [
        catalog,
        b,
        document,
      ]),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("isola leituras pela RLS", async () => {
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${b}',false);`,
    );
    expect((await db.query("select * from public.catalogs")).rows).toHaveLength(
      0,
    );
    await db.exec(`select set_config('request.jwt.claim.sub','${a}',false);`);
    expect((await db.query("select * from public.catalogs")).rows).toHaveLength(
      1,
    );
    await db.exec("reset role;");
  });
  it("bloqueia alterações de pagamento e funções pelo navegador", async () => {
    await db.exec("set role authenticated;");
    try {
      await expect(
        db.query("update public.orders set status='paid'"),
      ).rejects.toThrow("permission denied");
      await expect(
        db.query("select public.begin_checkout($1,$2)", [catalog, a]),
      ).rejects.toThrow("permission denied");
      await expect(
        db.query("select * from public.admin_users"),
      ).rejects.toThrow("permission denied");
    } finally {
      await db.exec("reset role;");
    }
  });
  it("reutiliza pedido e aplica preço do servidor", async () => {
    order = (
      await db.query<any>("select (public.begin_checkout($1,$2)).*", [
        catalog,
        a,
      ])
    ).rows[0];
    const again = (
      await db.query<any>("select (public.begin_checkout($1,$2)).*", [
        catalog,
        a,
      ])
    ).rows[0];
    expect(again.id).toBe(order.id);
    expect(order.amount).toBe(1990);
    expect(order.status).toBe("pending");
  });
  it("congela versão comprada", async () => {
    const changed = { ...document, professional: "Outro nome" };
    await db.query("select public.save_catalog($1,$2,2,$3)", [
      catalog,
      a,
      changed,
    ]);
    const r = await db.query<any>(
      "select snapshot from public.catalog_versions where id=$1",
      [order.version_id],
    );
    expect(r.rows[0].snapshot.professional).toBe("Ana");
  });
  it("apenas uma requisição pode iniciar a cobrança", async () => {
    expect(
      (
        await db.query<any>("select public.claim_checkout($1,$2) ok", [
          order.id,
          a,
        ])
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await db.query<any>("select public.claim_checkout($1,$2) ok", [
          order.id,
          a,
        ])
      ).rows[0].ok,
    ).toBe(false);
  });
  it("não gera trabalho de PDF antes da aprovação", async () => {
    expect((await db.query("select * from public.pdf_jobs")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query<any>("select public.claim_pdf_job($1) ok", [order.id]))
        .rows[0].ok,
    ).toBe(false);
  });
  it("rejeita cobrança de um centavo", async () => {
    await db.query(
      "update public.orders set gateway_transaction_id=$1,gateway_order_id=$2 where id=$3",
      ["tx", "go", order.id],
    );
    await expect(
      db.query(
        "select public.confirm_payment('bad',$1,'tx','go',1,'BRL','paid',now(),'hash')",
        [order.id],
      ),
    ).rejects.toThrow("PAYMENT_MISMATCH");
    expect((await db.query("select * from public.pdf_jobs")).rows).toHaveLength(
      0,
    );
  });
  it("aprova uma vez e trata webhook duplicado", async () => {
    const query =
      "select public.confirm_payment('event-1',$1,'tx','go',1990,'BRL','paid',now(),'hash') ok";
    expect((await db.query<any>(query, [order.id])).rows[0].ok).toBe(true);
    expect((await db.query<any>(query, [order.id])).rows[0].ok).toBe(false);
    expect((await db.query("select * from public.pdf_jobs")).rows).toHaveLength(
      1,
    );
    expect(
      (
        await db.query(
          "select * from public.analytics_events where name='payment_approved'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("apenas um gerador assume o PDF", async () => {
    expect(
      (await db.query<any>("select public.claim_pdf_job($1) ok", [order.id]))
        .rows[0].ok,
    ).toBe(true);
    expect(
      (await db.query<any>("select public.claim_pdf_job($1) ok", [order.id]))
        .rows[0].ok,
    ).toBe(false);
  });
  it("evento pendente não regride aprovação", async () => {
    await db.query(
      "select public.confirm_payment('late',$1,'tx','go',1990,'BRL','pending',now(),'hash')",
      [order.id],
    );
    expect(
      (
        await db.query<any>("select status from public.orders where id=$1", [
          order.id,
        ])
      ).rows[0].status,
    ).toBe("paid");
  });
  it("reembolso revoga aprovação e bloqueia novo PDF", async () => {
    await db.query(
      "select public.confirm_payment('refund',$1,'tx','go',1990,'BRL','refunded',now(),'hash')",
      [order.id],
    );
    expect(
      (
        await db.query<any>("select status from public.orders where id=$1", [
          order.id,
        ])
      ).rows[0].status,
    ).toBe("refunded");
    await db.query(
      "update public.pdf_jobs set status='failed' where order_id=$1",
      [order.id],
    );
    expect(
      (await db.query<any>("select public.claim_pdf_job($1) ok", [order.id]))
        .rows[0].ok,
    ).toBe(false);
  });
  it("anon não lê catálogos ou PDFs", async () => {
    await db.exec("set role anon;");
    try {
      await expect(db.query("select * from public.pdf_files")).rejects.toThrow(
        "permission denied",
      );
      await expect(db.query("select * from public.catalogs")).rejects.toThrow(
        "permission denied",
      );
    } finally {
      await db.exec("reset role;");
    }
  });
  it("contabiliza painel sem manipulação do cliente", async () => {
    const r = await db.query<any>("select public.admin_summary() stats");
    expect(r.rows[0].stats.users).toBe(1);
    expect(r.rows[0].stats.revenue).toBe(0);
  });
});
