import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Header, Footer } from "@/components/chrome";
const pages = {
  login: {
    mode: "login",
    title: "Que bom ter você aqui",
    desc: "Entre para continuar criando seu catálogo.",
  },
  cadastro: {
    mode: "register",
    title: "Salve seu catálogo e veja como ficou",
    desc: "Crie sua conta gratuita. Depois, escolha o plano para liberar seu PDF.",
  },
  "recuperar-senha": {
    mode: "recover",
    title: "Vamos recuperar seu acesso",
    desc: "Informe o e-mail da sua conta.",
  },
  "redefinir-senha": {
    mode: "password",
    title: "Escolha uma nova senha",
    desc: "Use uma senha que só você conheça.",
  },
  sair: {
    mode: "logout",
    title: "Até logo!",
    desc: "Seu catálogo continuará salvo para quando você voltar.",
  },
} as const;
export const metadata = { robots: { index: false, follow: false } };
export default async function AuthPage({
  params,
}: {
  params: Promise<{ auth: string }>;
}) {
  const key = (await params).auth as keyof typeof pages;
  if (!pages[key]) notFound();
  const p = pages[key];
  return (
    <>
      <Header />
      <main className="shell">
        <div className="auth card">
          <div className="eyebrow">SEU ESPAÇO CRIATIVO</div>
          <h1 style={{ marginTop: 16 }}>{p.title}</h1>
          <p className="muted">{p.desc}</p>
          <AuthForm mode={p.mode} />
        </div>
      </main>
      <Footer />
    </>
  );
}
