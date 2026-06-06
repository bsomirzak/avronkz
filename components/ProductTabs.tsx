"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
  count?: number;
  panel?: ReactNode;
  /** When set, the tab acts as a link to this URL instead of toggling a panel. */
  href?: string;
};

export function ProductTabs({ tabs }: { tabs: Tab[] }) {
  const firstPanelTab = tabs.find((t) => !t.href);
  const [active, setActive] = useState(firstPanelTab?.id);
  return (
    <div className="tabs-wrap">
      <div className="tabs" role="tablist">
        {tabs.map((t) =>
          t.href ? (
            <Link key={t.id} href={t.href} className="tab tab-link">
              {t.label}
              {t.count !== undefined && <span className="tab-count">{t.count}</span>}
            </Link>
          ) : (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              className={`tab${active === t.id ? " active" : ""}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
              {t.count !== undefined && <span className="tab-count">{t.count}</span>}
            </button>
          ),
        )}
      </div>
      {tabs
        .filter((t) => !t.href)
        .map((t) => (
          <div
            key={t.id}
            id={`tab-${t.id}`}
            role="tabpanel"
            className={`tab-panel${active === t.id ? " active" : ""}`}
          >
            {t.panel}
          </div>
        ))}
    </div>
  );
}
