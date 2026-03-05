"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/admin/styleguide", label: "Overview" },
  { href: "/admin/styleguide/foundations", label: "Foundations" },
  { href: "/admin/styleguide/components", label: "Components" },
  { href: "/admin/styleguide/patterns", label: "Patterns" },
  { href: "/admin/styleguide/motion", label: "Motion" },
];

export default function StyleguideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 border-b border-zinc-800/30 pb-3">
        {navLinks.map((link) => {
          const isActive = link.href === "/admin/styleguide"
            ? pathname === "/admin/styleguide"
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "type-body-sm px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "text-teal-400 bg-teal-400/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
