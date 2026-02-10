"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Lock } from "lucide-react";

interface AdminContextType {
  password: string;
}

const AdminContext = createContext<AdminContextType>({ password: "" });

export function useAdminAuth() {
  return useContext(AdminContext);
}

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const verify = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 401) {
        setError("Wrong password");
        setAuthed(false);
        sessionStorage.removeItem("admin_pw");
        setLoading(false);
        setChecking(false);
        return;
      }
      if (res.ok) {
        setAuthed(true);
        setPassword(pw);
        sessionStorage.setItem("admin_pw", pw);
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
    setChecking(false);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) {
      setPassword(saved);
      verify(saved);
    } else {
      setChecking(false);
    }
  }, [verify]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_pw");
    setAuthed(false);
    setPassword("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) verify(password.trim());
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
            <h1 className="text-xl font-semibold tracking-tight">Moltzart Admin</h1>
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
            {loading ? "Loading..." : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ password }}>
      <SidebarProvider>
        <AdminSidebar onLogout={handleLogout} />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <span className="text-sm font-medium">{title}</span>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AdminContext.Provider>
  );
}
