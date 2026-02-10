"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResearchDoc() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const fetchDoc = useCallback(
    async (pw: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/research/${slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pw }),
        });
        if (res.status === 401) {
          setError("Wrong password");
          setAuthed(false);
          sessionStorage.removeItem("research_pw");
          setLoading(false);
          return;
        }
        if (res.status === 404) {
          setError("Document not found");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError("Failed to load");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTitle(data.title);
        setContent(data.content);
        setAuthed(true);
        sessionStorage.setItem("research_pw", pw);
      } catch {
        setError("Connection error");
      }
      setLoading(false);
      setChecking(false);
    },
    [slug]
  );

  useEffect(() => {
    const saved = sessionStorage.getItem("research_pw");
    if (saved) {
      setPassword(saved);
      fetchDoc(saved);
    } else {
      setChecking(false);
    }
  }, [fetchDoc]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) fetchDoc(password.trim());
  };

  if (checking) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <Lock size={18} className="text-zinc-500" />
            <h1 className="text-xl font-semibold tracking-tight">Research</h1>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "View Document"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/research"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          All Research
        </Link>

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : (
          <article className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-zinc-100 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:text-amber-300 prose-code:bg-zinc-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-table:text-sm prose-th:text-zinc-400 prose-th:font-medium prose-td:text-zinc-300 prose-hr:border-zinc-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
