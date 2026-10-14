import { Header } from "@/components/chrome";
import { GuestCatalog } from "@/components/guest-catalog";
export const dynamic = "force-dynamic";
export default async function New() {
  return (
    <>
      <Header />
      <main className="shell page">
        <GuestCatalog />
      </main>
    </>
  );
}
