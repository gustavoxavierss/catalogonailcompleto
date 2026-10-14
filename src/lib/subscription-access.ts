import "server-only";
import { adminDb, AppError } from "./server";
export async function requireSubscriptionAccess(order: {
  plan?: string;
  subscription_id?: string;
  user_id?: string;
  catalog_id?: string;
}) {
  if (!order.plan?.startsWith("monthly")) return;
  if (!order.subscription_id)
    throw new AppError("Confirme sua assinatura para liberar o PDF.", 403);
  const { data, error } = await adminDb()
    .from("subscriptions")
    .select("active,expires_at")
    .eq("gateway_id", order.subscription_id)
    .eq("user_id", order.user_id)
    .eq("catalog_id", order.catalog_id)
    .maybeSingle();
  if (error) throw error;
  if (
    !data?.active ||
    !data.expires_at ||
    Date.parse(data.expires_at) <= Date.now()
  )
    throw new AppError(
      "Sua assinatura não está ativa. Escolha um plano para gerar e baixar seu PDF.",
      403,
    );
}
