"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      if (res.status === 401) {
        setError("Wrong password");
      } else if (res.ok) {
        router.refresh();
      }
    } catch {
      setError("Connection error");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="flex items-center gap-3">
          <Lock size={18} className="text-zinc-500" />
          <h1 className="type-h3">Moltzart Admin</h1>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg type-body-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          autoFocus
        />
        {error && <p className="type-body-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] rounded-lg type-body-sm font-medium transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? "Loading..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
