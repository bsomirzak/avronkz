import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";

const TABS = [
  ["/admin/docs", "Документы"],
  ["/admin/docs/new", "+ Новый"],
  ["/admin/docs/buyers", "Покупатели"],
  ["/admin/docs/products", "Товары"],
  ["/admin/docs/sellers", "ИП, печати, номера"],
  ["/admin/docs/settings", "Ставки и тексты"],
] as const;

/** Каркас раздела документов: шапка сайта, крошки, вкладки. */
export function DocsShell({ title, current, children, wide }: { title: string; current: string; children: ReactNode; wide?: boolean }) {
  return (
    <>
      <Header />
      <main className={`container docs-page${wide ? " wide" : ""}`}>
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <Link href="/admin">Админка</Link>
          <span className="sep">/</span>
          <span className="current">Документы</span>
        </nav>
        <nav className="docs-tabs">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} className={href === current ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>
        <h1 className="docs-title">{title}</h1>
        {children}
      </main>
    </>
  );
}
