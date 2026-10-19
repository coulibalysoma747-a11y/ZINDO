// Script ponctuel : régénère les icônes/favicon à partir du logo source.
// Usage : node scripts/generate-brand-assets.mjs
// (Pas un script de build habituel — exécuté manuellement quand le logo change.)
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EMBLEM = path.join(ROOT, "public/brand/zindo-emblem.png");
const ICONS_DIR = path.join(ROOT, "public/icons");

mkdirSync(ICONS_DIR, { recursive: true });

async function square(size, out, { maskablePadding = 0 } = {}) {
  const content = maskablePadding
    ? Math.round(size * (1 - maskablePadding * 2))
    : size;
  const resized = await sharp(EMBLEM)
    .resize(content, content, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(out);
}

// Icônes PWA standard (marge fine) et "maskable" (marge large — 20% de chaque
// côté — pour rester lisible une fois recadré en cercle/arrondi par l'OS).
await square(192, path.join(ICONS_DIR, "icon-192.png"), { maskablePadding: 0.06 });
await square(512, path.join(ICONS_DIR, "icon-512.png"), { maskablePadding: 0.06 });
await square(192, path.join(ICONS_DIR, "icon-maskable-192.png"), { maskablePadding: 0.2 });
await square(512, path.join(ICONS_DIR, "icon-maskable-512.png"), { maskablePadding: 0.2 });
await square(180, path.join(ICONS_DIR, "apple-touch-icon.png"), { maskablePadding: 0.1 });

// favicon.ico : format ICO moderne (PNG stocké tel quel dans le conteneur),
// supporté par tous les navigateurs actuels — pas besoin de dépendance externe.
const faviconSizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  faviconSizes.map((size) =>
    sharp(EMBLEM)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .ensureAlpha() // requis : Next.js refuse un PNG non-RGBA dans un .ico au build
      .png()
      .toBuffer()
  )
);

const headerSize = 6 + 16 * faviconSizes.length;
let offset = headerSize;
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = icon
header.writeUInt16LE(faviconSizes.length, 4);

faviconSizes.forEach((size, i) => {
  const entryOffset = 6 + i * 16;
  const buf = pngBuffers[i];
  header.writeUInt8(size === 256 ? 0 : size, entryOffset + 0); // width
  header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1); // height
  header.writeUInt8(0, entryOffset + 2); // color count
  header.writeUInt8(0, entryOffset + 3); // reserved
  header.writeUInt16LE(1, entryOffset + 4); // planes
  header.writeUInt16LE(32, entryOffset + 6); // bit count
  header.writeUInt32LE(buf.length, entryOffset + 8); // bytes in resource
  header.writeUInt32LE(offset, entryOffset + 12); // offset
  offset += buf.length;
});

writeFileSync(path.join(ROOT, "app/favicon.ico"), Buffer.concat([header, ...pngBuffers]));

console.log("Assets générés : icons/*.png, apple-touch-icon.png, app/favicon.ico");
