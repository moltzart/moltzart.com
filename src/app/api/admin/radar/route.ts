import { fetchRadarDay } from "@/lib/github";
import { getAdminAuth } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  const data = await fetchRadarDay(date);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
