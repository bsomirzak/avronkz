import { DocsShell } from "@/components/docs/DocsShell";
import { SellersEditor } from "@/components/docs/SellersEditor";
import { getCounters, getSellers, hasImages } from "@/lib/docs/store";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  const [sellers, counters, images] = await Promise.all([getSellers(), getCounters(), hasImages()]);
  return (
    <DocsShell title="ИП, печати, номера" current="/admin/docs/sellers">
      <SellersEditor initial={sellers} counters={counters} images={images} />
    </DocsShell>
  );
}
