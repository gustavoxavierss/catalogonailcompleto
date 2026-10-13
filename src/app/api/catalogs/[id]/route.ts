import { allImages, draftSchema } from "@/lib/catalog";
import {
  adminDb,
  AppError,
  failure,
  identity,
  jsonBody,
  ownedCatalog,
  sameOrigin,
  track,
} from "@/lib/server";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await identity();
    return Response.json(await ownedCatalog((await params).id, user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    const { id } = await params;
    const old = await ownedCatalog(id, user.id);
    const body = await jsonBody(req);
    const parsed = draftSchema.safeParse(body.document);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
    if (!Number.isInteger(body.revision))
      throw new AppError("Atualize a página antes de salvar.");
    const images = allImages(parsed.data);
    if (images.length) {
      const { data, error } = await adminDb()
        .from("assets")
        .select("id,path")
        .eq("user_id", user.id)
        .eq("catalog_id", id)
        .in(
          "id",
          images.map((i) => i.id),
        );
      if (error) throw error;
      if (
        images.some(
          (i) => !data?.some((a) => a.id === i.id && a.path === i.path),
        )
      )
        throw new AppError("Uma das fotos não pertence a este catálogo.", 403);
    }
    const { data, error } = await adminDb().rpc("save_catalog", {
      p_id: id,
      p_user: user.id,
      p_revision: body.revision,
      p_doc: parsed.data,
    });
    if (error?.message.includes("REVISION_CONFLICT"))
      throw new AppError(
        "Este catálogo foi alterado em outra aba. Recarregue para continuar.",
        409,
      );
    if (error) throw error;
    for (const s of parsed.data.services)
      if (!old.document.services.some((x: { id: string }) => x.id === s.id))
        await track("service_created", user.id, id);
    return Response.json({ revision: data });
  } catch (e) {
    return failure(e);
  }
}
