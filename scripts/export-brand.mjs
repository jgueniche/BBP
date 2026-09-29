import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

// Brand exports (Claude Design v1). The SVG sources in public/brand have
// their text converted to outlines, so rendering needs no installed font.
const root = process.cwd();
const brandDir = path.join(root, "public", "brand");
const pngDir = path.join(brandDir, "png");
const appDir = path.join(root, "src", "app");

const FRAMBOISE = "#C0265E";
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const icons = [
  { src: "icon.svg", out: path.join(pngDir, "icon-192.png"), size: 192 },
  { src: "icon.svg", out: path.join(pngDir, "icon-512.png"), size: 512 },
  {
    src: "mark-maskable.svg",
    out: path.join(pngDir, "maskable-192.png"),
    size: 192,
    flatten: FRAMBOISE,
  },
  {
    src: "mark-maskable.svg",
    out: path.join(pngDir, "maskable-512.png"),
    size: 512,
    flatten: FRAMBOISE,
  },
  { src: "favicon.svg", out: path.join(pngDir, "favicon-32.png"), size: 32 },
  // Monochrome notification badge: Android keeps only the alpha channel.
  { src: "badge.svg", out: path.join(pngDir, "badge-96.png"), size: 96 },
  // iOS applies its own corner mask and expects an opaque square.
  {
    src: "icon-square.svg",
    out: path.join(appDir, "apple-icon.png"),
    size: 180,
    flatten: FRAMBOISE,
  },
];

const logos = [
  { src: "logo-on-light.svg", out: "logo-on-light-1024.png", bg: "#FFFFFF" },
  { src: "logo-on-dark.svg", out: "logo-on-dark-1024.png", bg: "#2B2230" },
  {
    src: "logo-on-framboise.svg",
    out: "logo-on-framboise-1024.png",
    bg: FRAMBOISE,
  },
];

function render(src, width, height) {
  return sharp(path.join(brandDir, src), { density: 600 }).resize({
    width,
    height,
    fit: "contain",
    background: TRANSPARENT,
  });
}

/** Multi-size favicon.ico with PNG-compressed entries (16, 32, 48). */
async function writeIco(out, sizes) {
  const images = await Promise.all(
    sizes.map((size) => render("favicon.svg", size, size).png().toBuffer()),
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;
  images.forEach((image, i) => {
    const o = i * 16;
    directory.writeUInt8(sizes[i], o);
    directory.writeUInt8(sizes[i], o + 1);
    directory.writeUInt16LE(1, o + 4);
    directory.writeUInt16LE(32, o + 6);
    directory.writeUInt32LE(image.length, o + 8);
    directory.writeUInt32LE(offset, o + 12);
    offset += image.length;
  });
  await writeFile(out, Buffer.concat([header, directory, ...images]));
}

await mkdir(pngDir, { recursive: true });

for (const { src, out, size, flatten } of icons) {
  let image = render(src, size, size);
  if (flatten) image = image.flatten({ background: flatten });
  await image.png().toFile(out);
  console.log(`exported ${path.relative(root, out)}`);
}

for (const { src, out, bg } of logos) {
  const logo = await render(src, Math.round(1024 * 0.72))
    .png()
    .toBuffer();
  await sharp({
    create: { width: 1024, height: 512, channels: 3, background: bg },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(pngDir, out));
  console.log(`exported public/brand/png/${out}`);
}

await writeIco(path.join(appDir, "favicon.ico"), [16, 32, 48]);
console.log("exported src/app/favicon.ico");
