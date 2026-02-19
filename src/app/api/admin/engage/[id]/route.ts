import { NextRequest, NextResponse } from "next/server";
import { deleteEngageItem } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteEngageItem(id);
  return NextResponse.json({ ok: true });
}
