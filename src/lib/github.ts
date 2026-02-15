import {
  fetchRadarDatesDb,
  fetchRadarItemsByDate,
  fetchRadarClustersByDate,
  fetchNewsletterArticlesDb,
  fetchDraftsDb,
  updateDraftStatus as dbUpdateDraftStatus,
} from "./db";

const GH_TOKEN = () => process.env.GITHUB_TOKEN!;
const REPO = "moltzart/openclaw-home";

// --- Frontmatter Parsing ---

interface Frontmatter {
  meta: Record<string, unknown>;
  body: string;
}

function parseFrontmatter(md: string): Frontmatter | null {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const meta: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const val = raw.trim();
    // YAML arrays: [a, b, c]
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    } else if (val === "true") {
      meta[key] = true;
    } else if (val === "false") {
      meta[key] = false;
    } else if (/^\d+$/.test(val)) {
      meta[key] = parseInt(val, 10);
    } else {
      meta[key] = val;
    }
  }

  return { meta, body: match[2] };
}

async function ghFetch(path: string, accept = "application/vnd.github.v3+json") {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN()}`,
      Accept: accept,
    },
    next: { revalidate: 0 },
  });
}

export interface ResearchDoc {
  slug: string;
  title: string;
  sha: string;
  createdAt: string | null;
  excerpt?: string;
  wordCount?: number;
  tags?: string[];
  status?: "draft" | "published" | "archived";
}

export async function fetchResearchList(): Promise<ResearchDoc[]> {
  const res = await ghFetch(`/repos/${REPO}/contents/research`);
  if (!res.ok) return [];

  const files = await res.json();
  const mdFiles = files.filter((f: { name: string }) => f.name.endsWith(".md"));

  const docs = await Promise.all(
    mdFiles.map(async (f: { name: string; sha: string }) => {
      const slug = f.name.replace(/\.md$/, "");
      let title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      let createdAt: string | null = null;
      let tags: string[] | undefined;
      let status: "draft" | "published" | "archived" | undefined;
      let excerpt: string | undefined;
      let wordCount: number | undefined;

      // Fetch content (needed for excerpt + frontmatter check)
      let fullContent: string | undefined;
      try {
        const contentRes = await ghFetch(
          `/repos/${REPO}/contents/research/${encodeURIComponent(f.name)}`
        );
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          fullContent = Buffer.from(contentData.content, "base64").toString("utf-8");
        }
      } catch {}

      if (fullContent) {
        const fm = parseFrontmatter(fullContent);
        const body = fm ? fm.body : fullContent;

        // Extract frontmatter fields if present
        if (fm?.meta.title) title = fm.meta.title as string;
        if (fm?.meta.created) createdAt = fm.meta.created as string;
        if (fm?.meta.tags) tags = fm.meta.tags as string[];
        if (fm?.meta.status) status = fm.meta.status as "draft" | "published" | "archived";

        // Excerpt from body
        const plainLines = body
          .split("\n")
          .filter((l: string) => !l.startsWith("#") && !l.startsWith("---") && l.trim().length > 0);
        const plainText = plainLines.join(" ").replace(/[*_`\[\]]/g, "");
        excerpt = plainText.slice(0, 150).trim();
        if (plainText.length > 150) excerpt += "...";
        wordCount = body.split(/\s+/).filter(Boolean).length;
      }

      // Only do expensive git commit lookup if frontmatter didn't provide created date
      if (!createdAt) {
        try {
          const commitsRes = await ghFetch(
            `/repos/${REPO}/commits?path=research/${encodeURIComponent(f.name)}&per_page=1`
          );
          if (commitsRes.ok) {
            const linkHeader = commitsRes.headers.get("link");
            const commits = await commitsRes.json();

            if (linkHeader && linkHeader.includes('rel="last"')) {
              const lastMatch = linkHeader.match(/<([^>]+)>;\s*rel="last"/);
              if (lastMatch) {
                const lastRes = await fetch(lastMatch[1], {
                  headers: {
                    Authorization: `Bearer ${GH_TOKEN()}`,
                    Accept: "application/vnd.github.v3+json",
                  },
                });
                if (lastRes.ok) {
                  const lastCommits = await lastRes.json();
                  const oldest = lastCommits[lastCommits.length - 1];
                  createdAt = oldest?.commit?.author?.date || null;
                }
              }
            } else if (commits.length > 0) {
              createdAt = commits[commits.length - 1]?.commit?.author?.date || null;
            }
          }
        } catch {}
      }

      return { slug, title, sha: f.sha, createdAt, excerpt, wordCount, tags, status };
    })
  );

  docs.sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return docs;
}

