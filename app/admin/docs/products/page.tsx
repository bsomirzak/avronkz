import { DocsShell } from "@/components/docs/DocsShell";
import { ProductsEditor } from "@/components/docs/ProductsEditor";
import { getProducts } from "@/lib/docs/store";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  return (
    <DocsShell title="Товары для документов" current="/admin/docs/products">
      <ProductsEditor initial={await getProducts()} />
    </DocsShell>
  );
}
