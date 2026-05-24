export type IconName =
  | "desk"
  | "monitor"
  | "ereader"
  | "massager"
  | "carplay"
  | "minipc"
  | "printer"
  | "smartdisplay"
  | "printer3d";

export type BadgeKind = "hit" | "new" | "sale";

export type Product = {
  id: string;
  cat: string;
  catKey: string;
  name: string;
  shortName: string;
  desc: string;
  details?: ReadonlyArray<string>;
  advantages?: ReadonlyArray<string>;
  price: number;
  oldPrice: number | null;
  discount: string | null;
  badge: BadgeKind | null;
  icon: IconName;
  rating: number;
  reviews: number;
  installment: string;
  specs: ReadonlyArray<readonly [string, string]>;
  images?: ReadonlyArray<string>;
  kaspiUrl?: string;
};

export const CATEGORIES = [
  { key: "all", label: "Все товары" },
  { key: "desks", label: "Столы" },
  { key: "monitors", label: "Мониторы" },
  { key: "ereaders", label: "Электронные книги" },
  { key: "massagers", label: "Массажёры" },
  { key: "auto", label: "Автоэлектроника" },
  { key: "displays", label: "Смарт-дисплеи" },
  { key: "printers3d", label: "3D-принтеры" },
] as const;

export const PRODUCTS: ReadonlyArray<Product> = [
  {
    id: "desk-white",
    cat: "Столы",
    catKey: "desks",
    name: "Стол компьютерный AVRON AVR-001, 120×60×113 см, белый",
    shortName: "AVR-001-WHT",
    desc: "Эргономичный стол с электроприводом — работайте сидя и стоя с комфортом. Плавный и тихий подъём, прочная металлическая рама, выдерживает до 70 кг. Подходит для работы, учёбы, стримов и домашнего офиса. В комплекте всё для сборки и видеоинструкция.",
    price: 54990,
    oldPrice: 69990,
    discount: "-21%",
    badge: "hit",
    icon: "desk",
    rating: 5.0,
    reviews: 8,
    installment: "4 583 ₸ × 12 мес",
    specs: [
      ["Размеры", "120 × 60 × 113 см"],
      ["Цвет столешницы", "Белый"],
      ["Регулировка высоты", "Электрическая, плавная и тихая"],
      ["Управление", "Одна кнопка"],
      ["Макс. нагрузка", "70 кг"],
      ["Материал рамы", "Металл"],
      ["Комплектация", "Всё для сборки + видеоинструкция"],
      ["Доставка", "В день покупки, 5 000 ₸"],
      ["Рассрочка", "Kaspi Red+"],
      ["Гарантия", "12 месяцев"],
    ],
    images: [
      "/products/desk-white/4.jpg",
      "/products/desk-white/1.jpg",
      "/products/desk-white/2.jpg",
      "/products/desk-white/3.jpg",
      "/products/desk-white/5.jpeg",
      "/products/desk-white/5.jpeg",
      "/products/desk-white/6.jpeg",
      "/products/desk-white/9.jpeg",
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/stol-komp-juternyi-avron-avr-001-120h60x113-sm-belyi-152838624/",
  },
  {
    id: "desk-wood",
    cat: "Столы",
    catKey: "desks",
    name: "Стол компьютерный AVRON AVR-001, 120×60×113 см, коричневый",
    shortName: "AVR-001-NUT",
    desc: "Эргономичный электрический стол с регулировкой высоты — идеальный выбор для работы, учёбы и комфортного рабочего пространства. Подходит для дома и офиса, а также для работы сидя и стоя. Доступные цвета: белый, чёрный, коричневый.",
    details: [
      "Доступен в размерах 120 × 60 × 113 см за 54 990 ₸ и 140 × 60 × 113 см за 64 990 ₸.",
      "Оснащён плавной электрической регулировкой высоты, прочной металлической рамой и удобной панелью управления.",
      "Товар в наличии. Доступна оплата через Kaspi Red и рассрочку Kaspi.",
    ],
    advantages: [
      "Помогает улучшить осанку",
      "Снижает нагрузку на спину и шею",
      "Удобен для работы за компьютером, учёбы и хобби",
      "Современный минималистичный дизайн",
      "Подходит для дома, офиса и учебы",
    ],
    price: 54990,
    oldPrice: 69990,
    discount: "-21%",
    badge: "hit",
    icon: "desk",
    rating: 4.9,
    reviews: 8,
    installment: "4 583 ₸ × 12 мес",
    specs: [
      ["Размеры", "120 × 60 × 113 см"],
      ["Цвет", "Коричневый"],
      ["Регулировка высоты", "Электрическая, для работы сидя и стоя"],
      ["Макс. нагрузка", "70 кг"],
      ["Конструкция", "Прочная металлическая рама"],
      ["Управление", "Удобная панель управления"],
      ["Подходит для", "Дома, офиса и учёбы"],
      ["Доступные цвета", "Белый, чёрный, коричневый"],
      ["Рассрочка", "Kaspi Red + рассрочка Kaspi"],
      ["Наличие", "В наличии"],
    ],
    images: [
      "/products/desk-wood/4.jpg",
      "/products/desk-wood/1.jpeg",
      "/products/desk-wood/2.jpeg",
      "/products/desk-wood/3.jpeg",
      "/products/desk-wood/5.jpeg",
      "/products/desk-wood/6.jpeg",
      "/products/desk-wood/6.png",
      "/products/desk-wood/7.jpeg",
      "/products/desk-wood/8.jpeg",
      "/products/desk-wood/9.jpeg",
      "/products/desk-wood/10.jpeg",
      "/products/desk-wood/11.jpeg",
      "/products/desk-wood/12.jpeg",
      "/products/desk-wood/13.jpeg",
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/stol-komp-juternyi-avron-avr-001-120h60x113-sm-korichnevyi-152837984/",
  },
  {
    id: "desk-black",
    cat: "Столы",
    catKey: "desks",
    name: "Стол компьютерный AVRON AVR-001, 140×60×113 см, чёрный",
    shortName: "AVR-001-BLK",
    desc: "Эргономичный электрический регулируемый стол для работы и учёбы. Подходит для офиса и дома, позволяет комфортно работать сидя и стоя.",
    details: [
      "Размер столешницы: 140 × 60 × 113 см.",
      "Оснащён электроприводом для плавной регулировки высоты, прочной металлической рамой и удобной системой управления.",
      "Надёжная конструкция выдерживает нагрузку до 80 кг.",
    ],
    advantages: [
      "Улучшает осанку и снижает нагрузку на спину",
      "Подходит для работы за компьютером, учёбы и хобби",
      "Стильный современный дизайн",
      "Подходит для офиса и дома",
    ],
    price: 54990,
    oldPrice: 69990,
    discount: "-21%",
    badge: "hit",
    icon: "desk",
    rating: 4.9,
    reviews: 8,
    installment: "4 583 ₸ × 12 мес",
    specs: [
      ["Размеры", "140 × 60 × 113 см"],
      ["Цвет", "Чёрный"],
      ["Регулировка высоты", "Электрическая, для работы сидя и стоя"],
      ["Макс. нагрузка", "80 кг"],
      ["Конструкция", "Прочная металлическая рама"],
      ["Управление", "Удобная система управления"],
      ["Подходит для", "Офиса и дома"],
    ],
    images: [
      "/products/desk-black/8.jpg",
      "/products/desk-black/4.jpeg",
      "/products/desk-black/1.jpeg",
      "/products/desk-black/2.jpeg",
      "/products/desk-black/3.jpeg",
      "/products/desk-black/5.jpeg",
      "/products/desk-black/6.jpeg",
      "/products/desk-black/9.jpeg",
      "/products/desk-black/10.jpeg",
      "/products/desk-black/11.jpeg",
      "/products/desk-black/12.jpeg",
      "/products/desk-black/13.jpeg",
      "/products/desk-black/14.jpeg",
      "/products/desk-black/15.jpeg",
      "/products/desk-black/16.jpeg",
      "/products/desk-black/17.png",
      
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/stol-komp-juternyi-avron-avr-001-140h60x113-sm-chernyi-164141940/",
  },
  {
    id: "massager",
    cat: "Массажёры",
    catKey: "massagers",
    name: "AVRON Premium Foot Massager — 3D SPA массаж",
    shortName: "AVR-FM-01",
    desc: "Премиальный массажёр для глубокого 3D-массажа стоп и икр. Снимает усталость после рабочего дня.",
    price: 89990,
    oldPrice: null,
    discount: null,
    badge: null,
    icon: "massager",
    // bg: "#FFD9D9",
    rating: 4.8,
    reviews: 12,
    installment: "7 499 ₸ × 12 мес",
    specs: [
      ["Режимы", "5 программ"],
      ["Прогрев", "до 45°C"],
      ["Шиацу", "3D ролики"],
      ["Таймер", "15 / 30 мин"],
      ["Мощность", "60 Вт"],
    ],
  },
  {
    id: "ereader",
    cat: "Электронные книги",
    catKey: "ereaders",
    name: "Электронная книга AVRON 10.3″ E-ink, чёрный",
    shortName: "AVR-EB-103",
    desc: "E-Ink читалка с большим 10.3-дюймовым экраном. Идеальна для книг, статей и заметок.",
    price: 64990,
    oldPrice: null,
    discount: null,
    badge: null,
    icon: "ereader",
    // bg: "#FFF4C3",
    rating: 4.9,
    reviews: 6,
    installment: "5 416 ₸ × 12 мес",
    specs: [
      ["Экран", "10.3″ E-Ink"],
      ["Разрешение", "300 ppi"],
      ["Память", "32 ГБ"],
      ["Подсветка", "Регулируемая"],
      ["Батарея", "до 4 недель"],
    ],
    images: [
      "/products/ereader/1.png",
      "/products/ereader/2.png",
      "/products/ereader/3.png",
      "/products/ereader/4.png",
    ],
  },
  {
    id: "monitor",
    cat: "Мониторы",
    catKey: "monitors",
    name: "Портативный монитор AVRON 15.6″ FHD IPS",
    shortName: "AVR-M-156",
    desc: "Тонкий портативный монитор. Подключение по одному USB-C, поддержка ноутбука и игровых консолей.",
    price: 49990,
    oldPrice: null,
    discount: null,
    badge: "new",
    icon: "monitor",
    // bg: "#E5E9EE",
    rating: 4.7,
    reviews: 5,
    installment: "4 166 ₸ × 12 мес",
    specs: [
      ["Диагональ", "15.6 дюйма"],
      ["Матрица", "IPS Full HD"],
      ["Подключение", "USB-C, HDMI"],
      ["Вес", "780 г"],
      ["Толщина", "8 мм"],
    ],
    images: [
      "/products/monitor/1.png",
      "/products/monitor/2.png",
      "/products/monitor/3.png",
      "/products/monitor/4.png",
    ],
  },
  {
    id: "carplay",
    cat: "Автоэлектроника",
    catKey: "auto",
    name: "AVRON WizCar A1 — адаптер CarPlay для iPhone",
    shortName: "AVR-CAR-A1",
    desc: "Беспроводной адаптер CarPlay. Поддержка iPhone 6+, мгновенное подключение, без задержек.",
    price: 12990,
    oldPrice: null,
    discount: null,
    badge: "new",
    icon: "carplay",
    // bg: "#FBD4CD",
    rating: 4.8,
    reviews: 10,
    installment: "1 083 ₸ × 12 мес",
    specs: [
      ["Совместимость", "iPhone 6+"],
      ["Подключение", "Wi-Fi 5G + BT"],
      ["Задержка", "< 100 мс"],
      ["Размер", "60 × 50 × 12 мм"],
      ["Питание", "USB-A / USB-C"],
    ],
    images: [
      "/products/carplay/1.png",
      "/products/carplay/2.png",
      "/products/carplay/3.png",
    ],
  },
  {
    id: "smartdisplay",
    cat: "Смарт-дисплеи",
    catKey: "displays",
    name: "Смарт-дисплей AVRON 32″ Android, интерактивный",
    shortName: "AVR-SD-32",
    desc: "Сенсорный 32-дюймовый дисплей на Android 13. Идеален для презентаций, ресепшна или умного дома.",
    price: 79990,
    oldPrice: null,
    discount: null,
    badge: null,
    icon: "smartdisplay",
    // bg: "#D4F0CE",
    rating: 4.6,
    reviews: 4,
    installment: "6 666 ₸ × 12 мес",
    specs: [
      ["Диагональ", "32 дюйма"],
      ["Разрешение", "Full HD"],
      ["ОС", "Android 13"],
      ["Подключение", "Wi-Fi 6, BT 5.0"],
      ["Сенсор", "Multi-touch"],
    ],
    images: [
      "/products/smartdisplay/1.png",
      "/products/smartdisplay/2.png",
      "/products/smartdisplay/3.png",
      "/products/smartdisplay/4.png",
    ],
  },
  {
    id: "printer3d",
    cat: "3D-принтеры",
    catKey: "printers3d",
    name: "3D-принтер AVRON DAJA — лазерная гравировка",
    shortName: "AVR-3D-01",
    desc: "Компактный 3D-принтер и лазерный гравёр в одном устройстве. Работает с разными материалами.",
    price: 99990,
    oldPrice: null,
    discount: null,
    badge: "new",
    icon: "printer3d",
    // bg: "#D6EBFF",
    rating: 4.7,
    reviews: 3,
    installment: "8 332 ₸ × 12 мес",
    specs: [
      ["Тип", "3D + лазер"],
      ["Рабочая зона", "220 × 220 мм"],
      ["Высота печати", "250 мм"],
      ["Управление", "Wi-Fi, USB"],
      ["Питание", "220В"],
    ],
  },
  {
    id: "minipc",
    cat: "Смарт-дисплеи",
    catKey: "displays",
    name: "AVRON Mini PC — Intel N100, 16 ГБ RAM",
    shortName: "AVR-MPC-01",
    desc: "Компактный мини-ПК для офиса и медиа. Intel N100, 16 ГБ RAM, 512 ГБ SSD. Бесшумная работа.",
    price: 129990,
    oldPrice: null,
    discount: null,
    badge: null,
    icon: "minipc",
    // bg: "#FFE2BA",
    rating: 4.9,
    reviews: 7,
    installment: "10 832 ₸ × 12 мес",
    specs: [
      ["Процессор", "Intel N100"],
      ["RAM", "16 ГБ DDR4"],
      ["Накопитель", "512 ГБ SSD"],
      ["Wi-Fi", "Wi-Fi 6"],
      ["ОС", "Windows 11"],
    ],
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function productsByCategory(catKey: string): readonly Product[] {
  return catKey === "all"
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.catKey === catKey);
}

export function formatPrice(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₸";
}

export function countLabel(n: number): string {
  if (n === 1) return `${n} товар`;
  if (n < 5) return `${n} товара`;
  return `${n} товаров`;
}
