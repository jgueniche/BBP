import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const brandDir = path.join(process.cwd(), "public", "brand");
const outDir = path.join(brandDir, "png");

const jobs = [
  { src: "mark.svg", out: "favicon-32.png", width: 32 },
  { src: "mark.svg", out: "icon-192.png", width: 192 },
  { src: "mark.svg", out: "icon-512.png", width: 512 },
  { src: "mark-maskable.svg", out: "maskable-512.png", width: 512 },
  {
    src: "logo-black-on-white.svg",
    out: "logo-black-on-white-1024.png",
    width: 1024,
  },
  {
    src: "logo-white-on-black.svg",
    out: "logo-white-on-black-1024.png",
    width: 1024,
  },
  {
    src: "logo-orange-on-black.svg",
    out: "logo-orange-on-black-1024.png",
    width: 1024,
  },
];

await mkdir(outDir, { recursive: true });

for (const { src, out, width } of jobs) {
  await sharp(path.join(brandDir, src), { density: 300 })
    .resize({ width })
    .png()
    .toFile(path.join(outDir, out));
  console.log(`exported ${out}`);
}
