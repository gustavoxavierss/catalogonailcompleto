import {
  adminDb,
  failure,
  identity,
  ownedCatalog,
  sameOrigin,
} from "@/lib/server";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await identity();
    const { id } = await params;
    const catalog = await ownedCatalog(id, user.id);
    const db = adminDb();
    const [orders, subscriptions] = await Promise.all([
      db
        .from("orders")
        .select(
          "id,status,amount,created_at,version_id,checkout_url,plan,subscription_id,pdf_files(id),catalog_versions(revision)",
        )
        .eq("catalog_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("subscriptions")
        .select("gateway_id,active,expires_at")
        .eq("catalog_id", id)
        .eq("user_id", user.id),
    ]);
    if (orders.error || subscriptions.error)
      throw orders.error || subscriptions.error;
    const active = (subscriptions.data || []).filter(
      (s) => s.active && Date.parse(s.expires_at) > Date.now(),
    );
    return Response.json(
      {
        orders: orders.data.map((o) => ({
          ...o,
          isCurrent:
            (Array.isArray(o.catalog_versions)
              ? o.catalog_versions[0]
              : o.catalog_versions
            )?.revision === catalog.revision,
          status:
            o.status === "paid" &&
            o.plan.startsWith("monthly") &&
            !active.some((s) => s.gateway_id === o.subscription_id)
              ? "expired"
              : o.status,
        })),
        subscriptionActive: !!active.length,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    return GET(req, context);
  } catch (e) {
    return failure(e);
  }
}
