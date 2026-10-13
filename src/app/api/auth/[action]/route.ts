import { z } from "zod";
import {
  adminDb,
  AppError,
  failure,
  jsonBody,
  sameOrigin,
  sessionDb,
  track,
} from "@/lib/server";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(req);
    const { action } = await params;
    const db = await sessionDb();
    if (action === "logout") {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return Response.json({ ok: true });
    }
    const input = await jsonBody(req);
    const email = z.email().safeParse(input.email);
    if (action !== "password" && !email.success)
      throw new AppError("Confira seu e-mail.");
    if (
      ["login", "register", "password"].includes(action) &&
      (!input.password || input.password.length < 10)
    )
      throw new AppError("Use uma senha com pelo menos 10 caracteres.");
    const key =
      "auth:" + action + ":" + String(input.email || "password").toLowerCase();
    const limit = await adminDb().rpc("take_rate_limit", {
      p_key: key,
      p_limit: 10,
      p_seconds: 900,
    });
    if (limit.error) throw limit.error;
    if (!limit.data)
      throw new AppError(
        "Aguarde alguns minutos antes de tentar novamente.",
        429,
      );
    if (action === "register") {
      if (input.accept !== true)
        throw new AppError(
          "Leia e aceite os termos e a política de privacidade.",
        );
      const name = z.string().trim().min(2).max(100).parse(input.name);
      const { data, error } = await db.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            name,
            terms_version: "2026-10-13",
            accepted_at: new Date().toISOString(),
          },
          emailRedirectTo: `${process.env.APP_URL}/auth/callback`,
        },
      });
      if (error)
        throw new AppError(
          "Não foi possível criar a conta. Confira os dados ou tente entrar.",
        );
      if (data.user && data.user.identities?.length) {
        const result = await adminDb()
          .from("profiles")
          .upsert(
            { id: data.user.id, name, email: input.email },
            { onConflict: "id", ignoreDuplicates: true },
          );
        if (result.error) throw result.error;
        await track("user_registered", data.user.id);
      }
      return Response.json({
        message: "Confira seu e-mail para confirmar o cadastro.",
        redirect: data.session ? "/dashboard" : null,
      });
    }
    if (action === "login") {
      const { error } = await db.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error)
        throw new AppError(
          "E-mail ou senha incorretos, ou e-mail ainda não confirmado.",
        );
      return Response.json({ redirect: "/dashboard" });
    }
    if (action === "recover") {
      await db.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${process.env.APP_URL}/auth/callback?next=/redefinir-senha`,
      });
      return Response.json({
        message:
          "Se houver uma conta com este e-mail, você receberá as instruções.",
      });
    }
    if (action === "password") {
      const { data } = await db.auth.getUser();
      if (!data.user)
        throw new AppError("Abra novamente o link recebido por e-mail.", 401);
      const { error } = await db.auth.updateUser({ password: input.password });
      if (error)
        throw new AppError(
          "Não foi possível atualizar a senha. Solicite um novo link.",
        );
      return Response.json({ redirect: "/dashboard" });
    }
    throw new AppError("Página não encontrada.", 404);
  } catch (e) {
    return failure(e);
  }
}
