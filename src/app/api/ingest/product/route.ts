import { NextRequest, NextResponse } from "next/server";
import { fetchProductsDb, insertProductIdeas, type ProductIdeaInput } from "@/lib/db";
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

function validateProducts(products: ProductIdeaInput[]): string | null {
  for (const product of products) {
    if (!product.title || product.title.trim().length === 0) {
      return "Each product requires title";
    }

    if (product.status && !isProductStatus(product.status)) {
      return `Invalid status: ${product.status}. Must be one of: ${PRODUCT_STATUSES.join(", ")}`;
    }

    if (!product.research) continue;
    if (!Array.isArray(product.research)) {
      return "research must be an array when provided";
    }

    for (const item of product.research) {
      if (!item.title || item.title.trim().length === 0) {
        return "Each research item requires title";
      }

      if (item.source_type && !isProductSourceType(item.source_type)) {
        return `Invalid source_type: ${item.source_type}. Must be one of: ${PRODUCT_SOURCE_TYPES.join(", ")}`;
      }
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const q = req.nextUrl.searchParams.get("q") || undefined;

  if (status && !isProductStatus(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}. Must be one of: ${PRODUCT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const products = await fetchProductsDb({ status, q, includeArchived: true });
  return NextResponse.json({ ok: true, products });
}

export async function POST(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const products = body?.products as ProductIdeaInput[] | undefined;

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json(
      { error: "Missing required field: products (non-empty array)" },
      { status: 400 }
    );
  }

  const validationError = validateProducts(products);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const ids = await insertProductIdeas(products);
  return NextResponse.json({ ok: true, ids });
}
