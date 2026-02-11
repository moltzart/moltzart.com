import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchDraftsRaw, updateDraftsFile } from "@/lib/github";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8573948386";

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token && token === process.env.TASKS_PASSWORD;
}

async function notifyTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch {
    // Best effort — don't block the response
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId, action } = await request.json();

  if (!draftId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const raw = await fetchDraftsRaw();
  if (!raw) {
    return NextResponse.json({ error: "Could not fetch drafts file" }, { status: 500 });
  }

  let { content, sha } = raw;
  const lines = content.split("\n");
  let found = false;
  let inPendingSection = false;
  let draftContent = "";

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^## Pending Approval/i)) {
      inPendingSection = true;
      continue;
    }
    if (lines[i].match(/^## /) && inPendingSection) {
      inPendingSection = false;
    }

    if (inPendingSection && lines[i].startsWith("**") && !lines[i].includes("❌ REJECTED")) {
      // Extract date and type info from the header line
      const headerLine = lines[i];
      const dateMatch = headerLine.match(/(\d{4}-\d{2}-\d{2})/);
      const headerDate = dateMatch ? dateMatch[1] : "";

      // Parse draftId: "DATE-TYPE-TARGET-INDEX"
      const parts = draftId.split("-");
      const idDate = parts.slice(0, 3).join("-");
      const idType = parts[3];

      if (headerDate !== idDate) continue;

      const isReply = headerLine.toLowerCase().includes("reply");
      const isOriginal = headerLine.toLowerCase().includes("original");

      if ((idType === "reply" && isReply) || (idType === "original" && isOriginal)) {
        // If reply, also match the target handle
        if (idType === "reply") {
          const idTarget = parts.slice(4, -1).join("-");
          if (idTarget !== "original" && !headerLine.toLowerCase().includes(idTarget.toLowerCase())) {
            continue;
          }
        }

        // Capture the draft content (blockquote lines following the header)
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith("> ")) {
            draftContent += (draftContent ? " " : "") + lines[j].slice(2).trim();
          } else {
            break;
          }
        }

        if (action === "approve") {
          lines[i] = headerLine.replace(/\*\*\s*$/, " ✅**");
          if (!lines[i].endsWith("**")) lines[i] += " ✅";
        } else {
          lines[i] = headerLine.replace(/\*\*\s*$/, " ❌ REJECTED**");
          if (!lines[i].endsWith("**")) lines[i] += " ❌ REJECTED";
        }
        found = true;
        break;
      }
    }
  }

  if (!found) {
    return NextResponse.json({ error: "Draft not found in pending section" }, { status: 404 });
  }

  const newContent = lines.join("\n");
  const actionLabel = action === "approve" ? "Approve" : "Reject";
  const ok = await updateDraftsFile(newContent, sha, `${actionLabel} draft: ${draftId}`);

  if (!ok) {
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }

  // Notify Moltzart via Telegram
  const emoji = action === "approve" ? "✅" : "❌";
  const preview = draftContent.length > 100 ? draftContent.slice(0, 100) + "..." : draftContent;
  const msg = `${emoji} Draft ${action}d by Matt:\n\n_${preview}_`;
  await notifyTelegram(msg);

  return NextResponse.json({ ok: true, action });
}
