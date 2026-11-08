/**
 * Начальные справочники. Попадают в Redis при первом обращении, дальше всё
 * правится в /admin/docs — этот файл только стартовая точка.
 */

import type { CatalogItem, DocType, Placement, Seller, Settings } from "./types.ts";

const FREEDOM = { bank: "АО «Фридом Банк Казахстан»", bik: "KSNVKZKA", kbe: "19", knp: "710" };

export const SEED_SELLERS: Seller[] = [
  {
    id: "omirzaq",
    name: "ИП ӨМІРЗАҚ",
    iin: "981014301009",
    address: "РК, г. Алматы, Медеуский район",
    ...FREEDOM,
    iik: "KZ03551A600004105934",
    signer: "Өмірзақ Б.М.",
    signerPosition: "ИП",
    phone: "",
    email: "",
    regime: { kind: "simplified", rate: 300 },
    vatCertSeries: "",
    vatCertNum: "",
    stampKey: "omirzaq",
    signKey: "omirzaq",
  },
  {
    id: "kuandyk",
    name: "ИП КУАНДЫК",
    iin: "050820500624",
    address: "РК, г. Алматы, Медеуский район",
    ...FREEDOM,
    iik: "KZ93551X600008127112",
    signer: "Куандык С.Т.",
    signerPosition: "ИП",
    phone: "",
    email: "",
    regime: { kind: "our", ipn: 1000, vatPayer: true },
    vatCertSeries: "",
    vatCertNum: "",
    stampKey: "kuandyk",
    signKey: "kuandyk",
  },
  {
    id: "beksultan",
    name: "ИП БЕКСУЛТАН",
    iin: "010614501060",
    address: "РК, Туркестанская обл., Келесский р-н, Ушкынский с.о., с. Ушкын",
    ...FREEDOM,
    iik: "KZ74551A600022810912",
    signer: "Өмірзақ Б.М.",
    signerPosition: "ИП",
    phone: "",
    email: "",
    regime: { kind: "our", ipn: 1000, vatPayer: false },
    vatCertSeries: "",
    vatCertNum: "",
    stampKey: "beksultan",
    signKey: "beksultan",
  },
];

const PANEL_SPECS = (d: number) => [
  `Диагональ ${d} дюймов, 4K Ultra HD 3840×2160`,
  "Две системы: Android 14 + Windows 10 Pro (OPS Intel Core i7)",
  "Windows: 8 ГБ RAM / 256 ГБ SSD; Android: 4 ГБ / 32 ГБ",
  "Сенсор на 20 касаний",
  "Яркость 450 кд/м², контрастность 5000:1, отклик 4 мс, 60 Гц, углы обзора 178°",
  "Разъёмы: HDMI, DisplayPort, USB Type-C, USB 2.0/3.0, Ethernet",
  "Wi-Fi, Bluetooth, 2 встроенных динамика",
];
const PANEL_KIT =
  "Панель, настенное крепление, мобильная стойка на колёсах, стилус, телескопическая указка, кабель питания";

const item = (p: Partial<CatalogItem> & Pick<CatalogItem, "id" | "name" | "model">): CatalogItem => ({
  diagonal: "",
  unit: "шт.",
  warrantyMonths: 12,
  specs: [],
  kit: "",
  price: 0,
  tnved: "",
  unitCode: "796",
  origin: "",
  declNo: "",
  declDate: "",
  declPos: "",
  ...p,
});

