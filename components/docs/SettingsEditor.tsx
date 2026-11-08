"use client";

import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/admin/docs/actions";
import { fmtBp, toBp } from "@/lib/docs/money";
import { DOC_TYPE_LABEL, DOC_TYPES, type Placement, type Settings } from "@/lib/docs/types";

const TEXTS: [keyof Settings["texts"], string, number][] = [
  ["invoiceWarning", "Счёт: предупреждение вверху", 3],
  ["warrantyCovers", "Гарантия распространяется на", 3],
  ["warrantyExcludes", "Гарантия не распространяется (по пункту в строке)", 8],
  ["warrantyProcedure", "Порядок обращения", 4],
  ["offerPayment", "КП: оплата по умолчанию", 1],
  ["offerDelivery", "КП: доставка по умолчанию", 3],
  ["offerFooter", "КП: заключительная фраза", 1],
];

const PLACE: [keyof Placement, string][] = [
  ["signW", "Подпись: ширина"], ["signDx", "Подпись: сдвиг →"], ["signDy", "Подпись: сдвиг ↓"],
  ["stampD", "Печать: диаметр"], ["stampDx", "Печать: сдвиг →"], ["stampDy", "Печать: сдвиг ↓"],
];

export function SettingsEditor({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const upd = (p: Partial<Settings>) => {
    setS((x) => ({ ...x, ...p }));
    setMsg("");
  };

  return (
    <div className="docs-form">
      <div className="docs-row">
        <button className="docs-btn" disabled={pending} onClick={() => start(async () => { await saveSettingsAction(s); setMsg("Сохранено"); })}>
          Сохранить настройки
        </button>
        {msg && <span className="docs-msg">{msg}</span>}
      </div>

      <section className="docs-card">
        <h2>Ставка НДС по датам</h2>
        <p className="docs-muted">Документ берёт ставку, действующую на его дату. Новую ставку добавляйте строкой с датой начала — старые документы не изменятся.</p>
        {s.vatHistory.map((h, i) => (
          <div key={i} className="docs-row">
            <label className="docs-field inline">
              <span>с</span>
              <input type="date" value={h.from} onChange={(e) => upd({ vatHistory: s.vatHistory.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })} />
            </label>
            <label className="docs-field inline">
              <span>ставка, %</span>
              <input defaultValue={fmtBp(h.rate)} onBlur={(e) => upd({ vatHistory: s.vatHistory.map((x, j) => (j === i ? { ...x, rate: toBp(e.target.value || "0") } : x)) })} />
            </label>
            <button className="docs-x" onClick={() => upd({ vatHistory: s.vatHistory.filter((_, j) => j !== i) })}>×</button>
          </div>
        ))}
        <button className="docs-btn secondary" onClick={() => upd({ vatHistory: [...s.vatHistory, { from: new Date().toISOString().slice(0, 10), rate: 1600 }] })}>+ Ставка</button>
      </section>

      <section className="docs-card">
        <h2>Режимы калькулятора</h2>
        {s.presets.map((p, i) => (
          <div key={p.key} className="docs-row">
            <input className="docs-input" value={p.label} onChange={(e) => upd({ presets: s.presets.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <span className="docs-muted">
              {p.regime.kind === "simplified" ? "доля от суммы" : p.regime.kind === "manual" ? "k" : p.regime.vatPayer ? "ИПН + НДС" : "ИПН"}, %
            </span>
            <input
              className="docs-input narrow"
              defaultValue={fmtBp(p.regime.kind === "simplified" ? p.regime.rate : p.regime.kind === "manual" ? p.regime.k : p.regime.ipn)}
              onBlur={(e) => {
                const b = toBp(e.target.value || "0");
                const r = p.regime;
                const regime = r.kind === "simplified" ? { ...r, rate: b } : r.kind === "manual" ? { ...r, k: b } : { ...r, ipn: b };
                upd({ presets: s.presets.map((x, j) => (j === i ? { ...x, regime } : x)) });
              }}
            />
          </div>
        ))}
      </section>

      <section className="docs-card">
        <h2>Тексты документов</h2>
        {TEXTS.map(([k, label, rows]) => (
          <label key={k} className="docs-field wide">
            <span>{label}</span>
            <textarea rows={rows} value={s.texts[k]} onChange={(e) => upd({ texts: { ...s.texts, [k]: e.target.value } })} />
          </label>
        ))}
      </section>

      <section className="docs-card">
        <h2>Положение печати и подписи, мм</h2>
        {DOC_TYPES.map((t) => (
          <div key={t}>
            <h3>{DOC_TYPE_LABEL[t]}</h3>
            <div className="docs-grid">
              {PLACE.map(([k, label]) => (
                <label key={k} className="docs-field narrow">
                  <span>{label}</span>
                  <input
                    inputMode="decimal"
                    defaultValue={String(s.placement[t][k])}
                    onBlur={(e) => upd({ placement: { ...s.placement, [t]: { ...s.placement[t], [k]: Number(e.target.value.replace(",", ".")) || 0 } } })}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
