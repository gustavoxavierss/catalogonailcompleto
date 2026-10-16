import sharp from "sharp";
import {
  adminDb,
  AppError,
  failure,
  identity,
  ownedCatalog,
  sameOrigin,
  rateLimit,
} from "@/lib/server";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    await rateLimit(user.id, "upload", 40, 60);
    const { id } = await params;
    await ownedCatalog(id, user.id);
    if (Number(req.headers.get("content-length")) > 4400000)
      throw new AppError("Escolha uma foto com até 4 MB.", 413);
    const form = await req.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 4194304 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new AppError("Escolha uma imagem JPG, PNG ou WebP de até 4 MB.");
    let optimized: Buffer;
    let width: number;
    let height: number;
    try {
      const output = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 40000000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 2400,
          height: 6400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      optimized = output.data;
      width = output.info.width;
      height = output.info.height;
    } catch {
      throw new AppError(
        "Não conseguimos abrir essa foto. Tente outra imagem.",
      );
    }
    const assetId = crypto.randomUUID();
    const path = `${user.id}/${id}/${assetId}.jpg`;
    const db = adminDb();
    const result = await db.storage
      .from("catalog-images")
      .upload(path, optimized, { contentType: "image/jpeg", upsert: false });
    if (result.error) throw result.error;
    const saved = await db.from("assets").insert({
      id: assetId,
      user_id: user.id,
      catalog_id: id,
      path,
      bytes: optimized.length,
    });
    if (saved.error) {
      await db.storage.from("catalog-images").remove([path]);
      throw saved.error;
    }
    return Response.json({
      id: assetId,
      path,
      name: file.name.slice(0, 120),
      width,
      height,
    });
  } catch (e) {
    return failure(e);
  }
}
