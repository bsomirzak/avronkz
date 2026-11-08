"use client";

/**
 * Форма документа: ИП → покупатель → позиции → калькулятор → поля типа →
 * предпросмотр PDF рядом. Сохранение — server actions, PDF — /api/admin/docs/*.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { checkNumberAction, deleteDocAction, deriveAction, nextNumberAction, saveDocAction } from "@/app/admin/docs/actions";
import { fmt, fmtBp, toTiyn } from "@/lib/docs/money";
import { amountInWords } from "@/lib/docs/words";
import { sellerVatRate, totals } from "@/lib/docs/totals";
import {
  DOC_STATUS_LABEL,
  DOC_STATUSES,
  DOC_TYPE_LABEL,
  DOC_TYPES,
  type Attorney,
  type Buyer,
  type CatalogItem,
  type Doc,
  type DocStatus,
  type DocType,
  type Line,
  type Seller,
  type Settings,
} from "@/lib/docs/types";
import { BuyerFields } from "./BuyerFields";
import { CalcPanel } from "./CalcPanel";

type Props = {
  initial: Doc;
  isNew: boolean;
  sellers: Seller[];
  buyers: Buyer[];
  products: CatalogItem[];
  settings: Settings;
  related: { id: string; type: DocType; number: string; date: string }[];
};

type Issue = { level: "error" | "warning"; field: string; text: string };

function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(value ? fmt(value) : "");
  const [focus, setFocus] = useState(false);
  const shown = focus ? text : value ? fmt(value) : "";
  return (
    <input
      inputMode="decimal"
      value={shown}
      onFocus={() => {
        setText(value ? fmt(value) : "");
        setFocus(true);
      }}
      onBlur={() => setFocus(false)}
      onChange={(e) => {
        setText(e.target.value);
        try {
          onChange(toTiyn(e.target.value));
        } catch {
          /* ввод не закончен */
        }
      }}
    />
  );
}

function snapshot(p: CatalogItem): Partial<Line> {
  return {
    productId: p.id,
    name: p.name,
    unit: p.unit,
    model: p.model,
    specs: p.specs,
    kit: p.kit,
    warrantyMonths: p.warrantyMonths,
    tnved: p.tnved,
    unitCode: p.unitCode,
    origin: p.origin,
    declNo: p.declNo,
    declPos: p.declPos,
  };
}