export const SEED_PRODUCTS: CatalogItem[] = [
  item({ id: "lt-65", name: "Интерактивная панель 65 дюймов AVRON LT-65", model: "AVRON LT-65", diagonal: "65", specs: PANEL_SPECS(65), kit: PANEL_KIT, warrantyMonths: 12 }),
  item({ id: "lt-75", name: "Интерактивная панель 75 дюймов AVRON LT-75", model: "AVRON LT-75", diagonal: "75", specs: PANEL_SPECS(75), kit: PANEL_KIT, warrantyMonths: 12 }),
  item({ id: "avr-01", name: "Интерактивная панель 32 дюйма AVRON AVR-01", model: "AVRON AVR-01", diagonal: "32" }),
  item({ id: "bt-6205b", name: "Мини-принтер AVRON BT-6205B (маркиратор чёрный)", model: "AVRON BT-6205B" }),
  item({ id: "bt-620b", name: "Мини-принтер AVRON BT-620B", model: "AVRON BT-620B" }),
  item({ id: "dater-cartridge", name: "Картридж для датера маркиратора", model: "", warrantyMonths: 0 }),
  item({ id: "zklaw369", name: "Портативный монитор ZKLAW369, 16 дюймов", model: "ZKLAW369", diagonal: "16" }),
  item({ id: "jmgo", name: "Видеопроектор JMGO Smart Projector", model: "JMGO Smart Projector" }),
];

const PLACEMENT: Placement = { signW: 32, signDx: 0, signDy: 0, stampD: 38, stampDx: 0, stampDy: 0 };

export const SEED_SETTINGS: Settings = {
  // Новый Налоговый кодекс: 16% с 01.01.2026, до этого 12%.
  vatHistory: [
    { from: "2009-01-01", rate: 1200 },
    { from: "2026-01-01", rate: 1600 },
  ],
  presets: [
    { key: "s3", label: "Упрощёнка 3%", regime: { kind: "simplified", rate: 300 } },
    { key: "s4", label: "Упрощёнка 4%", regime: { kind: "simplified", rate: 400 } },
    { key: "s10", label: "Упрощёнка 10%", regime: { kind: "simplified", rate: 1000 } },
    { key: "our-vat", label: "ОУР: НДС + ИПН 10%", regime: { kind: "our", ipn: 1000, vatPayer: true } },
    { key: "our", label: "ОУР без НДС, ИПН 10%", regime: { kind: "our", ipn: 1000, vatPayer: false } },
    { key: "k26", label: "Ручной k = 26%", regime: { kind: "manual", k: 2600 } },
  ],
  texts: {
    invoiceWarning:
      "Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате обязательно, в противном случае не гарантируется наличие товара на складе. Товар отпускается по факту прихода денег на р/с Поставщика, самовывозом, при наличии доверенности и документов, удостоверяющих личность.",
    warrantyCovers:
      "Гарантия распространяется на производственные дефекты и неисправности, возникшие по вине изготовителя, при соблюдении покупателем правил эксплуатации, хранения и транспортировки.",
    warrantyExcludes: [
      "механические повреждения корпуса, экрана, сенсорной поверхности и разъёмов (сколы, трещины, следы ударов);",
      "попадание внутрь жидкости, насекомых, посторонних предметов, пыли;",
      "повреждения из-за скачков напряжения, неисправной электросети или неправильного подключения;",
      "ремонт, вскрытие или изменение конструкции не уполномоченными лицами;",
      "нарушение правил эксплуатации, хранения или транспортировки;",
      "стихийные бедствия, пожар, бытовые причины;",
      "программное обеспечение, установленное покупателем, вирусы, утрата данных;",
      "расходные материалы и аксессуары (стилусы, пульты, кабели, элементы питания), естественный износ.",
    ].join("\n"),
    warrantyProcedure:
      "Для гарантийного обслуживания покупатель обращается к поставщику с настоящим талоном и документом о покупке. Поставщик проводит диагностику и производит ремонт либо замену товара. Доставка товара до сервисного центра и обратно осуществляется силами и за счёт покупателя. Срок рассмотрения обращения — до 10 рабочих дней.",
    offerDelivery:
      "По г. Алматы — бесплатно. Доставка в другие города в цену не входит и рассчитывается отдельно: ж/д до станции с самовывозом или Jet Logistics до адреса.",
    offerPayment: "100% предоплата по счёту",
    offerFooter: "Будем рады сотрудничеству!",
  },
  placement: {
    invoice: { ...PLACEMENT },
    waybill: { ...PLACEMENT },
    warranty: { ...PLACEMENT },
    offer: { ...PLACEMENT },
  } satisfies Record<DocType, Placement>,
};
