import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { DEFAULTS } from "./catalog";
import { cache } from "react";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function configured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
export function adminDb() {
  if (!configured())
    throw new AppError(
      "Estamos preparando a plataforma. Tente novamente em breve.",
      503,
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function sessionDb() {
  if (!configured())
    throw new AppError(
      "Estamos preparando a plataforma. Tente novamente em breve.",
      503,
    );
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              }),
            );
          } catch {
            /* Server components refresh through proxy. */
          }
        },
      },
    },
  );
}
export async function identity() {
  const db = await sessionDb();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user)
    throw new AppError("Entre na sua conta para continuar.", 401);
  return { db, user: data.user };
}
export async function administrator() {
  const auth = await identity();
  const { data, error } = await adminDb()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error || !data)
    throw new AppError("Você não tem acesso a esta área.", 403);
  return auth;
}
export async function ownedCatalog(id: string, userId: string) {
  const { data, error } = await adminDb()
    .from("catalogs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Catálogo não encontrado.", 404);
  return data;
}
export const settings = cache(async function settings() {
  if (!configured()) return DEFAULTS;
  const { data, error } = await adminDb()
    .from("app_settings")
    .select("value")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return { ...DEFAULTS, ...data.value } as typeof DEFAULTS;
});
export async function track(
  name: string,
  userId: string,
  catalogId?: string,
  orderId?: string,
) {
  const { error } = await adminDb().from("analytics_events").insert({
    name,
    user_id: userId,
    catalog_id: catalogId,
    order_id: orderId,
  });
  if (error) console.error("analytics_write_failed", { code: error.code });
}
export function sameOrigin(req: Request) {
  if (
    req.headers.get("origin") !== new URL(process.env.APP_URL || req.url).origin
  )
    throw new AppError("Atualize a página e tente novamente.", 403);
}
export async function rateLimit(
  userId: string,
  action: string,
  limit = 30,
  seconds = 60,
) {
  const { data, error } = await adminDb().rpc("take_rate_limit", {
    p_key: `${action}:${userId}`,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw error;
  if (!data)
    throw new AppError(
      "Você está indo muito rápido. Aguarde um pouco e tente novamente.",
      429,
    );
}
export async function jsonBody(req: Request) {
  const raw = await req.text();
  if (raw.length > 2000000)
    throw new AppError("Há informações demais nesta solicitação.", 413);
  return JSON.parse(raw);
}
export function failure(e: unknown) {
  if (e instanceof AppError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error(
    "request_failed",
    e instanceof Error ? { name: e.name, message: e.message } : e,
  );
  return Response.json(
    { error: "Não conseguimos concluir essa ação. Tente novamente." },
    { status: 500 },
  );
}
