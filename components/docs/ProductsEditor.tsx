"use client";

import { useState, useTransition } from "react";
import { saveProductsAction } from "@/app/admin/docs/actions";
import { fmt, toTiyn } from "@/lib/docs/money";
import type { CatalogItem } from "@/lib/docs/types";

const blank = (): CatalogItem => ({
  id: `p${Date.now().toString(36)}`, name: "", model: "", diagonal: "", unit: "шт.", warrantyMonths: 12, specs: [], kit: "", price: 0,
  tnved: "", unitCode: "796", origin: "", declNo: "", declDate: "", declPos: "",
});

export function ProductsEditor({ initial }: { initial: CatalogItem[] }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = (id: string, p: Partial<CatalogItem>) => {
    setList((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setMsg("");
  };
  const text = (p: CatalogItem, k: keyof CatalogItem, label: string, cls = "") => (
    <label className={`docs-field ${cls}`}>
      <span>{label}</span>
      <input value={String(p[k] ?? "")} onChange={(e) => set(p.id, { [k]: k === "warrantyMonths" ? Number(e.target.value) || 0 : e.target.value })} />
    </label>
  );

  return (
    <div className="docs-form">
      <div className="docs-row">
        <button className="docs-btn" disabled={pending} onClick={() => start(async () => { await saveProductsAction(list); setMsg("Сохранено"); })}>
          Сохранить товары
        </button>
        <button className="docs-btn secondary" onClick={() => { const p = blank(); setList((l) => [...l, p]); setOpen(p.id); }}>+ Товар</button>
        {msg && <span className="docs-msg">{msg}</span>}
      </div>
      <p className="docs-muted">
        Поля ЭСФ берите из входящей ЭСФ поставщика / декларации: у ввезённых панелей, мониторов, принтеров признак происхождения <b>2</b> (не 1 —
        их кодов ТН ВЭД нет в Перечне изъятий), код единицы «штука» — <b>796</b>.
      </p>
      {list.map((p) => (
        <section key={p.id} className="docs-card">
          <button type="button" className="docs-item-head" onClick={() => setOpen(open === p.id ? null : p.id)}>
            <b>{p.name || "Новый товар"}</b>
            <span className="docs-muted">
              {p.tnved ? `ТН ВЭД ${p.tnved}` : "ТН ВЭД не указан"} · {p.origin ? `признак ${p.origin}` : "признак не указан"} · гарантия {p.warrantyMonths} мес.
            </span>
          </button>
          {open === p.id && (
            <>
              <div className="docs-grid">
                {text(p, "name", "Наименование для печати", "wide")}
                {text(p, "model", "Модель")}
                {text(p, "diagonal", "Диагональ")}
                {text(p, "unit", "Ед. изм.", "narrow")}
                {text(p, "warrantyMonths", "Гарантия, мес.", "narrow")}
                <label className="docs-field">
                  <span>Цена-подсказка, ₸</span>
                  <input defaultValue={p.price ? fmt(p.price) : ""} onBlur={(e) => { try { set(p.id, { price: toTiyn(e.target.value) }); } catch {} }} />
                </label>
                <label className="docs-field wide">
                  <span>Характеристики (по строке)</span>
                  <textarea rows={5} value={p.specs.join("\n")} onChange={(e) => set(p.id, { specs: e.target.value.split("\n") })} />
                </label>
                <label className="docs-field wide">
                  <span>Комплект поставки</span>
                  <textarea rows={2} value={p.kit} onChange={(e) => set(p.id, { kit: e.target.value })} />
                </label>
              </div>
              <h3>Для ЭСФ</h3>
              <div className="docs-grid">
                {text(p, "tnved", "Код ТН ВЭД (10 цифр)")}
                {text(p, "unitCode", "Код ед. изм. (796 — шт.)", "narrow")}
                <label className="docs-field">
                  <span>Признак происхождения</span>
                  <select value={p.origin} onChange={(e) => set(p.id, { origin: e.target.value as CatalogItem["origin"] })}>
                    <option value="">—</option>
                    <option value="1">1 — импорт, в Перечне изъятий</option>
                    <option value="2">2 — импорт, не в Перечне</option>
                    <option value="3">3 — РК, в Перечне</option>
                    <option value="4">4 — РК, не в Перечне</option>
                    <option value="5">5 — не 1–4</option>
                    <option value="6">6 — работы, услуги</option>
                  </select>
                </label>
                {text(p, "declNo", "№ декларации / СНТ")}
                {text(p, "declDate", "Дата декларации")}
                {text(p, "declPos", "№ позиции в декларации", "narrow")}
              </div>
              <button className="docs-link danger" onClick={() => setList((l) => l.filter((x) => x.id !== p.id))}>Удалить товар</button>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
