import { Header, Footer } from "@/components/chrome";
export default function Setup() {
  return (
    <>
      <Header />
      <main className="shell page">
        <div className="card empty">
          <h1 style={{ fontSize: 38 }}>Estamos preparando seu espaço</h1>
          <p className="muted">
            A plataforma ainda precisa ser conectada ao serviço de contas e
            armazenamento.
          </p>
          <p>Volte em breve para criar seu catálogo.</p>
          <a className="button secondary" href="/">
            Voltar ao início
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
