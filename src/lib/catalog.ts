import { z } from "zod";
export const DEFAULTS = {
  name: "Meu Catálogo Nail",
  priceCents: 1990,
  currency: "BRL",
  supportEmail: "",
  supportWhatsapp: "",
  logo: "",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
const text = (max: number) => z.string().trim().max(max);
export function contrast(a: string, b: string) {
  const l = (c: string) => {
    const v = [1, 3, 5]
      .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
  };
  const x = l(a),
    y = l(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableColor(background: string, preferred = "#302927") {
  if (contrast(background, preferred) >= 4.5) return preferred;
  return contrast(background, "#ffffff") > contrast(background, "#181818")
    ? "#ffffff"
    : "#181818";
}
const url = z.union([
  z.literal(""),
  z
    .url()
    .refine(
      (v) => new URL(v).protocol === "https:",
      "Use um link que comece com https://",
    ),
]);
export const imageSchema = z.object({
  id: z.uuid(),
  path: text(400),
  name: text(120),
});
export const draftSchema = z.object({
  professional: text(100),
  business: text(100),
  about: text(2500),
  specialties: text(300),
  logo: imageSchema.nullable(),
  portrait: imageSchema.nullable(),
  cover: imageSchema.nullable(),
  contacts: z
    .array(
      z.object({
        id: z.uuid(),
        kind: z.enum([
          "whatsapp",
          "phone",
          "instagram",
          "tiktok",
          "facebook",
          "website",
          "booking",
          "other",
        ]),
        label: text(80),
        value: text(500),
        visible: z.boolean(),
      }),
    )
    .max(30),
  address: z.object({
    street: text(150),
    district: text(80),
    city: text(100),
    state: text(2),
    zip: text(9),
    visible: z.boolean(),
  }),
  whatsappMessage: text(500),
  qr: z.enum(["none", "whatsapp", "booking"]),
  categories: z.array(z.object({ id: z.uuid(), name: text(80).min(1) })),
  services: z.array(
    z
      .object({
        id: z.uuid(),
        name: text(120),
        description: text(1500),
        price: z.number().int().min(0).max(10000000),
        promotion: z.number().int().min(0).max(10000000).nullable(),
        categoryId: z.uuid().nullable(),
        duration: text(80),
        note: text(500),
        images: z.array(imageSchema).max(12),
      })
      .refine(
        (s) => s.promotion === null || s.promotion < s.price,
        "A promoção precisa ser menor que o preço.",
      ),
  ),
  theme: z.object({
    template: z.enum(["elegante", "minimalista", "rose", "luxo"]),
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    secondary: z.string().regex(/^#[0-9a-f]{6}$/i),
    heading: z.string().regex(/^#[0-9a-f]{6}$/i),
    font: z.enum(["serif", "sans"]),
    imageShape: z.enum(["rounded", "square"]),
    card: z.enum(["outlined", "soft", "clean"]),
  }),
});
export const catalogSchema = draftSchema.superRefine((d, ctx) => {
  if (
    contrast(d.theme.heading, "#ffffff") < 4.5 ||
    contrast(d.theme.heading, d.theme.secondary) < 4.5 ||
    contrast("#302927", d.theme.secondary) < 4.5 ||
    contrast(d.theme.primary, "#ffffff") < 4.5 ||
    contrast(d.theme.primary, d.theme.secondary) < 4.5
  )
    ctx.addIssue({
      code: "custom",
      message:
        "Para deixar tudo legível, escolha um fundo claro e cores mais escuras para os títulos e detalhes.",
    });
  for (const s of d.services)
    if (!s.name.trim())
      ctx.addIssue({ code: "custom", message: "Dê um nome a cada serviço." });
  const ids = d.categories.map((c) => c.id);
  if (
    new Set(ids).size !== ids.length ||
    new Set(d.services.map((s) => s.id)).size !== d.services.length
  )
    ctx.addIssue({ code: "custom", message: "Há itens repetidos." });
  for (const s of d.services)
    if (s.categoryId && !ids.includes(s.categoryId))
      ctx.addIssue({
        code: "custom",
        message: "Escolha uma categoria válida.",
      });
  for (const c of d.contacts) {
    if (!c.value) continue;
    if (["whatsapp", "phone"].includes(c.kind)) {
      if (!/^\+?[\d\s()-]{10,20}$/.test(c.value))
        ctx.addIssue({
          code: "custom",
          message: "Confira o telefone com DDD.",
        });
    } else if (!url.safeParse(c.value).success)
      ctx.addIssue({
        code: "custom",
        message: "Use links completos começando com https://.",
      });
  }
});
export type Catalog = z.infer<typeof catalogSchema>;
export type CatalogImage = z.infer<typeof imageSchema>;
export const emptyCatalog = (): Catalog => ({
  professional: "",
  business: "",
  about: "",
  specialties: "",
  logo: null,
  portrait: null,
  cover: null,
  contacts: [],
  address: {
    street: "",
    district: "",
    city: "",
    state: "",
    zip: "",
    visible: true,
  },
  whatsappMessage: "Olá! Vi seu catálogo e gostaria de agendar um horário.",
  qr: "whatsapp",
  categories: [
    "Manicure",
    "Pedicure",
    "Alongamento",
    "Nail Art",
    "Banho de Gel",
    "Fibra de Vidro",
    "Gel na Tips",
    "Manutenção",
    "Spa dos Pés",
    "Combos",
    "Promoções",
    "Outros",
  ].map((name) => ({ id: crypto.randomUUID(), name })),
  services: [],
  theme: {
    template: "elegante",
    primary: "#78534f",
    secondary: "#f5eee8",
    heading: "#2c2928",
    font: "serif",
    imageShape: "rounded",
    card: "soft",
  },
});
export function readyErrors(d: Catalog) {
  const result = catalogSchema.safeParse(d);
  return [
    ...(!result.success ? result.error.issues.map((i) => i.message) : []),
    ...(!d.professional.trim() && !d.business.trim()
      ? ["Informe seu nome ou o nome do negócio."]
      : []),
    ...(!d.services.length
      ? ["Adicione pelo menos 1 serviço antes de continuar."]
      : []),
  ];
}
export function allImages(d: Catalog) {
  return [
    d.logo,
    d.portrait,
    d.cover,
    ...d.services.flatMap((s) => s.images),
  ].filter((x): x is CatalogImage => !!x);
}
export function contactHref(c: Catalog["contacts"][number], message: string) {
  if (c.kind === "whatsapp") {
    let n = c.value.replace(/\D/g, "");
    if (n.length === 10 || n.length === 11) n = "55" + n;
    return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
  }
  if (c.kind === "phone") return `tel:${c.value.replace(/[^\d+]/g, "")}`;
  return url.safeParse(c.value).success ? c.value : "#";
}
export const paymentLabels: Record<string, string> = {
  pending: "Aguardando pagamento",
  processing: "Confirmando pagamento",
  paid: "Pagamento aprovado",
  failed: "Pagamento não aprovado",
  cancelled: "Pagamento cancelado",
  refunded: "Pagamento reembolsado",
  expired: "Pagamento expirado",
};
export function hasPdf(files: unknown) {
  return Array.isArray(files) ? files.length > 0 : !!files;
}
