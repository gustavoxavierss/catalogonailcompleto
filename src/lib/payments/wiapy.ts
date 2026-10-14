import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { OFFERS } from "../offers";
const statusMap = {
  paid: "paid",
  unpaid: "pending",
  credit_card_declined: "failed",
  refunded: "refunded",
  chargedback: "refunded",
} as const;
const payload = z.object({
  payment: z.object({
    id: z.string().min(1).max(150),
    status: z.enum([
      "paid",
      "unpaid",
      "credit_card_declined",
      "refunded",
      "chargedback",
    ]),
    amount: z.number().int().positive(),
    type: z.enum(["payment", "subscription"]),
    dt_update: z.iso.datetime(),
    currency: z.literal("BRL").optional(),
  }),
  checkout: z.object({ id: z.string(), amount: z.number().int().positive() }),
  tracking: z
    .object({ utm_content: z.string().nullable().optional() })
    .nullish(),
  subscription: z
    .object({
      id: z.string().min(1).max(150).optional(),
      interval: z.literal("month").optional(),
      active: z.boolean().optional(),
      dt_end: z.iso.datetime().optional(),
      next_billing: z.iso.datetime().optional(),
    })
    .nullish(),
});
export function wiapyConfigured() {
  return (
    process.env.PAYMENT_PROVIDER === "wiapy" &&
    (process.env.QIAPAY_WEBHOOK_SECRET?.length || 0) >= 32
  );
}
export function verifyWiapyWebhook(raw: string, headers: Headers) {
  const secret = process.env.QIAPAY_WEBHOOK_SECRET || "";
  const supplied = headers.get("authorization") || "";
  if (
    secret.length < 32 ||
    supplied.length > 1024 ||
    !timingSafeEqual(
      createHash("sha256").update(secret).digest(),
      createHash("sha256").update(supplied).digest(),
    )
  )
    throw new Error("INVALID_WEBHOOK_AUTH");
  const body = payload.parse(JSON.parse(raw));
  const plan = body.payment.type === "subscription" ? "monthly" : "single";
  const offer = OFFERS[plan];
  if (
    body.checkout.id !== offer.checkoutId ||
    body.payment.amount !== offer.priceCents ||
    body.checkout.amount !== offer.priceCents
  )
    throw new Error("PAYMENT_MISMATCH");
  const reference = body.tracking?.utm_content;
  const orderId =
    reference && z.uuid().safeParse(reference).success ? reference : null;
  const subscription = body.subscription;
  let until: string | null = null;
  if (plan === "monthly") {
    if (!subscription?.id || subscription.interval !== "month")
      throw new Error("INVALID_SUBSCRIPTION");
    const dates = [subscription.dt_end, subscription.next_billing].filter(
      (d): d is string => !!d,
    );
    if (
      body.payment.status === "paid" &&
      (!dates.length || subscription.active !== true)
    )
      throw new Error("INVALID_SUBSCRIPTION_PERIOD");
    if (dates.length)
      until = dates.sort((a, b) => Date.parse(a) - Date.parse(b))[0];
    if (
      body.payment.status === "paid" &&
      Date.parse(until!) <= Date.parse(body.payment.dt_update)
    )
      throw new Error("INVALID_SUBSCRIPTION_PERIOD");
  }
  return {
    eventId: `${body.payment.id}:${body.payment.status}:${body.payment.dt_update}`,
    orderId,
    transactionId: body.payment.id,
    checkoutId: body.checkout.id,
    amount: body.payment.amount,
    currency: "BRL",
    status: statusMap[body.payment.status],
    occurredAt: body.payment.dt_update,
    plan,
    subscriptionId: plan === "monthly" ? subscription!.id! : null,
    expiresAt: until,
    hash: createHash("sha256").update(raw).digest("hex"),
  };
}
export function wiapyCheckoutUrl(
  plan: "single" | "monthly",
  order: { id: string; amount: number },
) {
  if (
    !z.uuid().safeParse(order.id).success ||
    order.amount !== OFFERS[plan].priceCents
  )
    throw new Error("CHECKOUT_PRICE_MISMATCH");
  const url = new URL(OFFERS[plan].checkoutUrl);
  // Confirmed in Wiapy's published checkout code and its webhook tracking contract.
  url.searchParams.set("utm_content", order.id);
  url.searchParams.set("utm_source", "meu-catalogo-nail");
  return url.toString();
}
