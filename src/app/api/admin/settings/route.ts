import { z } from "zod";
import {
  adminDb,
  administrator,
  AppError,
  failure,
  jsonBody,
  sameOrigin,
} from "@/lib/server";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  priceCents: z.number().int().min(100).max(1000000),
  currency: z.literal("BRL"),
  supportEmail: z.union([z.email(), z.literal("")]),
  supportWhatsapp: z.string().max(30),
  logo: z.union([
    z.url().refine((v) => v.startsWith("https://")),
    z.literal(""),
  ]),
});
export async function PUT(req: Request) {
  try {
    sameOrigin(req);
    await administrator();
    const parsed = schema.safeParse(await jsonBody(req));
    if (!parsed.success)
      throw new AppError("Confira o nome, preço e contatos informados.");
    const { error } = await adminDb()
      .from("app_settings")
      .update({ value: parsed.data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
