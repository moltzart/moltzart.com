/**
 * One-time migration script: GitHub markdown → Neon DB
 *
 * Usage: npx tsx scripts/migrate-to-neon.ts
 *
 * Requires .env.local with DATABASE_URL and GITHUB_TOKEN
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const GH_TOKEN = process.env.GITHUB_TOKEN!;
const REPO = "moltzart/openclaw-home";

async function ghFetch(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json();
}

async function ghContent(path: string): Promise<string> {
  const data = await ghFetch(`/repos/${REPO}/contents/${path}`);
  return Buffer.from(data.content, "base64").toString("utf-8");
}

// --- Frontmatter parser (copied from github.ts) ---
function parseFrontmatter(md: string) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const meta: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const val = raw.trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
    } else if (val === "true") meta[key] = true;
    else if (val === "false") meta[key] = false;
    else if (/^\d+$/.test(val)) meta[key] = parseInt(val, 10);
    else meta[key] = val;
  }
  return { meta, body: match[2] };
}

// --- Migrate Radar ---
async function migrateRadar() {
  const files = await ghFetch(`/repos/${REPO}/contents/memory`);
  const radarFiles = files
    .filter((f: { name: string }) => f.name.match(/^content-radar-\d{4}-\d{2}-\d{2}\.md$/))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

  let totalItems = 0;
  let totalClusters = 0;

  for (const file of radarFiles) {
    const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    const content = await ghContent(`memory/${file.name}`);
    const fm = parseFrontmatter(content);
    const body = fm ? fm.body : content;
    const scanSources = fm?.meta.scan_sources as string[] | undefined;

    // Parse sections and items (simplified from github.ts parseRadarMd)
    const lines = body.split("\n");
    let currentHeading = "";
    let currentLines: string[] = [];
    let inClusters = false;
    const sections: { heading: string; lines: string[] }[] = [];
    const clusterLines: string[] = [];

    for (const line of lines) {
      if (line.match(/^## Topic Clusters/i)) {
        if (currentHeading && currentLines.length > 0) {
          sections.push({ heading: currentHeading, lines: currentLines });
        }
        inClusters = true;
        currentHeading = "";
        currentLines = [];
        continue;
      }
      if (line.match(/^## Scan Quality/i)) {
        if (currentHeading && currentLines.length > 0 && !inClusters) {
          sections.push({ heading: currentHeading, lines: currentLines });
        }
        currentHeading = "";
        currentLines = [];
        continue;
      }
      if (line.match(/^---$/)) continue;
      if (line.match(/^## /)) {
        if (currentHeading && currentLines.length > 0 && !inClusters) {
          sections.push({ heading: currentHeading, lines: currentLines });
        }
        currentHeading = line.replace(/^## /, "").trim();
        currentLines = [];
        inClusters = false;
        continue;
      }
      if (inClusters && line.startsWith("**")) {
        clusterLines.push(line);
      } else {
        currentLines.push(line);
      }
    }
    if (currentHeading && currentLines.length > 0 && !inClusters) {
      sections.push({ heading: currentHeading, lines: currentLines });
    }

    // Parse items from each section
    for (const section of sections) {
      const items = parseRadarItems(section.heading, section.lines);
      for (const item of items) {
        await sql`
          INSERT INTO radar_items (date, section, title, source_name, source_url, lane, why_bullets, scan_source)
          VALUES (${date}, ${section.heading}, ${item.title}, ${item.source || null}, ${item.link || null}, ${item.lane}, ${item.whyBullets}, ${scanSources?.[0] || null})
        `;
        totalItems++;
      }
    }

    // Parse clusters
    for (const cl of clusterLines) {
      const title = cl.replace(/\*\*/g, "").replace(/\s*[—–-].*$/, "").trim();
      if (title) {
        await sql`
          INSERT INTO radar_clusters (date, title)
          VALUES (${date}, ${title})
        `;
        totalClusters++;
      }
    }

    console.log(`  Radar ${date}: ${sections.reduce((a, s) => a + parseRadarItems(s.heading, s.lines).length, 0)} items`);
  }

  console.log(`Radar: ${totalItems} items, ${totalClusters} clusters`);
}