export interface ResearchDocDetail {
  title: string;
  content: string;
  sha: string;
}

export async function fetchResearchDoc(slug: string): Promise<ResearchDocDetail | null> {
  const res = await ghFetch(
    `/repos/${REPO}/contents/research/${encodeURIComponent(slug)}.md`
  );
  if (!res.ok) return null;

  const fileData = await res.json();
  const raw = Buffer.from(fileData.content, "base64").toString("utf-8");
  const fm = parseFrontmatter(raw);
  const content = fm ? fm.body : raw;
  const title = (fm?.meta.title as string) || content.match(/^#\s+(.+)/m)?.[1] || slug.replace(/-/g, " ");

  return { title, content, sha: fileData.sha };
}

export async function deleteResearchDoc(slug: string): Promise<boolean> {
  const fileRes = await ghFetch(
    `/repos/${REPO}/contents/research/${encodeURIComponent(slug)}.md`
  );
  if (!fileRes.ok) return false;
  const fileData = await fileRes.json();

  const deleteRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/research/${encodeURIComponent(slug)}.md`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${GH_TOKEN()}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete research: ${slug}`,
        sha: fileData.sha,
      }),
    }
  );

  return deleteRes.ok;
}

// --- Brain (Second Brain) ---

export interface BrainFile {
  path: string;
  name: string;
  category: string;
  content: string;
  updatedAt: string | null;
  size: number;
}

export type BrainCategory =
  | "identity"
  | "memory"
  | "daily-logs"
  | "research"
  | "tasks"
  | "content"
  | "config";

function categorizeBrainFile(path: string): BrainCategory {
  if (path.startsWith("research/")) return "research";
  if (path.startsWith("memory/") && path.match(/\d{4}-\d{2}-\d{2}\.md$/)) return "daily-logs";
  if (path.startsWith("memory/")) return "memory";
  if (path === "TODO.md") return "tasks";
  if (path === "STANDING-ORDERS.md" || path === "HEARTBEAT.md") return "config";
  if (
    path === "SOUL.md" ||
    path === "USER.md" ||
    path === "IDENTITY.md" ||
    path === "AGENTS.md"
  )
    return "identity";
  if (path === "MEMORY.md") return "memory";
  return "config";
}

