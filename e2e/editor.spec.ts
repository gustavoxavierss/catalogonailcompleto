import { test, expect } from "@playwright/test";
test("editor real: etapas, autosave, fotos, serviços, ordem e prévia", async ({
  page,
}, info) => {
  let revision = 1;
  let saved: any;
  await page.route("**/api/catalogs/*", async (route) => {
    if (route.request().method() === "PUT") {
      saved = route.request().postDataJSON().document;
      await route.fulfill({ json: { revision: ++revision } });
    } else await route.continue();
  });
  await page.route("**/api/catalogs/*/images", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000002",
        path: "test/image.jpg",
        name: "teste.png",
      },
    }),
  );
  await page.route("**/api/images/*", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a28sAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("http://127.0.0.1:4173");
  await page.getByLabel("Seu nome profissional").fill("Ana de Teste");
  await page
    .getByLabel("Sua foto ou do espaço")
    .setInputFiles({
      name: "teste.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a28sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(page.getByText("Salvo ✓", { exact: true })).toBeVisible();
  expect(saved.professional).toBe("Ana de Teste");
  expect(saved.portrait).not.toBeNull();
  await page.getByRole("button", { name: "2 Contato" }).click();
  await page.getByRole("button", { name: "Adicionar contato" }).click();
  await page.getByLabel("Número com DDD").fill("11999999999");
  await page.getByRole("button", { name: "3 Serviços" }).click();
  await page
    .getByRole("button", { name: "Adicionar serviço", exact: true })
    .click();
  await page.getByLabel("Nome do serviço").fill("Manicure");
  await page.getByLabel("Quanto você cobra?").fill("45");
  await page
    .getByRole("button", { name: "Adicionar serviço", exact: true })
    .click();
  await page.getByLabel("Nome do serviço").nth(1).fill("Pedicure");
  await page.getByRole("button", { name: "Subir serviço" }).nth(1).click();
  await expect(page.getByLabel("Nome do serviço").first()).toHaveValue(
    "Pedicure",
  );
  await page.getByRole("button", { name: "4 Seu estilo" }).click();
  await page.getByRole("button", { name: "Aa Rosé" }).click();
  await page.getByRole("button", { name: "5 Conferir" }).click();
  await expect(page.getByText("PRÉVIA", { exact: true })).toBeVisible();
  await expect(page.getByText("Salvo ✓", { exact: true })).toBeVisible();
  expect(saved.services[0].name).toBe("Pedicure");
  expect(saved.theme.template).toBe("rose");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../../work/qa/editor-${info.project.name}.png`,
    fullPage: true,
  });
});
