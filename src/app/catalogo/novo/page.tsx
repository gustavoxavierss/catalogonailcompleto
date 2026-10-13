import { Header } from "@/components/chrome";
import { NewCatalog } from "@/components/new-catalog";
import { pageIdentity } from "@/lib/page-auth";
export const dynamic = "force-dynamic";
export default async function New() {
  await pageIdentity();
  return (
    <>
      <Header privatePage />
      <main className="shell page">
        <div className="card empty">
          <h1>Vamos criar seu catálogo?</h1>
          <p>Seu catálogo será salvo na sua conta.</p>
          <NewCatalog />
        </div>
      </main>
    </>
  );
}
