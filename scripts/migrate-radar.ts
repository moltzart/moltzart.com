/**
 * One-time migration script: converts v1/v2 radar files in openclaw-home to v3 with frontmatter.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx npx tsx scripts/migrate-radar.ts [--dry-run]
 *
 * What it does:
 *   1. Lists all content-radar-*.md files in memory/
 *   2. Detects format version (already v3/frontmatter → skip, v1/v2 → convert)
 *   3. Converts body to v3 structure with YAML frontmatter
 *   4. Commits each updated file back to openclaw-home
 */

const REPO = "moltzart/openclaw-home";
const GH_TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");

if (!GH_TOKEN) {
  console.error("GITHUB_TOKEN env var required");
  process.exit(1);
}

async function ghFetch(path: string, opts?: RequestInit) {
  return fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
}

function hasFrontmatter(md: string): boolean {
  return /^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(md);
}

/** Detect whether a radar file body uses v1/v2 item format (bold entries) vs v3 (### headings) */
function detectVersion(md: string): "v1" | "v2" | "v3" {
  // v3: uses ### headings for items and - Source: / - Lane: / - Why: metadata
  if (md.match(/^### .+$/m) && md.match(/^- Source:/m)) return "v3";
  // v2: **[Title](url)** — Source
  if (md.match(/^\*\*\[.+?\]\(.+?\)\*\*/m)) return "v2";
  // v1: **Title** — Note
  if (md.match(/^\*\*.+?\*\*\s*[—–-]/m)) return "v1";
  // Default to v3 if nothing matches (empty or unrecognized)
  return "v3";
}

interface V1V2Item {
  title: string;
  link: string;
  source: string;
  note: string;
}

function parseV1V2Section(heading: string, lines: string[]): V1V2Item[] {
  const items: V1V2Item[] = [];

  for (const line of lines) {
    // v2: **[Title](url)** — Description
    const v2Match = line.match(/^\*\*\[(.+?)\]\(([^)]+)\)\*\*\s*[—–-]\s*(.+)$/);
    if (v2Match) {
      items.push({
        title: v2Match[1].replace(/\s*\(\d+\s*pts?\)/, ""),
        link: v2Match[2],
        source: heading,
        note: v2Match[3].trim(),
      });
      continue;
    }

    // v1: **Title** — Note [Source](url)
    const v1Match = line.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
    if (v1Match) {
      let noteText = v1Match[2].trim();
      const linkMatch = noteText.match(/\[([^\]]*)\]\(([^)]+)\)/);
      const link = linkMatch ? linkMatch[2] : "";
      noteText = noteText.replace(/\s*\[[^\]]*\]\([^)]+\)\s*$/, "").trim();
      items.push({
        title: v1Match[1].replace(/\s*\(\d+\s*pts?\)/, ""),
        link,
        source: heading,
        note: noteText,
      });
      continue;
    }
  }

  return items;
}

