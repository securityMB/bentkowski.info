import type { AstroConfig, AstroIntegration } from "astro";
import sharp from "sharp";
import { OG_IMAGE_SIZE, ORIGIN } from "./config";
import type { BlogPostInfo } from "./types";
import { fileURLToPath } from "node:url";

function htmlentities(s: string) {
  return s.replace(/[<&"]/g, (c) => `&#${c.codePointAt(0)};`);
}

async function generateImage(blogPost: BlogPostInfo) {
  const url = `${ORIGIN}${blogPost.canonicalUrl}`;

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
            text: htmlentities(blogPost.title),
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
            text: `<u>${htmlentities(url)}</u>`,
            width: OG_IMAGE_SIZE.width - 400,
            dpi: 325,
            font: "sans",
            spacing: 10,
          },
        },
        gravity: "southeast",
        top: OG_IMAGE_SIZE.height - 200,
        left: OG_IMAGE_SIZE.width - 300,
      },
    ])
    .toFile("og-image.png");
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
        for (const { distURL, component } of routes) {
          if (!distURL) continue;
          if (component !== "src/pages/[year]/[month]/[slug].astro") continue;
        }
      },
    },
  };
}
