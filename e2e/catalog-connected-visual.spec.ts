import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { emptyCatalog, type CatalogImage } from "../src/lib/catalog";

test("catálogo real: upload adaptativo, dados persistidos e fotos grandes no celular", async ({
  page,
  browser,
}, info) => {
  test.skip(
    !process.env.E2E_IMAGE_QA || info.project.name !== "desktop",
    "Homologação real opt-in, executada uma única vez.",
  );
  test.setTimeout(180000);
  const origin = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
  const headers = { Origin: origin };
  const registered = await page.request.post("/api/auth/register", {
    headers,
    data: {
      name: "QA Imagens Catálogo",
      email: `daffemm+imagens-${randomUUID().slice(0, 8)}@gmail.com`,
      password: randomUUID() + "Aa1!",
      accept: true,
    },
  });
  expect(registered.status()).toBe(200);
  expect((await registered.json()).redirect).toBe("/dashboard");
  const created = await page.request.post("/api/catalogs", { headers });
  expect(created.status()).toBe(200);
  const { id } = await created.json();
  const photos: CatalogImage[] = [];
  for (const name of [
    "horizontal",
    "tall",
    "square",
    "low",
    "portrait",
    "panorama",
    "square",
    "portrait",
  ]) {
    const upload = await page.request.post(`/api/catalogs/${id}/images`, {
      headers,
      multipart: {
        file: {
          name: `${name}.jpg`,
          mimeType: "image/jpeg",
          buffer: readFileSync(`tests/ui/fixtures/${name}.jpg`),
        },
      },
    });
    expect(upload.status()).toBe(200);
    const image = await upload.json();
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    photos.push(image);
  }
  const small = await page.request.get(`/api/images/${photos[0].id}?w=320`);
  expect(small.headers()["content-type"]).toBe("image/webp");
  expect((await sharp(await small.body()).metadata()).width).toBe(320);
  const large = await page.request.get(`/api/images/${photos[0].id}?w=1440`);
  expect((await sharp(await large.body()).metadata()).width).toBe(1440);
  const tall = await page.request.get(`/api/images/${photos[1].id}?w=1440`);
  expect((await sharp(await tall.body()).metadata()).height).toBe(1500);
  const anonymous = await browser.newContext();
  expect(
    (
      await anonymous.request.get(`${origin}/api/images/${photos[0].id}?w=1440`)
    ).status(),
  ).toBe(401);
  await anonymous.close();
  const state = await (await page.request.get(`/api/catalogs/${id}`)).json();
  const d = emptyCatalog();
  d.professional = "Ana · Homologação de imagens";
  d.business = "Ateliê de Beleza";
  d.about = "Uma apresentação profissional com suas fotos em destaque.";
  d.cover = photos[0];
  d.portrait = photos[4];
  d.contacts = [
    {
      id: randomUUID(),
      kind: "whatsapp",
      label: "Agende pelo WhatsApp",
      value: "11999999999",
      visible: true,
    },
  ];
  d.services = photos
    .slice(0, 6)
    .map((image, i) => ({
      id: randomUUID(),
      name: [
        "Alongamento em gel",
        "Captura vertical",
        "Nail art",
        "Imagem pequena",
        "Manicure",
        "Galeria completa",
      ][i],
      description: "Atendimento personalizado e acabamento cuidadoso.",
      price: 12000,
      promotion: null,
      duration: "1h30",
      note: "Agende com antecedência.",
      categoryId: d.categories[0].id,
      images: i === 5 ? [image, photos[6], photos[7]] : [image],
    }));
  // Legacy assets without dimensions must still classify after the image loads.
  delete d.services[1].images[0].width;
  delete d.services[1].images[0].height;
  const saved = await page.request.put(`/api/catalogs/${id}`, {
    headers,
    data: { document: d, revision: state.revision },
  });
  expect(saved.status()).toBe(200);
  for (const width of [360, 375, 390, 393, 412, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/catalogo/${id}/preview`);
    await expect(
      page.getByRole("heading", { name: "Ateliê de Beleza", exact: true }),
    ).toBeVisible();
    const hero = page.locator('[data-media-role="cover"]');
    await expect(hero).toBeVisible();
    await page
      .getByRole("button", { name: "VER SERVIÇOS", exact: true })
      .click();
    const image = page.locator('[data-media-role="service"]').first();
    await expect(image).toHaveAttribute("data-orientation", "landscape");
    if (width < 760)
      expect((await image.boundingBox())!.width).toBeGreaterThan(width - 40);
    const screenshot = page.locator('[data-media-role="service"]').nth(1);
    await screenshot.scrollIntoViewIfNeeded();
    await expect(screenshot).toHaveAttribute("data-orientation", "tall");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1440)
      await image
        .locator("..")
        .screenshot({ path: `../../work/qa/catalog-real-${width}.png` });
    await page.getByRole("button", { name: "Conheça-me", exact: true }).click();
    await expect(page.locator("img.portrait")).toBeVisible();
  }
  const edited = await (await page.request.get(`/api/catalogs/${id}`)).json();
  expect(edited.document.services).toHaveLength(6);
});
