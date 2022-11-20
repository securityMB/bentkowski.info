import { ORIGIN } from "@base/config";
import { generateOgImage } from "@utils/generateOgImage";
import { allPosts } from "@utils/allPosts";
import type { GetStaticPaths } from "astro";

type Props = { title: string; url: string };

export const getStaticPaths: GetStaticPaths = async () => {
  return allPosts.map((post) => {
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
