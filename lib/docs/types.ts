/**
 * Модели модуля документов. Деньги — целые тиыны (см. money.ts).
 * Всё хранится JSON-ом в Redis (store.ts); PDF перегенерируется по требованию.
 */

import type { Bp, Money } from "./money.ts";

export type DocType = "invoice" | "waybill" | "warranty" | "offer";
export const DOC_TYPES: DocType[] = ["invoice", "waybill", "warranty", "offer"];
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  invoice: "Счёт на оплату",
  waybill: "Накладная З-2",
  warranty: "Гарантийный талон",
  offer: "Коммерческое предложение",
};

export type DocStatus = "draft" | "issued" | "paid" | "shipped";
export const DOC_STATUSES: DocStatus[] = ["draft", "issued", "paid", "shipped"];
export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Черновик",
  issued: "Выставлен",
  paid: "Оплачен",
  shipped: "Отгружен",
};

/** Режим налогообложения ИП. Ставку НДС берём из истории по дате документа. */
export type TaxRegime =
  | { kind: "simplified"; rate: Bp }
  | { kind: "our"; ipn: Bp; vatPayer: boolean };

export type Seller = {
  id: string;
  /** Как печатается: «ИП ӨМІРЗАҚ». */
  name: string;
  iin: string;
  address: string;
  bank: string;
  bik: string;
  iik: string;
  kbe: string;
  knp: string;
  /** Подписант: «Өмірзақ Б.М.». */
  signer: string;
  /** Должность подписанта в накладной: «ИП». */
  signerPosition: string;
  phone: string;
  email: string;
  regime: TaxRegime;
  /** Свидетельство о постановке на учёт по НДС — для ЭСФ, если плательщик. */
  vatCertSeries: string;
  vatCertNum: string;
  /** Чьи печать и подпись брать: ӨМІРЗАҚ и БЕКСУЛТАН подписывает один человек. */
  stampKey: string;
  signKey: string;
};

export type BuyerType = "too" | "ao" | "ip" | "person" | "gov" | "foreign_rep" | "public_org";
export const BUYER_TYPE_LABEL: Record<BuyerType, string> = {
  too: "ТОО",
  ao: "АО",
  ip: "ИП",
  person: "Физлицо",
  gov: "Госучреждение (КГУ, НАО, ГУ)",
  foreign_rep: "Представительство / филиал иностранной компании",
  public_org: "Общественное объединение",
};

export type Buyer = {
  id: string;
  type: BuyerType;
  /** Полное название, как в документах: «ТОО «KST BETON 2022»». Для физлица — ФИО. */
  name: string;
  /** БИН или ИИН. */
  bin: string;
  address: string;
  bank: string;
  bik: string;
  iik: string;
  kbe: string;
  phone: string;
  email: string;
  headName: string;
  headPosition: string;
  /** Основание полномочий: устав, доверенность № … */
  headBasis: string;
  /** Физлицо: удостоверение личности. */
  idNumber: string;
  idIssuer: string;
  idDate: string;
  /** Покупатель-резидент? Нерезиденту в ЭСФ свой статус. */
  nonResident?: boolean;
  updatedAt?: number;
};

/** Признак происхождения товара в ЭСФ (поле «Признак происхождения»). */
export type Origin = "1" | "2" | "3" | "4" | "5" | "6";

export type CatalogItem = {
  id: string;
  /** Наименование для печати. */
  name: string;
  model: string;
  diagonal: string;
  unit: string;
  warrantyMonths: number;
  /** Характеристики — строки для КП и гарантийного талона. */
  specs: string[];
  /** Комплект поставки. */
  kit: string;
  /** Ориентировочная цена в тиынах (для подсказки и распределения нетто). */
  price: Money;
  // ── для ЭСФ ──
  tnved: string;
  /** Код единицы измерения (КЕИ / ОКЕИ): 796 — штука. */
  unitCode: string;
  origin: Origin | "";
  declNo: string;
  declDate: string;
  /** Номер товарной позиции в декларации. */
  declPos: string;
};

export type Line = {
  productId?: string;
  name: string;
  unit: string;
  qty: number;
  /** Цена за единицу в тиынах, как в документе (с НДС, если ИП плательщик). */
  price: Money;
  /** Номенклатурный номер (накладная, графа 3). */
  nomenclature?: string;
  /** Серийные номера через запятую (гарантийный талон). */
  serial?: string;
  /** Строка доставки — у неё нет товарной карточки. */
  delivery?: boolean;
  /** Снимок карточки товара на момент создания — PDF не меняется задним числом. */
  model?: string;
  specs?: string[];
  kit?: string;
  warrantyMonths?: number;
  tnved?: string;
  unitCode?: string;
  origin?: Origin | "";
  declNo?: string;
  declPos?: string;
};

export type CalcSnapshot = {
  /** Как считали: режим из ИП, упрощёнка 4% или ручной k. */
  modeKey: string;
  /** Нетто «на руки», которое вводил пользователь. */
  net?: Money;
  expenses?: Money;
  step?: number;
};

export type Attorney =
  | { mode: "blank" }
  | { mode: "poa"; number: string; date: string; name: string; position: string }
  | { mode: "id"; idNumber: string; iin: string; name: string };

export type Doc = {
  id: string;
  type: DocType;
  sellerId: string;
  number: string;
  /** ДД.ММ.ГГГГ хранить неудобно — храним ISO «2026-11-08». */
  date: string;
  status: DocStatus;
  buyer: Buyer;
  items: Line[];
  /** Ставка НДС на дату документа; null — без НДС. Фиксируется при сохранении. */
  vatRate: Bp | null;
  withStamp: boolean;
  withSign: boolean;
  /** Из какого документа сделан (накладная из счёта и т. п.). */
  parentId?: string;
  calc?: CalcSnapshot;
  // ── счёт ──
  contract?: string;
  /** Условия оплаты, например 50% предоплата. */
  prepayPercent?: number;
  // ── накладная ──
  attorney?: Attorney;
  responsible?: string;
  transport?: string;
  ttn?: string;
  // ── гарантийный талон ──
  paymentBasis?: string;
  warrantyMonths?: number;
  saleDate?: string;
  // ── КП ──
  validDays?: number;
  deliveryDays?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  createdAt: number;
  updatedAt: number;
};

/** Где лежат печать и подпись относительно своей точки привязки, мм. */
export type Placement = {
  signW: number;
  signDx: number;
  signDy: number;
  stampD: number;
  stampDx: number;
  stampDy: number;
};

export type Settings = {
  /** История ставки НДС: действует с даты from (ISO). */
  vatHistory: { from: string; rate: Bp }[];
  /** Ставки для быстрого выбора режима в калькуляторе. */
  presets: { key: string; label: string; regime: TaxRegime | { kind: "manual"; k: Bp } }[];
  texts: {
    invoiceWarning: string;
    warrantyCovers: string;
    warrantyExcludes: string;
    warrantyProcedure: string;
    offerDelivery: string;
    offerPayment: string;
    offerFooter: string;
  };
  placement: Record<DocType, Placement>;
};
