import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import logo from "@/public/products/logo/logo.png";

export function Footer() {
  return (
    <footer className="footer" id="contacts">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="footer-brand" aria-label={SITE.name}>
              <Image
                src={logo}
                alt={SITE.name}
                placeholder="blur"
                sizes="64px"
                className="footer-logo"
              />
            </Link>
            <p className="footer-tagline">{SITE.description}</p>
          </div>
          <div className="footer-col">
            <h4>Магазин</h4>
            <Link href="/#catalog">Каталог</Link>
            <Link href="/#new">Новинки</Link>
            <Link href="/#hits">Хиты продаж</Link>
            <Link href="/#sale">Акции</Link>
          </div>
          <div className="footer-col">
            <h4>Информация</h4>
            {/* <Link href="/#about">О нас</Link> */}
            {/* <Link href="/#delivery">Доставка</Link> */}
            <Link href="/#warranty">Гарантия</Link>
            <Link href="/#return">Возврат</Link>
          </div>
          <div className="footer-col">
            <h4>Контакты</h4>
            <Link href="/contacts">Все контакты</Link>
            <a href={`tel:${SITE.phoneRaw}`}>{SITE.phone}</a>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <p>г. {SITE.city}<br />{SITE.hours}</p>
          </div>
        </div>
        <div className="footer-bot">
          <span>© {new Date().getFullYear()} {SITE.name}. Все права защищены.</span>
          <div className="social">
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.4a4 4 0 1 1-7.9 1.2 4 4 0 0 1 7.9-1.2z" />
                <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
              </svg>
            </a>
            <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <svg viewBox="0 0 24 24" strokeWidth="2">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
            <a href={SITE.social.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              <svg viewBox="0 0 24 24" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </a>
            <a href={SITE.social.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" strokeWidth="2">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
