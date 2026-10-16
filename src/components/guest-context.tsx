"use client";
import { createContext, useContext } from "react";
import type { Catalog, CatalogImage } from "@/lib/catalog";
export const GuestContext = createContext<null | {
  save: (document: Catalog) => Promise<void>;
  upload: (file: File) => Promise<CatalogImage>;
  finish: () => void;
  urls: Record<string, string>;
}>(null);
export function useImageSource() {
  const guest = useContext(GuestContext);
  return (id: string, width?: number) =>
    guest ? guest.urls[id] : `/api/images/${id}${width ? `?w=${width}` : ""}`;
}
