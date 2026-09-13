import Link from "next/link";
import { CATEGORIES, categoryHref } from "@/lib/products";

export function CategoryChips({ active }: { active: string }) {
  return (
    <nav className="cats" aria-label="Категории">
      {CATEGORIES.map((c) => {
        const isActive = c.key === active;
        return (
          <Link
            key={c.key}
            href={categoryHref(c.key)}
            className={`chip${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
