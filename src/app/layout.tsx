import type { Metadata } from "next";
import "./globals.css";
import { settings } from "@/lib/server";
export async function generateMetadata(): Promise<Metadata> {
  const platform = await settings();
  return {
    title: {
      default: `${platform.name} — Seu talento merece ser visto`,
      template: `%s | ${platform.name}`,
    },
    description:
      "Crie seu catálogo de serviços de beleza com fotos, preços e contatos. Fácil no celular, PDF profissional e sem mensalidade.",
    openGraph: {
      title: platform.name,
      description: "Transforme seu talento em um catálogo profissional.",
      type: "website",
      locale: "pt_BR",
    },
  };
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
