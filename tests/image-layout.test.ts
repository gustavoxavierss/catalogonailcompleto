import { expect, it } from "vitest";
import { imageLayout } from "../src/lib/image-layout";
import { imageSchema } from "../src/lib/catalog";
it.each([
  [1600, 900, "landscape"],
  [390, 1500, "tall"],
  [1080, 1920, "tall"],
  [900, 900, "square"],
  [900, 1200, "portrait"],
  [1800, 500, "panorama"],
] as const)("detecta %s × %s como %s", (w, h, expected) => {
  expect(imageLayout(w, h)).toBe(expected);
});
it("aceita fotos existentes sem dimensões e preserva as dimensões de novos uploads", () => {
  const image = {
    id: crypto.randomUUID(),
    name: "foto",
    path: "private/photo.jpg",
  };
  expect(imageSchema.parse(image)).toEqual(image);
  expect(
    imageSchema.parse({ ...image, width: 390, height: 1500 }),
  ).toMatchObject({ width: 390, height: 1500 });
});
