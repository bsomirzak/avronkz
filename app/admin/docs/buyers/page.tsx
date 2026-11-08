import { BuyersEditor } from "@/components/docs/BuyersEditor";
import { DocsShell } from "@/components/docs/DocsShell";
import { getBuyers } from "@/lib/docs/store";

export const dynamic = "force-dynamic";

export default async function BuyersPage() {
  return (
    <DocsShell title="Покупатели" current="/admin/docs/buyers">
      <BuyersEditor initial={await getBuyers()} />
    </DocsShell>
  );
}
