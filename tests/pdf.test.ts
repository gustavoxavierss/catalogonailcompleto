import { it, expect } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { emptyCatalog } from "../src/lib/catalog";
import { renderCatalogPdf } from "../src/lib/pdf-engine";
it("gera A4 multipágina com fotos proporcionais, acentos, QR e links", async () => {
  const d = emptyCatalog();
  d.professional = "Ana — TESTE";
  d.business = "Catálogo de teste";
  d.about =
    "Documento exclusivo de verificação. Não é um catálogo comprado. " +
    "Cuidados personalizados para suas unhas. ".repeat(20);
  d.contacts = [
    {
      id: crypto.randomUUID(),
      kind: "whatsapp",
      label: "Agende pelo WhatsApp",
      value: "11999999999",
      visible: true,
    },
  ];
  const id = crypto.randomUUID();
  d.cover = { id, path: "test.jpg", name: "Imagem de teste" };
  d.services = [
    {
      id: crypto.randomUUID(),
      name: "Alongamento em Gel",
      description: "Alongamento resistente e natural feito em gel. ".repeat(45),
      price: 12000,
      promotion: 9900,
      categoryId: d.categories[0].id,
      duration: "90 minutos",
      note: "Horário sujeito a disponibilidade.",
      images: [d.cover],
    },
  ];
  const jpg = await sharp({
    create: { width: 500, height: 300, channels: 3, background: "#d7b2a0" },
  })
    .jpeg()
    .toBuffer();
  const bytes = await renderCatalogPdf(d, async () => jpg);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
  for (const p of pdf.getPages()) {
    expect(p.getWidth()).toBeCloseTo(595.28);
    expect(p.getHeight()).toBeCloseTo(841.89);
  }
  expect(pdf.getPages().some((p) => p.node.has(PDFName.of("Annots")))).toBe(
    true,
  );
  mkdirSync("../../work/qa", { recursive: true });
  writeFileSync("../../work/qa/catalog-test.pdf", bytes);
});
