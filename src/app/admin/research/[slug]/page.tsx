"use client";

import { AdminShell, useAdminAuth } from "@/components/admin-shell";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Download,
  Trash2,
  Check,
} from "lucide-react";

function DocContent() {
  const { slug } = useParams<{ slug: string }>();
  const { password } = useAdminAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchDoc = useCallback(async () => {
    if (!password) return;
    try {
      const res = await fetch(`/api/research/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setContent(data.content);
      }
    } catch {}
    setLoading(false);
  }, [password, slug]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

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
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin/research");
      }
    } catch {}
    setDeleting(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/research"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          All Research
        </Link>

        {!loading && content && (
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
        )}
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : (
        <article className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-zinc-100 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:text-amber-300 prose-code:bg-zinc-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-table:text-sm prose-th:text-zinc-400 prose-th:font-medium prose-td:text-zinc-300 prose-hr:border-zinc-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}

export default function AdminResearchDoc() {
  return (
    <AdminShell title="Research">
      <DocContent />
    </AdminShell>
  );
}
