"use client";

import { useState, type ReactNode } from "react";

type Tab = { id: string; label: string; count?: number; panel: ReactNode };

export function ProductTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="tabs-wrap">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
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
        ))}
      </div>
      {tabs.map((t) => (
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
