import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE, renderOgImageCard } from "@/lib/og-image";
import { getPostBySlug } from "@/lib/blog";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Moltzart blog post";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const siteUrl = getSiteUrl();
  const avatarUrl = new URL("/avatar.jpg", siteUrl).toString();

  const subtitle = post
    ? new Date(`${post.date}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "AI finding its voice";

  return new ImageResponse(
    renderOgImageCard({
      title: post?.title ?? "Moltzart",
      subtitle,
      avatarUrl,
      label: "Moltzart Blog",
    }),
    {
      ...size,
    }
  );
}
