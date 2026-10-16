import { test, expect } from "@playwright/test";
test("catálogo editorial: imagens amplas, orientação, detalhes, zoom e navegação", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.goto("http://127.0.0.1:4173/?preview");
  const root = page.locator(".catalog-preview");
  const cover = page.locator('[data-media-role="cover"]');
  await expect(cover).toBeVisible();
  expect((await cover.boundingBox())!.height).toBeGreaterThan(400);
  await page.screenshot({
    path: `../../work/qa/catalog-cover-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "VER SERVIÇOS", exact: true }).click();
  const media = page.locator('article [data-media-role="service"]');
  await expect(media).toHaveCount(6);
  const expected = [
    "landscape",
    "tall",
    "square",
    "landscape",
    "portrait",
    "panorama",
  ];
  for (let i = 0; i < 6; i++) {
    const item = media.nth(i);
    await item.scrollIntoViewIfNeeded();
    await expect(item).toHaveAttribute("data-orientation", expected[i]);
    await expect
      .poll(() =>
        item
          .locator("img.catalog-photo")
          .evaluate((el: HTMLImageElement) => el.naturalWidth),
      )
      .toBeGreaterThan(0);
    const box = (await item.boundingBox())!;
    const rootBox = (await root.boundingBox())!;
    expect(box.width).toBeGreaterThan(
      info.project.name.startsWith("mobile")
        ? rootBox.width * 0.97
        : rootBox.width * 0.5,
    );
    const img = await item.locator("img.catalog-photo").boundingBox();
    expect(img!.width).toBeGreaterThan(box.width * 0.85);
    await item.locator("..").screenshot({
      path: `../../work/qa/catalog-case-${i + 1}-${info.project.name}.png`,
    });
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Galeria com três fotos", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Agende com antecedência");
  await expect(
    dialog.getByRole("link", { name: "AGENDAR HORÁRIO" }),
  ).toHaveAttribute("href", /wa\.me\/5511999999999/);
  await dialog.getByRole("button", { name: "Ver todas as 3 fotos" }).click();
  await expect(dialog).toHaveAccessibleName("Fotografias em tela cheia");
  await dialog.getByRole("button", { name: "Aumentar zoom" }).click();
  await expect(dialog).toContainText("150%");
  await dialog.getByRole("button", { name: "Próxima foto" }).click();
  await expect(dialog).toContainText("2/3");
  await expect(dialog).toContainText("100%");
  const stage = dialog.locator("[data-zoom]");
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(dialog).toContainText("3/3");
  if (info.project.name === "mobile-390") {
    const cdp = await page.context().newCDPSession(page);
    const y = box.y + box.height * 0.5;
    const x = box.x + box.width * 0.5;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 30, y },
        { x: x + 30, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 60, y },
        { x: x + 60, y },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => Number(await stage.getAttribute("data-zoom")))
      .toBeGreaterThan(1.5);
    await cdp.detach();
  }
  await page.screenshot({
    path: `../../work/qa/catalog-fullscreen-${info.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "Fechar fotografia" }).click();
  await expect(dialog).toContainText("Antes de agendar");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Conheça-me", exact: true }).click();
  const portrait = page.locator('[data-media-role="portrait"]');
  await expect(portrait).toBeVisible();
  const portraitBox = (await portrait.boundingBox())!;
  expect(portraitBox.width).toBeGreaterThan(
    info.project.name.startsWith("mobile")
      ? (await root.boundingBox())!.width * 0.97
      : 300,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(root.locator('[class*="panel"]')).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: `../../work/qa/catalog-about-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Portfólio", exact: true }).click();
  await expect(
    page.getByLabel("Portfólio").locator("img.catalog-photo"),
  ).toHaveCount(8);
  await page
    .getByRole("button", { name: "Localização e contato", exact: true })
    .click();
  await expect(page.getByRole("link", { name: /Ver no mapa/ })).toHaveAttribute(
    "href",
    /google\.com\/maps/,
  );
});
