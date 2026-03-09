import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

type DividerTone = "none" | "soft" | "default";

interface AdminPageIntroProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  divider?: DividerTone;
  className?: string;
}

const dividerClassNames: Record<DividerTone, string> = {
  none: "",
  soft: "border-zinc-800/50",
  default: "border-zinc-800",
};

export function AdminPageIntro({
  title,
  subtitle,
  breadcrumbs,
  meta,
  actions,
  divider = "default",
  className,
}: AdminPageIntroProps) {
  const dividerClassName = dividerClassNames[divider];
  const hasDivider = divider !== "none";

  return (
    <div
      className={cn(
        "flow-root",
        hasDivider && `border-b pb-4 mb-6 ${dividerClassName}`,
        className
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1.5">
            {breadcrumbs.map((item, i) => (
              <Fragment key={`${item.label}-${i}`}>
                {i > 0 && (
                  <li role="presentation" aria-hidden="true">
                    <ChevronRight size={12} className="text-zinc-700" />
                  </li>
                )}
                <li>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="type-body-sm text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="type-body-sm text-zinc-400">
                      {item.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl space-y-2">
          <h1 className="type-h1 text-zinc-100">{title}</h1>
          {subtitle && (
            <p className="type-body text-zinc-400">{subtitle}</p>
          )}
          {meta && (
            <div className="flex flex-wrap items-center gap-2 text-zinc-500">
              {meta}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
