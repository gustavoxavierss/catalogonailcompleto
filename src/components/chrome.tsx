import Link from "next/link";
import { Sparkles } from "lucide-react";
import { settings } from "@/lib/server";
export async function Header({
  name,
  privatePage = false,
}: {
  name?: string;
  privatePage?: boolean;
}) {
  const platform = await settings();
  name ??= platform.name;
  return (
    <header className="shell">
      <div className="topbar">
        <Link href={privatePage ? "/dashboard" : "/"} className="brand">
          {platform.logo ? (
            <img
              src={platform.logo}
              alt=""
              width={38}
              height={42}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <span className="brand-icon">
              <Sparkles size={19} />
            </span>
          )}
          <span>
            {name}
            <small>FEITO PARA ENCANTAR</small>
          </span>
        </Link>
        <nav className="nav">
          {privatePage ? (
            <>
              <Link href="/dashboard">Meus catálogos</Link>
              <form action="/sair" method="get">
                <button className="ghost">Sair</button>
              </form>
            </>
          ) : (
            <>
              <a className="desktop" href="/#como-funciona">
                Como funciona
              </a>
              <Link className="button secondary" href="/catalogo/novo">
                Começar agora <span aria-hidden>↗</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
export async function Footer({ name }: { name?: string }) {
  const platform = await settings();
  name ??= platform.name;
  return (
    <footer className="shell">
      <div className="footer">
        <span>
          © {new Date().getFullYear()} {name}. Feito para valorizar seu
          trabalho.
        </span>
        <div className="inline">
          {platform.supportEmail && (
            <a href={`mailto:${platform.supportEmail}`}>Suporte</a>
          )}
          {platform.supportWhatsapp && (
            <a
              href={`https://wa.me/${platform.supportWhatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp de suporte
            </a>
          )}
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
        </div>
      </div>
    </footer>
  );
}
