"use client";

/**
 * Реквизиты покупателя: выбор из справочника, разбор вставленного текста
 * (WhatsApp) и форма для проверки. Ничего не сохраняет сам — только меняет
 * значение через onChange.
 */

import { useState } from "react";
import { isValidBin, isValidIban, parseRequisites } from "@/lib/docs/parse";
import { BUYER_TYPE_LABEL, type Buyer, type BuyerType } from "@/lib/docs/types";

type Props = {
  value: Buyer;
  onChange: (b: Buyer) => void;
  buyers?: Buyer[];
};

const FIELDS: { key: keyof Buyer; label: string; wide?: boolean; person?: boolean; org?: boolean }[] = [
  { key: "name", label: "Название / ФИО", wide: true },
  { key: "bin", label: "БИН / ИИН" },
  { key: "address", label: "Юридический адрес", wide: true },
  { key: "bank", label: "Банк", org: true },
  { key: "bik", label: "БИК", org: true },
  { key: "iik", label: "ИИК (IBAN)", org: true },
  { key: "kbe", label: "КБе" },
  { key: "phone", label: "Телефон" },
  { key: "email", label: "E-mail" },
  { key: "headName", label: "Руководитель (ФИО)", org: true },
  { key: "headPosition", label: "Должность", org: true },
  { key: "headBasis", label: "Действует на основании", org: true },
  { key: "idNumber", label: "№ удостоверения личности", person: true },
  { key: "idIssuer", label: "Кем выдано", person: true },
  { key: "idDate", label: "Дата выдачи", person: true },
];

export function BuyerFields({ value, onChange, buyers }: Props) {
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState<{ warnings: string[]; rest: string[] } | null>(null);
  const [q, setQ] = useState("");
  const set = (k: keyof Buyer, v: string | boolean) => onChange({ ...value, [k]: v });
  const person = value.type === "person";

  function parse() {
    const r = parseRequisites(paste);
    const { rest, warnings, ...fields } = r;
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ""));
    onChange({ ...value, ...clean });
    setNote({ warnings, rest });
  }

  const found = q.trim()
    ? (buyers ?? []).filter((b) => `${b.name} ${b.bin}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];
  const binBad = value.bin && !isValidBin(value.bin);
  const iikBad = value.iik && !isValidIban(value.iik);

  return (
    <div className="docs-buyer">
      {buyers && (
        <div className="docs-field docs-search">
          <span>Найти в справочнике</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Название или БИН" />
          {found.length > 0 && (
            <ul className="docs-suggest">
              {found.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...b });
                      setQ("");
                      setNote(null);
                    }}
                  >
                    <b>{b.name}</b> <span className="docs-muted">{b.bin}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <details className="docs-paste" open={!value.name}>
        <summary>Вставить реквизиты из WhatsApp / письма</summary>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} placeholder={"ТОО «…»\nБИН: 190 140 900 097\nИИК: KZ…\nБИК: …\nАдрес: …"} />
        <button type="button" className="docs-btn secondary" onClick={parse} disabled={!paste.trim()}>
          Разобрать по полям
        </button>
        {note && (
          <div className="docs-parse-note">
            <p>Проверьте поля ниже — сохранится только то, что в форме.</p>
            {note.warnings.map((w) => (
              <p key={w} className="docs-warn">{w}</p>
            ))}
            {note.rest.length > 0 && <p className="docs-muted">Не разобрано: {note.rest.join(" · ")}</p>}
          </div>
        )}
      </details>

      <div className="docs-grid">
        <label className="docs-field">
          <span>Тип</span>
          <select value={value.type} onChange={(e) => set("type", e.target.value as BuyerType)}>
            {Object.entries(BUYER_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        {FIELDS.filter((f) => !(f.person && !person) && !(f.org && person)).map((f) => (
          <label key={f.key} className={`docs-field${f.wide ? " wide" : ""}`}>
            <span>
              {f.label}
              {f.key === "bin" && binBad && <em className="docs-bad"> контрольная цифра не сходится</em>}
              {f.key === "iik" && iikBad && <em className="docs-bad"> не похож на IBAN РК</em>}
            </span>
            <input
              type={f.key === "idDate" ? "date" : "text"}
              value={String(value[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </label>
        ))}
        <label className="docs-check">
          <input type="checkbox" checked={!!value.nonResident} onChange={(e) => set("nonResident", e.target.checked)} />
          Нерезидент РК
        </label>
      </div>
    </div>
  );
}
