import { notFound } from "next/navigation";
import { fetchResearchDoc, fetchResearchList } from "@/lib/github";
import { ResearchDocView } from "@/components/research-doc-view";

export const dynamic = "force-dynamic";

export default async function AdminResearchDoc({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [doc, allDocs] = await Promise.all([
    fetchResearchDoc(slug),
    fetchResearchList(),
  ]);

  if (!doc) notFound();

  const currentIdx = allDocs.findIndex((d) => d.slug === slug);
  const prevSlug = currentIdx < allDocs.length - 1 ? allDocs[currentIdx + 1].slug : null;
  const nextSlug = currentIdx > 0 ? allDocs[currentIdx - 1].slug : null;
  const prevTitle = prevSlug ? allDocs[currentIdx + 1].title : null;
  const nextTitle = nextSlug ? allDocs[currentIdx - 1].title : null;

  return (
    <ResearchDocView
      slug={slug}
      title={doc.title}
      content={doc.content}
      prevSlug={prevSlug}
      prevTitle={prevTitle}
      nextSlug={nextSlug}
      nextTitle={nextTitle}
    />
  );
}
