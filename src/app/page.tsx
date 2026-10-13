import Link from "next/link";
import Image from "next/image";
import { PlanCards } from "@/components/plan-cards";
import {
  ArrowUpRight,
  Check,
  FileText,
  Heart,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Header, Footer } from "@/components/chrome";
import { settings } from "@/lib/server";
import { money } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function Landing() {
  const config = await settings();
  return (
    <>
      <Header name={config.name} />
      <main className="shell">
        <section className="hero">
          <div>
            <div className="eyebrow">Seu talento merece ser visto</div>
            <h1 style={{ marginTop: 25 }}>
              Seu trabalho é lindo.
              <br />
              Seu catálogo
              <br />
              também pode ser.
            </h1>
            <p>
              Crie seu catálogo profissional de Nail Designer em poucos minutos
              💅 Adicione fotos, serviços, preços e contatos. Seu PDF
              profissional por apenas{" "}
              <strong>{money(config.priceCents)}</strong>.
            </p>
            <Link className="button" href="/cadastro">
              CRIAR MEU CATÁLOGO <ArrowUpRight size={18} />
            </Link>
            <div className="trust">
              <span>
                <Check size={14} /> Avulso sem mensalidade
              </span>
              <span>
                <Check size={14} /> Comece gratuitamente
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Referência de catálogo profissional"
          >
            <Image className="hero-catalog-image" src="/catalogo-mikaelly.png" alt="Catálogo de procedimentos de Mikaelly, com fotos de unhas e apresentação profissional em tons rosé e bege" width={423} height={726} sizes="(max-width: 700px) 300px, 380px" priority />
            <div className="floating-note">
              <span className="round-icon">
                <Check size={18} />
              </span>
              <div>
                <strong>Pronto para encantar</strong>
                <br />
                <span className="muted">
                  Seu catálogo, com a sua identidade.
                </span>
              </div>
            </div>
          </div>
        </section>
        <div className="benefits">
          {[
            [Heart, "Avulso ou mensal"],
            [Smartphone, "Feito para o celular"],
            [FileText, "PDF profissional"],
            [Sparkles, "Pronto para compartilhar"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Heart;
            return (
              <div key={String(label)}>
                <I size={21} />
                <span>{String(label)}</span>
              </div>
            );
          })}
        </div>
        <section id="como-funciona" className="section">
          <div className="center">
            <div className="eyebrow">SIMPLES DO COMEÇO AO FIM</div>
            <h2 style={{ marginTop: 14 }}>
              Você cuida dos detalhes.
              <br />A gente cuida do catálogo.
            </h2>
            <p className="muted">
              Nenhum conhecimento técnico. Só você e o seu melhor trabalho.
            </p>
          </div>
          <div className="steps-grid">
            {[
              [
                "Adicione suas informações",
                "Conte um pouco sobre você e deixe seus contatos.",
              ],
              [
                "Mostre seus serviços",
                "Escolha suas melhores fotos e informe seus preços.",
              ],
              [
                "Dê o seu toque",
                "Escolha entre quatro estilos e personalize as cores.",
              ],
              ["Confira como ficou", "Veja a prévia completa antes de pagar."],
              [
                `Libere por ${money(config.priceCents)}`,
                "Um único pagamento, sem mensalidade.",
              ],
              [
                "Baixe seu PDF",
                "Após a confirmação, compartilhe com suas clientes.",
              ],
            ].map(([title, desc], i) => (
              <div className="step-card" key={title}>
                <span className="step-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p className="muted small">{desc}</p>
              </div>
            ))}
          </div>
        </section>
        <PlanCards price={config.priceCents} />
        <section className="cta-panel">
          <div className="eyebrow">O PRÓXIMO PASSO É SEU</div>
          <h2 style={{ marginTop: 14 }}>Vamos criar seu catálogo?</h2>
          <p className="muted">
            Suas próximas clientes vão adorar conhecer seu trabalho.
          </p>
          <Link className="button" href="/cadastro">
            Comece agora <ArrowUpRight size={18} />
          </Link>
        </section>
        <div style={{ height: 70 }} />
      </main>
      <Footer name={config.name} />
    </>
  );
}
