import sharp from "sharp";
import { OG_IMAGE_SIZE } from "@base/config";

export type OgImageData = {
  url: string;
  title: string;
};

export async function generateOgImage({ url, title }: OgImageData) {
  return sharp({
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
            text: title,
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
    .toFormat("jpeg", { quality: 70 })
    .toBuffer();
}
