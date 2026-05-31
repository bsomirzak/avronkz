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
  price: number | null;
  priceNote?: string;
  oldPrice: number | null;
  discount: string | null;
  badge: BadgeKind | null;
  icon: IconName;
  rating: number;
  reviews: number;
  installment: string;
  installmentBadge?: string;
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
    id: "avron-lt-65",
    cat: "Смарт-дисплеи",
    catKey: "displays",
    name: "Интерактивная панель AVRON LT-65",
    shortName: "LT-65",
    desc: "Мощное решение для бизнеса, обучения и презентаций с большим 65-дюймовым 4K экраном, высокой производительностью и 20-точечным сенсорным управлением.",
    details: [
      "AVRON LT-65 объединяет 4K Ultra HD разрешение 3840×2160, яркость 450 кд/м², контрастность 5000:1, отклик 4 мс и частоту 60 Гц для чёткого и яркого изображения в офисах, школах и конференц-залах.",
      "Панель работает на Android 13 и оснащена модулем Intel Core i7 с Windows 10 Pro. Конфигурация включает 8 ГБ RAM и 256 ГБ SSD для Windows, а также 4 ГБ RAM и 32 ГБ ROM для Android.",
      "Поддерживается управление пальцем, стилусом и мультитач до 20 касаний одновременно. В комплекте уже есть настенное крепление, стойка на колёсах, стилус, телескопическая указка и всё необходимое для запуска.",
    ],
    advantages: [
      "Большой 65” экран для обучения, презентаций и демонстраций",
      "Мощный Intel Core i7 и Windows 10 Pro",
      "20-точечное сенсорное управление пальцем и стилусом",
      "Подходит для профессионального и учебного использования",
      "Современный минималистичный дизайн и готовность к работе сразу после установки",
    ],
    price: 400000,
    oldPrice: null,
    discount: null,
    badge: "hit",
    icon: "smartdisplay",
    rating: 5.0,
    reviews: 8,
    installment: "33 333 ₸ × 12 мес",
    installmentBadge: "0·0·12",
    specs: [
      ["Диагональ", "65”"],
      ["Разрешение", "4K Ultra HD (3840×2160)"],
      ["Система", "Android 13 + Windows 10 Pro"],
      ["Процессор", "Intel Core i7"],
      ["Память Windows", "8 ГБ RAM / 256 ГБ SSD"],
      ["Память Android", "4 ГБ RAM / 32 ГБ ROM"],
      ["Сенсор", "20-точечный экран"],
      ["Яркость", "450 кд/м²"],
      ["Контрастность", "5000:1"],
      ["Время отклика", "4 мс"],
      ["Частота обновления", "60 Гц"],
      ["Подключение", "HDMI, DisplayPort, USB Type-C, USB 2.0 / USB 3.0, Ethernet, Wi-Fi, Bluetooth"],
      ["Управление", "Палец, стилус, мультитач до 20 касаний"],
      ["Дополнительно", "Встроенные динамики, угол обзора 178°"],
      ["Комплектация", "Настенное крепление, стойка на колёсах, стилус, телескопическая указка"],
      ["Доставка", "Доступна"],
      ["Рассрочка", "0·0·12"],
    ],
    images: [
      "/products/smartdisplay-65/5.png",
      "/products/smartdisplay-65/6.png",
      "/products/smartdisplay-65/1.png",
      "/products/smartdisplay-65/2.png",
      "/products/smartdisplay-65/3.png",
      "/products/smartdisplay-65/7.png",
      "/products/smartdisplay-65/8.png",
      "/products/smartdisplay-65/9.png",
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/avron-lt-65-65-djuim-160858335/",
  },
  {
    id: "avron-panel-32",
    cat: "Смарт-дисплеи",
    catKey: "displays",
    name: "Интерактивная панель AVRON 32”",
    shortName: "AVR-01",
    desc: "Мобильная мультимедийная станция для работы, учёбы и развлечений. Современный экран, который легко перемещать по дому, офису или учебному классу. Объединяет мощность, мобильность и стиль в одном устройстве.",
    price: 229990,
    oldPrice: null,
    discount: null,
    badge: "hit",
    icon: "smartdisplay",
    rating: 5.0,
    reviews: 8,
    installment: "19 166 ₸ × 12 мес",
    installmentBadge: "0·0·12",
    specs: [
      ["Дисплей", "32-дюймовый FHD"],
      ["ОС", "Android 13"],
      ["Оперативная память", "8 ГБ"],
      ["Встроенная память", "128 ГБ"],
      ["Камера", "Встроенная веб-камера"],
      ["Автономность", "До 7 часов"],
      ["Аккумулятор", "15 000 мА·ч"],
      ["Подключение", "Wi-Fi, Bluetooth, HDMI, USB"],
      ["Трансляция", "Беспроводная трансляция экрана"],
      ["Конструкция", "Колёсики, регулируемый наклон и вращение экрана"],
      ["Доставка", "Доступна"],
      ["Рассрочка", "0·0·12"],
      ["Гарантия", "1 год"],
    ],
    images: [
      "/products/mobile-screen/2.png",
      "/products/mobile-screen/1.png",
      "/products/mobile-screen/3.png",
      "/products/mobile-screen/4.png",
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/avron-avr-01-32-djuim-153902162/?c=750000000",
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
    id: "bt-6205b-marker",
    cat: "3D-принтеры",
    catKey: "printers3d",
    name: "Ручной маркиратор AVRON BT-6205B",
    shortName: "BT-6205B",
    desc: "Профессиональный ручной маркиратор для быстрой печати дат, сроков годности, QR-кодов, штрихкодов, логотипов и другой информации практически на любой поверхности.",
    details: [
      "AVRON BT-6205B позволяет печатать даты производства и срока годности, QR-коды, Data Matrix, штрихкоды, логотипы, серийные номера, партии, а также автоматически подставлять дату и время.",
      "Маркиратор печатает до 10 строк текста с высотой печати до 12.7 мм, разрешением 300 DPI и скоростью до 30 м/мин. Цветной сенсорный экран 2.8” и USB упрощают загрузку шаблонов и логотипов.",
      "Подходит для картона, бумаги, текстиля, дерева, кожи, металла, стекла, пластика и ПВХ-труб. Аккумулятор 2600 мАч обеспечивает до 8 часов автономной работы, а вес 460 г делает устройство удобным для ежедневного использования.",
    ],
    advantages: [
      "Не нужны этикетки и наклейки",
      "Быстрая настройка за несколько минут",
      "Печать на разных материалах",
      "Поддержка QR и Data Matrix",
      "Компактный и лёгкий корпус",
      "Ресурс картриджа до 2 000 000 символов",
    ],
    price: 59990,
    oldPrice: null,
    discount: null,
    badge: "hit",
    icon: "printer",
    rating: 5.0,
    reviews: 8,
    installment: "4 999 ₸ × 12 мес",
    installmentBadge: "0·0·12",
    specs: [
      ["Печать", "Дата, срок годности, QR, Data Matrix, штрихкоды, логотипы"],
      ["Высота печати", "До 12.7 мм"],
      ["Строк текста", "До 10"],
      ["Разрешение", "300 DPI"],
      ["Скорость", "До 30 м/мин"],
      ["Экран", "Цветной сенсорный 2.8”"],
      ["USB", "Для загрузки шаблонов и логотипов"],
      ["Материалы", "Картон, бумага, текстиль, дерево, кожа, металл, стекло, пластик, ПВХ"],
      ["Аккумулятор", "2600 мАч"],
      ["Автономность", "До 8 часов"],
      ["Вес", "460 г"],
      ["Комплектация", "Картридж, USB-флешка, зарядное, набор очистки, линейка, кейс"],
      ["Доставка", "По Казахстану"],
      ["Рассрочка", "0·0·12"],
      ["Гарантия", "Есть"],
    ],
    images: [
      "/products/printer/7.png",
      "/products/printer/1.png",
      "/products/printer/2.png",
      "/products/printer/3.png",
      "/products/printer/4.png",
      "/products/printer/5.png",
      "/products/printer/6.png",
      "/products/printer/8.png",
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/avron-bt-6205b-markirator-chernyi-159430804/",
  },
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
    installmentBadge: "0·0·12",
    specs: [
      ["Размеры", "120 × 60 × 113 см"],
      ["Цвет столешницы", "Белый"],
      ["Регулировка высоты", "Электрическая, плавная и тихая"],
      ["Управление", "Одна кнопка"],
      ["Макс. нагрузка", "70 кг"],
      ["Материал рамы", "Металл"],
      ["Комплектация", "Всё для сборки + видеоинструкция"],
      ["Доставка", "В день покупки, 5 000 ₸"],
      ["Рассрочка", "0·0·12"],
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
    id: "ebook-light",
    cat: "Электронные книги",
    catKey: "ereaders",
    name: "Электронная книга AVRON E-Book Light",
    shortName: "E-Book Light",
    desc: "Электронная книга с 6-дюймовым E-Ink экраном и умной подсветкой для комфортного чтения днём и ночью. Экран создаёт ощущение настоящей бумаги, не перегружает глаза и отлично подходит для долгого чтения дома, в дороге и на учёбе.",
    details: [
      "AVRON E-Book Light работает на Android, поддерживает установку приложений для чтения и позволяет скачивать книги по Wi-Fi без подключения к компьютеру.",
      "Поддерживаются PDF, ePub, fb2, DOC и TXT, а дополнительные форматы можно открывать через Android-приложения. 32 ГБ памяти хватает для большой библиотеки.",
      "Лёгкий компактный корпус удобно брать с собой, а автономность до 3–4 недель делает устройство практичным для повседневного использования и путешествий.",
    ],
    advantages: [
      "6” E-Ink экран с подсветкой и эффектом бумажной страницы",
      "Адаптивная умная подсветка для чтения днём и ночью",
      "Android-система и поддержка популярных приложений-читалок",
      "32 ГБ встроенной памяти для большой библиотеки",
      "Лёгкий минималистичный корпус, удобный для поездок",
      "До 3–4 недель работы без подзарядки",
    ],
    price: 44990,
    oldPrice: null,
    discount: null,
    badge: "hit",
    icon: "ereader",
    rating: 5.0,
    reviews: 8,
    installment: "3 749 ₸ × 12 мес",
    installmentBadge: "0·0·12",
    specs: [
      ["Экран", "6” E-Ink с подсветкой"],
      ["Подсветка", "Адаптивная умная"],
      ["Система", "Android"],
      ["Встроенная память", "32 ГБ"],
      ["Подключение", "Wi-Fi"],
      ["Форматы", "PDF, ePub, fb2, DOC, TXT"],
      ["Автономность", "До 3–4 недель"],
      ["Корпус", "Лёгкий и компактный"],
      ["Комплектация", "Чехол, USB Type-C, адаптер, инструкция"],
      ["Доставка", "Доступна"],
      ["Рассрочка", "0·0·12"],
    ],
    images: [
      "/products/book-v2/4.png",
      "/products/book-v2/1.png",
      "/products/book-v2/2.png",
      "/products/book-v2/3.png",
      "/products/book-v2/5.png",
      "/products/book-v2/6.png",
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/avron-e-book-light-6-djuim-32-gb-chernyi-164767056/",
  },
  {
    id: "baidu-carlife-carplay",
    cat: "Автоэлектроника",
    catKey: "auto",
    name: "AVRON BT-6205B маркиратор черный",
    shortName: "CarLife → CarPlay",
    desc: "Адаптер для автомобилей с Baidu CarLife, который превращает штатную систему в полноценный беспроводной Apple CarPlay без прошивки и сложной настройки. Подходит только для iPhone и не поддерживает YouTube.",
    details: [
      "Адаптер работает только в автомобилях, где уже есть Baidu CarLife. Если на экране есть логотип CarLife, система просит открыть Baidu CarLife и в настройках нет Apple CarPlay, устройство вам подходит.",
      "Подключение выполняется через USB, после чего в автомобиле становится доступен беспроводной Apple CarPlay с управлением через тачскрин, Siri и штатные кнопки на руле.",
      "Поддерживаются Apple Maps, Google Maps, 2ГИС, Яндекс Навигатор, Spotify, Яндекс Музыка и другие приложения CarPlay. Прошивка и разбор системы не нужны.",
    ],
    advantages: [
      "Беспроводной Apple CarPlay без лишних проводов",
      "Быстрая настройка без перепрошивки",
      "Поддержка Siri, тачскрина и управления с руля",
      "Сохраняет штатное управление автомобиля",
      "Компактный корпус и простое USB-подключение",
    ],
    price: 19990,
    oldPrice: null,
    discount: null,
    badge: "hit",
    icon: "carplay",
    rating: 5.0,
    reviews: 8,
    installment: "1 666 ₸ × 12 мес",
    installmentBadge: "0·0·12",
    specs: [
      ["Совместимость", "Только автомобили с Baidu CarLife"],
      ["Смартфон", "Только iPhone"],
      ["Подключение", "USB → беспроводной Apple CarPlay"],
      ["Управление", "Siri, тачскрин и кнопки на руле"],
      ["Прошивка", "Не требуется"],
      ["Приложения", "Apple Maps, Google Maps, 2ГИС, Яндекс Навигатор, Spotify"],
      ["Поддержка YouTube", "Нет"],
      ["Подходящие авто", "Geely, Changan, Haval, BYD, GAC и другие китайские авто"],
      ["Корпус", "Компактный адаптер"],
      ["Доставка", "Доступна"],
      ["Рассрочка", "0·0·12"],
    ],
    images: [
      "/products/adapter/2.png",
      "/products/adapter/1.png",
      "/products/adapter/3.png",
    ],
    kaspiUrl: "https://kaspi.kz/shop/p/avron-besprovodnoi-adapter-baidu-carlife-na-carplay-152858563/",
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
