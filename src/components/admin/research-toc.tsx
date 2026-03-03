"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, List } from "lucide-react";
import { Panel } from "@/components/admin/panel";

interface ResearchTocProps {
  headings: Array<{ id: string; text: string }>;
}

export function ResearchToc({ headings }: ResearchTocProps) {
  const [collapsed, setCollapsed] = useState(headings.length < 3);

  if (headings.length === 0) return null;

  const Chevron = collapsed ? ChevronRight : ChevronDown;

  return (
    <Panel>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors rounded-lg"
      >
        <List size={16} className="text-zinc-500 shrink-0" />
        <span className="text-sm font-medium text-zinc-200 flex-1 text-left">
          On this page
        </span>
        <Chevron size={14} className="text-zinc-600" />
      </button>
      {!collapsed && (
        <div className="px-4 pb-3 border-t border-zinc-800/30">
          <nav className="space-y-1.5 pt-3">
            {headings.map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(heading.id)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="block text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </div>
      )}
    </Panel>
  );
}