function parseRadarItems(heading: string, lines: string[]): { title: string; source: string; link: string; lane: string; whyBullets: string[] }[] {
  const items: { title: string; source: string; link: string; lane: string; whyBullets: string[] }[] = [];

  const defaultLaneMap: Record<string, string> = {
    "hacker news": "HN", "the verge": "AI/Tech", "anthropic": "AI", "openai": "AI",
    "techcrunch": "Tech", "a16z": "Strategy", "simon willison": "AI", "platformer": "Tech",
    "every.to": "AI/Biz", "indie hackers": "Indie", "lenny": "Product", "stratechery": "Strategy",
    "reddit": "Reddit", "x timeline": "X", "x scan": "X", "blogs": "Blog",
  };
  const defaultLane = Object.entries(defaultLaneMap).find(([k]) => heading.toLowerCase().includes(k))?.[1] || heading.replace(/^#+\s*/, "");

  let currentTitle = "";
  let currentLink = "";
  let currentLane = defaultLane;
  let currentWhyBullets: string[] = [];
  let inWhy = false;

  function pushCurrent() {
    if (currentTitle) {
      items.push({ title: currentTitle, source: heading, link: currentLink, lane: currentLane, whyBullets: currentWhyBullets });
    }
    currentTitle = "";
    currentLink = "";
    currentLane = defaultLane;
    currentWhyBullets = [];
    inWhy = false;
  }

  for (const line of lines) {
    const h3Match = line.match(/^### (.+)$/);
    if (h3Match) { pushCurrent(); currentTitle = h3Match[1].trim(); continue; }

    const sourceMatch = line.match(/^- Source:\s*(.+?)\s*[—–-]\s*(\S+)\s*$/);
    if (sourceMatch && currentTitle) { currentLink = sourceMatch[2]; continue; }

    const laneMatch = line.match(/^- Lane:\s*(.+)$/);
    if (laneMatch && currentTitle) { currentLane = laneMatch[1].trim(); continue; }

    if (line.match(/^- Why:\s*$/) && currentTitle) { inWhy = true; continue; }

    if (inWhy && currentTitle) {
      const bulletMatch = line.match(/^\s+-\s+(.+)$/);
      if (bulletMatch) { currentWhyBullets.push(bulletMatch[1].trim()); continue; }
      if (line.trim() === "") continue;
      inWhy = false;
    }

    const v2Match = line.match(/^\*\*\[(.+?)\]\(([^)]+)\)\*\*\s*[—–-]\s*(.+)$/);
    if (v2Match) { pushCurrent(); currentTitle = v2Match[1].replace(/\s*\(\d+\s*pts?\)/, ""); currentLink = v2Match[2]; currentWhyBullets.push(v2Match[3].trim()); continue; }

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

    if (line.startsWith("> ") && currentTitle) {
      currentWhyBullets.push(line.slice(2).trim().replace(/^Why Matt cares:\s*/i, ""));
      continue;
    }

    if (line.startsWith("*") && line.endsWith("*") && currentTitle) {
      currentWhyBullets.push(line.replace(/^\*+|\*+$/g, "").trim());
    }
  }
  pushCurrent();
  return items;
}

// --- Migrate Newsletter Digests ---
async function migrateNewsletter() {
  const files = await ghFetch(`/repos/${REPO}/contents/memory`);
  const digestFiles = files
    .filter((f: { name: string }) => f.name.match(/^newsletter-digest-\d{4}-\d{2}-\d{2}\.md$/))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

  let total = 0;

  for (const file of digestFiles) {
    const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    const content = await ghContent(`memory/${file.name}`);
    const fm = parseFrontmatter(content);
    const body = fm ? fm.body : content;
    const isV2 = fm?.meta.format === "newsletter-v2";

    const articles: { title: string; description: string; source: string; link: string; category?: string }[] = [];

    if (isV2) {
      const lines = body.split("\n");
      let i = 0;
      while (i < lines.length) {
        const h3 = lines[i].match(/^### (.+)$/);
        if (!h3) { i++; continue; }
        const title = h3[1].trim();
        let source = "", link = "", category: string | undefined;
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
        if (title && source && link) articles.push({ title, description, source, link, category });
      }
    } else {
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

    for (const a of articles) {
      await sql`
        INSERT INTO newsletter_articles (digest_date, title, source, link, category, description)
        VALUES (${date}, ${a.title}, ${a.source}, ${a.link}, ${a.category || null}, ${a.description})
      `;
      total++;
    }

    console.log(`  Newsletter ${date}: ${articles.length} articles`);
  }

  console.log(`Newsletter: ${total} articles`);
}

// --- Migrate Drafts ---
async function migrateDrafts() {
  const content = await ghContent("memory/x-drafts.md");
  const fm = parseFrontmatter(content);
  const body = fm ? fm.body : content;
  const isV2 = fm?.meta.format === "drafts-v2";

  const lines = body.split("\n");
  let currentSection = "pending";
  let total = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.match(/^## Pending Approval/i)) { currentSection = "pending"; i++; continue; }
    if (line.match(/^## Approved/i)) { currentSection = "approved"; i++; continue; }
    if (line.match(/^## Posted/i)) { currentSection = "posted"; i++; continue; }
    if (line.match(/^## Rejected/i)) { currentSection = "rejected"; i++; continue; }

    if (isV2) {
      const v2Match = line.match(/^### (\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*\|\s*(.+)$/);
      if (v2Match) {
        const date = v2Match[1];
        const time = v2Match[2] || null;
        const typeStr = v2Match[3].trim();
        let type = "original";
        let replyTo: string | null = null;
        let replyContext: string | null = null;
        let priority: string | null = null;
        let tweetId: string | null = null;
        let contentLines: string[] = [];
        let feedback: string | null = null;

        if (typeStr.match(/Reply to @/i)) {
          type = "reply";
          const rm = typeStr.match(/Reply to @(\S+)/i);
          if (rm) replyTo = rm[1];
        }

        i++;
        while (i < lines.length) {
          const cl = lines[i];
          const metaMatch = cl.match(/^- ([\w-]+):\s*(.+)$/);
          if (metaMatch) {
            const [, k, v] = metaMatch;
            if (k === "priority") priority = v.trim();
            else if (k === "context") replyContext = v.trim();
            else if (k === "tweet-id") tweetId = v.trim();
            i++; continue;
          }
          if (cl.startsWith("> ")) {
            const text = cl.slice(2);
            contentLines.push(text.trim() === "" ? "\n" : text.trim());
            i++; continue;
          }
          if (cl.match(/^_Feedback:/) && cl.endsWith("_")) {
            feedback = cl.slice(1, -1).replace(/^Feedback:\s*/, "").trim();
            i++; continue;
          }
          if (cl.startsWith("_") && cl.endsWith("_")) {
            feedback = cl.slice(1, -1).trim();
            i++; continue;
          }
          if (cl.trim() === "") { i++; continue; }
          if (cl.startsWith("### ") || cl.startsWith("## ")) break;
          i++;
        }

        const draftContent = contentLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

        // Determine status from markers
        let status = currentSection;
        if (typeStr.includes("REJECTED") || typeStr.includes("❌")) status = "rejected";
        if (typeStr.includes("✅")) status = currentSection === "posted" ? "posted" : "approved";

        if (draftContent) {
          await sql`
            INSERT INTO drafts (date, time, type, content, status, reply_to, reply_context, feedback, tweet_id, priority)
            VALUES (${date}, ${time}, ${type}, ${draftContent}, ${status}, ${replyTo}, ${replyContext}, ${feedback}, ${tweetId}, ${priority || 'normal'})
          `;
          total++;
        }
        continue;
      }
    }

    // Legacy v1 format
    const entryMatch = line.match(/^\*\*(\d{4}-\d{2}-\d{2})(?:\s+[\d:]+)?\s*\|\s*(.+?)\*\*\s*(.*)?$/);
    if (entryMatch) {
      const date = entryMatch[1];
      const typeStr = entryMatch[2].trim();
      const statusSuffix = entryMatch[3]?.trim() || "";

      let type = "original";
      let replyTo: string | null = null;
      let replyContext: string | null = null;

      const replyMatch = typeStr.match(/Reply\s+(?:to|candidate to)\s+@(\S+)(?:\s*\(([^)]+)\))?/i);
      if (replyMatch) { type = "reply"; replyTo = replyMatch[1]; replyContext = replyMatch[2] || null; }

      const markers = typeStr + " " + statusSuffix;
      let status = currentSection;
      if (markers.includes("REJECTED") || markers.includes("❌")) status = "rejected";
      if (markers.includes("✅")) status = currentSection === "posted" ? "posted" : "approved";
      if (markers.includes("STALE") || markers.includes("KILLED")) status = "rejected";

      let draftContent = "";
      let feedback: string | null = null;
      let tweetId: string | null = null;
      i++;

      while (i < lines.length) {
        const cl = lines[i];
        if (cl.startsWith("> ")) { draftContent += (draftContent ? " " : "") + cl.slice(2).trim(); i++; }
        else if (cl.startsWith("_") && cl.endsWith("_")) {
          const inner = cl.slice(1, -1).trim();
          const tidMatch = inner.match(/tweet ID (\d+)/);
          if (tidMatch) tweetId = tidMatch[1];
          feedback = (feedback ? feedback + " " : "") + inner;
          i++;
        } else if (cl.trim() === "" || cl.startsWith("**") || cl.startsWith("##") || cl.startsWith("---")) { break; }
        else { i++; }
      }

      if (draftContent) {
        await sql`
          INSERT INTO drafts (date, type, content, status, reply_to, reply_context, feedback, tweet_id, priority)
          VALUES (${date}, ${type}, ${draftContent}, ${status}, ${replyTo}, ${replyContext}, ${feedback}, ${tweetId}, ${'normal'})
        `;
        total++;
      }
      continue;
    }

    i++;
  }

  console.log(`Drafts: ${total} drafts`);
}

// --- Migrate Content Feedback ---
async function migrateFeedback() {
  let total = 0;

  try {
    const content = await ghContent("memory/content-feedback.jsonl");
    const lines = content.split("\n").filter(l => l.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        await sql`
          INSERT INTO content_feedback (date, signal, topic, source, reason)
          VALUES (${entry.date || new Date().toISOString().slice(0, 10)}, ${entry.signal || 'interest'}, ${entry.topic || ''}, ${entry.source || null}, ${entry.reason || null})
        `;
        total++;
      } catch (e) {
        console.warn(`  Skipping malformed feedback line: ${line.slice(0, 80)}`);
      }
    }
  } catch {
    console.log("  No content-feedback.jsonl found, skipping");
  }

  console.log(`Feedback: ${total} entries`);
}

// --- Main ---
async function main() {
  console.log("Starting migration: GitHub → Neon\n");

  console.log("Migrating radar...");
  await migrateRadar();

  console.log("\nMigrating newsletter digests...");
  await migrateNewsletter();

  console.log("\nMigrating drafts...");
  await migrateDrafts();

  console.log("\nMigrating content feedback...");
  await migrateFeedback();

  console.log("\nMigration complete!");
}

main().catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});
