import { adminDb, AppError, failure, identity } from "@/lib/server";
import sharp from "sharp";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await identity();
    const db = adminDb();
    const { data, error } = await db
      .from("assets")
      .select("path")
      .eq("id", (await params).id)
      .eq("user_id", user.id)
      .single();
    if (error || !data) throw new AppError("Foto não encontrada.", 404);
    const file = await db.storage.from("catalog-images").download(data.path);
    if (file.error) throw file.error;
    const thumbnail = await sharp(Buffer.from(await file.data.arrayBuffer()))
      .resize({
        width: 720,
        height: 720,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    return new Response(new Uint8Array(thumbnail), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