function brainFileTitle(path: string, name: string): string {
  if (name.endsWith(".md")) {
    const base = name.replace(/\.md$/, "");
    // Daily logs: show date nicely
    const dateMatch = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      const d = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00`);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return base
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

export async function fetchBrainFiles(): Promise<BrainFile[]> {
  const files: BrainFile[] = [];

  // Root-level markdown files
  const rootRes = await ghFetch(`/repos/${REPO}/contents`);
  if (rootRes.ok) {
    const rootFiles = await rootRes.json();
    const mdFiles = rootFiles.filter(
      (f: { name: string; type: string }) =>
        f.type === "file" && f.name.endsWith(".md") && f.name !== "README.md"
    );
    for (const f of mdFiles) {
      files.push({
        path: f.name,
        name: brainFileTitle(f.name, f.name),
        category: categorizeBrainFile(f.name),
        content: "", // loaded on demand
        updatedAt: null,
        size: f.size,
      });
    }
  }

  // memory/ directory
  const memRes = await ghFetch(`/repos/${REPO}/contents/memory`);
  if (memRes.ok) {
    const memFiles = await memRes.json();
    const mdFiles = memFiles.filter(
      (f: { name: string; type: string }) =>
        f.type === "file" && f.name.endsWith(".md")
    );
    for (const f of mdFiles) {
      const path = `memory/${f.name}`;
      files.push({
        path,
        name: brainFileTitle(path, f.name),
        category: categorizeBrainFile(path),
        content: "",
        updatedAt: null,
        size: f.size,
      });
    }
  }

  // research/ directory
  const resRes = await ghFetch(`/repos/${REPO}/contents/research`);
  if (resRes.ok) {
    const resFiles = await resRes.json();
    const mdFiles = resFiles.filter(
      (f: { name: string; type: string }) =>
        f.type === "file" && f.name.endsWith(".md")
    );
    for (const f of mdFiles) {
      const path = `research/${f.name}`;
      files.push({
        path,
        name: brainFileTitle(path, f.name),
        category: categorizeBrainFile(path),
        content: "",
        updatedAt: null,
        size: f.size,
      });
    }
  }

  return files;
}

export async function fetchBrainFileContent(filePath: string): Promise<string | null> {
  const res = await ghFetch(
    `/repos/${REPO}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}

// --- Newsletter Digests ---

export interface NewsletterArticle {
  title: string;
  description: string;
  source: string;
  link: string;
  category?: string;
}

export interface NewsletterDigest {
  date: string;
  label: string;
  articles: NewsletterArticle[];
  articleCount?: number;
}

function parseDigestMd(md: string): { articles: NewsletterArticle[]; articleCount?: number } {
  const fm = parseFrontmatter(md);
  const body = fm ? fm.body : md;
  const isV2 = fm?.meta.format === "newsletter-v2";
  const articleCount = typeof fm?.meta.article_count === "number" ? fm.meta.article_count : undefined;

  const articles: NewsletterArticle[] = [];

  if (isV2) {
    // v2: ### Title + metadata lines + description body
    const lines = body.split("\n");
    let i = 0;
    while (i < lines.length) {
      const h3 = lines[i].match(/^### (.+)$/);
      if (!h3) { i++; continue; }

      const title = h3[1].trim();
      let source = "";
      let link = "";
      let category: string | undefined;
      const descLines: string[] = [];
      i++;

      while (i < lines.length) {
        const cl = lines[i];
        if (cl.startsWith("### ")) break;
        const meta = cl.match(/^- (source|link|category):\s*(.+)$/);
        if (meta) {
          if (meta[1] === "source") source = meta[2].trim();
          else if (meta[1] === "link") link = meta[2].trim();
          else if (meta[1] === "category") category = meta[2].trim();
          i++; continue;
        }
        if (cl.trim() !== "") descLines.push(cl.trim());
        i++;
      }

      const description = descLines.join(" ").trim();
      if (title && source && link) {
        articles.push({ title, description, source, link, category });
      }
    }
  } else {
    // Legacy: - **"Title"** — Description [Source: Name](url)
    for (const line of body.split("\n")) {
      const match = line.match(/^-\s+\*\*(.+?)\*\*\s*—\s*(.+?)\s*\[Source:\s*(.+?)\]\((.+?)\)\s*$/);
      if (match) {
        articles.push({
          title: match[1].replace(/^"|"$/g, ""),
          description: match[2].trim().replace(/\.$/, ""),
          source: match[3].trim(),
          link: match[4].trim(),
        });
      }
    }
  }

  return { articles, articleCount };
}

export async function fetchNewsletterDigests(): Promise<NewsletterDigest[]> {
  const rows = await fetchNewsletterArticlesDb();
  if (rows.length === 0) return [];

  // Group by digest_date
  const byDate = new Map<string, NewsletterArticle[]>();
  for (const r of rows) {
    const date = r.digest_date.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({
      title: r.title,
      description: r.description || "",
      source: r.source || "",
      link: r.link || "",
      category: r.category || undefined,
    });
  }

  const digests: NewsletterDigest[] = [];
  for (const [date, articles] of byDate) {
    const d = new Date(date + "T12:00:00");
    const now = new Date();
    const today = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const docDate = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
    today.setHours(0, 0, 0, 0);
    docDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - docDate.getTime()) / 86400000);

    let label: string;
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    digests.push({ date, label, articles, articleCount: articles.length });
  }

  return digests;
}

// --- Tasks ---

