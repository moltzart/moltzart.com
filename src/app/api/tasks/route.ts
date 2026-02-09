import { NextRequest, NextResponse } from "next/server";

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

interface ParsedTasks {
  sections: Section[];
  recurring: RecurringTask[];
}

function parseTodoMd(md: string): ParsedTasks {
  const sections: Section[] = [];
  const recurring: RecurringTask[] = [];

  const sectionMap: Record<string, string> = {
    "URGENT": "urgent",
    "SCHEDULED": "scheduled",
    "BACKLOG": "backlog",
    "ACTIVE": "active",
    "BLOCKED": "blocked",
    "COMPLETED": "completed",
  };

  const lines = md.split("\n");
  let currentSection: Section | null = null;
  let inRecurring = false;
  let inTable = false;

  for (const line of lines) {
    // Check for section headers
    const sectionMatch = line.match(/^## .+?(URGENT|SCHEDULED|BACKLOG|ACTIVE|BLOCKED|COMPLETED)/);
    if (sectionMatch) {
      inRecurring = false;
      const key = sectionMatch[1];
      const id = sectionMap[key] || key.toLowerCase();

      // Clean title: remove emojis and extra formatting
      let title = key.charAt(0) + key.slice(1).toLowerCase();
      if (key === "URGENT") title = "Urgent";
      if (key === "SCHEDULED") title = "Scheduled";
      if (key === "BACKLOG") title = "Backlog";
      if (key === "ACTIVE") title = "Active";
      if (key === "BLOCKED") title = "Blocked";
      if (key === "COMPLETED") title = "Completed";

      // Check for parenthetical subtitle
      const subtitleMatch = line.match(/\(([^)]+)\)/);
      if (subtitleMatch) {
        title += ` · ${subtitleMatch[1]}`;
      }

      currentSection = { id, title, tasks: [] };
      sections.push(currentSection);
      continue;
    }

    // Check for recurring section
    if (line.match(/RECURRING/i)) {
      inRecurring = true;
      currentSection = null;
      continue;
    }

    // Parse recurring table rows
    if (inRecurring) {
      if (line.startsWith("|") && !line.includes("---") && !line.includes("Task")) {
        const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
        if (cols.length >= 3) {
          recurring.push({
            task: cols[0],
            schedule: cols[1],
            method: cols[2],
          });
        }
      }
      continue;
    }

    // Parse task lines
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

  // Filter out empty sections (except urgent — always show)
  return {
    sections: sections.filter((s) => s.tasks.length > 0 || s.id === "urgent"),
    recurring,
  };
}

function parseTaskText(raw: string): { text: string; detail?: string } {
  // Split on " — " or " - " for detail
  const dashSplit = raw.split(/\s[—–]\s/);
  const text = dashSplit[0].replace(/\*\*/g, "").trim();
  const detail = dashSplit.length > 1 ? dashSplit.slice(1).join(" — ").trim() : undefined;
  return { text, detail };
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== process.env.TASKS_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const res = await fetch(
    "https://api.github.com/repos/moltzart/openclaw-home/contents/TODO.md",
    {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github.raw+json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 502 }
    );
  }

  const markdown = await res.text();
  const parsed = parseTodoMd(markdown);

  return NextResponse.json(parsed);
}
