import { NextResponse } from "next/server";
import { sessionDb } from "@/lib/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await sessionDb();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          url.searchParams.get("next") === "/redefinir-senha"
            ? "/redefinir-senha"
            : "/catalogo/continuar",
          process.env.APP_URL || url.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=link", process.env.APP_URL || url.origin),
  );
}
