import { notFound } from "next/navigation";
import Link from "next/link";
import { Header, Footer } from "@/components/chrome";
import { Editor } from "@/components/editor";
import { CatalogPreview } from "@/components/catalog-preview";
import { PaymentPanel } from "@/components/payment-panel";
import { pageIdentity } from "@/lib/page-auth";
import { AppError, ownedCatalog, settings, track } from "@/lib/server";
import { Catalog, readyErrors } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function CatalogPage({
  params,
}: {
  params: Promise<{ id: string; action: string }>;
}) {
  const { id, action } = await params;
  if (
    ![
      "editar",
      "preview",
      "checkout",
      "pagamento",
      "sucesso",
      "download",
    ].includes(action)
  )
    notFound();
  const { user } = await pageIdentity();
  let record;
  try {
    record = await ownedCatalog(id, user.id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const config = await settings();
  const d = record.document as Catalog;
  return (
    <>
      <Header name={config.name} privatePage />
      <main className="shell page">
        {action === "editar" ? (
          <Editor id={id} initial={d} revision={record.revision} />
        ) : action === "preview" ? (
          <>
            <div className="page-heading">
              <div>
                <h1>Confira como ficou</h1>
                <p className="muted">
                  Prévia do catálogo. O PDF terá diagramação própria em A4.
                </p>
              </div>
              <div className="actions">
                <Link
                  className="button secondary"
                  href={`/catalogo/${id}/editar`}
                >
                  Continuar editando
                </Link>
                <Link className="button" href={`/catalogo/${id}/checkout`}>
                  Gerar meu catálogo
                </Link>
              </div>
            </div>
            <CatalogPreview document={d} />
          </>
        ) : (
          <PaymentPanel
            catalogId={id}
            price={config.priceCents}
            mode={action === "checkout" ? "checkout" : "payment"}
            errors={action === "checkout" ? readyErrors(d) : []}
          />
        )}
      </main>
      <Footer name={config.name} />
    </>
  );
}
