import Link from "next/link";
import { CATEGORIES } from "@/lib/products";

export function CategoryChips({ active }: { active: string }) {
  return (
    <div className="cats" role="tablist">
      {CATEGORIES.map((c) => {
        const href = c.key === "all" ? "/#catalog" : `/?cat=${c.key}#catalog`;
        const isActive = c.key === active;
        return (
          <Link
            key={c.key}
            href={href}
            className={`chip${isActive ? " active" : ""}`}
            role="tab"
            aria-selected={isActive}
            scroll={false}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
