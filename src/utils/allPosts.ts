import type {
  BlogPostFrontmatter,
  BlogPostInfo,
  BlogPostSibling,
} from "@base/types";
import type { MarkdownInstance } from "astro";

function getFileNameFromPath(path: string) {
  const lastDot = path.lastIndexOf(".");
  const lastSlash = path.lastIndexOf("/");
  return path.substring(lastSlash + 1, lastDot);
}
function dateComparer(a: BlogPostInfo, b: BlogPostInfo) {
  return b.date.getTime() - a.date.getTime();
}

function siblingFromPost(
  post: BlogPostInfo | undefined
): BlogPostSibling | undefined {
  if (!post) return;
  const { canonicalUrl, title } = post;
  return { canonicalUrl, title };
}

const importRes = import.meta.glob<MarkdownInstance<BlogPostFrontmatter>>(
  `../posts/**/*.md`,
  { eager: true }
);
const posts = Object.values(importRes);
export const allPosts: BlogPostInfo[] = posts
  .map((md) => {
    const date = new Date(md.frontmatter.date);
    const year = "" + date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const slug = getFileNameFromPath(md.file);
    const html = md.compiledContent();
    const filepath = md.file;
    const canonicalUrl = `/${year}/${month}/${slug}/`;
    const title = md.frontmatter.title;
    const description = md.frontmatter.description;

    return {
      year,
      month,
      slug,
      html,
      title,
      filepath,
      date,
      description,
      canonicalUrl,
    } as BlogPostInfo;
  })
  .sort(dateComparer)
  .map(({ ...rest }, index, posts) => {
    const prevPost = posts[index + 1];
    const nextPost = posts[index - 1];
    const prev = siblingFromPost(prevPost);
    const next = siblingFromPost(nextPost);

    return { prev, next, ...rest };
  });
