import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/catalogo/",
        "/login",
        "/cadastro",
        "/redefinir-senha",
        "/recuperar-senha",
      ],
    },
  };
}
