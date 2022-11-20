import rss from "@astrojs/rss";
import type { MarkdownContent } from "astro";
import { SITE_TITLE, SITE_DESCRIPTION } from "../config";

const posts = getAllPosts;

export const get = () =>
  rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: import.meta.env.SITE,
    items: blogPosts.map((post) => {
      console.log(post.file);
      return {
        link: post.url ?? "asd",
        title: post.frontmatter.title,
        pubDate: post.frontmatter.date,
        description: post.frontmatter.description,
      };
    }),
  });
