import { CatalogPreview } from "../../src/components/catalog-preview";
import { GuestContext } from "../../src/components/guest-context";
import { emptyCatalog } from "../../src/lib/catalog";
const document = emptyCatalog();
document.professional = "Ana · Teste visual";
document.business = "Ateliê de Beleza";
document.about =
  "Uma apresentação criada exclusivamente para verificar fotografias amplas em diferentes telas.";
document.specialties = "Manicure, alongamento e nail art.";
document.contacts = [
  {
    id: crypto.randomUUID(),
    kind: "whatsapp",
    label: "WhatsApp",
    value: "11999999999",
    visible: true,
  },
];
document.address = {
  street: "Rua de teste, 123",
  district: "Centro",
  city: "São Paulo",
  state: "SP",
  zip: "",
  visible: true,
};
const photos = [
  "horizontal",
  "tall",
  "square",
  "low",
  "portrait",
  "panorama",
].map((name, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  path: `${name}.jpg`,
  name,
}));
document.cover = photos[0];
document.portrait = photos[4];
document.services = photos.map((image, i) => ({
  id: crypto.randomUUID(),
  name: [
    "Horizontal de alta qualidade",
    "Screenshot muito vertical",
    "Fotografia quadrada",
    "Foto de baixa resolução",
    "Fotografia vertical",
    "Galeria com três fotos",
  ][i],
  description:
    "Um serviço apresentado com fotografia em destaque e informações claras.",
  price: 12000,
  promotion: i === 0 ? 9900 : null,
  duration: "1h30",
  note: "Agende com antecedência. Atendimento personalizado.",
  categoryId: document.categories[0].id,
  images: i === 5 ? [image, photos[2], photos[4]] : [image],
}));
export function PreviewFixture() {
  return (
    <GuestContext.Provider
      value={{
        urls: Object.fromEntries(
          photos.map((p) => [p.id, `/fixtures/${p.path}`]),
        ),
        save: async () => {},
        upload: async () => {
          throw new Error("Test fixture");
        },
        finish: () => {},
      }}
    >
      <CatalogPreview document={document} />
    </GuestContext.Provider>
  );
}
