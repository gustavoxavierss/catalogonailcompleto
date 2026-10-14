// Public checkout URLs supplied by the owner. These are never proof of payment.
import { DEFAULTS } from "./catalog";
export const OFFERS = {
  single: {
    priceCents: DEFAULTS.priceCents,
    checkoutId: "6ace757ec8bdfc294912eb4f",
    checkoutUrl: "https://pay.wiapy.com/G5KoHkHx8TSP",
  },
  monthly: {
    priceCents: 1599,
    checkoutId: "6ace76946ebcdbf6682ec046",
    checkoutUrl: "https://pay.wiapy.com/6ace76946ebcdbf6682ec046",
  },
} as const;
