import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  FileText,
  Smartphone,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { PlanCards } from "@/components/plan-cards";
import { Header, Footer } from "@/components/chrome";
import { settings } from "@/lib/server";
import { money } from "@/lib/catalog";
import styles from "./landing.module.css";

export const dynamic = "force-dynamic";
const steps = [
  [
    "Conte sua história",
    "Adicione seu nome, sua apresentação e os contatos para agendamento.",
  ],
  [
    "Mostre seu melhor trabalho",
    "Escolha fotos bonitas, organize seus serviços e informe os preços.",
  ],
  [
    "Dê o seu toque",
    "Escolha um dos quatro estilos e personalize cores e fontes.",
  ],
  [
    "Confira cada detalhe",
    "Crie sua conta para guardar o catálogo e ver a prévia completa.",
  ],
  [
    "Escolha como liberar",
    "Pagamento único para uma versão ou plano mensal para continuar atualizando.",
  ],
  [
    "Compartilhe seu catálogo",
    "Com o pagamento confirmado, baixe o PDF e envie para suas clientes.",
  ],
];

export default async function Landing() {
  const config = await settings();
  return (
    <div className={styles.landing}>
      <Header name={config.name} />
      <main className={styles.container}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <span className={styles.overline}>
              <span /> FEITO PARA VALORIZAR SEU TRABALHO
            </span>
            <h1 id="hero-title">
              Seu talento merece uma <em>apresentação à altura.</em>
            </h1>
            <p className={styles.intro}>
              Transforme suas fotos, serviços e preços em um catálogo
              profissional. Fácil de criar, bonito de compartilhar e com a sua
              identidade.
            </p>
            <div className={styles.actions}>
              <Link className="button" href="/catalogo/novo">
                CRIAR MEU CATÁLOGO <ArrowUpRight size={19} />
              </Link>
              <a className={styles.textLink} href="#como-funciona">
                Veja como funciona <span aria-hidden>↓</span>
              </a>
            </div>
            <p className={styles.heroHint}>
              Comece sem cadastro. Libere seu PDF por{" "}
              <strong>{money(config.priceCents)}</strong> ou escolha o plano
              mensal.
            </p>
            <div className={styles.trust}>
              <span>
                <Check size={15} /> Sem experiência em design
              </span>
              <span>
                <Check size={15} /> Feito para o celular
              </span>
            </div>
          </div>
          <figure className={styles.heroVisual}>
            <div className={styles.heroImage}>
              <Image
                src="/landing/catalogo-editorial.webp"
                alt="Referência visual de catálogo editorial em tons de areia e café, apresentado em notebook, tablet e páginas impressas"
                width={1600}
                height={900}
                sizes="(max-width: 900px) 100vw, 58vw"
                preload
              />
              <div className={styles.imageLabel}>
                <Sparkles size={14} /> SUA HISTÓRIA, BEM APRESENTADA
              </div>
            </div>
            <div className={styles.visualNote}>
              <span className={styles.noteIcon}>
                <FileText size={22} />
              </span>
              <div>
                <strong>Uma nova forma de apresentar seu talento.</strong>
                <span>Fotos, serviços e contatos no mesmo lugar.</span>
              </div>
            </div>
            <figcaption>
              Inspiração visual de apresentação e diagramação.
            </figcaption>
          </figure>
        </section>

        <div className={styles.benefits} aria-label="Benefícios do catálogo">
          <div>
            <Smartphone size={21} />
            <span>Crie pelo celular</span>
          </div>
          <div>
            <Sparkles size={21} />
            <span>Quatro estilos para escolher</span>
          </div>
          <div>
            <FileText size={21} />
            <span>PDF pronto para compartilhar</span>
          </div>
          <div>
            <ShieldCheck size={21} />
            <span>Você confere antes de pagar</span>
          </div>
        </div>

        <section className={styles.showcase} aria-labelledby="showcase-title">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.overline}>BELEZA EM CADA DETALHE</span>
              <h2 id="showcase-title">
                Mais do que uma lista de serviços.
                <br />
                <em>Um convite para conhecer você.</em>
              </h2>
            </div>
            <p>
              Para nail designers, manicures e espaços de beleza que querem
              apresentar seu trabalho com mais cuidado, clareza e personalidade.
            </p>
          </div>
          <div className={styles.featureShowcase}>
            <figure>
              <Image
                src="/landing/multidispositivos.webp"
                alt="Inspiração de catálogo com apresentação consistente em celular, tablet e computador"
                width={1600}
                height={900}
                sizes="(max-width: 760px) 100vw, 65vw"
              />
              <figcaption>
                Referência visual · apresentação em diferentes telas
              </figcaption>
            </figure>
            <div className={styles.featureCopy}>
              <span className={styles.smallNumber}>01 / SUA IDENTIDADE</span>
              <h3>
                Seu trabalho.{" "}
                <br />
                Seu estilo.{" "}
                <br />
                Seu catálogo.
              </h3>
              <p>
                Reúna sua apresentação, suas melhores fotos e seus serviços em
                uma composição que combina com você.
              </p>
              <ul>
                <li>
                  <Check size={16} /> Fotos e serviços organizados
                </li>
                <li>
                  <Check size={16} /> Preços claros para suas clientes
                </li>
                <li>
                  <Check size={16} /> Contatos e links de agendamento
                </li>
              </ul>
              <Link className={styles.textLink} href="/catalogo/novo">
                Quero criar o meu <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <div className={styles.editorialGrid}>
            <article>
              <figure>
                <Image
                  src="/landing/detalhes.webp"
                  alt="Referência de páginas editoriais com fotografias proporcionais, tipografia elegante e cores naturais"
                  width={1600}
                  height={900}
                  sizes="(max-width: 760px) 100vw, 50vw"
                />
              </figure>
              <div className={styles.editorialCaption}>
                <span className={styles.smallNumber}>
                  02 / OS DETALHES IMPORTAM
                </span>
                <h3>Uma apresentação que valoriza suas fotos.</h3>
                <p>
                  Escolha suas cores e um dos estilos Elegante, Minimalista,
                  Rosé ou Luxo. A sua identidade aparece em cada página.
                </p>
              </div>
            </article>
            <article>
              <figure>
                <Image
                  src="/landing/transformacao.webp"
                  alt="Inspiração visual do processo de organizar fotografias até chegar a um catálogo com diagramação profissional"
                  width={1600}
                  height={900}
                  sizes="(max-width: 760px) 100vw, 50vw"
                />
              </figure>
              <div className={styles.editorialCaption}>
                <span className={styles.smallNumber}>
                  03 / TUDO NO SEU LUGAR
                </span>
                <h3>Do seu acervo a um catálogo organizado.</h3>
                <p>
                  Separe por categorias, ajuste a ordem dos serviços e confira o
                  resultado antes de liberar o PDF.
                </p>
              </div>
            </article>
          </div>
          <p className={styles.referenceNote}>
            As imagens desta seção são referências visuais de composição. Seu
            catálogo será criado com suas fotos e os modelos disponíveis na
            plataforma.
          </p>
        </section>

        <section
          id="como-funciona"
          className={styles.process}
          aria-labelledby="process-title"
        >
          <div className={styles.processIntro}>
            <span className={styles.overline}>DO SEU TALENTO AO SEU PDF</span>
            <h2 id="process-title">
              Você entra com as ideias.
              <br />
              <em>A gente organiza a apresentação.</em>
            </h2>
            <p>
              Um passo de cada vez, com tudo explicado. Você pode começar agora
              e continuar de onde parou.
            </p>
          </div>
          <figure className={styles.processImage}>
            <Image
              src="/landing/criacao.webp"
              alt="Referência visual das etapas de seleção das fotos, organização do conteúdo e apresentação final de um catálogo"
              width={1600}
              height={900}
              sizes="(max-width: 760px) 100vw, 1200px"
            />
            <figcaption>
              Inspiração visual · do conteúdo à apresentação final
            </figcaption>
          </figure>
          <div className={styles.steps}>
            {steps.map(([title, description], i) => (
              <article key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.plans}>
          <PlanCards price={config.priceCents} />
        </div>
        <section className={styles.finalCta} aria-labelledby="cta-title">
          <span className={styles.overline}>
            SEU PRÓXIMO CAPÍTULO COMEÇA AQUI
          </span>
          <h2 id="cta-title">
            Seu trabalho já é especial.
            <br />
            <em>Agora, mostre isso ao mundo.</em>
          </h2>
          <p>Vamos criar um catálogo com a sua cara?</p>
          <Link className="button" href="/catalogo/novo">
            CRIAR MEU CATÁLOGO <ArrowUpRight size={19} />
          </Link>
          <span className={styles.ctaHint}>
            Comece gratuitamente · Escolha seu plano depois da prévia
          </span>
        </section>
      </main>
      <Footer name={config.name} />
    </div>
  );
}
