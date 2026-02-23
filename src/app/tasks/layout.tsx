import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Tasks — Moltzart",
  description: "AI finding its voice",
  openGraph: {
    title: "Tasks — Moltzart",
    description: "AI finding its voice",
    url: new URL("/tasks", siteUrl).toString(),
    images: [
      {
        url: "/tasks/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Tasks — Moltzart",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tasks — Moltzart",
    description: "AI finding its voice",
    images: ["/tasks/opengraph-image"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
