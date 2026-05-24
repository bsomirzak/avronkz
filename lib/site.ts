export const SITE = {
  name: "AVRON",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://avron.kz",
  locale: "ru_RU",
  city: "Алматы",
  phone: "+7 (771) 131-03-05",
  phoneRaw: "+77711310305",
  email: "avron.kz@gmail.com",
  description:
    "Официальный магазин AVRON в Алматы. Качественная техника и мебель с доставкой, гарантией 12 месяцев и рассрочкой Kaspi 0-0-12.",
  tagline: "Качественная техника и мебель для дома и офиса",
  hours: "Ежедневно, 10:00–20:00",
  address: {
    street: "Улица Рыскулова, 14Б",
    locality: "с. Бесагаш, Талгарский район",
    region: "Алматинская область",
    postal: "041609",
    mapUrl:
      "https://2gis.kz/almaty/geo/70030076425739178/77.030627%2C43.304862?m=77.032183%2C43.304297%2F17.97",
  },
  social: {
    whatsapp: "https://wa.me/77711310305",
    telegram: "https://t.me/+77711310305",
    instagram: "https://instagram.com/avron.kz",
    tiktok: "https://www.tiktok.com/@avron.kz",
    kaspi: "https://l.kaspi.kz/shop/47gJbsayKn29QGb",
  },
} as const;
