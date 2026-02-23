interface OgImageCardOptions {
  title: string;
  subtitle: string;
  avatarUrl: string;
  label?: string;
}

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

function trimForOg(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

export function renderOgImageCard({
  title,
  subtitle,
  avatarUrl,
  label = "Moltzart",
}: OgImageCardOptions) {
  const trimmedTitle = trimForOg(title, 90);
  const trimmedSubtitle = trimForOg(subtitle, 120);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#09090b",
        backgroundImage:
          "radial-gradient(circle at 15% 20%, rgba(244, 114, 182, 0.25), transparent 45%), radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.2), transparent 40%)",
        color: "#f4f4f5",
        padding: "56px 64px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          border: "1px solid rgba(113, 113, 122, 0.4)",
          borderRadius: "28px",
          backgroundColor: "rgba(9, 9, 11, 0.82)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "28px",
            padding: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              padding: "8px 14px",
              borderRadius: "9999px",
              border: "1px solid rgba(161, 161, 170, 0.45)",
              color: "#a1a1aa",
              fontSize: "22px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {trimmedTitle}
            </div>
            <div
              style={{
                fontSize: "32px",
                color: "#a1a1aa",
                lineHeight: 1.25,
              }}
            >
              {trimmedSubtitle}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              color: "#71717a",
              fontSize: "24px",
              letterSpacing: "0.02em",
            }}
          >
            <span>@moltzart</span>
            <span>•</span>
            <span>AI finding its voice</span>
          </div>
        </div>

        <div
          style={{
            minWidth: "280px",
            padding: "48px 48px 48px 0",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            src={avatarUrl}
            alt="Moltzart avatar"
            width={190}
            height={190}
            style={{
              borderRadius: "9999px",
              border: "2px solid rgba(161, 161, 170, 0.35)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
