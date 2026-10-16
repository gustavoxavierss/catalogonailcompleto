import { it, expect } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import sharp from "sharp";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
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
it("mantém fotos verticais grandes com composição preenchida no A4", async () => {
  const d = emptyCatalog();
  d.professional = "Ana · Homologação visual";
  const names = ["horizontal", "tall", "square", "low", "portrait", "panorama"];
  d.services = names.map((name) => ({
    id: crypto.randomUUID(),
    name: `Fotografia ${name}`,
    description: "Catálogo exclusivo de testes de diagramação.",
    price: 12000,
    promotion: null,
    categoryId: d.categories[0].id,
    duration: "1h30",
    note: "Imagem original preservada.",
    images: [{ id: crypto.randomUUID(), path: name, name }],
  }));
  d.cover = d.services[0].images[0];
  d.portrait = d.services[4].images[0];
  const tallPhoto = await sharp({
    create: { width: 390, height: 1500, channels: 3, background: "#b98b82" },
  })
    .jpeg()
    .toBuffer();
  const files = Object.fromEntries(
    await Promise.all(
      names.map(async (name) => [
        name,
        await sharp(
          name === "tall"
            ? tallPhoto
            : readFileSync("public/catalogo-mikaelly.png"),
        )
          .resize(
            name === "tall" ? 390 : 900,
            name === "tall"
              ? 1500
              : name === "horizontal"
                ? 500
                : name === "panorama"
                  ? 250
                  : name === "square"
                    ? 900
                    : 1300,
            { fit: "cover" },
          )
          .jpeg()
          .toBuffer(),
      ]),
    ),
  );
  const bytes = await renderCatalogPdf(d, async (path) => files[path]);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(9);
  for (const page of pdf.getPages()) {
    expect(page.getWidth()).toBeCloseTo(595.28);
    expect(page.getHeight()).toBeCloseTo(841.89);
  }
  writeFileSync("../../work/qa/catalog-image-layouts.pdf", bytes);
});
