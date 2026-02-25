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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12 md:px-8 md:py-16">
      <main className="mx-auto w-full max-w-xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center type-body-sm text-zinc-500 hover:text-zinc-100 transition-colors"
        >
          ← Back
        </Link>

        <header>
          <h1 className="type-h1">{post.title}</h1>
        </header>

        <div className="border-t border-zinc-800 pt-8">
          <MarkdownRenderer
            content={post.content}
            className="prose-p:my-4 prose-headings:mt-8 prose-headings:mb-3"
          />
        </div>
      </main>
    </div>
  );
}
