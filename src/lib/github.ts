const GH_TOKEN = () => process.env.GITHUB_TOKEN!;
const REPO = "moltzart/openclaw-home";

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
}

export async function fetchResearchList(): Promise<ResearchDoc[]> {
  const res = await ghFetch(`/repos/${REPO}/contents/research`);
  if (!res.ok) return [];

  const files = await res.json();
  const mdFiles = files.filter((f: { name: string }) => f.name.endsWith(".md"));

  const docs = await Promise.all(
    mdFiles.map(async (f: { name: string; sha: string }) => {
      const slug = f.name.replace(/\.md$/, "");
      const title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      let createdAt: string | null = null;
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

      return { slug, title, sha: f.sha, createdAt };
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
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1] : slug.replace(/-/g, " ");

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
}

export interface NewsletterDigest {
  date: string;
  label: string;
  articles: NewsletterArticle[];
}

function parseDigestMd(md: string): NewsletterArticle[] {
  const articles: NewsletterArticle[] = [];
  const lines = md.split("\n");

  for (const line of lines) {
    // Match: - **"Title"** — Description [Source: Name](url)
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

  return articles;
}

export async function fetchNewsletterDigests(): Promise<NewsletterDigest[]> {
  const res = await ghFetch(`/repos/${REPO}/contents/memory`);
  if (!res.ok) return [];

  const files = await res.json();
  const digestFiles = files
    .filter((f: { name: string }) => f.name.match(/^newsletter-digest-\d{4}-\d{2}-\d{2}\.md$/))
    .sort((a: { name: string }, b: { name: string }) => b.name.localeCompare(a.name));

  const digests: NewsletterDigest[] = [];

  for (const file of digestFiles) {
    const contentRes = await ghFetch(
      `/repos/${REPO}/contents/memory/${encodeURIComponent(file.name)}`
    );
    if (!contentRes.ok) continue;

    const fileData = await contentRes.json();
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
    const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;

    const date = dateMatch[1];
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

    const articles = parseDigestMd(content);
    if (articles.length > 0) {
      digests.push({ date, label, articles });
    }
  }

  return digests;
}

// --- Tasks ---

interface Task {
  text: string;
  status: "done" | "partial" | "open";
  detail?: string;
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

  const lines = md.split("\n");
  let currentSection: Section | null = null;
  let inRecurring = false;

  for (const line of lines) {
    const sectionMatch = line.match(/^## .+?(URGENT|SCHEDULED|BACKLOG|ACTIVE|BLOCKED|COMPLETED)/);
    if (sectionMatch) {
      inRecurring = false;
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

    if (currentSection && line.match(/^\s*-\s*\[/)) {
      const doneMatch = line.match(/^\s*-\s*\[x\]\s*(.*)/i);
      const partialMatch = line.match(/^\s*-\s*\[~\]\s*(.*)/);
      const openMatch = line.match(/^\s*-\s*\[ \]\s*(.*)/);

      if (doneMatch) {
        const { text, detail } = parseTaskText(doneMatch[1]);
        currentSection.tasks.push({ text, status: "done", detail });
      } else if (partialMatch) {
        const { text, detail } = parseTaskText(partialMatch[1]);
        currentSection.tasks.push({ text, status: "partial", detail });
      } else if (openMatch) {
        const { text, detail } = parseTaskText(openMatch[1]);
        currentSection.tasks.push({ text, status: "open", detail });
      }
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
  type: "original" | "reply";
  replyTo?: string;
  replyContext?: string;
  content: string;
  status: DraftStatus;
  feedback?: string;
  tweetId?: string;
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
  const drafts: Draft[] = [];
  const lines = md.split("\n");
  let currentSection: DraftStatus = "pending";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect section headers
    if (line.match(/^## Pending Approval/i)) { currentSection = "pending"; i++; continue; }
    if (line.match(/^## Approved/i)) { currentSection = "approved"; i++; continue; }
    if (line.match(/^## Posted/i)) { currentSection = "posted"; i++; continue; }
    if (line.match(/^## Rejected/i)) { currentSection = "rejected"; i++; continue; }

    // Parse draft entries: **DATE | TYPE**
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
  const res = await ghFetch(`/repos/${REPO}/contents/memory/x-drafts.md`);
  if (!res.ok) return { days: [], sha: "" };
  const fileData = await res.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  const drafts = parseDraftsMd(content);
  return { days: groupDraftsByDay(drafts), sha: fileData.sha };
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

function parseRadarMd(md: string): { sections: { heading: string; items: RadarItem[] }[]; clusters: string[] } {
  const sections: { heading: string; items: RadarItem[] }[] = [];
  const clusters: string[] = [];
  const lines = md.split("\n");
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

    if (line.match(/^## Scan Quality/i) || line.match(/^---$/)) {
      if (inClusters) continue;
      if (currentHeading && currentLines.length > 0) {
        const items = parseRadarSection(currentHeading, currentLines);
        if (items.length > 0) sections.push({ heading: currentHeading, items });
      }
      currentHeading = "";
      currentLines = [];
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

  return { sections, clusters };
}

export async function fetchRadarDates(): Promise<string[]> {
  const res = await ghFetch(`/repos/${REPO}/contents/memory`);
  if (!res.ok) return [];
  const files = await res.json();
  return files
    .filter((f: { name: string }) => f.name.match(/^content-radar-\d{4}-\d{2}-\d{2}\.md$/))
    .map((f: { name: string }) => f.name.match(/(\d{4}-\d{2}-\d{2})/)![1])
    .sort((a: string, b: string) => b.localeCompare(a));
}

export async function fetchRadarDay(date: string): Promise<RadarDay | null> {
  const filename = `content-radar-${date}.md`;
  const res = await ghFetch(`/repos/${REPO}/contents/memory/${encodeURIComponent(filename)}`);
  if (!res.ok) return null;
  const fileData = await res.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  const { sections, clusters } = parseRadarMd(content);

  const d = new Date(date + "T12:00:00");
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const docDate = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  today.setHours(0, 0, 0, 0);
  docDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - docDate.getTime()) / 86400000);
  const label = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return { date, label, sections, clusters, rawMarkdown: content };
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
