import { beforeEach, describe, expect, it } from "vitest";
import {
  verifyWiapyWebhook,
  wiapyCheckoutUrl,
} from "../src/lib/payments/wiapy";
import { OFFERS } from "../src/lib/offers";
const secret = "test-only-webhook-secret-not-for-production";
const id = "1c611ace-6230-4b44-b198-e4569d753cc7";
const headers = () => new Headers({ authorization: secret });
const single = () => ({
  payment: {
    id: "transaction-test",
    status: "paid",
    amount: 1990,
    type: "payment",
    dt_update: "2026-10-14T12:00:00Z",
  },
  checkout: { id: String(OFFERS.single.checkoutId), amount: 1990 },
  tracking: { utm_content: id },
  subscription: {},
});
beforeEach(() => {
  process.env.QIAPAY_WEBHOOK_SECRET = secret;
});
describe("Contrato Wiapy documentado", () => {
  it("valida token e vincula a referência do pedido", () => {
    const e = verifyWiapyWebhook(JSON.stringify(single()), headers());
    expect(e.orderId).toBe(id);
    expect(e.amount).toBe(1990);
    expect(e.status).toBe("paid");
  });
  it("recusa webhook sem token ou com token incorreto", () => {
    for (const h of [new Headers(), new Headers({ authorization: "wrong" })])
      expect(() => verifyWiapyWebhook(JSON.stringify(single()), h)).toThrow(
        "INVALID_WEBHOOK_AUTH",
      );
  });
  it("recusa valor de um centavo e checkout de outro produto", () => {
    const p = single();
    p.payment.amount = 1;
    expect(() => verifyWiapyWebhook(JSON.stringify(p), headers())).toThrow();
    p.payment.amount = 1990;
    p.checkout.id = "wrong";
    expect(() => verifyWiapyWebhook(JSON.stringify(p), headers())).toThrow();
  });
  it("chargeback revoga a liberação", () => {
    const p = single();
    p.payment.status = "chargedback";
    expect(verifyWiapyWebhook(JSON.stringify(p), headers()).status).toBe(
      "refunded",
    );
  });
  it("assinatura exige período confirmado e ativo", () => {
    const p = {
      ...single(),
      payment: { ...single().payment, type: "subscription", amount: 1599 },
      checkout: { id: OFFERS.monthly.checkoutId, amount: 1599 },
      subscription: {
        id: "subscription-test",
        interval: "month",
        active: true,
        dt_end: "2026-11-14T12:00:00Z",
      },
    };
    expect(verifyWiapyWebhook(JSON.stringify(p), headers()).expiresAt).toBe(
      p.subscription.dt_end,
    );
    p.subscription.active = false;
    expect(() => verifyWiapyWebhook(JSON.stringify(p), headers())).toThrow();
  });
  it("não fabrica referências ao não receber tracking", () => {
    const p = { ...single(), tracking: null };
    expect(verifyWiapyWebhook(JSON.stringify(p), headers()).orderId).toBeNull();
  });
  it("o checkout usa preço do servidor e referência única", () => {
    expect(
      new URL(
        wiapyCheckoutUrl("single", { id, amount: 1990 }),
      ).searchParams.get("utm_content"),
    ).toBe(id);
    expect(() => wiapyCheckoutUrl("single", { id, amount: 1 })).toThrow();
  });
});
