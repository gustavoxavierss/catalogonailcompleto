import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header, Footer } from "@/components/chrome";
import { AdminSettings } from "@/components/admin-settings";
import { administrator, adminDb, AppError, settings } from "@/lib/server";
import { money, paymentLabels } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};
export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  try {
    await administrator();
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect("/login");
    if (e instanceof AppError && e.status === 503) redirect("/configuracao");
    notFound();
  }
  const section = (await params).section?.[0] || "dashboard";
  if (
    !["dashboard", "usuarios", "pagamentos", "configuracoes"].includes(section)
  )
    notFound();
  const query = await searchParams;
  const search = (query.q || "").slice(0, 100);
  const page = Math.max(0, Number(query.page) || 0);
  const db = adminDb();
  const config = await settings();
  const summary = await db.rpc("admin_summary");
  if (summary.error) throw summary.error;
  const stats = summary.data;
  let usersQuery = db
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (search)
    usersQuery = usersQuery.ilike("name", `%${search.replace(/[%_]/g, "")}%`);
  const users = await usersQuery.range(page * 30, page * 30 + 29);
  const payments = await db.rpc("admin_payments", {
    p_query: search,
    p_offset: page * 30,
  });
  if (users.error) throw users.error;
  if (payments.error) throw payments.error;
  return (
    <>
      <Header name={config.name} privatePage />
      <main className="shell page">
        <div className="page-heading">
          <h1>Visão do negócio</h1>
          <span className="badge">Administração</span>
        </div>
        <nav className="actions" style={{ marginBottom: 30 }}>
          {[
            ["dashboard", "Visão geral"],
            ["usuarios", "Usuárias"],
            ["pagamentos", "Pagamentos"],
            ["configuracoes", "Configurações"],
          ].map(([path, label]) => (
            <Link
              key={path}
              href={path === "dashboard" ? "/admin" : `/admin/${path}`}
              className={`button ${section === path ? "" : "secondary"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {section === "configuracoes" ? (
          <AdminSettings initial={config} />
        ) : (
          <>
            {section === "dashboard" && (
              <>
                <div className="stats">
                  {[
                    ["Usuárias", stats.users],
                    ["Catálogos", stats.catalogs],
                    ["Pagamentos pendentes", stats.pending],
                    ["Pagamentos aprovados", stats.paid],
                    ["Faturamento aprovado", money(stats.revenue)],
                    ["PDFs gerados", stats.pdfs],
                  ].map(([label, value]) => (
                    <div className="stat" key={String(label)}>
                      {label}
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <h2>Funil de conversão</h2>
                  <p className="muted small">
                    Pessoas únicas por etapa. “Terminou” significa que validou o
                    catálogo para liberação.
                  </p>
                  <div className="stats">
                    {Object.entries(stats.funnel as Record<string, number>).map(
                      ([label, value]) => (
                        <div key={label} className="stat">
                          {(
                            {
                              catalog_created: "Começaram",
                              catalog_completed: "Terminaram",
                              checkout_started: "Foram pagar",
                              payment_approved: "Pagaram",
                              pdf_downloaded: "Baixaram",
                            } as Record<string, string>
                          )[label] || label}
                          <strong>{value}</strong>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
            {section !== "dashboard" && (
              <form className="inline" style={{ marginBottom: 20 }}>
                <input
                  style={{ maxWidth: 400 }}
                  name="q"
                  defaultValue={search}
                  placeholder={
                    section === "usuarios"
                      ? "Pesquisar por nome"
                      : "Nome, e-mail, pedido ou transação"
                  }
                  aria-label="Pesquisar"
                />
                <button>Pesquisar</button>
              </form>
            )}
            {section === "usuarios" ? (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.data?.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!users.data?.length && <p>Nenhuma usuária encontrada.</p>}
              </div>
            ) : (
              <div className="card table-wrap" style={{ marginTop: 25 }}>
                <h3>Pagamentos</h3>
                <table>
                  <thead>
                    <tr>
                      {[
                        "Nome",
                        "E-mail",
                        "Catálogo",
                        "Valor",
                        "Gateway",
                        "Status",
                        "Data",
                        "Transação",
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.data?.map(
                      (p: Record<string, string | number>) => (
                        <tr key={String(p.id)}>
                          <td>{p.name}</td>
                          <td>{p.email}</td>
                          <td>{p.catalog_name}</td>
                          <td>{money(Number(p.amount))}</td>
                          <td>{p.gateway}</td>
                          <td>
                            <span
                              className={
                                "badge " + (p.status === "paid" ? "paid" : "")
                              }
                            >
                              {paymentLabels[p.status]}
                            </span>
                          </td>
                          <td>
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td>{p.gateway_transaction_id || "—"}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                {!payments.data?.length && <p>Nenhum pagamento encontrado.</p>}
              </div>
            )}
            {section !== "dashboard" && (
              <div className="actions" style={{ marginTop: 20 }}>
                {page > 0 && (
                  <Link
                    className="button secondary"
                    href={`?q=${encodeURIComponent(search)}&page=${page - 1}`}
                  >
                    Anterior
                  </Link>
                )}
                <Link
                  className="button secondary"
                  href={`?q=${encodeURIComponent(search)}&page=${page + 1}`}
                >
                  Próxima página
                </Link>
              </div>
            )}
          </>
        )}
      </main>
      <Footer name={config.name} />
    </>
  );
}
