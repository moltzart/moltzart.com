"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, ChevronDown, FolderOpen, Inbox } from "lucide-react";

interface ResearchGroupProps {
  title: string;
  count: number;
  isUnassigned?: boolean;
  children: ReactNode;
}

export function ResearchGroup({ title, count, isUnassigned, children }: ResearchGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  const Icon = isUnassigned ? Inbox : FolderOpen;

  return (
    <div className="border border-zinc-800/50 rounded-lg bg-zinc-900/30">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors rounded-lg"
      >
        <Icon size={16} className="text-zinc-500 shrink-0" />
        <span className="text-sm font-medium text-zinc-200 flex-1 text-left">
          {title}
        </span>
        <span className="text-xs text-zinc-600 mr-2">{count} artifact{count !== 1 ? "s" : ""}</span>
        <Chevron size={14} className="text-zinc-600 shrink-0" />
      </button>
      {!collapsed && (
        <div className="border-t border-zinc-800/30">
          {children}
        </div>
      )}
    </div>
  );
}
