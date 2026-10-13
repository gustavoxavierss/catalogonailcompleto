import { describe, it, expect } from "vitest";
import {
  emptyCatalog,
  catalogSchema,
  readyErrors,
  contactHref,
  money,
} from "../src/lib/catalog";
import {
  provider,
  validatePayment,
  VerifiedPayment,
} from "../src/lib/payments/provider";
describe("Catálogo e fronteiras de pagamento", () => {
  it("valida rascunho e exige identidade e serviço para finalizar", () => {
    const d = emptyCatalog();
    expect(catalogSchema.safeParse(d).success).toBe(true);
    expect(readyErrors(d)).toHaveLength(2);
  });
  it("rejeita URLs executáveis", () => {
    const d = emptyCatalog();
    d.contacts = [
      {
        id: crypto.randomUUID(),
        kind: "website",
        label: "Site",
        value: "javascript:alert(1)",
        visible: true,
      },
    ];
    expect(catalogSchema.safeParse(d).success).toBe(false);
  });
  it("gera WhatsApp brasileiro com mensagem escapada", () => {
    expect(
      contactHref(
        {
          id: crypto.randomUUID(),
          kind: "whatsapp",
          label: "",
          value: "(11) 99999-9999",
          visible: true,
        },
        "Olá & agendar",
      ),
    ).toBe("https://wa.me/5511999999999?text=Ol%C3%A1%20%26%20agendar");
  });
  it("formata dinheiro sem arredondamento de cobrança", () =>
    expect(money(1990)).toContain("19,90"));
  it("mantém gateway bloqueado sem contrato oficial", async () => {
    expect(provider.available).toBe(false);
    await expect(provider.verifyWebhook("{}", new Headers())).rejects.toThrow(
      "QIAPAY_OFFICIAL_CONTRACT_REQUIRED",
    );
  });
  const order = {
    id: "o1",
    amount: 1990,
    currency: "BRL",
    gateway_transaction_id: "t1",
    gateway_order_id: "g1",
  };
  const event: VerifiedPayment = {
    eventId: "e1",
    orderId: "o1",
    amount: 1990,
    currency: "BRL",
    transactionId: "t1",
    gatewayOrderId: "g1",
    status: "paid",
    occurredAt: new Date().toISOString(),
  };
  it.each([
    { amount: 1 },
    { currency: "USD" },
    { transactionId: "forged" },
    { orderId: "other" },
    { gatewayOrderId: "other" },
  ])("rejeita pagamento divergente %j", (change) =>
    expect(() => validatePayment(order, { ...event, ...change })).toThrow(
      "PAYMENT_MISMATCH",
    ),
  );
  it("aceita somente os identificadores e valor esperados", () =>
    expect(() => validatePayment(order, event)).not.toThrow());
});
