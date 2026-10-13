import { draftSchema, readyErrors } from "@/lib/catalog";
import {
  adminDb,
  AppError,
  failure,
  identity,
  ownedCatalog,
  sameOrigin,
  track,
  rateLimit,
} from "@/lib/server";
import { provider } from "@/lib/payments/provider";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    await rateLimit(user.id, "checkout", 6, 60);
    const { id } = await params;
    const c = await ownedCatalog(id, user.id);
    const errors = readyErrors(draftSchema.parse(c.document));
    if (errors.length) throw new AppError(errors.join(" "));
    await track("catalog_completed", user.id, id);
    if (!provider.available)
      throw new AppError(
        "Os pagamentos ainda estão sendo preparados. Seu catálogo está salvo e você poderá voltar para liberá-lo.",
        503,
      );
    const db = adminDb();
    const { data: order, error } = await db.rpc("begin_checkout", {
      p_catalog: id,
      p_user: user.id,
    });
    if (error) throw error;
    if (order.status === "paid")
      return Response.json({ redirect: `/catalogo/${id}/pagamento` });
    if (order.checkout_url)
      return Response.json({ redirect: order.checkout_url });
    const claimed = await db.rpc("claim_checkout", {
      p_order: order.id,
      p_user: user.id,
    });
    if (claimed.error) throw claimed.error;
    if (!claimed.data)
      throw new AppError(
        "Seu pagamento está sendo preparado. Aguarde e use “Verificar pagamento”.",
        409,
      );
    // Provider MUST use order.id as the gateway idempotency key. Never replace ambiguous transactions.
    const created = await provider.createPayment(
      order,
      `${process.env.APP_URL}/catalogo/${id}/pagamento`,
    );
    if (new URL(created.checkoutUrl).protocol !== "https:")
      throw new Error("INSECURE_CHECKOUT");
    const result = await db
      .from("orders")
      .update({
        gateway_transaction_id: created.transactionId,
        gateway_order_id: created.gatewayOrderId,
        checkout_url: created.checkoutUrl,
        expires_at: created.expiresAt,
      })
      .eq("id", order.id)
      .is("gateway_transaction_id", null);
    if (result.error) throw result.error;
    await track("payment_pending", user.id, id, order.id);
    return Response.json({ redirect: created.checkoutUrl });
  } catch (e) {
    return failure(e);
  }
}
