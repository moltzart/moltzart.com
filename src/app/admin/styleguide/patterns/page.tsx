"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  FileText,
  Inbox,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Panel, PanelHeader } from "@/components/admin/panel";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── data ── */

const sampleListItems = [
  { title: "Research: AI Agents", subtitle: "Product development notes", href: "#" },
  { title: "Newsletter Pipeline", subtitle: "Ops automation workflow", href: "#" },
  { title: "Landing Page Copy", subtitle: "Marketing content draft", href: "#" },
];

/* ── component ── */

export default function PatternsPage() {
  const [collapsedOpen, setCollapsedOpen] = useState(true);

  return (
    <div className="space-y-8">
      {/* ─── 1. Admin Page Layout ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Admin Page Layout</h2>
        <Panel className="px-4 py-4">
          <p className="type-body-sm text-zinc-400 mb-4">Canonical structure for all admin pages:</p>
          <div className="rounded-lg border border-dashed border-zinc-700/50 p-4 space-y-4">
            <div className="rounded border border-zinc-800/50 px-3 py-2 bg-zinc-900/30">
              <span className="type-code text-zinc-500">max-w-4xl</span>
            </div>
            <div className="rounded border border-zinc-800/50 px-3 py-2 bg-zinc-900/30">
              <span className="type-code text-zinc-500">&lt;PageHeader title=&quot;...&quot; /&gt;</span>
            </div>
            <div className="rounded border border-dashed border-zinc-700/50 p-3">
              <span className="type-code text-zinc-500 block mb-2">space-y-6 mt-6</span>
              <div className="space-y-3">
                <div className="rounded border border-zinc-800/50 px-3 py-2 bg-zinc-900/30">
                  <span className="type-code text-zinc-500">type-label text-zinc-500 mb-3</span>
                </div>
                <div className="rounded border border-zinc-800/50 px-3 py-2 bg-zinc-900/30">
                  <span className="type-code text-zinc-500">Section content</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* ─── 2. List View Pattern ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">List View Pattern</h2>
        <Panel className="flex flex-col">
          <PanelHeader
            icon={FileText}
            title="Research Artifacts"
            count={sampleListItems.length}
            countLabel="items"
            action={{ label: "View all", href: "#" }}
          />
          <div className="divide-y divide-zinc-800/30">
            {sampleListItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
              >
                <FileText size={16} className="text-zinc-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="type-body-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                    {item.title}
                  </p>
                  <p className="type-body-sm text-zinc-500">{item.subtitle}</p>
                </div>
                <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      {/* ─── 3. Detail Page Pattern ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Detail Page Pattern</h2>
        <Panel className="px-4 py-4">
          <PageHeader
            title="Article Title"
            subtitle="Captured Mar 1, 2026"
            breadcrumbs={[
              { label: "Research", href: "#" },
              { label: "Project Name", href: "#" },
              { label: "Article Title" },
            ]}
          />
          <div className="mt-4 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
            <p className="type-body-sm text-zinc-400">Content sections would follow here with space-y-6</p>
          </div>
        </Panel>
      </section>

      {/* ─── 4. Collapsible Section ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Collapsible Section</h2>
        <Panel className="flex flex-col">
          <button
            onClick={() => setCollapsedOpen(!collapsedOpen)}
            className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-zinc-800/20 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-teal-400" />
              <span className="type-body-sm font-medium text-zinc-200">Collapsible Section</span>
              <span className="type-body-sm text-zinc-500">3 items</span>
            </div>
            {collapsedOpen
              ? <ChevronDown size={14} className="text-zinc-600" />
              : <ChevronRight size={14} className="text-zinc-600" />
            }
          </button>
          {collapsedOpen && (
            <div className="border-t border-zinc-800/30 divide-y divide-zinc-800/30">
              {["First item", "Second item", "Third item"].map((item) => (
                <div key={item} className="px-4 py-3 type-body-sm text-zinc-300">{item}</div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {/* ─── 5. State Patterns ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">State Patterns</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Loading */}
          <Panel className="px-4 py-4">
            <h3 className="type-body-sm text-zinc-400 mb-3">Loading</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-zinc-500 animate-spin" />
                <span className="type-body-sm text-zinc-400">Refreshing...</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-zinc-500 animate-spin" />
                <span className="type-body-sm text-zinc-400">Loading data...</span>
              </div>
              <div className="opacity-50 pointer-events-none rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2">
                <span className="type-body-sm text-zinc-400">Overlay loading (opacity-50)</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
              </div>
            </div>
          </Panel>

          {/* Empty */}
          <Panel>
            <h3 className="type-body-sm text-zinc-400 px-4 pt-4 mb-0">Empty</h3>
            <EmptyState icon={Inbox} message="Nothing here yet." />
          </Panel>

          {/* Error */}
          <Panel className="px-4 py-4">
            <h3 className="type-body-sm text-zinc-400 mb-3">Error</h3>
            <div className="space-y-3">
              <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
              <input
                type="text"
                className="w-full px-4 py-3 bg-zinc-900 border border-red-400/50 focus:border-red-400 rounded-lg text-zinc-100 text-sm"
                defaultValue="Invalid input"
                readOnly
              />
              <p className="text-sm text-red-400 mt-1">This field is required</p>
            </div>
          </Panel>

          {/* Disabled */}
          <Panel className="px-4 py-4">
            <h3 className="type-body-sm text-zinc-400 mb-3">Disabled</h3>
            <div className="space-y-3">
              <Button size="sm" disabled>Disabled Button</Button>
              <input
                type="text"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 text-sm opacity-50"
                placeholder="Disabled input"
                disabled
              />
            </div>
          </Panel>
        </div>
      </section>

      {/* ─── 6. Accessibility ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Accessibility</h2>
        <Panel className="px-4 py-4 space-y-6">
          {/* Focus rings */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-3">Focus Ring Demos</h3>
            <p className="type-body-sm text-zinc-500 mb-3">Tab through these elements to see focus rings:</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" variant="outline">shadcn focus</Button>
              <button className="px-3 py-2 rounded-lg border border-zinc-800/50 bg-zinc-900/30 type-body-sm text-zinc-300 focus-visible:ring-1 focus-visible:ring-teal-500/60 focus-visible:outline-none transition-colors hover:bg-zinc-800/40">
                Custom teal focus
              </button>
              <input
                type="text"
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-teal-500/60"
                placeholder="Focus me"
              />
            </div>
          </div>

          {/* Contrast table */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-3">Contrast Compliance</h3>
            <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-zinc-500 border-b border-zinc-800/50">
                    <th className="text-left font-medium px-4 py-2">Text</th>
                    <th className="text-left font-medium px-4 py-2">Background</th>
                    <th className="text-left font-medium px-4 py-2">WCAG</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { text: "text-zinc-100", bg: "bg-zinc-950", wcag: "AA" },
                    { text: "text-zinc-200", bg: "bg-zinc-950", wcag: "AA" },
                    { text: "text-zinc-300", bg: "bg-zinc-900/30", wcag: "AA" },
                    { text: "text-zinc-400", bg: "bg-zinc-950", wcag: "AA" },
                    { text: "text-zinc-500", bg: "bg-zinc-950", wcag: "AA (large)" },
                  ].map((row) => (
                    <tr key={row.text} className="border-b border-zinc-800/30 last:border-0">
                      <td className={cn("text-sm px-4 py-2", row.text)}>{row.text}</td>
                      <td className="text-sm text-zinc-500 px-4 py-2">{row.bg}</td>
                      <td className="text-sm text-emerald-400 px-4 py-2">{row.wcag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Color independence */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-3">Color Independence</h3>
            <p className="type-body-sm text-zinc-500 mb-2">
              Color is never the only indicator — always paired with icons, text, or position:
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-2 text-sm text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400" /> Urgent
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Complete
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Active
              </span>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
