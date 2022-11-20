import { ORIGIN } from "@base/config";
import { generateOgImage } from "@utils/generateOgImage";
import { getAllPosts } from "@utils/getAllPosts";
import type { GetStaticPaths } from "astro";

type Props = { title: string; url: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getAllPosts();
  return posts.map((post) => {
    const { slug } = post;
    return {
      params: { slug },
      props: { title: post.title, url: post.canonicalUrl },
    };
  });
};

// Can't use APIRoute because the type is wrong (only string as accepted
// as body, while it can also be a buffer)
export const get = async function get({ props }: { props: Props }) {
  const { title, url: pathname } = props as Props;
  const url = `${ORIGIN}${pathname}`;
  const image = await generateOgImage({ url, title });
  return {
    body: image,
    encoding: "binary",
  };
};
