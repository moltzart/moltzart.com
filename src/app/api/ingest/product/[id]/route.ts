import { NextRequest, NextResponse } from "next/server";
import {
  fetchProductById,
  insertProductResearchItems,
  updateProductIdea,
  type ProductResearchInput,
} from "@/lib/db";
import {
  isProductSourceType,
  isProductStatus,
  PRODUCT_SOURCE_TYPES,
  PRODUCT_STATUSES,
} from "@/lib/products";

function checkIngestAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === process.env.INGEST_API_KEY;
}

function validateResearchItems(items: ProductResearchInput[]): string | null {
  for (const item of items) {
    if (!item.title || item.title.trim().length === 0) {
      return "Each research item requires title";
    }
    if (item.source_type && !isProductSourceType(item.source_type)) {
      return `Invalid source_type: ${item.source_type}. Must be one of: ${PRODUCT_SOURCE_TYPES.join(", ")}`;
    }
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    title,
    slug,
    summary,
    status,
    problem,
    audience,
    research_add,
  } = body;

  if (title !== undefined && (!title || String(title).trim().length === 0)) {
    return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
  }
  if (slug !== undefined && (!slug || String(slug).trim().length === 0)) {
    return NextResponse.json({ error: "slug cannot be empty" }, { status: 400 });
  }
  if (status !== undefined && !isProductStatus(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}. Must be one of: ${PRODUCT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (research_add !== undefined && !Array.isArray(research_add)) {
    return NextResponse.json({ error: "research_add must be an array when provided" }, { status: 400 });
  }
  if (Array.isArray(research_add)) {
    const researchValidationError = validateResearchItems(research_add);
    if (researchValidationError) {
      return NextResponse.json({ error: researchValidationError }, { status: 400 });
    }
  }

  const hasProductFields =
    title !== undefined ||
    slug !== undefined ||
    summary !== undefined ||
    status !== undefined ||
    problem !== undefined ||
    audience !== undefined;
  const hasResearchItems = Array.isArray(research_add) && research_add.length > 0;

  if (!hasProductFields && !hasResearchItems) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });
  }

  try {
    if (hasProductFields) {
      const updated = await updateProductIdea(id, {
        title,
        slug,
        summary,
        status,
        problem,
        audience,
      });
      if (!updated) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
    } else {
      const existing = await fetchProductById(id);
      if (!existing) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (hasResearchItems) {
    await insertProductResearchItems(id, research_add);
  }

  return NextResponse.json({ ok: true });
}
