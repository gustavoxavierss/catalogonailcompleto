import {
  adminDb,
  failure,
  identity,
  sameOrigin,
  track,
  rateLimit,
  AppError,
} from "@/lib/server";
import { emptyCatalog } from "@/lib/catalog";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    const draftId = req.headers.get("X-Draft-Id");
    if (draftId && !z.uuid().safeParse(draftId).success)
      throw new AppError("Rascunho inválido.");
    if (draftId) {
      const existing = await adminDb()
        .from("catalogs")
        .select("id")
        .eq("id", draftId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) return Response.json(existing.data);
    }
    await rateLimit(user.id, "create_catalog", 20, 3600);
    const { data, error } = await adminDb()
      .from("catalogs")
      .insert({
        ...(draftId ? { id: draftId } : {}),
        user_id: user.id,
        document: emptyCatalog(),
      })
      .select("id")
      .single();
    if (error?.code === "23505" && draftId) {
      const existing = await adminDb()
        .from("catalogs")
        .select("id")
        .eq("id", draftId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing.data) return Response.json(existing.data);
    }
    if (error) throw error;
    await track("catalog_created", user.id, data.id);
    return Response.json(data);
  } catch (e) {
    return failure(e);
  }
}
