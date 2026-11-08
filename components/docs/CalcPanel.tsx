"use client";

/**
 * Калькулятор «на руки ↔ сумма счёта» внутри формы документа.
 * Режим по умолчанию — режим ИП; можно взять пресет (упрощёнка 4%, ручной k…).
 */

import { useMemo, useState } from "react";
import { breakdown, fromNet, hasVat, modeLabel, split, type Breakdown, type CalcMode } from "@/lib/docs/calc";
import { fmt, toBp, toTiyn, type Money } from "@/lib/docs/money";
import { lineSum, regimeToMode } from "@/lib/docs/totals";
import type { Line, Seller, Settings } from "@/lib/docs/types";

type Props = {
  seller: Seller;
  settings: Settings;
  vatRate: number | null;
  items: Line[];
  onApply: (items: Line[], calc: { modeKey: string; net: Money; expenses: Money; step: number }) => void;
};

function safe(s: string): Money | null {
  try {
    return s.trim() ? toTiyn(s) : null;
  } catch {
    return null;
  }
}

export function CalcPanel({ seller, settings, vatRate, items, onApply }: Props) {
  const [modeKey, setModeKey] = useState("seller");
  const [k, setK] = useState("26");
  const [netText, setNetText] = useState("");
  const [expText, setExpText] = useState("");
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<"all" | number>("all");
  const [delivText, setDelivText] = useState("");
  const [delivMode, setDelivMode] = useState<"included" | "separate">("included");

  const vat = vatRate ?? 1600;
  const mode: CalcMode = useMemo(() => {
    if (modeKey === "seller") return regimeToMode(seller.regime, vat);
    if (modeKey === "manual") return { kind: "manual", k: toBp(k || "0") };
    const p = settings.presets.find((x) => x.key === modeKey);
    return p ? regimeToMode(p.regime, vat) : regimeToMode(seller.regime, vat);
  }, [modeKey, k, seller.regime, settings.presets, vat]);

  const net = safe(netText);
  const exp = safe(expText) ?? 0;
  const deliv = safe(delivText) ?? 0;
  const goods = items.filter((l) => !l.delivery);
  const res: Breakdown | null = net != null ? fromNet(mode, net + (delivMode === "included" ? deliv : 0), { expenses: exp, step }) : null;
  const delivRes = deliv && delivMode === "separate" ? fromNet(mode, deliv, { step: 0 }) : null;
  const current = breakdown(mode, items.reduce((a, l) => a + lineSum(l), 0), exp);
  const modeMismatch = hasVat(mode) !== (vatRate != null);

  function apply() {
    if (!res) return;
    // Нетто распределяем только по товарам; старые строки доставки заменяем, если доставку ввели.
    let priced = goods;
    if (target === "all") {
      const w = goods.map((l) => (lineSum(l) > 0 ? lineSum(l) : Math.max(1, l.qty) * 100));
      const parts = split(res.gross, w);
      priced = goods.map((l, i) => ({ ...l, price: Math.round(parts[i] / (l.qty > 0 ? l.qty : 1)) }));
    } else {
      priced = goods.map((l, i) => (i === target ? { ...l, price: Math.round(res.gross / (l.qty > 0 ? l.qty : 1)) } : l));
    }
    const next = [...priced, ...(deliv ? [] : items.filter((l) => l.delivery))];
    if (delivRes) next.push({ name: "Доставка", unit: "усл.", qty: 1, price: delivRes.gross, delivery: true, origin: "6", unitCode: "5114" });
    onApply(next, { modeKey, net: net ?? 0, expenses: exp, step });
  }

  const row = (label: string, b: Breakdown) => (
    <table className="docs-calc-table">
      <caption>{label}</caption>
      <tbody>
        <tr><th>Сумма счёта</th><td>{fmt(b.gross)}</td></tr>
        <tr><th>НДС</th><td>{b.vat ? fmt(b.vat) : "без НДС"}</td></tr>
        <tr><th>База (без НДС)</th><td>{fmt(b.base)}</td></tr>
        <tr><th>Налог ({mode.kind === "our" ? "ИПН" : mode.kind === "manual" ? "k" : "упрощёнка"})</th><td>{fmt(b.tax)}</td></tr>
        <tr className="strong"><th>На руки</th><td>{fmt(b.net)}</td></tr>
      </tbody>
    </table>
  );

  return (
    <section className="docs-card">
      <h2>Калькулятор</h2>
      <div className="docs-grid">
        <label className="docs-field">
          <span>Режим расчёта</span>
          <select value={modeKey} onChange={(e) => setModeKey(e.target.value)}>
            <option value="seller">Как у {seller.name}: {modeLabel(regimeToMode(seller.regime, vat))}</option>
            {settings.presets.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
            <option value="manual">Ручной коэффициент k</option>
          </select>
        </label>
        {modeKey === "manual" && (
          <label className="docs-field">
            <span>k, %</span>
            <input value={k} onChange={(e) => setK(e.target.value)} inputMode="decimal" />
          </label>
        )}
        <label className="docs-field">
          <span>Хочу на руки, ₸</span>
          <input value={netText} onChange={(e) => setNetText(e.target.value)} inputMode="decimal" placeholder="550 000" />
        </label>
        {mode.kind === "our" && (
          <label className="docs-field">
            <span>Расходы (закуп), ₸</span>
            <input value={expText} onChange={(e) => setExpText(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
        )}
        <label className="docs-field">
          <span>Куда</span>
          <select value={String(target)} onChange={(e) => setTarget(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">На весь счёт (распределить по позициям)</option>
            {goods.map((l, i) => (
              <option key={i} value={i}>Позиция {i + 1}: {l.name.slice(0, 40)}</option>
            ))}
          </select>
        </label>
        <label className="docs-field">
          <span>Доставка, ₸ (на руки)</span>
          <input value={delivText} onChange={(e) => setDelivText(e.target.value)} inputMode="decimal" placeholder="0" />
        </label>
        <label className="docs-field">
          <span>Доставка в документе</span>
          <select value={delivMode} onChange={(e) => setDelivMode(e.target.value as "included" | "separate")}>
            <option value="included">Включена в цену (не печатается)</option>
            <option value="separate">Отдельной строкой</option>
          </select>
        </label>
      </div>
      <div className="docs-row">
        <span className="docs-muted">Округлить сумму вверх до:</span>
        {[0, 10, 100, 1000].map((s) => (
          <button key={s} type="button" className={`docs-chip${step === s ? " active" : ""}`} onClick={() => setStep(s)}>
            {s ? `${s} ₸` : "не округлять"}
          </button>
        ))}
      </div>
      {modeMismatch && <p className="docs-warn">Режим {hasVat(mode) ? "с НДС" : "без НДС"}, а документ {vatRate != null ? "с НДС" : "без НДС"} — расшифровка не совпадёт с документом.</p>}
      <div className="docs-calc">
        {res && row(`Расчёт от ${fmt(net! + (delivMode === "included" ? deliv : 0))} на руки`, res)}
        {row("Сейчас в документе", current)}
      </div>
      {delivRes && <p className="docs-muted">Строка доставки: {fmt(delivRes.gross)} (на руки {fmt(delivRes.net)})</p>}
      <button type="button" className="docs-btn" disabled={!res} onClick={apply}>
        Подставить цены в документ
      </button>
    </section>
  );
}
