import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/research-headings";

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

interface MarkdownRendererProps {
  content: string;
  className?: string;
  generateIds?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  generateIds,
}: MarkdownRendererProps) {
  const components: Components | undefined = generateIds
    ? {
        h2: ({ children }) => {
          const text = extractText(children);
          return <h2 id={slugify(text)}>{children}</h2>;
        },
      }
    : undefined;

  return (
    <article
      className={`prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-zinc-100 prose-a:text-zinc-100 prose-a:underline prose-a:underline-offset-2 prose-a:transition-colors hover:prose-a:no-underline hover:prose-a:text-zinc-50 prose-code:text-amber-300 prose-code:bg-zinc-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-table:text-sm prose-th:text-zinc-400 prose-th:font-medium prose-td:text-zinc-300 prose-hr:border-zinc-800 [&_hr+p]:text-zinc-500${className ? ` ${className}` : ""}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
