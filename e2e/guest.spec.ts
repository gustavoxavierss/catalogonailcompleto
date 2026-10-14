import { test, expect, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";
async function prepare(page: Page) {
  await page.goto("/");
  await expect(
    page.locator("header").getByRole("link", { name: "Entrar", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "CRIAR MEU CATÁLOGO", exact: false })
    .first()
    .click();
  await page.getByLabel("Seu nome profissional").fill("Ana Teste");
  await page
    .getByLabel("Sua foto ou do espaço", { exact: true })
    .setInputFiles(path.join(process.cwd(), "public/catalogo-mikaelly.png"));
  await expect(page.locator(".upload-box img")).toHaveCount(1);
  await page.getByRole("button", { name: "3 Serviços" }).click();
  await page
    .getByRole("button", { name: "Adicionar serviço", exact: true })
    .click();
  await page
    .getByLabel("Nome do serviço", { exact: true })
    .fill("Manicure de teste");
  await page.getByLabel("Quanto você cobra?").fill("45");
  await expect(page.locator(".save-state")).toContainText("Salvo");
  await page.reload();
  await expect(page.getByLabel("Seu nome profissional")).toHaveValue(
    "Ana Teste",
  );
  await expect(page.locator(".upload-box img")).toHaveCount(1);
  await page.getByRole("button", { name: "3 Serviços" }).click();
  await expect(page.getByLabel("Nome do serviço", { exact: true })).toHaveValue(
    "Manicure de teste",
  );
  await page.getByRole("button", { name: "5 Conferir" }).click();
  await page.getByRole("button", { name: "Gerar meu catálogo" }).click();
  await expect(page.locator(".preview-lock")).toBeVisible();
  await expect(page.locator(".blurred-catalog")).toHaveCSS(
    "filter",
    "blur(9px)",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("criação sem login, foto persistida, prévia com cadeado e layout responsivo", async ({
  page,
}) => {
  let apiCalls = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/catalogs")) apiCalls++;
  });
  await prepare(page);
  expect(apiCalls).toBe(0);
});
test("cadastro real transfere rascunho e foto; sessão permite edição e saída", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  test.skip(
    info.project.name !== "desktop" || !process.env.E2E_REAL_REGISTER,
    "Executar uma única vez contra o Supabase de teste do catálogo.",
  );
  await prepare(page);
  await page
    .getByRole("link", { name: "CRIAR CONTA E VER MEU CATÁLOGO" })
    .click();
  await page.getByLabel("Como você se chama?").fill("QA Catálogo");
  await page
    .getByLabel("Seu e-mail")
    .fill(`catalog-qa-${randomUUID()}@example.invalid`);
  await page.getByLabel(/^Sua senha/).fill(randomUUID() + "aA1!");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Criar minha conta", exact: true })
    .click();
  await page.waitForURL("**/preview", { timeout: 60000 });
  await expect(page.locator(".catalog-preview")).toContainText(
    "Manicure de teste",
  );
  const image = page.locator(".catalog-preview .portrait");
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await page
    .getByRole("link", { name: "Gerar meu catálogo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Catálogo avulso" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Seu catálogo sempre à mão" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "LIBERAR MEU CATÁLOGO", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByRole("button", { name: "Sair da minha conta" }).click();
  await page.waitForURL("/");
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
});
