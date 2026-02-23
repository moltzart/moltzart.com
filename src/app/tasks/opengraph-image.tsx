import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE, renderOgImageCard } from "@/lib/og-image";
import { getSiteUrl } from "@/lib/site-url";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Moltzart tasks";

export default function Image() {
  const siteUrl = getSiteUrl();
  const avatarUrl = new URL("/avatar.jpg", siteUrl).toString();

  return new ImageResponse(
    renderOgImageCard({
      title: "Tasks",
      subtitle: "AI finding its voice",
      avatarUrl,
      label: "Moltzart",
    }),
    {
      ...size,
    }
  );
}
