import Link from "next/link";
import { DocsShell } from "@/components/docs/DocsShell";
import { StatusSelect } from "@/components/docs/StatusSelect";
import { fmt } from "@/lib/docs/money";
import { getSellers, listDocs, storageIsPersistent } from "@/lib/docs/store";
import { ruDate, totals } from "@/lib/docs/totals";
import { DOC_STATUS_LABEL, DOC_STATUSES, DOC_TYPE_LABEL, DOC_TYPES } from "@/lib/docs/types";

export const dynamic = "force-dynamic";

type SP = { seller?: string; type?: string; status?: string; q?: string; from?: string; to?: string };

export default async function DocsListPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [docs, sellers] = await Promise.all([listDocs(), getSellers()]);
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = docs.filter(
    (d) =>
      (!sp.seller || d.sellerId === sp.seller) &&
      (!sp.type || d.type === sp.type) &&
      (!sp.status || d.status === sp.status) &&
      (!sp.from || d.date >= sp.from) &&
      (!sp.to || d.date <= sp.to) &&
      (!q || `${d.buyer.name} ${d.buyer.bin} ${d.number}`.toLowerCase().includes(q)),
  );
  const sum = rows.reduce(
    (a, d) => {
      const t = totals(d);
      return { total: a.total + t.total, vat: a.vat + t.vat };
    },
    { total: 0, vat: 0 },
  );
  const sellerName = (id: string) => sellers.find((s) => s.id === id)?.name ?? id;

  return (
    <DocsShell title="Документы" current="/admin/docs">
      {!storageIsPersistent && <p className="docs-warn">Хранилище не подключено (нет KV_REST_API_*): документы живут только до перезапуска.</p>}
      <form className="docs-filters" method="get">
        <select name="seller" defaultValue={sp.seller ?? ""}>
          <option value="">Все ИП</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type ?? ""}>
          <option value="">Все типы</option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""}>
          <option value="">Любой статус</option>
          {DOC_STATUSES.map((s) => (
            <option key={s} value={s}>{DOC_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Покупатель, БИН, номер" />
        <input type="date" name="from" defaultValue={sp.from ?? ""} aria-label="С даты" />
        <input type="date" name="to" defaultValue={sp.to ?? ""} aria-label="По дату" />
        <button className="docs-btn" type="submit">Показать</button>
        <Link className="docs-link" href="/admin/docs">сбросить</Link>
      </form>

      <p className="docs-summary">
        {rows.length} док. · на сумму <b>{fmt(sum.total)} ₸</b>
        {sum.vat > 0 && <> · в т. ч. НДС {fmt(sum.vat)} ₸</>}
      </p>

      {rows.length === 0 ? (
        <p className="docs-muted">
          Документов нет. <Link href="/admin/docs/new">Создать счёт</Link>
        </p>
      ) : (
        <div className="orders-table-wrap">
          <table className="orders-table docs-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Документ</th>
                <th>ИП</th>
                <th>Покупатель</th>
                <th className="num">Сумма, ₸</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>{ruDate(d.date)}</td>
                  <td>
                    <Link href={`/admin/docs/${d.id}`}>
                      {DOC_TYPE_LABEL[d.type]} № {d.number}
                    </Link>
                  </td>
                  <td>{sellerName(d.sellerId)}</td>
                  <td>
                    {d.buyer.name || <span className="docs-muted">—</span>}
                    {d.buyer.bin && <div className="docs-muted">{d.buyer.bin}</div>}
                  </td>
                  <td className="num">{fmt(totals(d).total)}</td>
                  <td>
                    <StatusSelect id={d.id} value={d.status} />
                  </td>
                  <td className="orders-table-actions">
                    <a className="docs-chip" href={`/api/admin/docs/${d.id}/pdf?inline=1`} target="_blank" rel="noreferrer">PDF</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DocsShell>
  );
}
