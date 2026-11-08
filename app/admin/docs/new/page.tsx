import { DocEditor } from "@/components/docs/DocEditor";
import { DocsShell } from "@/components/docs/DocsShell";
import { blankDoc } from "@/lib/docs/derive";
import { getBuyers, getProducts, getSellers, getSettings, nextNumber } from "@/lib/docs/store";
import { sellerVatRate, todayIso } from "@/lib/docs/totals";
import { DOC_TYPES, type DocType } from "@/lib/docs/types";

export const dynamic = "force-dynamic";

export default async function NewDocPage({ searchParams }: { searchParams: Promise<{ type?: string; seller?: string }> }) {
  const sp = await searchParams;
  const [sellers, buyers, products, settings] = await Promise.all([getSellers(), getBuyers(), getProducts(), getSettings()]);
  const type: DocType = DOC_TYPES.includes(sp.type as DocType) ? (sp.type as DocType) : "invoice";
  const seller = sellers.find((s) => s.id === sp.seller) ?? sellers[0];
  const date = todayIso();
  const doc = blankDoc({ type, sellerId: seller.id, number: await nextNumber(seller.id, type), date, vatRate: sellerVatRate(seller, date, settings) });
  return (
    <DocsShell title="Новый документ" current="/admin/docs/new" wide>
      <DocEditor initial={doc} isNew sellers={sellers} buyers={buyers} products={products} settings={settings} related={[]} />
    </DocsShell>
  );
}
