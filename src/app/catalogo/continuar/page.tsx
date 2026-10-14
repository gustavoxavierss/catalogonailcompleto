import { Header } from "@/components/chrome";
import { ImportGuest } from "@/components/import-guest";
import { pageIdentity } from "@/lib/page-auth";
export const dynamic = "force-dynamic";
export default async function ContinueCatalog() {
  await pageIdentity();
  return (
    <>
      <Header privatePage />
      <main className="shell page">
        <ImportGuest />
      </main>
    </>
  );
}
