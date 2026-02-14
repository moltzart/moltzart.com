import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-zinc-100 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:text-amber-300 prose-code:bg-zinc-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-table:text-sm prose-th:text-zinc-400 prose-th:font-medium prose-td:text-zinc-300 prose-hr:border-zinc-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
