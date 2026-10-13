"use client";
import { useState } from "react";
import { DEFAULTS } from "@/lib/catalog";
export function AdminSettings({ initial }: { initial: typeof DEFAULTS }) {
  const [value, setValue] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(value),
          });
          const d = await r.json();
          setMessage(
            r.ok
              ? "Configurações salvas. Novos pedidos usarão o novo preço."
              : d.error,
          );
        } catch {
          setMessage("Não foi possível salvar. Tente novamente.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Configurações da plataforma</h2>
      <label className="field">
        Nome da plataforma
        <input
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
          required
        />
      </label>
      <label className="field">
        Preço do catálogo (R$)
        <input
          type="number"
          min="1"
          step="0.01"
          value={value.priceCents / 100}
          onChange={(e) =>
            setValue({
              ...value,
              priceCents: Math.round(Number(e.target.value) * 100),
            })
          }
          required
        />
      </label>
      <label className="field">
        Logo (endereço HTTPS)
        <input
          type="url"
          value={value.logo}
          onChange={(e) => setValue({ ...value, logo: e.target.value })}
        />
      </label>
      <label className="field">
        E-mail de suporte
        <input
          type="email"
          value={value.supportEmail}
          onChange={(e) => setValue({ ...value, supportEmail: e.target.value })}
        />
      </label>
      <label className="field">
        WhatsApp de suporte
        <input
          value={value.supportWhatsapp}
          onChange={(e) =>
            setValue({ ...value, supportWhatsapp: e.target.value })
          }
        />
      </label>
      <p className="small muted">
        As credenciais do gateway são configuradas somente no ambiente seguro do
        servidor.
      </p>
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
      <button disabled={busy}>
        {busy ? "Salvando…" : "Salvar configurações"}
      </button>
    </form>
  );
}
