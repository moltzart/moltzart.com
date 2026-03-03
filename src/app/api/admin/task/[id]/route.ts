import { NextRequest, NextResponse } from "next/server";
import { updateTask } from "@/lib/db";
import { getAdminAuth } from "@/lib/admin-auth";
import { normalizeTaskStatusInput } from "@/lib/task-workflow";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await getAdminAuth();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, detail, priority, effort, due_date, blocked_by, board_order } = body;

  const normalizedStatus = status === undefined ? undefined : normalizeTaskStatusInput(status);
  const normalizedBoardOrder = board_order === undefined ? undefined : Number(board_order);

  const updated = await updateTask(id, {
    status: normalizedStatus,
    detail,
    priority,
    effort,
    due_date,
    blocked_by,
    board_order: Number.isFinite(normalizedBoardOrder) ? normalizedBoardOrder : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
