import {
  adminDb,
  failure,
  identity,
  sameOrigin,
  track,
  rateLimit,
} from "@/lib/server";
import { emptyCatalog } from "@/lib/catalog";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    await rateLimit(user.id, "create_catalog", 20, 3600);
    const { data, error } = await adminDb()
      .from("catalogs")
      .insert({ user_id: user.id, document: emptyCatalog() })
      .select("id")
      .single();
    if (error) throw error;
    await track("catalog_created", user.id, data.id);
    return Response.json(data);
  } catch (e) {
    return failure(e);
  }
}
