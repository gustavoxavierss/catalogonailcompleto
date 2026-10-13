"use client";
import { useState } from "react";
import { Plus, LoaderCircle } from "lucide-react";
export function NewCatalog() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/catalogs", { method: "POST" });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            location.href = `/catalogo/${d.id}/editar`;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Tente novamente.");
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircle className="spinning" size={18} />
        ) : (
          <Plus size={18} />
        )}
        Criar meu catálogo
      </button>
      {error && (
        <p className="message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