interface Task {
  text: string;
  status: "done" | "partial" | "open";
  detail?: string;
  due?: string;
  effort?: "S" | "M" | "L" | "XL";
  blockedBy?: string;
}

interface Section {
  id: string;
  title: string;
  tasks: Task[];
}

interface RecurringTask {
  task: string;
  schedule: string;
  method: string;
}

export interface ParsedTasks {
  sections: Section[];
  recurring: RecurringTask[];
}

function parseTaskText(raw: string): { text: string; detail?: string } {
  const dashSplit = raw.split(/\s[—–]\s/);
  const text = dashSplit[0].replace(/\*\*/g, "").trim();
  const detail = dashSplit.length > 1 ? dashSplit.slice(1).join(" — ").trim() : undefined;
  return { text, detail };
}

function parseTodoMd(md: string): ParsedTasks {
  const fm = parseFrontmatter(md);
  const body = fm ? fm.body : md;

  const sections: Section[] = [];
  const recurring: RecurringTask[] = [];

  const sectionMap: Record<string, string> = {
    URGENT: "urgent",
    SCHEDULED: "scheduled",
    BACKLOG: "backlog",
    ACTIVE: "active",
    BLOCKED: "blocked",
    COMPLETED: "completed",
  };

  const lines = body.split("\n");
  let currentSection: Section | null = null;
  let inRecurring = false;
  let lastTask: Task | null = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^## .+?(URGENT|SCHEDULED|BACKLOG|ACTIVE|BLOCKED|COMPLETED)/);
    if (sectionMatch) {
      inRecurring = false;
      lastTask = null;
      const key = sectionMatch[1];
      const id = sectionMap[key] || key.toLowerCase();
      let title = key.charAt(0) + key.slice(1).toLowerCase();
      const subtitleMatch = line.match(/\(([^)]+)\)/);
      if (subtitleMatch) title += ` · ${subtitleMatch[1]}`;

      currentSection = { id, title, tasks: [] };
      sections.push(currentSection);
      continue;
    }

    if (line.match(/RECURRING/i)) {
      inRecurring = true;
      currentSection = null;
      lastTask = null;
      continue;
    }

    if (inRecurring) {
      if (line.startsWith("|") && !line.includes("---") && !line.includes("Task")) {
        const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
        if (cols.length >= 3) {
          recurring.push({ task: cols[0], schedule: cols[1], method: cols[2] });
        }
      }
      continue;
    }

    // Indented metadata sub-items (v2): "  - due: 2026-02-20"
    if (lastTask && line.match(/^\s+-\s+(due|effort|blocked-by):\s*/)) {
      const metaMatch = line.match(/^\s+-\s+(due|effort|blocked-by):\s*(.+)$/);
      if (metaMatch) {
        const [, key, val] = metaMatch;
        if (key === "due") lastTask.due = val.trim();
        else if (key === "effort") lastTask.effort = val.trim() as "S" | "M" | "L" | "XL";
        else if (key === "blocked-by") lastTask.blockedBy = val.trim();
      }
      continue;
    }

    if (currentSection && line.match(/^\s*-\s*\[/)) {
      const doneMatch = line.match(/^\s*-\s*\[x\]\s*(.*)/i);
      const partialMatch = line.match(/^\s*-\s*\[~\]\s*(.*)/);
      const openMatch = line.match(/^\s*-\s*\[ \]\s*(.*)/);

      lastTask = null;
      if (doneMatch) {
        const { text, detail } = parseTaskText(doneMatch[1]);
        lastTask = { text, status: "done", detail };
        currentSection.tasks.push(lastTask);
      } else if (partialMatch) {
        const { text, detail } = parseTaskText(partialMatch[1]);
        lastTask = { text, status: "partial", detail };
        currentSection.tasks.push(lastTask);
      } else if (openMatch) {
        const { text, detail } = parseTaskText(openMatch[1]);
        lastTask = { text, status: "open", detail };
        currentSection.tasks.push(lastTask);
      }
    } else if (!line.match(/^\s+-\s/)) {
      // Non-indented, non-task line resets lastTask
      lastTask = null;
    }
  }

  return {
    sections: sections.filter((s) => s.tasks.length > 0 || s.id === "urgent"),
    recurring,
  };
}

