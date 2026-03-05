import { FileText, Folder, Bell, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Panel } from "@/components/admin/panel";
import { StatusDot } from "@/components/admin/status-dot";

/* ── data ── */

const backgrounds = [
  { label: "Page bg", cls: "bg-zinc-950", token: "bg-zinc-950" },
  { label: "Card bg", cls: "bg-zinc-900/30", token: "bg-zinc-900/30" },
  { label: "Hover", cls: "bg-zinc-800/40", token: "bg-zinc-800/40" },
  { label: "Panel", cls: "bg-zinc-800/60", token: "bg-zinc-800/60" },
];

const textHierarchy = [
  { cls: "text-zinc-100", label: "zinc-100", usage: "Headings, primary text" },
  { cls: "text-zinc-200", label: "zinc-200", usage: "Body text" },
  { cls: "text-zinc-300", label: "zinc-300", usage: "De-emphasized body, prose" },
  { cls: "text-zinc-400", label: "zinc-400", usage: "Muted text, secondary labels" },
  { cls: "text-zinc-500", label: "zinc-500", usage: "Labels, meta text" },
  { cls: "text-zinc-600", label: "zinc-600", usage: "Very subtle, timestamps" },
];

const statusVariants: Array<{ name: string; variant: "urgent" | "active" | "blocked" | "scheduled" | "complete" | "neutral"; text: string; bg: string; border: string }> = [
  { name: "Urgent", variant: "urgent", text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  { name: "Active", variant: "active", text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  { name: "Blocked", variant: "blocked", text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  { name: "Scheduled", variant: "scheduled", text: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { name: "Complete", variant: "complete", text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { name: "Neutral", variant: "neutral", text: "text-zinc-400", bg: "bg-zinc-400/10", border: "border-zinc-400/20" },
];

const typeScale = [
  { step: "text-3xs", clamp: "clamp(0.625rem, 0.6rem + 0.1vw, 0.6875rem)", approx: "~10-11px" },
  { step: "text-2xs", clamp: "clamp(0.6875rem, 0.66rem + 0.12vw, 0.75rem)", approx: "~11-12px" },
  { step: "text-xs", clamp: "clamp(0.75rem, 0.72rem + 0.14vw, 0.8125rem)", approx: "~12-13px" },
  { step: "text-sm", clamp: "clamp(0.875rem, 0.84rem + 0.16vw, 0.9375rem)", approx: "~14-15px" },
  { step: "text-base", clamp: "clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)", approx: "~16-17px" },
  { step: "text-lg", clamp: "clamp(1.125rem, 1.05rem + 0.32vw, 1.25rem)", approx: "~18-20px" },
  { step: "text-xl", clamp: "clamp(1.25rem, 1.13rem + 0.5vw, 1.5rem)", approx: "~20-24px" },
  { step: "text-2xl", clamp: "clamp(1.5rem, 1.3rem + 0.85vw, 1.875rem)", approx: "~24-30px" },
  { step: "text-3xl", clamp: "clamp(1.875rem, 1.55rem + 1.35vw, 2.5rem)", approx: "~30-40px" },
  { step: "text-4xl", clamp: "clamp(2.25rem, 1.8rem + 1.9vw, 3.25rem)", approx: "~36-52px" },
];

const typeClasses = [
  { cls: "type-display", applies: "text-4xl font-semibold tracking-tight", usage: "Hero headline" },
  { cls: "type-h1", applies: "text-3xl font-medium tracking-tight", usage: "Page headings" },
  { cls: "type-h2", applies: "text-2xl font-medium tracking-tight", usage: "Section headings" },
  { cls: "type-h3", applies: "text-xl font-medium tracking-tight", usage: "Sub-section headings" },
  { cls: "type-lead", applies: "text-lg leading-relaxed", usage: "Intro paragraphs" },
  { cls: "type-body", applies: "text-sm leading-relaxed", usage: "Standard body text" },
  { cls: "type-body-sm", applies: "text-xs leading-relaxed", usage: "Secondary/meta text" },
  { cls: "type-label", applies: "text-xs uppercase tracking-[0.08em] font-medium", usage: "Section labels" },
  { cls: "type-badge", applies: "text-3xs uppercase tracking-[0.08em] font-medium font-mono", usage: "Tag badges" },
];

const spacingScale = [
  { util: "gap-1 / space-y-1", value: "4px", usage: "Tight inline spacing" },
  { util: "gap-1.5 / space-y-1.5", value: "6px", usage: "Tight list items" },
  { util: "gap-2 / space-y-2", value: "8px", usage: "Icon + text, standard list items" },
  { util: "gap-2.5", value: "10px", usage: "Input internal spacing" },
  { util: "gap-3 / space-y-3", value: "12px", usage: "Card stacks, button groups" },
  { util: "gap-4 / space-y-4", value: "16px", usage: "Section group spacing" },
  { util: "gap-6 / space-y-6", value: "24px", usage: "Major section spacing" },
];

const radiusVariants = [
  { token: "rounded-sm", value: "6px" },
  { token: "rounded-md", value: "8px" },
  { token: "rounded-lg", value: "10px" },
  { token: "rounded-xl", value: "14px" },
  { token: "rounded-2xl", value: "18px" },
  { token: "rounded-3xl", value: "22px" },
  { token: "rounded-4xl", value: "26px" },
];

const borderPatterns = [
  { label: "Standard card", cls: "border border-zinc-800/50" },
  { label: "Panel component", cls: "border border-zinc-700/50" },
  { label: "Subtle divider", cls: "border border-zinc-800/30" },
  { label: "Input border", cls: "border border-zinc-800" },
];

const iconSizes = [
  { size: 12, usage: "Chevrons, meta indicators" },
  { size: 14, usage: "Status icons, inline secondary" },
  { size: 16, usage: "Default section icons" },
  { size: 18, usage: "Emphasis icons" },
  { size: 32, usage: "EmptyState illustration" },
];

/* ── component ── */

export default function FoundationsPage() {
  return (
    <div className="space-y-8">
      {/* ─── 1. Color System ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Color System</h2>
        <div className="space-y-4">
          {/* Backgrounds */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Backgrounds & Surfaces</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {backgrounds.map((bg) => (
                <div key={bg.label} className="space-y-2">
                  <div className={`h-16 rounded-lg border border-zinc-700/50 ${bg.cls}`} />
                  <p className="type-body-sm text-zinc-300">{bg.label}</p>
                  <p className="type-code text-zinc-500">{bg.token}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Text hierarchy */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Text Hierarchy</h3>
            <div className="space-y-3">
              {textHierarchy.map((t) => (
                <div key={t.label} className="flex items-center gap-4">
                  <span className={`type-body font-medium w-24 ${t.cls}`}>Aa</span>
                  <span className="type-code text-zinc-400 w-28">{t.label}</span>
                  <span className="type-body-sm text-zinc-500">{t.usage}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Teal accent */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Teal Accent</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-teal-400 type-body font-medium">text-teal-400</span>
              <span className="bg-teal-400/10 text-teal-400 px-3 py-1 rounded type-body-sm">bg-teal-400/10</span>
              <span className="border border-teal-500/60 px-3 py-1 rounded text-teal-400 type-body-sm">ring-teal-500/60</span>
            </div>
          </Panel>

          {/* Status colors */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Status Colors</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statusVariants.map((s) => (
                <div key={s.name} className={`rounded-lg border px-3 py-3 ${s.bg} ${s.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusDot variant={s.variant} />
                    <span className={`type-body-sm font-medium ${s.text}`}>{s.name}</span>
                  </div>
                  <p className="type-code text-zinc-500">{s.text}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      {/* ─── 2. Typography ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Typography</h2>
        <div className="space-y-4">
          {/* Fluid type scale */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Fluid Type Scale</h3>
            <div className="space-y-3">
              {typeScale.map((t) => (
                <div key={t.step} className="flex items-baseline gap-4">
                  <span className={`${t.step} text-zinc-200 w-48 shrink-0`}>The quick brown fox</span>
                  <span className="type-code text-zinc-400 shrink-0">{t.step}</span>
                  <span className="type-body-sm text-zinc-600">{t.approx}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* .type-* classes */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">.type-* Classes</h3>
            <div className="space-y-4">
              {typeClasses.map((t) => (
                <div key={t.cls} className="space-y-1">
                  <span className={`${t.cls} text-zinc-200`}>
                    {t.cls === "type-badge" ? "TAG BADGE" : "The quick brown fox"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="type-code text-teal-400">.{t.cls}</span>
                    <span className="type-body-sm text-zinc-500">{t.usage}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Markdown variants */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Markdown Variants</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="type-code text-teal-400">.doc-markdown</span>
                <span className="type-body-sm text-zinc-500">Full prose treatment for long-form reading</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="type-code text-teal-400">.doc-markdown-compact</span>
                <span className="type-body-sm text-zinc-500">Tighter spacing for card contexts</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="type-code text-teal-400">.doc-markdown-subtle</span>
                <span className="type-body-sm text-zinc-500">Muted body text (zinc-400)</span>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {/* ─── 3. Spacing & Radius ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Spacing & Radius</h2>
        <div className="space-y-4">
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Spacing Scale</h3>
            <div className="space-y-2">
              {spacingScale.map((s) => (
                <div key={s.util} className="flex items-center gap-4">
                  <div className="w-16 flex justify-end">
                    <div className="bg-teal-400/30 h-3 rounded" style={{ width: s.value }} />
                  </div>
                  <span className="type-code text-zinc-400 w-44 shrink-0">{s.util}</span>
                  <span className="type-body-sm text-zinc-500 w-12 shrink-0">{s.value}</span>
                  <span className="type-body-sm text-zinc-500">{s.usage}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Border Radius</h3>
            <div className="flex items-end gap-3 flex-wrap">
              {radiusVariants.map((r) => (
                <div key={r.token} className="text-center">
                  <div
                    className={`w-14 h-14 border border-zinc-500 bg-zinc-800/40 ${r.token}`}
                  />
                  <p className="type-code text-zinc-400 mt-2">{r.token}</p>
                  <p className="type-body-sm text-zinc-600">{r.value}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      {/* ─── 4. Borders & Shadows ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Borders & Shadows</h2>
        <div className="space-y-4">
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Border Patterns</h3>
            <div className="grid grid-cols-2 gap-3">
              {borderPatterns.map((b) => (
                <div key={b.label}>
                  <div className={`h-16 rounded-lg bg-zinc-900/30 ${b.cls}`} />
                  <p className="type-body-sm text-zinc-300 mt-2">{b.label}</p>
                  <p className="type-code text-zinc-500">{b.cls}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">Shadow Tokens</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-20 rounded-lg bg-zinc-800/60 border border-zinc-700/50 shadow-card" />
                <p className="type-body-sm text-zinc-300 mt-2">shadow-card</p>
                <p className="type-body-sm text-zinc-500">Elevated panels, popovers</p>
              </div>
              <div>
                <div className="h-20 rounded-lg bg-zinc-800/60 border border-zinc-700/50 shadow-overlay" />
                <p className="type-body-sm text-zinc-300 mt-2">shadow-overlay</p>
                <p className="type-body-sm text-zinc-500">Modals, sheets, dropdowns</p>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {/* ─── 5. Icon System ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Icon System</h2>
        <Panel className="px-4 py-4">
          <h3 className="type-body font-medium text-zinc-200 mb-3">Standard Sizes</h3>
          <div className="flex items-end gap-6">
            {iconSizes.map((item) => {
              const icons = [FileText, Folder, Bell, CheckCircle, AlertTriangle, Clock];
              const Icon = icons[item.size % icons.length];
              return (
                <div key={item.size} className="text-center">
                  <Icon size={item.size} className="text-zinc-400 mx-auto" />
                  <p className="type-code text-zinc-400 mt-2">{item.size}px</p>
                  <p className="type-body-sm text-zinc-500 mt-1 max-w-20">{item.usage}</p>
                </div>
              );
            })}
          </div>

          <h3 className="type-body font-medium text-zinc-200 mt-6 mb-3">Color States</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-zinc-500" />
              <span className="type-body-sm text-zinc-500">Default</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-zinc-400" />
              <span className="type-body-sm text-zinc-400">Hover</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-teal-400" />
              <span className="type-body-sm text-teal-400">Accent</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-red-400" />
              <span className="type-body-sm text-red-400">Status</span>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
