"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Brain,
  Calendar,
  FileText,
  Settings,
  User,
  ListTodo,
  Sparkles,
  ChevronRight,
  ChevronDown,
  X,
  Folder,
  Loader2,
} from "lucide-react";
import type { BrainFile } from "@/lib/github";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import { EmptyState } from "@/components/admin/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = [
  { id: "all", label: "All", icon: Brain },
  { id: "identity", label: "Identity", icon: User },
  { id: "memory", label: "Memory", icon: Sparkles },
  { id: "daily-logs", label: "Daily Logs", icon: Calendar },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "research", label: "Research", icon: FileText },
  { id: "content", label: "Content", icon: FileText },
  { id: "config", label: "Config", icon: Settings },
] as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function highlightMatches(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<mark class="bg-amber-500/30 text-amber-200 rounded-sm px-0.5">$1</mark>'
  );
}

// Group files by category for tree view
function groupByCategory(files: BrainFile[]): { category: string; label: string; files: BrainFile[] }[] {
  const map = new Map<string, BrainFile[]>();
  for (const f of files) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category)!.push(f);
  }
  const catOrder = ["identity", "memory", "daily-logs", "tasks", "research", "content", "config"];
  const catLabels: Record<string, string> = {
    identity: "Identity",
    memory: "Memory",
    "daily-logs": "Daily Logs",
    tasks: "Tasks",
    research: "Research",
    content: "Content",
    config: "Config",
  };
  return catOrder
    .filter((cat) => map.has(cat))
    .map((cat) => ({ category: cat, label: catLabels[cat] || cat, files: map.get(cat)! }));
}

interface SearchResult {
  path: string;
  name: string;
  snippet: string;
  matchCount: number;
}

export function BrainView() {
  const [files, setFiles] = useState<BrainFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Load file list only (no content preloading)
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
      setLoading(false);
    })();
  }, []);

  // Server-side search with debounce
  useEffect(() => {
    const query = search.trim();
    if (!query) return;

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch("/api/brain/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch {}
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  // Derive: clear search results when search is empty
  const effectiveSearchResults = search.trim() ? searchResults : null;

  // Load selected file content on-demand
  const loadContent = useCallback(async (path: string) => {
    setSelectedFile(path);
    setLoadingContent(true);
    const res = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "content", path }),
    });
    if (res.ok) {
      const data = await res.json();
      setFileContent(data.content);
    }
    setLoadingContent(false);
  }, []);

  // Filter files by category
  const filtered = useMemo(() => {
    if (activeCategory === "all") return files;
    return files.filter((f) => f.category === activeCategory);
  }, [files, activeCategory]);

  // Stats
  const stats = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const f of files) {
      cats[f.category] = (cats[f.category] || 0) + 1;
    }
    return cats;
  }, [files]);

  const toggleGroup = (cat: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const groups = useMemo(() => groupByCategory(filtered), [filtered]);

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Brain size={20} /> Brain
        </h1>
        <div className="text-sm text-zinc-500">Loading your second brain...</div>
      </div>
    );
  }

  // File list panel content
  const fileListContent = search.trim() && effectiveSearchResults ? (
    // Search results mode
    <div className="space-y-1">
      {searching && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
          <Loader2 size={12} className="animate-spin" /> Searching...
        </div>
      )}
      {!searching && effectiveSearchResults.length === 0 && (
        <p className="text-sm text-zinc-500 py-6 text-center">No results for &ldquo;{search}&rdquo;</p>
      )}
      {effectiveSearchResults.map((result) => (
        <button
          key={result.path}
          onClick={() => loadContent(result.path)}
          className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
            selectedFile === result.path
              ? "bg-zinc-800 text-zinc-100"
              : "hover:bg-zinc-800/40 text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={12} className="text-zinc-500 shrink-0" />
            <span className="text-sm truncate">{result.name}</span>
            <span className="text-[10px] font-mono text-zinc-600 ml-auto shrink-0">
              {result.matchCount} match{result.matchCount !== 1 ? "es" : ""}
            </span>
          </div>
          {result.snippet && (
            <p
              className="text-xs text-zinc-500 mt-1 line-clamp-2 pl-5"
              dangerouslySetInnerHTML={{
                __html: highlightMatches(
                  result.snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                  search
                ),
              }}
            />
          )}
        </button>
      ))}
    </div>
  ) : (
    // Tree view mode (grouped by category)
    <div className="space-y-1">
      {groups.map((group) => (
        <div key={group.category}>
          <button
            onClick={() => toggleGroup(group.category)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors rounded-md hover:bg-zinc-800/20"
          >
            {collapsedGroups.has(group.category) ? (
              <ChevronRight size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            <span className="uppercase tracking-wider">{group.label}</span>
            <span className="text-zinc-600 ml-auto font-mono">{group.files.length}</span>
          </button>
          {!collapsedGroups.has(group.category) && (
            <div className="ml-2">
              {group.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => loadContent(file.path)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                    selectedFile === file.path
                      ? "bg-zinc-800 text-zinc-100"
                      : "hover:bg-zinc-800/40 text-zinc-300"
                  }`}
                >
                  <FileText size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                    {formatSize(file.size)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Content panel
  const contentPanel = selectedFile ? (
    <div className="flex flex-col h-full">
      {/* Sticky breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-950/80 shrink-0">
        <Folder size={12} className="text-zinc-600" />
        <span className="text-xs text-zinc-500 font-mono truncate">{selectedFile}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loadingContent ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-8">
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          ) : fileContent ? (
            <MarkdownRenderer content={fileContent} />
          ) : (
            <p className="text-sm text-zinc-500">Failed to load content.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-zinc-600">Select a file to view its content</p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Brain size={20} /> Brain
        </h1>
        <span className="text-xs text-zinc-500">{files.length} files</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          type="text"
          placeholder="Search everything..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-800/50 bg-zinc-900/30 pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count = cat.id === "all" ? files.length : stats[cat.id] || 0;
          if (count === 0 && cat.id !== "all") return null;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                  : "bg-zinc-900/30 text-zinc-500 border border-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <cat.icon size={12} />
              {cat.label}
              <span className={`ml-1 ${active ? "text-zinc-400" : "text-zinc-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Split panel: file list + content */}
      {/* Desktop: side by side. Mobile: stacked */}
      <div className="flex flex-col md:flex-row gap-4 min-h-[60vh]">
        {/* File list (40%) */}
        <div className="w-full md:w-2/5 rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
          <ScrollArea className="h-[60vh]">
            <div className="p-2">
              {filtered.length === 0 ? (
                <EmptyState icon={FileText} message="No files in this category" />
              ) : (
                fileListContent
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Content preview (60%) */}
        <div className="w-full md:w-3/5 rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden h-[60vh]">
          {contentPanel}
        </div>
      </div>
    </div>
  );
}
