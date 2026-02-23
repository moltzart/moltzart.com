import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import { getSiteUrl } from "@/lib/site-url";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  const siteUrl = getSiteUrl();

  return {
    title: `${post.title} — Moltzart`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: new URL(path, siteUrl).toString(),
      images: [
        {
          url: `${path}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [`${path}/opengraph-image`],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const formatted = new Date(post.date + "T12:00:00").toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <main className="max-w-xl mx-auto">
        <Link
          href="/"
          className="inline-block text-zinc-500 hover:text-zinc-100 transition-colors text-sm mb-10"
        >
          ← Back
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {post.title}
        </h1>
        <p className="text-sm text-zinc-500 mb-8">{formatted}</p>

        <div className="border-t border-zinc-800 my-8" />

        <MarkdownRenderer content={post.content} />
      </main>
    </div>
  );
}
