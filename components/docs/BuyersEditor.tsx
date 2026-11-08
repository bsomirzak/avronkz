"use client";

import { useState, useTransition } from "react";
import { deleteBuyerAction, saveBuyerAction } from "@/app/admin/docs/actions";
import { emptyBuyer } from "@/lib/docs/derive";
import { BUYER_TYPE_LABEL, type Buyer } from "@/lib/docs/types";
import { BuyerFields } from "./BuyerFields";

export function BuyersEditor({ initial }: { initial: Buyer[] }) {
  const [list, setList] = useState(initial);
  const [edit, setEdit] = useState<Buyer | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const rows = list.filter((b) => `${b.name} ${b.bin}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="docs-form">
      {edit ? (
        <section className="docs-card">
          <h2>{edit.id ? "Покупатель" : "Новый покупатель"}</h2>
          <BuyerFields value={edit} onChange={setEdit} />
          <div className="docs-row">
            <button
              className="docs-btn"
              disabled={pending || !edit.name.trim()}
              onClick={() =>
                start(async () => {
                  const saved = await saveBuyerAction(edit);
                  setList((l) => [saved, ...l.filter((x) => x.id !== saved.id)]);
                  setEdit(null);
                })
              }
            >
              Сохранить
            </button>
            <button className="docs-btn secondary" onClick={() => setEdit(null)}>Отмена</button>
            {edit.id && (
              <button
                className="docs-link danger"
                onClick={() => {
                  if (!confirm(`Удалить «${edit.name}» из справочника? Выданные документы не изменятся.`)) return;
                  start(async () => {
                    await deleteBuyerAction(edit.id);
                    setList((l) => l.filter((x) => x.id !== edit.id));
                    setEdit(null);
                  });
                }}
              >
                Удалить
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="docs-row">
          <button className="docs-btn" onClick={() => setEdit(emptyBuyer())}>+ Покупатель</button>
          <input className="docs-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или БИН" />
        </div>
      )}
      <div className="orders-table-wrap">
        <table className="orders-table docs-table">
          <thead>
            <tr><th>Название</th><th>БИН/ИИН</th><th>Тип</th><th>Адрес</th><th>Телефон</th></tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} onClick={() => setEdit(b)} className="docs-click">
                <td>{b.name}</td>
                <td>{b.bin}</td>
                <td>{BUYER_TYPE_LABEL[b.type]}</td>
                <td>{b.address}</td>
                <td>{b.phone}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="docs-muted">Покупатели появятся здесь после первого документа или кнопки «+ Покупатель».</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
