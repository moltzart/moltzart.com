import Link from "next/link";
import { Layers, Component, LayoutGrid, Zap } from "lucide-react";
import { Panel } from "@/components/admin/panel";
import { PageHeader } from "@/components/admin/page-header";

const sections = [
  {
    href: "/admin/styleguide/foundations",
    icon: Layers,
    title: "Foundations",
    description: "Colors, typography, spacing, borders, shadows, and icons.",
  },
  {
    href: "/admin/styleguide/components",
    icon: Component,
    title: "Components",
    description: "Buttons, badges, inputs, cards, panels, tables, and status indicators.",
  },
  {
    href: "/admin/styleguide/patterns",
    icon: LayoutGrid,
    title: "Patterns",
    description: "Page layouts, list views, detail pages, collapsible sections, and state patterns.",
  },
  {
    href: "/admin/styleguide/motion",
    icon: Zap,
    title: "Motion",
    description: "Duration scale, easing curves, transition patterns, and Framer Motion presets.",
  },
];

const tokenInventory = [
  { label: "Text sizes", count: 10 },
  { label: "Type classes", count: 9 },
  { label: "Status colors", count: 6 },
  { label: "Radius variants", count: 7 },
  { label: "Shadows", count: 2 },
  { label: "Durations", count: 3 },
];

const checklist = [
  "Uses appropriate container max-width (max-w-xl public, max-w-4xl admin)",
  "Page title uses PageHeader component or .type-h1",
  "Section labels use .type-label text-zinc-500",
  "Cards use border-zinc-800/50, bg-zinc-900/30, rounded-lg",
  "Elevated panels use Panel component (border-zinc-700/50 bg-zinc-800/60)",
  "Interactive elements have hover:bg-zinc-800/40 transition-colors",
  "Buttons have active:scale-[0.98] and disabled:opacity-50",
  "Icons use standard sizes (12/14/16/18) and include shrink-0 in flex",
  "Typography uses .type-* classes, not raw Tailwind equivalents",
  "All transitions are 300ms or under",
  "Focus states are visible (never remove focus-visible:ring)",
  "Tag badges use TagBadge exports, not inline <span> elements",
  "Status indicators use StatusDot or StatusTag, not custom dots",
  "Empty states use EmptyState component",
  "Spacing uses the documented scale",
];

export default function StyleguideOverview() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Styleguide"
        subtitle="Design system reference for moltzart.com"
      />

      {/* Philosophy */}
      <Panel className="px-4 py-4">
        <h2 className="type-label text-zinc-500 mb-3">Philosophy</h2>
        <ul className="space-y-2 type-body-sm text-zinc-300">
          <li><strong className="text-zinc-100">Consistency over novelty</strong> — patterns should be predictable; resist one-off solutions</li>
          <li><strong className="text-zinc-100">Performance first</strong> — fast animations, GPU-accelerated properties only</li>
          <li><strong className="text-zinc-100">Accessibility</strong> — hover states, focus rings, and semantic HTML are non-negotiable</li>
          <li><strong className="text-zinc-100">Practical not perfect</strong> — ship working UI and iterate; don&apos;t block on polish</li>
        </ul>
      </Panel>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Panel className="px-4 py-4 hover:bg-zinc-800/80 transition-colors h-full group">
              <div className="flex items-center gap-2 mb-2">
                <section.icon size={16} className="text-teal-400 shrink-0" />
                <span className="type-body font-medium text-zinc-200 group-hover:text-zinc-100">{section.title}</span>
              </div>
              <p className="type-body-sm text-zinc-500">{section.description}</p>
            </Panel>
          </Link>
        ))}
      </div>

      {/* Token inventory */}
      <div>
        <h2 className="type-label text-zinc-500 mb-3">Token Inventory</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {tokenInventory.map((item) => (
            <Panel key={item.label} className="px-3 py-3 text-center">
              <p className="type-h2 text-zinc-100">{item.count}</p>
              <p className="type-body-sm text-zinc-500 mt-1">{item.label}</p>
            </Panel>
          ))}
        </div>
      </div>

      {/* Pattern checklist */}
      <div>
        <h2 className="type-label text-zinc-500 mb-3">Pattern Checklist</h2>
        <Panel className="px-4 py-4">
          <ul className="space-y-2">
            {checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 type-body-sm text-zinc-400">
                <span className="text-zinc-600 shrink-0">&#9744;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
