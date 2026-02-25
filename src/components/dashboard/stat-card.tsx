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
      <div className="flex items-center justify-between mb-2">
        <span className="type-label text-zinc-500">{title}</span>
        <ArrowUpRight size={12} className="text-zinc-700 group-hover:text-teal-400 transition-colors" />
      </div>
      <div className="type-h2 text-zinc-100">{value}</div>
      {subtitle && (
        <p className="type-body-sm text-zinc-600 mt-1">{subtitle}</p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </Link>
  );
}
