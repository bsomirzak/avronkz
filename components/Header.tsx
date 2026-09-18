"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import logo from "@/public/products/logo/logo.png";

export function Header() {
  const pathname = usePathname() ?? "/";
  const isContacts = pathname.startsWith("/contacts");
  const isReviews = pathname.startsWith("/reviews");
  const isDelivery = pathname.startsWith("/dostavka");
  // Главная, категории и товары — это каталог; /vozvrat, /privacy и прочие справочные страницы — нет.
  const isCatalog =
    pathname === "/" || pathname.startsWith("/catalog") || pathname.startsWith("/products");
  const links = [
    { href: "/#catalog", label: "Каталог", active: isCatalog },
    { href: "/reviews", label: "Отзывы", active: isReviews },
    { href: "/dostavka", label: "Доставка и оплата", active: isDelivery },
    { href: "/contacts", label: "Контакты", active: isContacts },
  ];

  // Мобильное меню (до 768px): кнопка «☰» раскрывает панель под шапкой.
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    // Нажатие мимо шапки закрывает меню.
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <header className="header" ref={headerRef}>
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
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={l.active ? "active" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="header-right">
          <div className="header-phones">
            <a href={`tel:${SITE.phoneRaw}`} className="header-phone">{SITE.phone}</a>
            <a href={`tel:${SITE.phoneAltRaw}`} className="header-phone alt">{SITE.phoneAlt}</a>
          </div>
          <a href={SITE.social.kaspi} target="_blank" rel="noopener noreferrer" className="btn-kaspi">
            Kaspi Магазин
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="14" x2="21" y2="14" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div id="mobile-menu" className="mobile-menu" hidden={!menuOpen}>
        <nav aria-label="Меню">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={l.active ? "active" : undefined}
              onClick={closeMenu}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mobile-menu-contacts">
          <a href={`tel:${SITE.phoneRaw}`} className="header-phone">{SITE.phone}</a>
          <a href={`tel:${SITE.phoneAltRaw}`} className="header-phone alt">{SITE.phoneAlt}</a>
          <a
            href={SITE.social.kaspi}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-kaspi mobile-menu-kaspi"
            onClick={closeMenu}
          >
            Kaspi Магазин
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
