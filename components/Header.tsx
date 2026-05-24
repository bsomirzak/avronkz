"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import logo from "@/public/products/logo/logo.png";

export function Header() {
  const pathname = usePathname() ?? "/";
  const isContacts = pathname.startsWith("/contacts");
  const isCatalog = !isContacts; // home + product pages all belong to catalog

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label={SITE.name}>
          <Image
            src={logo}
            alt={SITE.name}
            priority
            placeholder="blur"
            sizes="44px"
            className="brand-logo"
          />
        </Link>
        <nav className="nav" aria-label="Главное меню">
          <Link href="/#catalog" className={isCatalog ? "active" : undefined}>Каталог</Link>
          {/* <Link href="/#about">О нас</Link> */}
          {/* <Link href="/#delivery">Доставка</Link> */}
          <Link href="/contacts" className={isContacts ? "active" : undefined}>Контакты</Link>
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
