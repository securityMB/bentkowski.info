import type { AstroIntegration } from "astro";
import sharp from "sharp";
import { OG_IMAGE_DIR, OG_IMAGE_SIZE, SITE_TITLE } from "./config";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

type OgImageData = {
  title: string;
  url: string;
  slug: string;
};

async function generateImage(
  { url, title, slug }: OgImageData,
  baseDir: string
) {
  const outputPath = join(baseDir, `${slug}.jpg`);
  await sharp({
    create: {
      background: "black",
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
      channels: 4,
    },
  })
    .composite([
      {
        input: {
          text: {
            text: title.replace(` - ${SITE_TITLE}`, ""),
            width: OG_IMAGE_SIZE.width * 0.85,
            dpi: 325,
            font: "sans",
            spacing: 10,
          },
        },
        gravity: "northwest",
        top: 30,
        left: 30,
      },
      {
        input: {
          text: {
            text: `<u><span foreground="#888">${url}</span></u>`,
            width: OG_IMAGE_SIZE.width - 500,
            dpi: 200,
            font: "sans",
            spacing: 10,
            rgba: true,
          },
        },
        gravity: "southeast",
        top: OG_IMAGE_SIZE.height - 150,
        left: 30,
      },
      {
        input: "public/my-avatar.jpeg",
        gravity: "southeast",
      },
    ])
    .toFile(outputPath);
}

export default function ogImageGenerator(): AstroIntegration {
  return {
    name: "og-image-generator",
    hooks: {
      async "astro:build:done"({ dir, pages }) {
        const imgBaseDir = join(fileURLToPath(dir), OG_IMAGE_DIR);
        const blogPostPaths = pages
          .filter((p) => /\d{4}\/\d{2}\//.test(p.pathname))
          .map(({ pathname }) =>
            join(fileURLToPath(dir), pathname, "index.html")
          );
        await mkdir(imgBaseDir, { recursive: true });
        for (const path of blogPostPaths) {
          const html = (await readFile(path)).toString("utf-8");
          const url =
            (html.match(/"og:url" content="([^"]+)"/) ?? ["", ""])[1] ?? "";
          const title =
            (html.match(/"og:title" content="([^"]+)"/) ?? ["", ""])[1] ?? "";
          const slug = path.split("/").at(-2) ?? "";
          await generateImage({ url, title, slug }, imgBaseDir);
        }
      },
    },
  };
}
