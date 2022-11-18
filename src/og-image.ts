import type { AstroConfig, AstroIntegration } from "astro";
import sharp from "sharp";
import { OG_IMAGE_SIZE } from "./config";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

type OgImageData = {
  title: string;
  url: string;
  slug: string;
};

function htmlentities(s: string) {
  return s.replace(/[<&"]/g, (c) => `&#${c.codePointAt(0)};`);
}

async function generateImage(
  { url, title, slug }: OgImageData,
  baseDir: string
) {
  const outputPath = join(baseDir, `${slug}.png`);
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
        input: "public/my-avatar.jpeg",
        gravity: "southeast",
      },
      {
        input: {
          text: {
            text: htmlentities(title),
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
            text: `<u><span foreground="#888">${htmlentities(url)}</span></u>`,
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
    ])
    .toFile(outputPath);
}

export default function ogImageGenerator(): AstroIntegration {
  let config: AstroConfig;
  return {
    name: "og-image-generator",
    hooks: {
      async "astro:config:done"({ config: cfg }) {
        config = cfg;
      },
      async "astro:build:done"({ routes, dir }) {
        const baseDir = join(fileURLToPath(dir), "og-images");
        await mkdir(baseDir, { recursive: true });
        for (const route of routes) {
          console.log(route);
          const { distURL, component } = route;
          if (!distURL) continue;
          if (component !== "src/pages/[year]/[month]/[slug].astro") continue;
          const path = fileURLToPath(distURL);
          const html = (await readFile(path)).toString("utf-8");
          const url =
            (html.match(/"og:url" content="([^"]+)"/) ?? ["", ""])[1] ?? "";
          const title =
            (html.match(/"og:title" content="([^"]+)"/) ?? ["", ""])[1] ?? "";
          const slug = path.split("/").at(-2) ?? "";
          await generateImage({ url, title, slug }, baseDir);
        }
      },
    },
  };
}