function convertToV3(md: string, date: string): string {
  const lines = md.split("\n");
  const sections: { heading: string; items: V1V2Item[] }[] = [];
  const clusters: string[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];
  let inClusters = false;
  let totalItems = 0;
  const sources = new Set<string>();

  // Strip any existing title line (# Content Radar — ...)
  const bodyLines = lines.filter((l) => !l.match(/^# Content Radar/i));

  for (const line of bodyLines) {
    if (line.match(/^## Topic Clusters/i)) {
      if (currentHeading && currentLines.length > 0) {
        const items = parseV1V2Section(currentHeading, currentLines);
        if (items.length > 0) sections.push({ heading: currentHeading, items });
      }
      inClusters = true;
      currentHeading = "";
      currentLines = [];
      continue;
    }

    if (line.match(/^## Scan Quality/i) || (line.match(/^---$/) && !inClusters)) {
      if (currentHeading && currentLines.length > 0) {
        const items = parseV1V2Section(currentHeading, currentLines);
        if (items.length > 0) sections.push({ heading: currentHeading, items });
      }
      currentHeading = "";
      currentLines = [];
      continue;
    }

    if (line.match(/^## /)) {
      if (currentHeading && currentLines.length > 0 && !inClusters) {
        const items = parseV1V2Section(currentHeading, currentLines);
        if (items.length > 0) sections.push({ heading: currentHeading, items });
      }
      currentHeading = line.replace(/^## /, "").trim();
      currentLines = [];
      inClusters = false;
      continue;
    }

    if (inClusters && line.startsWith("**")) {
      clusters.push(line);
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading && currentLines.length > 0 && !inClusters) {
    const items = parseV1V2Section(currentHeading, currentLines);
    if (items.length > 0) sections.push({ heading: currentHeading, items });
  }

  // Build v3 output
  for (const s of sections) {
    sources.add(s.heading);
    totalItems += s.items.length;
  }

  const sourcesArray = Array.from(sources);
  let out = `---\nformat: radar-v3\ndate: ${date}\nscan_sources: [${sourcesArray.join(", ")}]\nitem_count: ${totalItems}\n---\n`;

  for (const section of sections) {
    out += `\n## ${section.heading}\n\n`;
    for (const item of section.items) {
      out += `### ${item.title}\n`;
      out += `- Source: ${item.source} — ${item.link}\n`;
      out += `- Lane: ${item.source}\n`;
      out += `- Why:\n`;
      if (item.note) {
        out += `  - ${item.note}\n`;
      }
      out += "\n";
    }
  }

  if (clusters.length > 0) {
    out += "## Topic Clusters\n\n";
    for (const c of clusters) {
      out += c + "\n";
    }
  }

  return out;
}

async function main() {
  console.log(`Migration script — ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  // List memory/ files
  const listRes = await ghFetch(`/repos/${REPO}/contents/memory`);
  if (!listRes.ok) {
    console.error("Failed to list memory/ directory");
    process.exit(1);
  }

  const files = await listRes.json();
  const radarFiles = files.filter((f: { name: string }) =>
    f.name.match(/^content-radar-\d{4}-\d{2}-\d{2}\.md$/)
  );

  console.log(`Found ${radarFiles.length} radar files`);

  let converted = 0;
  let skipped = 0;

  for (const file of radarFiles) {
    const contentRes = await ghFetch(`/repos/${REPO}/contents/memory/${file.name}`);
    if (!contentRes.ok) {
      console.warn(`  Skip ${file.name} — fetch failed`);
      skipped++;
      continue;
    }

    const fileData = await contentRes.json();
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    // Already has frontmatter? Skip.
    if (hasFrontmatter(content)) {
      console.log(`  Skip ${file.name} — already has frontmatter`);
      skipped++;
      continue;
    }

    const version = detectVersion(content);
    if (version === "v3") {
      // v3 body but no frontmatter — just add frontmatter
      const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : "unknown";

      // Count items and sources from existing v3 body
      const itemCount = (content.match(/^### /gm) || []).length;
      const sourceMatches = content.match(/^## (?!Topic Clusters|Scan Quality).+$/gm) || [];
      const sources = sourceMatches.map((s: string) => s.replace(/^## /, "").trim());

      const newContent = `---\nformat: radar-v3\ndate: ${date}\nscan_sources: [${sources.join(", ")}]\nitem_count: ${itemCount}\n---\n\n${content}`;

      if (DRY_RUN) {
        console.log(`  Would add frontmatter to ${file.name} (v3 body, ${itemCount} items)`);
      } else {
        const putRes = await ghFetch(`/repos/${REPO}/contents/memory/${file.name}`, {
          method: "PUT",
          body: JSON.stringify({
            message: `Add v3 frontmatter to ${file.name}`,
            content: Buffer.from(newContent).toString("base64"),
            sha: fileData.sha,
          }),
        });
        console.log(`  ${putRes.ok ? "✓" : "✗"} Add frontmatter to ${file.name}`);
      }
      converted++;
      continue;
    }

    // v1 or v2 — full conversion
    const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : "unknown";
    const newContent = convertToV3(content, date);

    if (DRY_RUN) {
      console.log(`  Would convert ${file.name} from ${version} to v3`);
    } else {
      const putRes = await ghFetch(`/repos/${REPO}/contents/memory/${file.name}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `Migrate ${file.name} from ${version} to v3 format`,
          content: Buffer.from(newContent).toString("base64"),
          sha: fileData.sha,
        }),
      });
      console.log(`  ${putRes.ok ? "✓" : "✗"} Convert ${file.name} (${version} → v3)`);
    }
    converted++;
  }

  console.log(`\nDone: ${converted} converted, ${skipped} skipped`);
}

main().catch(console.error);
