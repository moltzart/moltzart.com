import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import * as React from "react";

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-zinc-700/50 bg-zinc-800/60", className)}
      {...props}
    />
  );
}

interface PanelHeaderProps {
  icon?: LucideIcon;
  title: string;
  count?: number;
  countLabel?: string;
  action?: { label: string; href: string };
  children?: React.ReactNode;
}

export function PanelHeader({
  icon: Icon,
  title,
  count,
  countLabel,
  action,
  children,
}: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-teal-400" />}
        <span className="type-body-sm font-medium text-zinc-200">{title}</span>
        {count != null && (
          <span className="type-body-sm text-zinc-500">
            {count} {countLabel ?? "items"}
          </span>
        )}
        {children}
      </div>
      {action && (
        <Link
          href={action.href}
          className="type-body-sm text-zinc-500 hover:text-teal-400 transition-colors flex items-center gap-1"
        >
          {action.label} <ArrowUpRight size={10} />
        </Link>
      )}
    </div>
  );
}
