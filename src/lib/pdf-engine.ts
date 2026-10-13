import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFName,
  PDFString,
  PDFFont,
  PDFPage,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
} from "pdf-lib";
import QRCode from "qrcode";
import { Catalog, contactHref, money } from "./catalog";
export async function renderCatalogPdf(
  d: Catalog,
  loadImage: (path: string) => Promise<Uint8Array>,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(d.business || d.professional);
  pdf.setAuthor(d.professional);
  pdf.setSubject("Catálogo profissional");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const heading = await pdf.embedFont(
    d.theme.font === "serif"
      ? StandardFonts.TimesRoman
      : StandardFonts.HelveticaBold,
  );
  const hex = (s: string) =>
    rgb(
      parseInt(s.slice(1, 3), 16) / 255,
      parseInt(s.slice(3, 5), 16) / 255,
      parseInt(s.slice(5, 7), 16) / 255,
    );
  const ink = hex(d.theme.heading);
  const accent = hex(d.theme.primary);
  let page!: PDFPage;
  let y = 780;
  const safe = (s: string) =>
    [...s]
      .map((c) => {
        try {
          regular.encodeText(c);
          return c;
        } catch {
          return "";
        }
      })
      .join("");
  function newPage() {
    page = pdf.addPage([595.28, 841.89]);
    y = 780;
    page.drawRectangle({
      x: 0,
      y: 828,
      width: 595.28,
      height: 14,
      color: accent,
    });
  }
  function text(
    value: string,
    size = 12,
    font: PDFFont = regular,
    color = rgb(0.18, 0.17, 0.17),
  ) {
    y -= size;
    const width = 499;
    const words = safe(value).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        let chunk = "";
        for (const c of word) {
          if (font.widthOfTextAtSize(chunk + c, size) > width) {
            lines.push(chunk);
            chunk = "";
          }
          chunk += c;
        }
        line = chunk;
        continue;
      }
      const next = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      if (y - size < 60) newPage();
      page.drawText(l, { x: 48, y, size, font, color });
      y -= size * 1.55;
    }
    y -= 8;
  }
  async function photo(path: string, height: number) {
    if (y - height < 60) newPage();
    const img = await pdf.embedJpg(await loadImage(path));
    const ratio = Math.min(499 / img.width, height / img.height);
    const w = img.width * ratio,
      h = img.height * ratio;
    const x = (595.28 - w) / 2,
      bottom = y - h;
    if (d.theme.imageShape === "rounded") {
      const r = Math.min(12, w / 4, h / 4),
        k = r * 0.55228475;
      page.pushOperators(
        pushGraphicsState(),
        moveTo(x + r, bottom),
        lineTo(x + w - r, bottom),
        appendBezierCurve(
          x + w - r + k,
          bottom,
          x + w,
          bottom + r - k,
          x + w,
          bottom + r,
        ),
        lineTo(x + w, bottom + h - r),
        appendBezierCurve(
          x + w,
          bottom + h - r + k,
          x + w - r + k,
          bottom + h,
          x + w - r,
          bottom + h,
        ),
        lineTo(x + r, bottom + h),
        appendBezierCurve(
          x + r - k,
          bottom + h,
          x,
          bottom + h - r + k,
          x,
          bottom + h - r,
        ),
        lineTo(x, bottom + r),
        appendBezierCurve(x, bottom + r - k, x + r - k, bottom, x + r, bottom),
        closePath(),
        clip(),
        endPath(),
      );
    }
    page.drawImage(img, { x, y: bottom, width: w, height: h });
    if (d.theme.imageShape === "rounded")
      page.pushOperators(popGraphicsState());
    y -= h + 24;
  }
  function link(label: string, url: string) {
    if (y < 85) newPage();
    const cleaned = safe(label);
    const yy = y - 12;
    text(cleaned, 12, bold, accent);
    page.node.addAnnot(
      pdf.context.register(
        pdf.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [48, yy - 3, 547, yy + 16],
          Border: [0, 0, 0],
          A: { Type: "Action", S: PDFName.of("URI"), URI: PDFString.of(url) },
        }),
      ),
    );
  }
  newPage();
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 595.28,
    height: 828,
    color: hex(d.theme.secondary),
  });
  text("CATÁLOGO DE SERVIÇOS", 10, bold, accent);
  y -= 22;
  if (d.logo) await photo(d.logo.path, 90);
  text(d.business || d.professional, 34, heading, ink);
  if (d.business && d.professional) text(d.professional, 15);
  if (d.cover) await photo(d.cover.path, 400);
  text("Cuidado, beleza e um momento só seu.", 15, heading, ink);
  newPage();
  text("Prazer em conhecer você", 28, heading, ink);
  if (d.portrait) await photo(d.portrait.path, 230);
  text(d.professional, 19, heading, ink);
  text(
    d.about || "Conheça meus serviços e encontre seu próximo cuidado favorito.",
  );
  if (d.specialties) {
    text("Especialidades", 15, bold, ink);
    text(d.specialties);
  }
  const groups = [...d.categories, { id: null, name: "Outros serviços" }];
  for (const cat of groups) {
    const services = d.services.filter((s) => s.categoryId === cat.id);
    for (const s of services) {
      newPage();
      if (d.theme.card !== "clean")
        page.drawRectangle({
          x: 32,
          y: 48,
          width: 531.28,
          height: 752,
          color: d.theme.card === "soft" ? hex(d.theme.secondary) : undefined,
          borderColor: d.theme.card === "outlined" ? accent : undefined,
          borderWidth: d.theme.card === "outlined" ? 1 : 0,
        });
      text(cat.name.toUpperCase(), 10, bold, accent);
      text(s.name, 27, heading, ink);
      if (s.images[0]) await photo(s.images[0].path, 320);
      text(s.description);
      if (s.promotion !== null) {
        text(`De ${money(s.price)}`, 12);
        text(money(s.promotion), 24, bold, accent);
      } else text(money(s.price), 24, bold, accent);
      if (s.duration) text("Duração: " + s.duration);
      if (s.note) text(s.note);
      for (let i = 1; i < s.images.length; i++) {
        newPage();
        text(s.name + " · Galeria", 20, heading, ink);
        await photo(s.images[i].path, 620);
      }
    }
  }
  newPage();
  text("Gostou de algum serviço?", 30, heading, ink);
  text("Entre em contato comigo e agende seu horário.", 16);
  y -= 15;
  for (const c of d.contacts.filter((c) => c.visible && c.value))
    link(c.label || c.kind, contactHref(c, d.whatsappMessage));
  if (d.address.visible) {
    text(
      [
        d.address.street,
        d.address.district,
        d.address.city,
        d.address.state,
        d.address.zip,
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }
  const qr = d.contacts.find((c) => c.visible && c.value && c.kind === d.qr);
  if (qr) {
    const png = await QRCode.toBuffer(contactHref(qr, d.whatsappMessage), {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    const img = await pdf.embedPng(png);
    if (y < 220) newPage();
    page.drawImage(img, { x: 48, y: y - 140, width: 140, height: 140 });
    y -= 160;
    text("Aponte a câmera e agende seu horário.", 10);
  }
  const pages = pdf.getPages();
  let footerName = safe(d.business || d.professional);
  while (regular.widthOfTextAtSize(footerName, 9) > 400)
    footerName = footerName.slice(0, -1);
  pages.forEach((p, i) =>
    p.drawText(`${footerName}  |  ${i + 1} / ${pages.length}`, {
      x: 48,
      y: 28,
      size: 9,
      font: regular,
      color: rgb(0.4, 0.4, 0.4),
    }),
  );
  return pdf.save();
}