export function DocEditor({ initial, isNew, sellers, buyers, products, settings, related }: Props) {
  const router = useRouter();
  const [doc, setDoc] = useState<Doc>(initial);
  const [saved, setSaved] = useState(!isNew);
  const [dirty, setDirty] = useState(false);
  const [saveBuyer, setSaveBuyer] = useState(true);
  const [dupCount, setDupCount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [esf, setEsf] = useState<Issue[] | null>(null);
  const [pending, start] = useTransition();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const seller = sellers.find((s) => s.id === doc.sellerId) ?? sellers[0];
  const t = useMemo(() => totals(doc), [doc]);

  const patch = useCallback((p: Partial<Doc>) => {
    setDoc((d) => ({ ...d, ...p }));
    setDirty(true);
  }, []);
  const setItem = (i: number, p: Partial<Line>) => patch({ items: doc.items.map((l, j) => (j === i ? { ...l, ...p } : l)) });

  // ── Предпросмотр ──
  const lastUrl = useRef<string | null>(null);
  const refresh = useCallback(async (d: Doc) => {
    setPdfErr(null);
    const res = await fetch("/api/admin/docs/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    if (!res.ok) {
      setPdfErr(await res.text());
      return;
    }
    const url = URL.createObjectURL(await res.blob());
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    lastUrl.current = url;
    setPdfUrl(url);
  }, []);
  useEffect(() => {
    if (!auto) return;
    const h = setTimeout(() => refresh(doc), 700);
    return () => clearTimeout(h);
  }, [doc, auto, refresh]);

  // ── Номер: проверка дубля ──
  useEffect(() => {
    const h = setTimeout(async () => setDupCount(await checkNumberAction({ id: doc.id, sellerId: doc.sellerId, type: doc.type, number: doc.number })), 400);
    return () => clearTimeout(h);
  }, [doc.id, doc.sellerId, doc.type, doc.number]);

  async function changeSeller(id: string) {
    const s = sellers.find((x) => x.id === id)!;
    const p: Partial<Doc> = { sellerId: id, vatRate: sellerVatRate(s, doc.date, settings) };
    if (isNew && !saved) p.number = await nextNumberAction(id, doc.type);
    patch(p);
  }
  async function changeType(type: DocType) {
    const p: Partial<Doc> = { type };
    if (isNew && !saved) p.number = await nextNumberAction(doc.sellerId, type);
    if (type === "waybill" && !doc.attorney) p.attorney = doc.buyer.type === "person" ? { mode: "id", idNumber: doc.buyer.idNumber, iin: doc.buyer.bin, name: doc.buyer.name } : { mode: "blank" };
    patch(p);
  }

  function save(then?: (d: Doc) => void) {
    setMsg(null);
    start(async () => {
      const r = await saveDocAction(doc, saveBuyer);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setDoc(r.doc);
      setSaved(true);
      setDirty(false);
      setMsg(r.duplicates.length ? `Сохранено. Внимание: номер ${r.doc.number} уже есть у этого ИП (${r.duplicates.length})` : "Сохранено");
      if (isNew) router.replace(`/admin/docs/${r.doc.id}`);
      then?.(r.doc);
    });
  }
  function derive(kind: DocType | "reissue" | "duplicate") {
    start(async () => {
      const r = await deriveAction(doc.id, kind);
      if ("error" in r) setMsg(r.error);
      else router.push(`/admin/docs/${r.id}`);
    });
  }
  async function checkEsf() {
    const res = await fetch(`/api/admin/docs/${doc.id}/esf?format=check`);
    setEsf(((await res.json()) as { issues: Issue[] }).issues);
  }

  const vatPayer = seller.regime.kind === "our" && seller.regime.vatPayer;
  const attorney: Attorney = doc.attorney ?? { mode: "blank" };

  return (
    <div className="docs-editor">
      <div className="docs-form">
        {/* 1. Документ и ИП */}
        <section className="docs-card">
          <div className="docs-grid">
            <label className="docs-field">
              <span>Документ</span>
              <select value={doc.type} onChange={(e) => changeType(e.target.value as DocType)} disabled={saved}>
                {DOC_TYPES.map((x) => (
                  <option key={x} value={x}>{DOC_TYPE_LABEL[x]}</option>
                ))}
              </select>
            </label>
            <label className="docs-field">
              <span>Номер {dupCount > 0 && <em className="docs-bad">уже занят ({dupCount})</em>}</span>
              <input value={doc.number} onChange={(e) => patch({ number: e.target.value })} />
            </label>
            <label className="docs-field">
              <span>Дата</span>
              <input type="date" value={doc.date} onChange={(e) => patch({ date: e.target.value, vatRate: sellerVatRate(seller, e.target.value, settings) })} />
            </label>
            <label className="docs-field">
              <span>Статус</span>
              <select value={doc.status} onChange={(e) => patch({ status: e.target.value as DocStatus })}>
                {DOC_STATUSES.map((s) => (
                  <option key={s} value={s}>{DOC_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="docs-sellers">
            {sellers.map((s) => (
              <button key={s.id} type="button" className={`docs-seller${s.id === doc.sellerId ? " active" : ""}`} onClick={() => changeSeller(s.id)}>
                <b>{s.name}</b>
                <span>{s.regime.kind === "simplified" ? `упрощёнка ${fmtBp(s.regime.rate)}%` : s.regime.vatPayer ? "ОУР + НДС" : "ОУР без НДС"}</span>
              </button>
            ))}
          </div>
          <p className="docs-muted">
            {doc.vatRate == null ? "Документ без НДС" : `Цены с НДС ${fmtBp(doc.vatRate)}%`}
            {vatPayer !== (doc.vatRate != null) && (
              <button type="button" className="docs-link" onClick={() => patch({ vatRate: sellerVatRate(seller, doc.date, settings) })}>
                — привести в соответствие с режимом ИП
              </button>
            )}
          </p>
        </section>

        {/* 2. Покупатель */}
        <section className="docs-card">
          <h2>Покупатель</h2>
          <BuyerFields value={doc.buyer} onChange={(b) => patch({ buyer: b })} buyers={buyers} />
          <label className="docs-check">
            <input type="checkbox" checked={saveBuyer} onChange={(e) => setSaveBuyer(e.target.checked)} />
            Сохранить / обновить покупателя в справочнике
          </label>
        </section>

        {/* 3. Позиции */}
        <section className="docs-card">
          <h2>Позиции</h2>
          <div className="docs-items">
            {doc.items.map((l, i) => (
              <div key={i} className="docs-item">
                <div className="docs-item-main">
                  <span className="docs-item-n">{i + 1}</span>
                  <select
                    value={l.productId ?? ""}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      setItem(i, p ? { ...snapshot(p), price: l.price || p.price } : { productId: undefined });
                    }}
                  >
                    <option value="">— свой товар —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button type="button" className="docs-x" title="Удалить строку" onClick={() => patch({ items: doc.items.filter((_, j) => j !== i) })}>
                    ×
                  </button>
                </div>
                <div className="docs-grid">
                  <label className="docs-field wide">
                    <span>Наименование для печати</span>
                    <input value={l.name} onChange={(e) => setItem(i, { name: e.target.value })} />
                  </label>
                  <label className="docs-field narrow">
                    <span>Кол-во</span>
                    <input inputMode="decimal" value={String(l.qty)} onChange={(e) => setItem(i, { qty: Number(e.target.value.replace(",", ".")) || 0 })} />
                  </label>
                  <label className="docs-field narrow">
                    <span>Ед.</span>
                    <input value={l.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
                  </label>
                  <label className="docs-field">
                    <span>Цена за ед.{doc.vatRate != null ? " с НДС" : ""}, ₸</span>
                    <MoneyInput value={l.price} onChange={(v) => setItem(i, { price: v })} />
                  </label>
                  <div className="docs-field">
                    <span>Сумма</span>
                    <output>{fmt(t.lines[i]?.sum ?? 0)}</output>
                  </div>
                  {(doc.type === "warranty" || doc.type === "waybill") && (
                    <label className="docs-field wide">
                      <span>{doc.type === "warranty" ? "Серийные номера (через запятую)" : "Номенклатурный номер"}</span>
                      <input
                        value={(doc.type === "warranty" ? l.serial : l.nomenclature) ?? ""}
                        onChange={(e) => setItem(i, doc.type === "warranty" ? { serial: e.target.value } : { nomenclature: e.target.value })}
                      />
                    </label>
                  )}
                </div>
                <details className="docs-esf-fields">
                  <summary>
                    Поля ЭСФ {l.tnved ? `· ТН ВЭД ${l.tnved}` : "· ТН ВЭД не указан"} {l.origin ? `· признак ${l.origin}` : ""}
                  </summary>
                  <div className="docs-grid">
                    <label className="docs-field">
                      <span>Код ТН ВЭД (10 цифр)</span>
                      <input value={l.tnved ?? ""} onChange={(e) => setItem(i, { tnved: e.target.value })} />
                    </label>
                    <label className="docs-field narrow">
                      <span>Код ед. изм.</span>
                      <input value={l.unitCode ?? ""} onChange={(e) => setItem(i, { unitCode: e.target.value })} placeholder="796" />
                    </label>
                    <label className="docs-field">
                      <span>Признак происхождения</span>
                      <select value={l.origin ?? ""} onChange={(e) => setItem(i, { origin: e.target.value as Line["origin"] })}>
                        <option value="">—</option>
                        <option value="1">1 — импорт, в Перечне изъятий</option>
                        <option value="2">2 — импорт, не в Перечне</option>
                        <option value="3">3 — РК, в Перечне</option>
                        <option value="4">4 — РК, не в Перечне</option>
                        <option value="5">5 — не 1–4</option>
                        <option value="6">6 — работы, услуги</option>
                      </select>
                    </label>
                    <label className="docs-field">
                      <span>№ декларации / СНТ</span>
                      <input value={l.declNo ?? ""} onChange={(e) => setItem(i, { declNo: e.target.value })} />
                    </label>
                    <label className="docs-field narrow">
                      <span>№ позиции</span>
                      <input value={l.declPos ?? ""} onChange={(e) => setItem(i, { declPos: e.target.value })} />
                    </label>
                  </div>
                </details>
              </div>
            ))}
          </div>
          <button type="button" className="docs-btn secondary" onClick={() => patch({ items: [...doc.items, { name: "", unit: "шт.", qty: 1, price: 0, unitCode: "796" }] })}>
            + Позиция
          </button>
          <div className="docs-total">
            <div>Итого: <b>{fmt(t.total)} ₸</b></div>
            <div>{doc.vatRate == null ? "Без НДС" : `в т. ч. НДС ${fmtBp(doc.vatRate)}%: ${fmt(t.vat)} ₸`}</div>
            <div className="docs-muted">{amountInWords(t.total)}</div>
          </div>
        </section>

        <CalcPanel
          seller={seller}
          settings={settings}
          vatRate={doc.vatRate}
          items={doc.items}
          onApply={(items, calc) => patch({ items, calc: { modeKey: calc.modeKey, net: calc.net, expenses: calc.expenses, step: calc.step } })}
        />

        {/* 4. Поля типа документа */}
        <section className="docs-card">
          <h2>{DOC_TYPE_LABEL[doc.type]}: условия</h2>
          {doc.type === "invoice" && (
            <div className="docs-grid">
              <label className="docs-field wide">
                <span>Договор (пусто или «№ 7 от 01.11.2026»)</span>
                <input value={doc.contract ?? ""} onChange={(e) => patch({ contract: e.target.value })} />
              </label>
              <label className="docs-field">
                <span>Предоплата, % (пусто — без условий)</span>
                <input inputMode="numeric" value={doc.prepayPercent ?? ""} onChange={(e) => patch({ prepayPercent: Number(e.target.value) || undefined })} />
              </label>
            </div>
          )}
          {doc.type === "waybill" && (
            <>
              <div className="docs-grid">
                <label className="docs-field">
                  <span>Ответственный за поставку</span>
                  <input value={doc.responsible ?? seller.signer} onChange={(e) => patch({ responsible: e.target.value })} />
                </label>
                <label className="docs-field">
                  <span>Транспортная организация</span>
                  <input value={doc.transport ?? ""} onChange={(e) => patch({ transport: e.target.value })} />
                </label>
                <label className="docs-field">
                  <span>ТТН (номер, дата)</span>
                  <input value={doc.ttn ?? ""} onChange={(e) => patch({ ttn: e.target.value })} />
                </label>
              </div>
              <div className="docs-row">
                {(
                  [
                    ["blank", "Доверенность — пустые поля"],
                    ["poa", "Есть доверенность"],
                    ["id", "Физлицо — удостоверение"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    className={`docs-chip${attorney.mode === m ? " active" : ""}`}
                    onClick={() =>
                      patch({
                        attorney:
                          m === "blank"
                            ? { mode: "blank" }
                            : m === "poa"
                              ? { mode: "poa", number: "", date: doc.date, name: doc.buyer.headName, position: doc.buyer.headPosition }
                              : { mode: "id", idNumber: doc.buyer.idNumber, iin: doc.buyer.bin, name: doc.buyer.name },
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {attorney.mode === "poa" && (
                <div className="docs-grid">
                  {(["number", "date", "name", "position"] as const).map((k) => (
                    <label key={k} className="docs-field">
                      <span>{{ number: "№ доверенности", date: "Дата", name: "ФИО получателя", position: "Должность" }[k]}</span>
                      <input type={k === "date" ? "date" : "text"} value={attorney[k]} onChange={(e) => patch({ attorney: { ...attorney, [k]: e.target.value } })} />
                    </label>
                  ))}
                </div>
              )}
              {attorney.mode === "id" && (
                <div className="docs-grid">
                  {(["idNumber", "iin", "name"] as const).map((k) => (
                    <label key={k} className="docs-field">
                      <span>{{ idNumber: "№ удостоверения", iin: "ИИН", name: "ФИО" }[k]}</span>
                      <input value={attorney[k]} onChange={(e) => patch({ attorney: { ...attorney, [k]: e.target.value } })} />
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
          {doc.type === "warranty" && (
            <div className="docs-grid">
              <label className="docs-field wide">
                <span>Форма оплаты / основание</span>
                <input value={doc.paymentBasis ?? ""} onChange={(e) => patch({ paymentBasis: e.target.value })} placeholder="Счет на оплату № 66 от 03.11.2026" />
              </label>
              <label className="docs-field">
                <span>Дата продажи</span>
                <input type="date" value={doc.saleDate ?? doc.date} onChange={(e) => patch({ saleDate: e.target.value })} />
              </label>
              <label className="docs-field">
                <span>Гарантия, мес.</span>
                <input inputMode="numeric" value={doc.warrantyMonths ?? ""} placeholder="из карточки товара" onChange={(e) => patch({ warrantyMonths: Number(e.target.value) || undefined })} />
              </label>
            </div>
          )}
          {doc.type === "offer" && (
            <div className="docs-grid">
              <label className="docs-field">
                <span>Срок действия, дней</span>
                <input inputMode="numeric" value={doc.validDays ?? 10} onChange={(e) => patch({ validDays: Number(e.target.value) || undefined })} />
              </label>
              <label className="docs-field">
                <span>Срок поставки</span>
                <input value={doc.deliveryDays ?? ""} onChange={(e) => patch({ deliveryDays: e.target.value })} placeholder="3–5 рабочих дней" />
              </label>
              <label className="docs-field wide">
                <span>Оплата</span>
                <input value={doc.paymentTerms ?? ""} onChange={(e) => patch({ paymentTerms: e.target.value })} placeholder={settings.texts.offerPayment} />
              </label>
              <label className="docs-field wide">
                <span>Доставка</span>
                <textarea rows={2} value={doc.deliveryTerms ?? ""} onChange={(e) => patch({ deliveryTerms: e.target.value })} placeholder={settings.texts.offerDelivery} />
              </label>
              <label className="docs-field">
                <span>Гарантия, мес.</span>
                <input inputMode="numeric" value={doc.warrantyMonths ?? ""} placeholder="из карточки товара" onChange={(e) => patch({ warrantyMonths: Number(e.target.value) || undefined })} />
              </label>
            </div>
          )}
          <div className="docs-row">
            <label className="docs-check">
              <input type="checkbox" checked={doc.withSign} onChange={(e) => patch({ withSign: e.target.checked })} /> С подписью
            </label>
            <label className="docs-check">
              <input type="checkbox" checked={doc.withStamp} onChange={(e) => patch({ withStamp: e.target.checked })} /> С печатью
            </label>
            <span className="docs-muted">Печать и подпись — только {seller.name}</span>
          </div>
        </section>

        {/* 5. Действия */}
        <section className="docs-card docs-actions">
          <div className="docs-row">
            <button type="button" className="docs-btn" disabled={pending} onClick={() => save()}>
              {pending ? "Сохраняю…" : "Сохранить"}
            </button>
            <button
              type="button"
              className="docs-btn secondary"
              disabled={pending}
              onClick={() => (saved && !dirty ? (window.location.href = `/api/admin/docs/${doc.id}/pdf`) : save((d) => (window.location.href = `/api/admin/docs/${d.id}/pdf`)))}
            >
              Скачать PDF
            </button>
            {doc.type === "invoice" && (
              <button
                type="button"
                className="docs-btn secondary"
                disabled={pending}
                onClick={() => (saved && !dirty ? (window.location.href = `/api/admin/docs/${doc.id}/zip`) : save((d) => (window.location.href = `/api/admin/docs/${d.id}/zip`)))}
              >
                Скачать пакет (счёт + накладная + талон)
              </button>
            )}
            {msg && <span className="docs-msg">{msg}</span>}
            {dirty && saved && <span className="docs-muted">есть несохранённые изменения</span>}
          </div>
          {saved && (
            <>
              <div className="docs-row">
                <span className="docs-muted">Из этого документа:</span>
                {doc.type !== "waybill" && <button type="button" className="docs-chip" onClick={() => derive("waybill")}>Накладная</button>}
                {doc.type !== "warranty" && <button type="button" className="docs-chip" onClick={() => derive("warranty")}>Гарантийный талон</button>}
                {doc.type !== "invoice" && <button type="button" className="docs-chip" onClick={() => derive("invoice")}>Счёт</button>}
                {doc.type !== "offer" && <button type="button" className="docs-chip" onClick={() => derive("offer")}>КП</button>}
                <button type="button" className="docs-chip" onClick={() => derive("reissue")} title="Копия сегодняшним числом с новым номером">Перевыпустить</button>
                <button type="button" className="docs-chip" onClick={() => derive("duplicate")} title="Те же позиции для другого покупателя">Дублировать</button>
              </div>
              {(doc.type === "invoice" || doc.type === "waybill") && (
                <div className="docs-row">
                  <span className="docs-muted">ЭСФ:</span>
                  <button type="button" className="docs-chip" onClick={checkEsf}>Проверить</button>
                  <a className="docs-chip" href={`/api/admin/docs/${doc.id}/esf?format=xml`}>XML для импорта</a>
                  <a className="docs-chip" href={`/api/admin/docs/${doc.id}/esf?format=csv`}>Таблица CSV</a>
                </div>
              )}
              {esf && (
                <ul className="docs-issues">
                  {esf.length === 0 && <li className="ok">Ошибок не найдено — XML можно импортировать в ИС ЭСФ</li>}
                  {esf.map((x, i) => (
                    <li key={i} className={x.level}>{x.text}</li>
                  ))}
                </ul>
              )}
              {related.length > 0 && (
                <div className="docs-row">
                  <span className="docs-muted">Связанные:</span>
                  {related.map((r) => (
                    <Link key={r.id} className="docs-chip" href={`/admin/docs/${r.id}`}>
                      {DOC_TYPE_LABEL[r.type]} № {r.number}
                    </Link>
                  ))}
                </div>
              )}
              <div className="docs-row">
                <button
                  type="button"
                  className="docs-link danger"
                  onClick={() => {
                    if (!confirm(`Удалить ${DOC_TYPE_LABEL[doc.type].toLowerCase()} № ${doc.number}?`)) return;
                    start(async () => {
                      await deleteDocAction(doc.id);
                      router.push("/admin/docs");
                    });
                  }}
                >
                  Удалить документ
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <aside className="docs-preview">
        <div className="docs-row">
          <button type="button" className="docs-chip" onClick={() => refresh(doc)}>Обновить предпросмотр</button>
          <label className="docs-check">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> автоматически
          </label>
        </div>
        {pdfErr && <p className="docs-warn">{pdfErr}</p>}
        {pdfUrl ? <iframe src={`${pdfUrl}#view=FitH&toolbar=0`} title="Предпросмотр PDF" /> : <div className="docs-preview-empty">Предпросмотр появится здесь</div>}
      </aside>
    </div>
  );
}
