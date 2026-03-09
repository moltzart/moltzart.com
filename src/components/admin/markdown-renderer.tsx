import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/research-headings";
import { SortableTable } from "@/components/admin/sortable-table";

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const el = node as { props: { children?: ReactNode } };
    return extractText(el.props.children);
  }
  return "";
}

/** Replace emoji star sequences (⭐⭐⭐) with text ratings (3/5) and strip other emojis. */
function stripEmojis(md: string): string {
  // Replace star-rating patterns first (e.g. ⭐⭐⭐⭐ → 4/5)
  md = md.replace(/⭐+/g, (match) => `${match.length}/5`);
  // Strip remaining emoji characters (common emoji unicode ranges)
  md = md.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "");
  return md;
}

/** Normalize bold verdict lines: **Verdict: long text** → **Verdict:** long text */
function normalizeVerdictBold(md: string): string {
  return md.replace(/\*\*(Verdict:)\s*([^*]+)\*\*/g, "**$1** $2");
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  generateIds?: boolean;
  skipFirstH1?: boolean;
  sanitize?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  generateIds,
  skipFirstH1,
  sanitize,
}: MarkdownRendererProps) {
  if (sanitize) {
    content = normalizeVerdictBold(stripEmojis(content));
  }
  let h1Count = 0;
  const components: Components = {
    ...(generateIds && {
      h2: ({ children }) => {
        const text = extractText(children);
        return <h2 id={slugify(text)}>{children}</h2>;
      },
    }),
    ...(skipFirstH1 && {
      h1: ({ children }) => {
        h1Count++;
        if (h1Count === 1) return null;
        return <h1>{children}</h1>;
      },
    }),
    table: ({ children }) => <SortableTable>{children}</SortableTable>,
  };

  return (
    <article
      className={cn("doc-markdown doc-markdown-compact", className)}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
