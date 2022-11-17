import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
// https://astro.build/config
import tailwind from "@astrojs/tailwind";
import ogImage from './src/og-image'

// https://astro.build/config
export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: 'dark-plus'
    }
  },
  site: 'https://www.bentkowski.info',
  integrations: [mdx(), sitemap(), tailwind(), ogImage()]
});