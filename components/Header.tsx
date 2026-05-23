import Link from "next/link";
import { SITE } from "@/lib/site";

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label={SITE.name}>
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 4L21 20H3L12 4Z" stroke="#FFCD3C" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="brand-name">{SITE.name}</div>
        </Link>
        <nav className="nav" aria-label="Главное меню">
          <Link href="/#catalog" className="active">Каталог</Link>
          <Link href="/#about">О нас</Link>
          <Link href="/#delivery">Доставка</Link>
          <Link href="/#contacts">Контакты</Link>
        </nav>
        <div className="header-right">
          <a href={`tel:${SITE.phoneRaw}`} className="header-phone">{SITE.phone}</a>
          <a href={SITE.social.kaspi} target="_blank" rel="noopener noreferrer" className="btn-kaspi">
            Kaspi Магазин
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <button className="menu-toggle" aria-label="Меню">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="14" x2="21" y2="14" />
              <line x1="3" y1="21" x2="21" y2="21" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
