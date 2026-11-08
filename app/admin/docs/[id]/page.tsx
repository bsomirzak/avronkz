import { notFound } from "next/navigation";
import { DocEditor } from "@/components/docs/DocEditor";
import { DocsShell } from "@/components/docs/DocsShell";
import { getBuyers, getDoc, getProducts, getSellers, getSettings, listDocs } from "@/lib/docs/store";
import { DOC_TYPE_LABEL } from "@/lib/docs/types";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) notFound();
  const [sellers, buyers, products, settings, all] = await Promise.all([getSellers(), getBuyers(), getProducts(), getSettings(), listDocs()]);
  const related = all
    .filter((d) => d.id !== doc.id && (d.parentId === doc.id || d.id === doc.parentId || (doc.parentId && d.parentId === doc.parentId)))
    .map((d) => ({ id: d.id, type: d.type, number: d.number, date: d.date }));
  return (
    <DocsShell title={`${DOC_TYPE_LABEL[doc.type]} № ${doc.number}`} current="" wide>
      <DocEditor key={doc.id + doc.updatedAt} initial={doc} isNew={false} sellers={sellers} buyers={buyers} products={products} settings={settings} related={related} />
    </DocsShell>
  );
}
