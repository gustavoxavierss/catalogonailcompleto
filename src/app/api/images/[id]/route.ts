import { adminDb, AppError, failure, identity } from "@/lib/server";
import sharp from "sharp";
export async function GET(
  req: Request,
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
    const requested = Number(new URL(req.url).searchParams.get("w") || 1440);
    const widths = [320, 640, 960, 1440, 2048, 2400];
    const width = widths.includes(requested) ? requested : 1440;
    const image = await sharp(Buffer.from(await file.data.arrayBuffer()))
      .resize({
        width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
