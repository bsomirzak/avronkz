export const SITE = {
  name: "AVRON",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://avron.kz",
  locale: "ru_RU",
  city: "Алматы",
  phone: "+7 (727) 000-00-00",
  phoneRaw: "+77270000000",
  email: "hello@avron.kz",
  description:
    "Официальный магазин AVRON в Алматы. Качественная техника и мебель с доставкой, гарантией 12 месяцев и рассрочкой Kaspi 0-0-12.",
  tagline: "Качественная техника и мебель для дома и офиса",
  social: {
    instagram: "https://instagram.com/avron.official_store",
    kaspi: "https://kaspi.kz",
  },
} as const;
