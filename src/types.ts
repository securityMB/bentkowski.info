export type BlogPostFrontmatter = { title: string; date: string };
export type BlogPostSibling = {
  title: string;
  canonicalUrl: string;
  desciption: string | undefined;
};
export type BlogPostInfo = {
  date: Date;
  year: string;
  month: string;
  slug: string;
  html: string;
  title: string;
  filepath: string;
  canonicalUrl: string;
  description: string;
  next?: BlogPostSibling | undefined;
  prev?: BlogPostSibling | undefined;
};
export type ContactInfo = {
  icon: string;
  href: string;
  text: string;
};
