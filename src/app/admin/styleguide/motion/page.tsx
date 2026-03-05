"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Panel } from "@/components/admin/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── data ── */

const durations = [
  { label: "Fast", ms: 100, token: "--duration-fast", tailwind: "duration-100" },
  { label: "Normal", ms: 200, token: "--duration-normal", tailwind: "duration-200" },
  { label: "Slow", ms: 300, token: "--duration-slow", tailwind: "duration-300" },
];

const easings = [
  { label: "Ease out (enter)", css: "cubic-bezier(0.16, 1, 0.3, 1)", token: "--ease-out", usage: "Appearing elements — decelerate into place" },
  { label: "Ease in (exit)", css: "cubic-bezier(0.7, 0, 0.84, 0)", token: "--ease-in", usage: "Disappearing elements — accelerate away" },
];

const motionRules = [
  "Max 300ms — never use duration-500 or higher",
  "GPU-only properties: transform and opacity",
  "Avoid animating width, height, top, left, margin, padding",
  "Don't add Motion to shadcn overlays — they have built-in transitions",
  "Use ease-out for entering, ease-in for exiting",
  "Don't animate from scale(0) — start from 0.95 or higher",
  "Reserve animation for intentional interactions",
  "Add will-change-transform only if profiling shows jank",
];

/* ── component ── */

export default function MotionPage() {
  const [durationAnimate, setDurationAnimate] = useState<number | null>(null);
  const [showPresence, setShowPresence] = useState(true);
  const [staggerKey, setStaggerKey] = useState(0);

  return (
    <div className="space-y-8">
      {/* ─── 1. Duration Scale ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Duration Scale</h2>
        <Panel className="px-4 py-4">
          <p className="type-body-sm text-zinc-500 mb-4">Click each box to see its animation duration:</p>
          <div className="flex items-center gap-4">
            {durations.map((d) => (
              <button
                key={d.ms}
                onClick={() => {
                  setDurationAnimate(null);
                  requestAnimationFrame(() => setDurationAnimate(d.ms));
                }}
                className="text-center"
              >
                <div
                  className={cn(
                    "w-20 h-20 rounded-lg border border-zinc-700/50 bg-zinc-800/60 flex items-center justify-center cursor-pointer hover:bg-zinc-800/80",
                    durationAnimate === d.ms && "animate-bounce-once"
                  )}
                  style={
                    durationAnimate === d.ms
                      ? {
                          animation: `pulse ${d.ms}ms ease-out`,
                          backgroundColor: "oklch(0.3 0.06 192 / 0.4)",
                        }
                      : undefined
                  }
                >
                  <span className="type-h3 text-zinc-200">{d.ms}</span>
                </div>
                <p className="type-code text-zinc-400 mt-2">{d.tailwind}</p>
                <p className="type-body-sm text-zinc-500">{d.label}</p>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      {/* ─── 2. Easing Curves ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Easing Curves</h2>
        <Panel className="px-4 py-4 space-y-4">
          {easings.map((e) => (
            <div key={e.label} className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="type-body font-medium text-zinc-200">{e.label}</span>
                <span className="type-code text-zinc-500">{e.token}</span>
              </div>
              <p className="type-code text-amber-300">{e.css}</p>
              <p className="type-body-sm text-zinc-500">{e.usage}</p>
            </div>
          ))}
        </Panel>
      </section>

      {/* ─── 3. Transition Patterns ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Transition Patterns</h2>
        <Panel className="px-4 py-4 space-y-4">
          {/* Color hover */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">Color hover</h3>
            <div className="inline-block rounded-lg border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors px-4 py-3 cursor-pointer">
              <span className="type-body-sm text-zinc-300">Hover me — transition-colors</span>
            </div>
          </div>

          {/* Opacity fade */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">Opacity fade</h3>
            <div className="inline-block rounded-lg border border-zinc-800/50 bg-zinc-900/30 hover:opacity-60 transition-opacity px-4 py-3 cursor-pointer">
              <span className="type-body-sm text-zinc-300">Hover me — transition-opacity</span>
            </div>
          </div>

          {/* Press feedback */}
          <div>
            <h3 className="type-body font-medium text-zinc-200 mb-2">Press feedback</h3>
            <button className="rounded-lg border border-zinc-800/50 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] transition-all duration-150 px-4 py-3 type-body-sm font-medium text-zinc-200">
              Click/hold me — active:scale-[0.98]
            </button>
          </div>
        </Panel>
      </section>

      {/* ─── 4. Framer Motion Presets ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Framer Motion Presets</h2>
        <div className="space-y-4">
          {/* fadeIn */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">fadeIn</h3>
            <AnimatePresence mode="wait">
              {showPresence && (
                <motion.div
                  key="fade"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3"
                >
                  <span className="type-body-sm text-zinc-300">Fading element</span>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              size="xs"
              variant="outline"
              className="mt-3"
              onClick={() => setShowPresence(!showPresence)}
            >
              Toggle
            </Button>
          </Panel>

          {/* slideUp */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">slideUp</h3>
            <AnimatePresence mode="wait">
              {showPresence && (
                <motion.div
                  key="slide"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3"
                >
                  <span className="type-body-sm text-zinc-300">Sliding element</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>

          {/* staggerContainer */}
          <Panel className="px-4 py-4">
            <h3 className="type-body font-medium text-zinc-200 mb-3">staggerChildren</h3>
            <motion.div
              key={staggerKey}
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } },
              }}
              className="space-y-2"
            >
              {["First", "Second", "Third", "Fourth"].map((label) => (
                <motion.div
                  key={label}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
                  }}
                  className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-2"
                >
                  <span className="type-body-sm text-zinc-300">{label} item</span>
                </motion.div>
              ))}
            </motion.div>
            <Button
              size="xs"
              variant="outline"
              className="mt-3"
              onClick={() => setStaggerKey((k) => k + 1)}
            >
              Replay
            </Button>
          </Panel>
        </div>
      </section>

      {/* ─── 5. Rules ─── */}
      <section>
        <h2 className="type-label text-zinc-500 mb-4">Rules</h2>
        <Panel className="px-4 py-4">
          <ul className="space-y-2">
            {motionRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 type-body-sm text-zinc-400">
                <span className="text-zinc-600 shrink-0">&bull;</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  );
}
