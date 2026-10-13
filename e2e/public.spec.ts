import { test, expect } from "@playwright/test";
test("landing e cadastro responsivos sem rolagem horizontal", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Seu trabalho é lindo",
  );
  const hero = page.getByAltText(/Catálogo de procedimentos de Mikaelly/);
  await expect(hero).toBeVisible();
  await expect.poll(() => hero.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText("R$ 15,99", { exact: false })).toBeVisible();
  await page.getByText("Conhecer assinatura mensal", { exact: true }).click();
  const external = page.getByRole("link", { name: "Consultar checkout externo" });
  await expect(external).toHaveAttribute("href", "https://pay.wiapy.com/6ace76946ebcdbf6682ec046");
  await expect(page.getByText(/este link, sozinho, não ativa/).last()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../../work/qa/landing-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "CRIAR MEU CATÁLOGO" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Vamos criar seu catálogo?",
  );
  await expect(page.getByLabel("Seu e-mail")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Termos de Uso", exact: true })
    .first()
    .evaluate((el) => el.removeAttribute("target"));
  await page
    .getByRole("link", { name: "Termos de Uso", exact: true })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Termos de Uso",
  );
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
  expect(hook.status()).toBe(503);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/(configuracao|login)$/);
  await expect(page.getByText("Visão do negócio", { exact: true })).toHaveCount(
    0,
  );
});
