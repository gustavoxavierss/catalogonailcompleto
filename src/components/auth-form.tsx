"use client";
import { useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { loadGuest } from "@/lib/guest-draft";
export function AuthForm({
  mode,
}: {
  mode: "login" | "register" | "recover" | "password" | "logout";
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          email: f.get("email"),
          password: f.get("password"),
          accept: f.get("accept") === "on",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.redirect || mode === "logout") {
        let pending = false;
        if (mode === "login" || mode === "register") {
          try {
            pending = !!(await loadGuest());
          } catch {
            /* Login works even when local storage is unavailable. */
          }
        }
        location.href = pending ? "/catalogo/continuar" : d.redirect || "/";
      } else setMessage(d.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {mode === "register" && (
        <label className="field">
          Como você se chama?
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
          />
        </label>
      )}
      {!["password", "logout"].includes(mode) && (
        <label className="field">
          Seu e-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
      {["login", "register", "password"].includes(mode) && (
        <label className="field">
          {mode === "password" ? "Sua nova senha" : "Sua senha"}
          <input
            name="password"
            type="password"
            minLength={10}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
          />
          <span className="muted small">Pelo menos 10 caracteres.</span>
        </label>
      )}
      {mode === "register" && (
        <label className="check">
          <input name="accept" type="checkbox" required />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank">
              <u>Termos de Uso</u>
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank">
              <u>Política de Privacidade</u>
            </Link>
            .
          </span>
        </label>
      )}
      {message && (
        <p role="status" className="message">
          {message}
        </p>
      )}
      <button className="full" disabled={busy}>
        {busy && <LoaderCircle className="spinning" size={18} />}
        {
          {
            login: "Entrar na minha conta",
            register: "Criar minha conta",
            recover: "Receber instruções",
            password: "Salvar nova senha",
            logout: "Sair da minha conta",
          }[mode]
        }
      </button>
      {mode === "login" && (
        <>
          <p className="center small" style={{ marginTop: 18 }}>
            <Link href="/recuperar-senha">Esqueci minha senha</Link>
          </p>
          <p className="center small muted">
            Primeira vez aqui?{" "}
            <Link href="/cadastro">
              <u>Crie sua conta</u>
            </Link>
          </p>
        </>
      )}
      {mode === "register" && (
        <p className="center small" style={{ marginTop: 18 }}>
          Já tem uma conta?{" "}
          <Link href="/login">
            <u>Entrar</u>
          </Link>
        </p>
      )}
    </form>
  );
}
