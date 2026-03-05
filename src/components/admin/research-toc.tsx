"use client";

import { useEffect, useState } from "react";

interface ResearchTocProps {
  headings: Array<{ id: string; text: string }>;
}

export function ResearchToc({ headings }: ResearchTocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -80% 0px" }
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-6">
      <p className="type-label text-zinc-500 mb-3">
        On this page
      </p>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(heading.id)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`block type-body-sm pl-3 py-1 border-l-2 transition-colors ${
                activeId === heading.id
                  ? "text-teal-400 border-l-teal-400"
                  : "text-zinc-500 border-l-transparent hover:text-zinc-300"
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
