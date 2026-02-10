"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Lock, FileText, ArrowRight } from "lucide-react";

interface Doc {
  slug: string;
  title: string;
}

export default function Research() {
  const [password, setPassword] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const fetchDocs = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/research", {
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
      if (!res.ok) {
        setError("Failed to load");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDocs(data.docs);
      setAuthed(true);
      sessionStorage.setItem("research_pw", pw);
    } catch {
      setError("Connection error");
    }
    setLoading(false);
    setChecking(false);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("research_pw");
    if (saved) {
      setPassword(saved);
      fetchDocs(saved);
    } else {
      setChecking(false);
    }
  }, [fetchDocs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) fetchDocs(password.trim());
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
            {loading ? "Loading..." : "View Research"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-semibold tracking-tight mb-6">Research</h1>
        <div className="space-y-2">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/research/${doc.slug}`}
              className="flex items-center gap-3 px-4 py-3 border border-zinc-800/50 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors group"
            >
              <FileText size={16} className="text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{doc.title}</span>
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
