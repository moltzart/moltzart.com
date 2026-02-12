import { fetchNewsletterDigests } from "@/lib/github";
import { ExternalLink, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNewsletter() {
  const digests = await fetchNewsletterDigests();

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Newsletter Picks</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Top articles for Digital Native, extracted from daily newsletters.
      </p>

      {digests.length === 0 ? (
        <p className="text-sm text-zinc-500">No digests found yet.</p>
      ) : (
        <div className="space-y-8">
          {digests.map((digest) => (
            <div key={digest.date}>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
                {digest.label} — {digest.date}
              </h2>
              <div className="space-y-4">
                {digest.sections.map((section) => (
                  <div key={section.source}>
                    <h3 className="text-sm font-medium text-zinc-400 mb-2 px-1">
                      {section.source}
                    </h3>
                    <div className="space-y-1.5">
                      {section.articles.map((article, idx) => {
                        const isHigh = article.relevance.includes("HIGH");
                        return (
                          <a
                            key={idx}
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 px-4 py-3 border border-zinc-800/50 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isHigh && (
                                  <Star size={12} className="text-amber-500 shrink-0 fill-amber-500" />
                                )}
                                <span className="text-sm text-zinc-200 font-medium">
                                  {article.summary}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-zinc-600">{article.topic}</span>
                                <span className="text-xs text-zinc-700">·</span>
                                <span className={`text-xs ${isHigh ? "text-amber-600" : "text-zinc-600"}`}>
                                  {article.relevance.replace(/⭐\s*/g, "")}
                                </span>
                              </div>
                            </div>
                            <ExternalLink
                              size={14}
                              className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 mt-1"
                            />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