export async function fetchTasks(): Promise<ParsedTasks> {
  const res = await ghFetch(
    `/repos/${REPO}/contents/TODO.md`,
    "application/vnd.github.raw+json"
  );
  if (!res.ok) return { sections: [], recurring: [] };

  const markdown = await res.text();
  return parseTodoMd(markdown);
}

// --- Drafts ---

export type DraftStatus = "pending" | "approved" | "posted" | "rejected";

export interface Draft {
  id: string;
  date: string;
  time?: string;
  type: "original" | "reply";
  replyTo?: string;
  replyContext?: string;
  content: string;
  status: DraftStatus;
  feedback?: string;
  tweetId?: string;
  priority?: "high" | "normal" | "low";
}

export interface DraftDay {
  date: string;
  label: string;
  drafts: Draft[];
}

export interface DraftsData {
  days: DraftDay[];
  sha: string;
}

function parseDraftsMd(md: string): Draft[] {
  const fm = parseFrontmatter(md);
  const body = fm ? fm.body : md;
  const isV2 = fm?.meta.format === "drafts-v2";

  const drafts: Draft[] = [];
  const lines = body.split("\n");
  let currentSection: DraftStatus = "pending";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect section headers
    if (line.match(/^## Pending Approval/i)) { currentSection = "pending"; i++; continue; }
    if (line.match(/^## Approved/i)) { currentSection = "approved"; i++; continue; }
    if (line.match(/^## Posted/i)) { currentSection = "posted"; i++; continue; }
    if (line.match(/^## Rejected/i)) { currentSection = "rejected"; i++; continue; }

    // v2 format: ### 2026-02-14 14:32 | Original
    if (isV2) {
      const v2Match = line.match(/^### (\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*\|\s*(.+)$/);
      if (v2Match) {
        const date = v2Match[1];
        const time = v2Match[2] || undefined;
        const typeStr = v2Match[3].trim();

        let type: "original" | "reply" = "original";
        let replyTo: string | undefined;
        let replyContext: string | undefined;
        if (typeStr.match(/Reply to @/i)) {
          type = "reply";
          const rm = typeStr.match(/Reply to @(\S+)/i);
          if (rm) replyTo = rm[1];
        }

        // Collect metadata, content, feedback
        let priority: "high" | "normal" | "low" | undefined;
        let tweetId: string | undefined;
        let content = "";
        let feedback = "";
        i++;

        while (i < lines.length) {
          const cl = lines[i];
          const metaMatch = cl.match(/^- ([\w-]+):\s*(.+)$/);
          if (metaMatch) {
            const [, k, v] = metaMatch;
            if (k === "priority") priority = v.trim() as "high" | "normal" | "low";
            else if (k === "context") replyContext = v.trim();
            else if (k === "tweet-id") tweetId = v.trim();
            i++; continue;
          }
          if (cl.startsWith("> ")) {
            const text = cl.slice(2);
            // Blank blockquote line = paragraph break
            content += (content ? "\n" : "") + (text.trim() === "" ? "\n" : text.trim());
            i++; continue;
          }
          if (cl.match(/^_Feedback:/) && cl.endsWith("_")) {
            feedback = cl.slice(1, -1).replace(/^Feedback:\s*/, "").trim();
            i++; continue;
          }
          // Legacy italic feedback
          if (cl.startsWith("_") && cl.endsWith("_")) {
            feedback = cl.slice(1, -1).trim();
            i++; continue;
          }
          if (cl.trim() === "") { i++; continue; }
          if (cl.startsWith("### ") || cl.startsWith("## ")) break;
          i++;
        }

        // Clean up double newlines in content
        content = content.replace(/\n{3,}/g, "\n\n").trim();

        if (content) {
          const id = `${date}-${type}-${replyTo || "original"}-${drafts.length}`;
          drafts.push({ id, date, time, type, replyTo, replyContext, content, status: currentSection, feedback: feedback || undefined, tweetId, priority });
        }
        continue;
      }
    }

    // Legacy v1 format: **DATE | TYPE**
    const entryMatch = line.match(/^\*\*(\d{4}-\d{2}-\d{2})(?:\s+[\d:]+)?\s*\|\s*(.+?)\*\*\s*(.*)?$/);
    if (entryMatch) {
      const date = entryMatch[1];
      const typeStr = entryMatch[2].trim();
      const statusSuffix = entryMatch[3]?.trim() || "";

      let type: "original" | "reply" = "original";
      let replyTo: string | undefined;
      let replyContext: string | undefined;

      const replyMatch = typeStr.match(/Reply\s+(?:to|candidate to)\s+@(\S+)(?:\s*\(([^)]+)\))?/i);
      if (replyMatch) {
        type = "reply";
        replyTo = replyMatch[1];
        replyContext = replyMatch[2];
      }

      // Determine status from section + suffix markers + inline markers in typeStr
      const markers = typeStr + " " + statusSuffix;
      let status = currentSection;
      if (markers.includes("REJECTED") || markers.includes("❌")) status = "rejected";
      if (markers.includes("✅")) status = currentSection === "posted" ? "posted" : "approved";
      if (markers.includes("STALE") || markers.includes("KILLED")) status = "rejected";

      // Collect content (blockquote lines)
      let content = "";
      let feedback = "";
      let tweetId: string | undefined;
      i++;

      while (i < lines.length) {
        const cl = lines[i];
        if (cl.startsWith("> ")) {
          content += (content ? " " : "") + cl.slice(2).trim();
          i++;
        } else if (cl.startsWith("_") && cl.endsWith("_")) {
          const inner = cl.slice(1, -1).trim();
          if (inner.match(/tweet ID|Posted/i)) {
            const tidMatch = inner.match(/tweet ID (\d+)/);
            if (tidMatch) tweetId = tidMatch[1];
            feedback = (feedback ? feedback + " " : "") + inner;
          } else {
            feedback = (feedback ? feedback + " " : "") + inner;
          }
          i++;
        } else if (cl.trim() === "" || cl.startsWith("**") || cl.startsWith("##") || cl.startsWith("---")) {
          break;
        } else {
          i++;
        }
      }

      if (content) {
        const id = `${date}-${type}-${replyTo || "original"}-${drafts.length}`;
        drafts.push({ id, date, type, replyTo, replyContext, content, status, feedback: feedback || undefined, tweetId });
      }
      continue;
    }

    i++;
  }

  return drafts;
}

function formatDraftDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const docDate = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  today.setHours(0, 0, 0, 0);
  docDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - docDate.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function groupDraftsByDay(drafts: Draft[]): DraftDay[] {
  const map = new Map<string, Draft[]>();
  for (const d of drafts) {
    if (!map.has(d.date)) map.set(d.date, []);
    map.get(d.date)!.push(d);
  }
  const days = Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, drafts]) => ({
      date,
      label: formatDraftDayLabel(date),
      drafts,
    }));
  return days;
}

export async function fetchDrafts(): Promise<DraftsData> {
  const rows = await fetchDraftsDb();
  const drafts: Draft[] = rows.map((r) => ({
    id: r.id,
    date: r.date.slice(0, 10),
    time: r.time || undefined,
    type: r.type as "original" | "reply",
    replyTo: r.reply_to || undefined,
    replyContext: r.reply_context || undefined,
    content: r.content,
    status: r.status as DraftStatus,
    feedback: r.feedback || undefined,
    tweetId: r.tweet_id || undefined,
    priority: (r.priority as "high" | "normal" | "low") || undefined,
  }));
  return { days: groupDraftsByDay(drafts), sha: "" };
}

export async function fetchDraftsRaw(): Promise<{ content: string; sha: string } | null> {
  const res = await ghFetch(`/repos/${REPO}/contents/memory/x-drafts.md`);
  if (!res.ok) return null;
  const fileData = await res.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  return { content, sha: fileData.sha };
}

// --- Content Radar ---

export interface RadarItem {
  title: string;
  source: string;
  link: string;
  lane: string;
  note: string;
  angle?: string;
}

export interface RadarDay {
  date: string;
  label: string;
  sections: { heading: string; items: RadarItem[] }[];
  clusters?: string[];
  rawMarkdown: string;
  scanSources?: string[];
  itemCount?: number;
}

function parseRadarSection(heading: string, lines: string[]): RadarItem[] {
  const items: RadarItem[] = [];
  const defaultLaneMap: Record<string, string> = {
    "hacker news": "HN",
    "the verge": "AI/Tech",
    "anthropic": "AI",
    "openai": "AI",
    "techcrunch": "Tech",
    "a16z": "Strategy",
    "simon willison": "AI",
    "platformer": "Tech",
    "every.to": "AI/Biz",
    "indie hackers": "Indie",
    "lenny": "Product",
    "stratechery": "Strategy",
    "reddit": "Reddit",
    "x timeline": "X",
    "x scan": "X",
    "blogs": "Blog",
  };

  const defaultLane = Object.entries(defaultLaneMap).find(([k]) =>
    heading.toLowerCase().includes(k)
  )?.[1] || heading.replace(/^#+\s*/, "");

  let currentTitle = "";
  let currentLink = "";
  let currentLane = defaultLane;
  let currentWhyBullets: string[] = [];
  let inWhy = false;

  function pushCurrent() {
    if (currentTitle) {
      const note = currentWhyBullets.join("\n");
      items.push({ title: currentTitle, source: heading, link: currentLink, lane: currentLane, note: note.trim(), angle: undefined });
    }
    currentTitle = "";
    currentLink = "";
    currentLane = defaultLane;
    currentWhyBullets = [];
    inWhy = false;
  }

  for (const line of lines) {
    // v3 format: ### Short descriptive title
    const h3Match = line.match(/^### (.+)$/);
    if (h3Match) {
      pushCurrent();
      currentTitle = h3Match[1].trim();
      continue;
    }

    // v3 format: - Source: X — https://...
    const sourceMatch = line.match(/^- Source:\s*(.+?)\s*[—–-]\s*(\S+)\s*$/);
    if (sourceMatch && currentTitle) {
      currentLink = sourceMatch[2];
      continue;
    }

    // v3 format: - Lane: agentic-coding
    const laneMatch = line.match(/^- Lane:\s*(.+)$/);
    if (laneMatch && currentTitle) {
      currentLane = laneMatch[1].trim();
      continue;
    }

    // v3 format: - Why:
    if (line.match(/^- Why:\s*$/) && currentTitle) {
      inWhy = true;
      continue;
    }

    // v3 format: Why bullets (indented with - )
    if (inWhy && currentTitle) {
      const bulletMatch = line.match(/^\s+-\s+(.+)$/);
      if (bulletMatch) {
        currentWhyBullets.push(bulletMatch[1].trim());
        continue;
      }
      if (line.trim() === "") continue;
      // Non-bullet line ends the Why section
      inWhy = false;
    }

    // v2 format: **[Title](url)** — Source Name
    const v2Match = line.match(/^\*\*\[(.+?)\]\(([^)]+)\)\*\*\s*[—–-]\s*(.+)$/);
    if (v2Match) {
      pushCurrent();
      currentTitle = v2Match[1].replace(/\s*\(\d+\s*pts?\)/, "");
      currentLink = v2Match[2];
      currentWhyBullets.push(v2Match[3].trim());
      continue;
    }

    // v1 format: **Title** — Note [Source](url)
    const v1Match = line.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
    if (v1Match) {
      pushCurrent();
      currentTitle = v1Match[1].replace(/\s*\(\d+\s*pts?\)/, "");
      let noteText = v1Match[2].trim();
      const linkMatch = noteText.match(/\[([^\]]*)\]\(([^)]+)\)/);
      currentLink = linkMatch ? linkMatch[2] : "";
      noteText = noteText.replace(/\s*\[[^\]]*\]\([^)]+\)\s*$/, "").trim();
      currentWhyBullets.push(noteText);
      continue;
    }

    // Blockquote lines (v2 "Why Matt cares")
    if (line.startsWith("> ") && currentTitle) {
      const text = line.slice(2).trim().replace(/^Why Matt cares:\s*/i, "");
      currentWhyBullets.push(text);
      continue;
    }

    // Italic lines
    if (line.startsWith("*") && line.endsWith("*") && currentTitle) {
      currentWhyBullets.push(line.replace(/^\*+|\*+$/g, "").trim());
    }
  }
  pushCurrent();

  return items;
}

function parseRadarMd(md: string): { sections: { heading: string; items: RadarItem[] }[]; clusters: string[]; scanSources?: string[]; itemCount?: number } {
  const fm = parseFrontmatter(md);
  const body = fm ? fm.body : md;
  const scanSources = fm?.meta.scan_sources as string[] | undefined;
  const itemCount = typeof fm?.meta.item_count === "number" ? fm.meta.item_count : undefined;

  const sections: { heading: string; items: RadarItem[] }[] = [];
  const clusters: string[] = [];
  const lines = body.split("\n");
  let currentHeading = "";
  let currentLines: string[] = [];
  let inClusters = false;

  for (const line of lines) {
    if (line.match(/^## Topic Clusters/i)) {
      if (currentHeading && currentLines.length > 0) {
        const items = parseRadarSection(currentHeading, currentLines);
        if (items.length > 0) sections.push({ heading: currentHeading, items });
      }
      inClusters = true;
      currentHeading = "";
      currentLines = [];
      continue;
    }

    if (line.match(/^## Scan Quality/i)) {
      if (inClusters) continue;
      if (currentHeading && currentLines.length > 0) {
        const items = parseRadarSection(currentHeading, currentLines);
        if (items.length > 0) sections.push({ heading: currentHeading, items });
      }
      currentHeading = "";
      currentLines = [];
      continue;
    }

    // Skip --- separators but don't flush section
    if (line.match(/^---$/)) {
      continue;
    }

    if (line.match(/^## /)) {
      if (currentHeading && currentLines.length > 0 && !inClusters) {
        const items = parseRadarSection(currentHeading, currentLines);
        if (items.length > 0) sections.push({ heading: currentHeading, items });
      }
      currentHeading = line.replace(/^## /, "").trim();
      currentLines = [];
      inClusters = false;
      continue;
    }

    if (inClusters && line.startsWith("**")) {
      clusters.push(line.replace(/\*\*/g, "").replace(/\s*[—–-].*$/, "").trim());
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading && currentLines.length > 0 && !inClusters) {
    const items = parseRadarSection(currentHeading, currentLines);
    if (items.length > 0) sections.push({ heading: currentHeading, items });
  }

  return { sections, clusters, scanSources, itemCount };
}

export async function fetchRadarDates(): Promise<string[]> {
  return fetchRadarDatesDb();
}

export async function fetchRadarDay(date: string): Promise<RadarDay | null> {
  const [items, clusters] = await Promise.all([
    fetchRadarItemsByDate(date),
    fetchRadarClustersByDate(date),
  ]);

  if (items.length === 0 && clusters.length === 0) return null;

  // Group items by section, preserving order
  const sectionMap = new Map<string, RadarItem[]>();
  const scanSources = new Set<string>();
  for (const item of items) {
    if (!sectionMap.has(item.section)) sectionMap.set(item.section, []);
    sectionMap.get(item.section)!.push({
      title: item.title,
      source: item.source_name || item.section,
      link: item.source_url || "",
      lane: item.lane,
      note: (item.why_bullets || []).join("\n"),
    });
    if (item.scan_source) scanSources.add(item.scan_source);
  }

  const sections = Array.from(sectionMap.entries()).map(([heading, sectionItems]) => ({
    heading,
    items: sectionItems,
  }));

  const clusterTitles = clusters.map((c) => c.title);

  const d = new Date(date + "T12:00:00");
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const docDate = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  today.setHours(0, 0, 0, 0);
  docDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - docDate.getTime()) / 86400000);
  const label = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return {
    date,
    label,
    sections,
    clusters: clusterTitles.length > 0 ? clusterTitles : undefined,
    rawMarkdown: "",
    scanSources: scanSources.size > 0 ? Array.from(scanSources) : undefined,
    itemCount: items.length,
  };
}

export async function updateDraftsFile(content: string, sha: string, message: string): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/memory/x-drafts.md`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GH_TOKEN()}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
      }),
    }
  );
  return res.ok;
}
