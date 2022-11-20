import rss from "@astrojs/rss";
import { getAllPosts } from "@utils/getAllPosts";
import { SITE_TITLE, SITE_DESCRIPTION } from "../config";

const blogPosts = getAllPosts();

export const get = () =>
  rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: import.meta.env.SITE,
    stylesheet: "/rss-style.xsl",
    items: blogPosts.map((post) => {
      return {
        link: post.canonicalUrl,
        title: post.title,
        pubDate: post.date,
        description: post.description ?? "",
      };
    }),
  });
