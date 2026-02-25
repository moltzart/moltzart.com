import { Lightbulb } from "lucide-react";
import { fetchProductsDb } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { ProductsView } from "@/components/products-view";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await fetchProductsDb({ includeArchived: true });

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-teal-500" />
            <span className="type-body-sm font-medium text-zinc-200">Products</span>
          </div>
          <span className="type-body-sm text-zinc-600">{products.length} ideas</span>
        </div>
      </Panel>

      <ProductsView products={products} />
    </div>
  );
}
