import { draftSchema, readyErrors } from "@/lib/catalog";
import { OFFERS } from "@/lib/offers";
import {
  adminDb,
  AppError,
  failure,
  identity,
  ownedCatalog,
  sameOrigin,
  track,
  rateLimit,
  jsonBody,
} from "@/lib/server";
import { wiapyConfigured, wiapyCheckoutUrl } from "@/lib/payments/wiapy";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    await rateLimit(user.id, "checkout", 6, 60);
    const { id } = await params;
    const body = await jsonBody(req);
    const plan: unknown = body.plan;
    if (plan !== "single" && plan !== "monthly")
      throw new AppError("Escolha uma das opções de pagamento.");
    const catalog = await ownedCatalog(id, user.id);
    const errors = readyErrors(draftSchema.parse(catalog.document));
    if (errors.length) throw new AppError(errors.join(" "));
    const db = adminDb();
    if (plan === "monthly") {
      const access = await db.rpc("monthly_catalog_order", {
        p_catalog: id,
        p_user: user.id,
      });
      if (access.error) throw access.error;
      if (access.data)
        return Response.json({ redirect: `/catalogo/${id}/pagamento` });
    }
    if (!wiapyConfigured())
      throw new AppError(
        "A liberação do PDF estará disponível em breve. Seu catálogo está salvo na sua conta.",
        503,
      );
    const result = await db.rpc("begin_wiapy_checkout", {
      p_catalog: id,
      p_user: user.id,
      p_plan: plan,
      p_checkout: OFFERS[plan].checkoutId,
    });
    if (result.error) throw result.error;
    const order = result.data;
    if (order.status === "paid")
      return Response.json({ redirect: `/catalogo/${id}/pagamento` });
    if (order.amount !== OFFERS[plan].priceCents)
      throw new AppError(
        "Este plano está sendo atualizado. Tente novamente mais tarde.",
        503,
      );
    const checkoutUrl = wiapyCheckoutUrl(plan, order);
    const saved = await db
      .from("orders")
      .update({ checkout_url: checkoutUrl })
      .eq("id", order.id)
      .eq("user_id", user.id);
    if (saved.error) throw saved.error;
    await track("payment_pending", user.id, id, order.id);
    return Response.json({ checkoutUrl, orderId: order.id });
  } catch (e) {
    return failure(e);
  }
}
