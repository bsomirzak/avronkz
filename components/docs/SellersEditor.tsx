"use client";

import { useState, useTransition } from "react";
import { saveSellersAction, setCounterAction } from "@/app/admin/docs/actions";
import { fmtBp, toBp } from "@/lib/docs/money";
import { DOC_TYPE_LABEL, DOC_TYPES, type DocType, type Seller } from "@/lib/docs/types";
import { SealUploader } from "./SealUploader";

type Props = { initial: Seller[]; counters: Record<string, number>; images: Record<string, boolean> };

const FIELDS: [keyof Seller, string][] = [
  ["name", "Название"], ["iin", "ИИН"], ["address", "Адрес"], ["bank", "Банк"], ["bik", "БИК"], ["iik", "ИИК"],
  ["kbe", "КБе"], ["knp", "КНП"], ["signer", "Подписант"], ["signerPosition", "Должность в накладной"], ["phone", "Телефон"], ["email", "E-mail"],
  ["vatCertSeries", "Свид. НДС: серия"], ["vatCertNum", "Свид. НДС: номер"],
];

export function SellersEditor({ initial, counters, images }: Props) {
  const [list, setList] = useState(initial);
  const [cnt, setCnt] = useState(counters);
  const [v, setV] = useState(0);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [have, setHave] = useState(images);
  const set = (id: string, p: Partial<Seller>) => setList((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const keys = [...new Set(list.flatMap((s) => [s.stampKey, s.signKey, s.id]))];

  return (
    <div className="docs-form">
      <div className="docs-row">
        <button className="docs-btn" disabled={pending} onClick={() => start(async () => { await saveSellersAction(list); setMsg("Сохранено"); })}>
          Сохранить реквизиты ИП
        </button>
        {msg && <span className="docs-msg">{msg}</span>}
      </div>
      {list.map((s) => (
        <section key={s.id} className="docs-card">
          <h2>{s.name}</h2>
          <div className="docs-grid">
            {FIELDS.map(([k, label]) => (
              <label key={k} className={`docs-field${k === "address" || k === "bank" ? " wide" : ""}`}>
                <span>{label}</span>
                <input value={String(s[k] ?? "")} onChange={(e) => set(s.id, { [k]: e.target.value })} />
              </label>
            ))}
            <label className="docs-field">
              <span>Налоговый режим</span>
              <select
                value={s.regime.kind === "simplified" ? "simplified" : s.regime.vatPayer ? "our-vat" : "our"}
                onChange={(e) =>
                  set(s.id, {
                    regime: e.target.value === "simplified" ? { kind: "simplified", rate: 300 } : { kind: "our", ipn: 1000, vatPayer: e.target.value === "our-vat" },
                  })
                }
              >
                <option value="simplified">Упрощёнка, без НДС</option>
                <option value="our">ОУР, без НДС</option>
                <option value="our-vat">ОУР, плательщик НДС</option>
              </select>
            </label>
            <label className="docs-field narrow">
              <span>{s.regime.kind === "simplified" ? "Ставка, %" : "ИПН, %"}</span>
              <input
                defaultValue={fmtBp(s.regime.kind === "simplified" ? s.regime.rate : s.regime.ipn)}
                onBlur={(e) => {
                  const b = toBp(e.target.value || "0");
                  set(s.id, { regime: s.regime.kind === "simplified" ? { ...s.regime, rate: b } : { ...s.regime, ipn: b } });
                }}
              />
            </label>
            <label className="docs-field">
              <span>Чья печать</span>
              <select value={s.stampKey} onChange={(e) => set(s.id, { stampKey: e.target.value })}>
                {keys.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="docs-field">
              <span>Чья подпись</span>
              <select value={s.signKey} onChange={(e) => set(s.id, { signKey: e.target.value })}>
                {keys.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>

          <h3>Печать и подпись</h3>
          <div className="docs-seals">
            {(["stamp", "sign"] as const).map((kind) => {
              const key = kind === "stamp" ? s.stampKey : s.signKey;
              const exists = have[`img:${key}:${kind}`];
              return (
                <div key={kind} className="docs-seal">
                  <div className="docs-checker small">
                    {exists ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/admin/docs/image?key=${key}&kind=${kind}&v=${v}`} alt={kind === "stamp" ? "Печать" : "Подпись"} />
                    ) : (
                      <span className="docs-muted">{kind === "stamp" ? "печати нет" : "подписи нет"}</span>
                    )}
                  </div>
                  <SealUploader
                    keyName={key}
                    kind={kind}
                    label={kind === "stamp" ? "печать" : "подпись"}
                    onSaved={() => {
                      setHave((h) => ({ ...h, [`img:${key}:${kind}`]: true }));
                      setV((x) => x + 1);
                    }}
                  />
                </div>
              );
            })}
          </div>

          <h3>Нумерация (последний выданный номер)</h3>
          <div className="docs-grid">
            {DOC_TYPES.map((t: DocType) => {
              const f = `${s.id}:${t}`;
              return (
                <label key={t} className="docs-field">
                  <span>{DOC_TYPE_LABEL[t]}</span>
                  <input
                    inputMode="numeric"
                    value={String(cnt[f] ?? 0)}
                    onChange={(e) => setCnt((c) => ({ ...c, [f]: Number(e.target.value.replace(/\D/g, "")) || 0 }))}
                    onBlur={() => start(() => setCounterAction(s.id, t, cnt[f] ?? 0))}
                  />
                </label>
              );
            })}
          </div>
          <p className="docs-muted">Следующий документ получит номер «последний + 1», но не меньше уже выданных номеров.</p>
        </section>
      ))}
    </div>
  );
}
