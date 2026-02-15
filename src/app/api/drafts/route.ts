import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateDraftStatus, fetchDraftById } from "@/lib/db";

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

  const draft = await fetchDraftById(draftId);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const draftContent = draft.content;
  const newStatus = action === "approve" ? "approved" : "rejected";
  const ok = await updateDraftStatus(draftId, newStatus);

  if (!ok) {
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }

  // Notify Moltzart via Telegram
  const emoji = action === "approve" ? "✅" : "❌";
  const preview = draftContent.length > 100 ? draftContent.slice(0, 100) + "..." : draftContent;
  const msg = `${emoji} Draft ${action}d by Matt:\n\n_${preview}_`;
  await notifyTelegram(msg);

  return NextResponse.json({ ok: true, action });
}
