"use client";

import { FileText, Inbox, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/admin/panel";
import { StatusDot } from "@/components/admin/status-dot";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { MarkdownRenderer } from "@/components/admin/markdown-renderer";
import {
  LaneTag,
  PillarTag,
  SourceTag,
  DomainTag,
  KindTag,
} from "@/components/admin/tag-badge";

/* ── data ── */

const buttonVariants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const buttonSizes = ["xs", "sm", "default", "lg"] as const;

const statusDotVariants = ["urgent", "active", "blocked", "scheduled", "complete", "neutral"] as const;

const sampleTableData = [
  { name: "Research: AI Agents", domain: "product", date: "Mar 1, 2026" },
  { name: "Newsletter Pipeline", domain: "ops", date: "Feb 28, 2026" },
  { name: "Landing Page Copy", domain: "marketing", date: "Feb 25, 2026" },
];

const sampleMarkdown = `## Sample Heading

This is a paragraph with **bold** and *italic* text, plus \`inline code\`.

- First list item
- Second list item with [a link](https://example.com)

| Column A | Column B |
|---|---|
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |
`;

/* ── component ── */

export default function ComponentsPage() {
  return (
    <div className="space-y-8">
      {/* ─── 1. Buttons ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Buttons</h2>
        <Panel className="px-4 py-4 space-y-6">
          {/* Variants */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-3">Variants</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {buttonVariants.map((v) => (
                <Button key={v} variant={v} size="sm">
                  {v}
                </Button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-3">Sizes</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {buttonSizes.map((s) => (
                <Button key={s} variant="outline" size={s}>
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* States */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-3">States</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm">Normal</Button>
              <Button size="sm" disabled>Disabled</Button>
              <p className="type-body-sm text-zinc-500">
                All buttons include <code className="type-code text-amber-300">active:scale-[0.98]</code> — click to test.
              </p>
            </div>
          </div>
        </Panel>
      </section>

      {/* ─── 2. Badges ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Badges (TagBadge)</h2>
        <Panel className="px-4 py-4 space-y-4">
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">LaneTag</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {["HN", "Design", "CSS", "AI/Tech", "UX"].map((l) => (
                <LaneTag key={l} lane={l} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">PillarTag</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {["DESIGN + DEVELOPMENT", "TECH + INNOVATION", "WORK + MINDSET"].map((p) => (
                <PillarTag key={p} pillar={p} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">SourceTag</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {["The Verge", "Hacker News", "TechCrunch", "Ars Technica"].map((s) => (
                <SourceTag key={s} source={s} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">DomainTag</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {["product", "marketing", "ops", "content", "strategy"].map((d) => (
                <DomainTag key={d} domain={d} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">KindTag</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <KindTag kind="product" />
              <KindTag kind="general" />
            </div>
          </div>
        </Panel>
      </section>

      {/* ─── 3. Inputs ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Inputs</h2>
        <Panel className="px-4 py-4 space-y-4 max-w-md">
          <div>
            <label className="type-body-sm text-zinc-400 mb-1 block">Default</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-sm"
              placeholder="Placeholder text"
              readOnly
            />
          </div>
          <div>
            <label className="type-body-sm text-zinc-400 mb-1 block">Focus</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-600 rounded-lg text-zinc-100 text-sm ring-1 ring-teal-500/60"
              defaultValue="Focused state"
              readOnly
            />
          </div>
          <div>
            <label className="type-body-sm text-zinc-400 mb-1 block">Error</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-zinc-900 border border-red-400/50 rounded-lg text-zinc-100 text-sm"
              defaultValue="Invalid value"
              readOnly
            />
            <p className="text-sm text-red-400 mt-1">This field is required</p>
          </div>
          <div>
            <label className="type-body-sm text-zinc-400 mb-1 block">Disabled</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 text-sm opacity-50"
              placeholder="Disabled input"
              disabled
            />
          </div>
        </Panel>
      </section>

      {/* ─── 4. Cards ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <h3 className="type-body-sm text-zinc-400 mb-2">Interactive</h3>
            <div className="border border-zinc-800/50 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors px-4 py-3 cursor-pointer">
              <p className="type-body-sm font-medium text-zinc-200">Interactive card</p>
              <p className="type-body-sm text-zinc-500 mt-1">Hover to see background change</p>
            </div>
          </div>
          <div>
            <h3 className="type-body-sm text-zinc-400 mb-2">Static</h3>
            <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
              <p className="type-body-sm font-medium text-zinc-200">Static card</p>
              <p className="type-body-sm text-zinc-500 mt-1">No hover state</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Panel & PanelHeader ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Panel & PanelHeader</h2>
        <div className="space-y-3">
          <Panel className="flex flex-col">
            <PanelHeader
              icon={AlertCircle}
              title="With icon, count, and action"
              count={12}
              action={{ label: "View all", href: "#" }}
            />
            <div className="px-4 py-3 type-body-sm text-zinc-400">Panel content area</div>
          </Panel>

          <Panel className="flex flex-col">
            <PanelHeader title="Title only — no icon or action" />
            <div className="px-4 py-3 type-body-sm text-zinc-400">Minimal header</div>
          </Panel>

          <Panel className="flex flex-col">
            <PanelHeader
              icon={Search}
              title="With custom count label"
              count={3}
              countLabel="artifacts"
            />
            <div className="px-4 py-3 type-body-sm text-zinc-400">Custom count label</div>
          </Panel>
        </div>
      </section>

      {/* ─── 6. Table ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Table</h2>
        <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800/50">
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Domain</th>
                <th className="text-left font-medium px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {sampleTableData.map((row) => (
                <tr key={row.name} className="border-b border-zinc-800/30 last:border-0">
                  <td className="text-left text-sm text-zinc-300 px-4 py-3">{row.name}</td>
                  <td className="text-left px-4 py-3"><DomainTag domain={row.domain} /></td>
                  <td className="text-left text-sm text-zinc-500 px-4 py-3">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── 7. StatusDot ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">StatusDot</h2>
        <Panel className="px-4 py-4">
          <div className="flex items-center gap-6 flex-wrap">
            {statusDotVariants.map((v) => (
              <div key={v} className="flex items-center gap-2">
                <StatusDot variant={v} />
                <span className="type-body-sm text-zinc-400">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 flex-wrap mt-4">
            {statusDotVariants.map((v) => (
              <div key={`${v}-pulse`} className="flex items-center gap-2">
                <StatusDot variant={v} pulse />
                <span className="type-body-sm text-zinc-400">{v} (pulse)</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* ─── 8. EmptyState ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">EmptyState</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Panel>
            <EmptyState icon={FileText} message="No research articles yet." />
          </Panel>
          <Panel>
            <EmptyState
              icon={Inbox}
              message="Your inbox is empty."
              action={<Button size="sm" variant="outline">Refresh</Button>}
            />
          </Panel>
        </div>
      </section>

      {/* ─── 9. PageHeader ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">PageHeader</h2>
        <div className="space-y-4">
          <Panel className="px-4 py-4">
            <PageHeader title="Simple Title" subtitle="With a subtitle" />
          </Panel>
          <Panel className="px-4 py-4">
            <PageHeader
              title="With Breadcrumbs"
              breadcrumbs={[
                { label: "Admin", href: "#" },
                { label: "Research", href: "#" },
                { label: "Detail" },
              ]}
            >
              <Button size="sm" variant="outline">Action</Button>
            </PageHeader>
          </Panel>
        </div>
      </section>

      {/* ─── 10. MarkdownRenderer ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">MarkdownRenderer</h2>
        <div className="space-y-3">
          <Panel className="px-4 py-4">
            <h3 className="type-body-sm text-zinc-400 mb-3">doc-markdown (default via MarkdownRenderer)</h3>
            <MarkdownRenderer content={sampleMarkdown} />
          </Panel>
          <Panel className="px-4 py-4">
            <h3 className="type-body-sm text-zinc-400 mb-3">doc-markdown-compact doc-markdown-subtle</h3>
            <MarkdownRenderer content={sampleMarkdown} className="doc-markdown-subtle" />
          </Panel>
        </div>
      </section>
    </div>
  );
}
