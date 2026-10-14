"use client";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { allImages, CatalogImage } from "@/lib/catalog";
import {
  clearGuest,
  guestPhoto,
  loadGuest,
  saveGuest,
} from "@/lib/guest-draft";

export function ImportGuest() {
  const [message, setMessage] = useState("Salvando seu catálogo na sua conta…");
  const [error, setError] = useState(false);
  useEffect(() => {
    async function transfer() {
      const draft = await loadGuest();
      if (!draft) {
        location.replace("/dashboard");
        return;
      }
      async function request(url: string, init?: RequestInit) {
        const res = await fetch(url, init);
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.error || "Não conseguimos transferir seu catálogo.",
          );
        return data;
      }
      const { id } = await request("/api/catalogs", {
        method: "POST",
        headers: { "X-Draft-Id": draft.id },
      });
      const mapped = draft.imported || {};
      const images = allImages(draft.document);
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (mapped[img.id]) continue;
        const blob = await guestPhoto(img.id);
        if (!blob)
          throw new Error(
            "Uma foto não está mais neste navegador. Volte ao catálogo e substitua essa foto.",
          );
        setMessage(`Salvando foto ${i + 1} de ${images.length}…`);
        const form = new FormData();
        form.append("file", blob, "foto.jpg");
        mapped[img.id] = await request(`/api/catalogs/${id}/images`, {
          method: "POST",
          body: form,
        });
        draft.imported = mapped;
        await saveGuest(draft);
      }
      const replace = (img: CatalogImage | null) =>
        img ? mapped[img.id] : null;
      const document = {
        ...draft.document,
        logo: replace(draft.document.logo),
        portrait: replace(draft.document.portrait),
        cover: replace(draft.document.cover),
        services: draft.document.services.map((s) => ({
          ...s,
          images: s.images.map((img) => mapped[img.id]),
        })),
      };
      const current = await request(`/api/catalogs/${id}`);
      // Never overwrite edits made after a successful import in another tab.
      if (current.revision === 1)
        await request(`/api/catalogs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document, revision: current.revision }),
        });
      await clearGuest();
      location.replace(`/catalogo/${id}/preview`);
    }
    // A single import across StrictMode effect replays in the same page.
    const promise = ((
      window as Window & { catalogImport?: Promise<void> }
    ).catalogImport ??= transfer());
    promise.catch(() => {
      setMessage(
        "Não conseguimos concluir a transferência. Seu rascunho continua salvo neste navegador.",
      );
      setError(true);
    });
  }, []);
  return (
    <div className="card empty" role="status">
      {!error && <LoaderCircle className="spinning" />}
      <h1>Seu catálogo vai com você</h1>
      <p>{message}</p>
      {error && (
        <div className="actions">
          <button onClick={() => location.reload()}>Tentar novamente</button>
          <Link className="button secondary" href="/catalogo/novo">
            Voltar ao rascunho
          </Link>
        </div>
      )}
    </div>
  );
}
