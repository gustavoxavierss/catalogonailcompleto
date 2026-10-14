"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LockKeyhole, LoaderCircle } from "lucide-react";
import { allImages, Catalog } from "@/lib/catalog";
import {
  GuestDraft,
  guestPhoto,
  saveGuest,
  saveGuestPhoto,
  startGuest,
} from "@/lib/guest-draft";
import { GuestContext } from "./guest-context";
import { Editor } from "./editor";
import { CatalogPreview } from "./catalog-preview";
export function GuestCatalog() {
  const [draft, setDraft] = useState<GuestDraft>();
  const current = useRef<GuestDraft | undefined>(undefined);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState(false),
    [error, setError] = useState("");
  const objectUrls = useRef<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    startGuest()
      .then(async (d) => {
        const images: Record<string, string> = {};
        for (const image of allImages(d.document)) {
          const blob = await guestPhoto(image.id);
          if (blob) {
            images[image.id] = URL.createObjectURL(blob);
            objectUrls.current.push(images[image.id]);
          }
        }
        if (cancelled) {
          Object.values(images).forEach(URL.revokeObjectURL);
          return;
        }
        current.current = d;
        setDraft(d);
        setUrls(images);
      })
      .catch(() =>
        setError(
          "Permita o armazenamento neste navegador para salvar seu catálogo. Depois, recarregue esta página.",
        ),
      );
    return () => {
      cancelled = true;
      objectUrls.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  const save = useCallback(async (document: Catalog) => {
    const d = { ...current.current!, document };
    await saveGuest(d);
    current.current = d;
    setDraft(d);
  }, []);
  const upload = useCallback(async (file: File) => {
    const img = await saveGuestPhoto(file),
      blob = await guestPhoto(img.id);
    if (!blob) throw new Error("Não conseguimos salvar essa foto.");
    const url = URL.createObjectURL(blob);
    objectUrls.current.push(url);
    setUrls((old) => ({ ...old, [img.id]: url }));
    return img;
  }, []);
  if (error)
    return (
      <div className="message" role="alert">
        {error}
      </div>
    );
  if (!draft)
    return (
      <p role="status">
        <LoaderCircle className="spinning" /> Preparando seu espaço criativo…
      </p>
    );
  return (
    <GuestContext.Provider
      value={{ save, upload, urls, finish: () => setLocked(true) }}
    >
      {locked ? (
        <section className="guest-result">
          <div className="center">
            <span className="eyebrow">FEITO POR VOCÊ</span>
            <h1>Seu catálogo está ficando lindo! 💅</h1>
            <p className="muted">
              Crie sua conta gratuita para conferir todos os detalhes e escolher
              como liberar seu PDF.
            </p>
          </div>
          <div className="locked-preview">
            <div className="blurred-catalog" aria-hidden="true" inert>
              <CatalogPreview document={draft.document} />
            </div>
            <div className="preview-lock card">
              <LockKeyhole size={32} />
              <h2>Seu catálogo, guardado para você</h2>
              <p>
                Faça um cadastro rápido para salvar seu trabalho e ver a prévia
                completa.
              </p>
              <Link href="/cadastro" className="button full">
                CRIAR CONTA E VER MEU CATÁLOGO
              </Link>
              <p className="small muted">
                Cadastro gratuito. O PDF é liberado somente após o pagamento.
              </p>
              <Link href="/login" className="text-link">
                Já tenho uma conta
              </Link>
            </div>
          </div>
          <button className="secondary" onClick={() => setLocked(false)}>
            Voltar e ajustar meu catálogo
          </button>
        </section>
      ) : (
        <>
          <p className="guest-save-note">
            Comece sem cadastro. Seu rascunho fica salvo neste navegador; após
            criar sua conta, ele será transferido para ela.
          </p>
          <Editor id={draft.id} initial={draft.document} revision={1} />
        </>
      )}
    </GuestContext.Provider>
  );
}
