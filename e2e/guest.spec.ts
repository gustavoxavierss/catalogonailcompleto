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
  const email =
    process.env.E2E_REGISTER_EMAIL ||
    `catalog-qa-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "aA1!";
  await page.getByLabel("Seu e-mail").fill(email);
  await page.getByLabel(/^Sua senha/).fill(password);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Criar minha conta", exact: true })
    .click();
  await page.waitForURL("**/preview", { timeout: 60000 });
  await page.getByRole("button", { name: "VER SERVIÇOS", exact: true }).click();
  await expect(page.locator(".catalog-preview")).toContainText(
    "Manicure de teste",
  );
  await page.getByRole("button", { name: "Conheça-me", exact: true }).click();
  const image = page.locator(".catalog-preview img.portrait");
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
  const release = page.getByRole("button", {
    name: "LIBERAR MEU CATÁLOGO",
    exact: true,
  });
  if (process.env.E2E_PAYMENTS_READY) {
    await expect(release).toBeEnabled();
    const catalogId = new URL(page.url()).pathname.split("/")[2];
    const origin = new URL(page.url()).origin;
    for (const plan of ["single", "monthly"]) {
      const options = {
        headers: { Origin: origin },
        data: { plan, amount: 1 },
      };
      const response = await page.request.post(
        `/api/catalogs/${catalogId}/checkout`,
        options,
      );
      expect(response.status()).toBe(200);
      const order = await response.json();
      const checkout = new URL(order.checkoutUrl);
      expect(checkout.origin).toBe("https://pay.wiapy.com");
      expect(checkout.pathname).toBe(
        plan === "single" ? "/G5KoHkHx8TSP" : "/6ace76946ebcdbf6682ec046",
      );
      expect(checkout.searchParams.get("utm_content")).toBe(order.orderId);
      const repeat = await page.request.post(
        `/api/catalogs/${catalogId}/checkout`,
        options,
      );
      expect(repeat.status()).toBe(200);
      expect((await repeat.json()).orderId).toBe(order.orderId);
      const status = await page.request.get(
        `/api/catalogs/${catalogId}/payment`,
      );
      expect(status.status()).toBe(200);
      const saved = (await status.json()).orders.find(
        (item: { id: string }) => item.id === order.orderId,
      );
      expect(saved.amount).toBe(plan === "single" ? 1990 : 1599);
      expect(saved.status).toBe("pending");
      const download = await page.request.post(
        `/api/orders/${order.orderId}/download`,
        { headers: { Origin: origin } },
      );
      expect(download.status()).toBe(403);
      expect(download.headers()["content-type"]).not.toContain(
        "application/pdf",
      );
    }
  } else {
    await expect(release).toBeDisabled();
  }
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByRole("button", { name: "Sair da minha conta" }).click();
  await page.waitForURL("/");
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
  await page.getByLabel("Seu e-mail").fill(email);
  await page.getByLabel(/^Sua senha/).fill(password);
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await page.waitForURL("**/dashboard");
  await expect(
    page.getByText("Ana Teste", { exact: true }).first(),
  ).toBeVisible();
});
