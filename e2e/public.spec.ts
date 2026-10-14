import { test, expect } from "@playwright/test";
test("apresentação responsiva conduz ao editor sem cadastro", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Seu talento",
  );
  const hero = page.getByAltText(/Referência visual de catálogo editorial/);
  await expect(hero).toBeVisible();
  await expect
    .poll(() => hero.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  const images = page.locator('main img[src*="landing"]');
  await expect(images).toHaveCount(5);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(
    page.getByRole("heading", { name: "Seu catálogo sempre à mão" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../../work/qa/landing-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "CRIAR MEU CATÁLOGO" }).first().click();
  await expect(page.getByLabel("Seu nome profissional")).toBeVisible();
  await expect(page.getByLabel("Seu e-mail", { exact: true })).toHaveCount(0);
});
test("rotas privadas e webhook não liberam acesso anônimo", async ({
  request,
  page,
}) => {
  const r = await request.post(
    "/api/orders/00000000-0000-0000-0000-000000000000/download",
    {
      headers: { origin: process.env.E2E_BASE_URL || "http://localhost:3000" },
    },
  );
  expect([401, 503]).toContain(r.status());
  const hook = await request.post("/api/payments/webhook/qiapay", {
    data: { status: "paid", amount: 1 },
  });
  expect([400, 401, 503]).toContain(hook.status());
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/(configuracao|login)$/);
  await expect(page.getByText("Visão do negócio", { exact: true })).toHaveCount(
    0,
  );
});
