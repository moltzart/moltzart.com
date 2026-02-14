"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Download, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";

interface Props {
  slug: string;
  title: string;
  content: string;
  prevSlug?: string | null;
  prevTitle?: string | null;
  nextSlug?: string | null;
  nextTitle?: string | null;
}

export function ResearchDocView({ slug, content, prevSlug, prevTitle, nextSlug, nextTitle }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/research/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        router.push("/admin/research");
      }
    } catch {}
    setDeleting(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/research"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          All Research
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            title="Copy markdown"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            title="Download markdown"
          >
            <Download size={14} />
            Download
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              confirmDelete
                ? "text-red-400 bg-red-950/50 hover:bg-red-950"
                : "text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
            } disabled:opacity-50`}
            title="Delete document"
          >
            <Trash2 size={14} />
            {deleting ? "Deleting..." : confirmDelete ? "Confirm delete" : "Delete"}
          </button>
        </div>
      </div>

      <MarkdownRenderer content={content} />

      {/* Prev/Next navigation */}
      {(prevSlug || nextSlug) && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800/50">
          {prevSlug ? (
            <Link
              href={`/admin/research/${prevSlug}`}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
            >
              <ChevronLeft size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              <div className="text-left">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider block">Previous</span>
                <span className="line-clamp-1">{prevTitle}</span>
              </div>
            </Link>
          ) : (
            <div />
          )}
          {nextSlug ? (
            <Link
              href={`/admin/research/${nextSlug}`}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group text-right"
            >
              <div>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider block">Next</span>
                <span className="line-clamp-1">{nextTitle}</span>
              </div>
              <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
