import { test, expect } from "@playwright/test";
test("conta real: login, catálogo, salvamento, serviço, prévia, checkout bloqueado e logout", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Exige Supabase configurado e uma conta exclusiva de homologação.",
  );
  await page.goto("/login");
  await page.getByLabel("Seu e-mail").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Sua senha").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await page.waitForURL("**/dashboard");
  await page
    .getByRole("button", { name: "Criar meu catálogo" })
    .first()
    .click();
  await page.waitForURL("**/editar");
  await page.getByLabel("Seu nome profissional").fill("Teste automatizado");
  await expect(page.getByRole("status")).toHaveText(/Salvo/);
  await page.getByRole("button", { name: "3 Serviços" }).click();
  await page
    .getByRole("button", { name: "Adicionar serviço", exact: true })
    .click();
  await page.getByLabel("Nome do serviço").fill("Manicure de teste");
  await page.getByLabel("Quanto você cobra?").fill("45");
  await expect(page.getByRole("status")).toHaveText(/Salvo/);
  await page.reload();
  await page.getByRole("button", { name: "3 Serviços" }).click();
  await expect(page.getByLabel("Nome do serviço")).toHaveValue(
    "Manicure de teste",
  );
  await page.getByRole("button", { name: "5 Conferir" }).click();
  await expect(page.getByText("PRÉVIA", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gerar meu catálogo" }).click();
  await page.getByRole("button", { name: /LIBERAR MEU CATÁLOGO/ }).click();
  await expect(page.getByRole("status")).toContainText(
    "pagamentos ainda estão sendo preparados",
  );
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByRole("button", { name: "Sair da minha conta" }).click();
  await page.waitForURL("/");
});
