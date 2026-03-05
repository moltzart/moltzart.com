import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem as BreadcrumbListItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, children }: PageHeaderProps) {
  return (
    <div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-8 pb-4 border-b border-zinc-800">
          <Breadcrumb>
            <BreadcrumbList className="text-lg">
              {breadcrumbs.map((item, i) => (
                <Fragment key={item.label}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbListItem>
                    {item.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbListItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="type-h3 text-zinc-100">{title}</h1>
          {subtitle && <p className="type-body-sm text-zinc-500">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
