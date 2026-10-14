import { Catalog, CatalogImage, draftSchema, emptyCatalog } from "./catalog";

export type GuestDraft = {
  id: string;
  document: Catalog;
  imported?: Record<string, CatalogImage>;
};
const DB = "meu-catalogo-rascunho";
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("draft");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new Error(
          "Não conseguimos abrir o rascunho. Permita o armazenamento neste navegador.",
        ),
      );
  });
}
async function read<T>(key: string): Promise<T | undefined> {
  const db = await database();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const r = db.transaction("draft").objectStore("draft").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
async function write(key: string, value: unknown) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("draft", "readwrite");
      tx.objectStore("draft").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(
          new Error(
            "Não conseguimos salvar. Verifique o espaço disponível neste navegador.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function loadGuest(): Promise<GuestDraft | undefined> {
  const draft = await read<GuestDraft>("current");
  if (draft) draft.document = draftSchema.parse(draft.document);
  return draft;
}
export async function startGuest() {
  const existing = await loadGuest();
  if (existing) return existing;
  const draft: GuestDraft = {
    id: crypto.randomUUID(),
    document: emptyCatalog(),
  };
  await saveGuest(draft);
  return draft;
}
export const saveGuest = (draft: GuestDraft) => write("current", draft);
export const guestPhoto = (id: string) => read<Blob>("photo:" + id);
export async function saveGuestPhoto(file: File): Promise<CatalogImage> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 4194304
  )
    throw new Error("Escolha uma imagem JPG, PNG ou WebP com até 4 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não conseguimos preparar essa foto.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Escolha outra foto."))),
        "image/jpeg",
        0.88,
      ),
    );
    const id = crypto.randomUUID();
    await write("photo:" + id, blob);
    return { id, path: "guest/" + id, name: file.name.slice(0, 120) };
  } finally {
    bitmap.close();
  }
}
export async function clearGuest() {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("draft", "readwrite");
      tx.objectStore("draft").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
