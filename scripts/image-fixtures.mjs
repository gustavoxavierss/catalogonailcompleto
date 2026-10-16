import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("tests/ui/fixtures", { recursive: true });
const photo = "public/catalogo-mikaelly.png";
await sharp(photo)
  .resize(1600, 900, { fit: "cover" })
  .jpeg({ quality: 92 })
  .toFile("tests/ui/fixtures/horizontal.jpg");
await sharp(photo)
  .resize(900, 900, { fit: "cover" })
  .jpeg({ quality: 92 })
  .toFile("tests/ui/fixtures/square.jpg");
await sharp(photo)
  .resize(160, 120, { fit: "cover" })
  .jpeg({ quality: 85 })
  .toFile("tests/ui/fixtures/low.jpg");
await sharp(photo)
  .resize(900, 1200, { fit: "cover" })
  .jpeg({ quality: 92 })
  .toFile("tests/ui/fixtures/portrait.jpg");
await sharp(photo)
  .resize(1800, 500, { fit: "cover" })
  .jpeg({ quality: 92 })
  .toFile("tests/ui/fixtures/panorama.jpg");
const screenshot = Buffer.from(
  `<svg width="390" height="1500" xmlns="http://www.w3.org/2000/svg"><rect width="390" height="1500" fill="#191818"/><text x="24" y="58" fill="white" font-size="24">Captura vertical de teste</text>${Array.from({ length: 14 }, (_, i) => `<rect x="24" y="${110 + i * 90}" width="342" height="65" rx="12" fill="${i % 2 ? "#594b47" : "#b98b82"}"/><text x="40" y="${150 + i * 90}" fill="white" font-size="18">Informação preservada ${i + 1}</text>`).join("")}<text x="24" y="1470" fill="white" font-size="20">Fim da imagem · não cortar</text></svg>`,
);
await sharp(screenshot)
  .jpeg({ quality: 94 })
  .toFile("tests/ui/fixtures/tall.jpg");
console.log("6 image fixtures ready");
