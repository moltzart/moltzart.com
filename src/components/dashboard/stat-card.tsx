import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { type ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  href: string;
  children?: ReactNode;
}

export function StatCard({ title, value, subtitle, href, children }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-zinc-700/50 bg-zinc-800/60 p-4 hover:bg-zinc-800/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{title}</span>
        <ArrowUpRight size={12} className="text-zinc-700 group-hover:text-teal-400 transition-colors" />
      </div>
      <div className="text-2xl font-semibold tracking-tight text-zinc-100 font-mono">{value}</div>
      {subtitle && (
        <p className="text-xs text-zinc-600 mt-0.5">{subtitle}</p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </Link>
  );
}
