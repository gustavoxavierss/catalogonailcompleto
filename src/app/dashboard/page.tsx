import Link from "next/link";
import { BookOpen, ArrowUpRight, Image, Layers } from "lucide-react";
import { pageIdentity } from "@/lib/page-auth";
import { adminDb, settings } from "@/lib/server";
import { allImages, Catalog, paymentLabels, hasPdf } from "@/lib/catalog";
import { Header, Footer } from "@/components/chrome";
import { NewCatalog } from "@/components/new-catalog";
export const metadata = {
  title: "Seu espaço",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const { user } = await pageIdentity();
  const db = adminDb();
  const [{ data: catalogs, error }, { data: profile }, config] =
    await Promise.all([
      db
        .from("catalogs")
        .select("*,orders(id,status,created_at,pdf_files(id))")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      db.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      settings(),
    ]);
  if (error) throw error;
  return (
    <>
      <Header name={config.name} privatePage />
      <main className="shell page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">UM ESPAÇO PARA O SEU TALENTO</div>
            <h1 style={{ marginTop: 14 }}>
              Olá, {profile?.name?.split(" ")[0] || "profissional"} 👋
            </h1>
            <p className="muted">
              Vamos mostrar ao mundo o que você faz de melhor?
            </p>
          </div>
          <NewCatalog />
        </div>
        <div className="stats">
          <div className="stat">
            Seus catálogos<strong>{catalogs?.length || 0}</strong>
          </div>
          <div className="stat">
            Serviços cadastrados
            <strong>
              {catalogs?.reduce((n, c) => n + c.document.services.length, 0) ||
                0}
            </strong>
          </div>
          <div className="stat">
            Fotos adicionadas
            <strong>
              {catalogs?.reduce(
                (n, c) => n + allImages(c.document).length,
                0,
              ) || 0}
            </strong>
          </div>
          <div className="stat">
            PDFs disponíveis
            <strong>
              {catalogs?.reduce(
                (n, c) =>
                  n +
                  c.orders.filter(
                    (o: { status: string; pdf_files: unknown }) =>
                      o.status === "paid" && hasPdf(o.pdf_files),
                  ).length,
                0,
              ) || 0}
            </strong>
          </div>
        </div>
        <h2 style={{ fontSize: 28, marginTop: 40 }}>Seu Catálogo</h2>
        {!catalogs?.length ? (
          <div className="card empty">
            <span className="round-icon">
              <BookOpen size={30} />
            </span>
            <h2>Seu próximo capítulo começa aqui</h2>
            <p className="muted">
              Adicione suas fotos e serviços. Nós ajudamos com o resto.
            </p>
            <NewCatalog />
          </div>
        ) : (
          <div className="grid">
            {catalogs.map((c) => {
              const d = c.document as Catalog;
              const orders = [...c.orders].sort((a, b) =>
                b.created_at.localeCompare(a.created_at),
              );
              const latest = orders[0];
              const paid = orders.find((o) => o.status === "paid");
              return (
                <article className="card" key={c.id}>
                  <div
                    className="inline"
                    style={{
                      justifyContent: "space-between",
                      marginBottom: 22,
                    }}
                  >
                    <span className="round-icon">
                      <BookOpen size={22} />
                    </span>
                    <span
                      className={
                        "badge " + (latest?.status === "paid" ? "paid" : "")
                      }
                    >
                      {latest?.status === "paid" && hasPdf(latest.pdf_files)
                        ? "PDF disponível"
                        : latest
                          ? paymentLabels[latest.status]
                          : d.services.length
                            ? "Pronto para gerar"
                            : "Rascunho"}
                    </span>
                  </div>
                  <h3>
                    {d.business || d.professional || "Meu primeiro catálogo"}
                  </h3>
                  <p className="muted small">
                    <Layers size={13} /> {d.services.length} serviços ·{" "}
                    <Image size={13} /> {allImages(d).length} fotos
                  </p>
                  <p className="muted small">
                    Última edição:{" "}
                    {new Date(c.updated_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </p>
                  <div className="actions">
                    <Link className="button" href={`/catalogo/${c.id}/editar`}>
                      Continuar editando <ArrowUpRight size={16} />
                    </Link>
                    <Link
                      className="button secondary"
                      href={`/catalogo/${c.id}/preview`}
                    >
                      Visualizar catálogo
                    </Link>
                    <Link
                      className="button ghost"
                      href={`/catalogo/${c.id}/${paid ? "pagamento" : "checkout"}`}
                    >
                      {paid ? "Baixar PDF" : "Gerar catálogo"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer name={config.name} />
    </>
  );
}
