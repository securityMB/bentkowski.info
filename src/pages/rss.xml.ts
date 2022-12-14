import rss from "@astrojs/rss";
import { allPosts } from "@utils/allPosts";
import { SITE_TITLE, SITE_DESCRIPTION } from "../config";

export const get = () =>
  rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: import.meta.env.SITE,
    stylesheet: "/rss-style.xsl",
    items: allPosts.map((post) => {
      return {
        link: post.canonicalUrl,
        title: post.title,
        pubDate: post.date,
        description: post.description ?? "",
      };
    }),
  });
