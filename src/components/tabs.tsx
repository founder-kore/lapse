"use client";

import { useState } from "react";

export type TabItem = {
  id: string;
  label: string;
  count: number;
  /** Tailwind class for the severity dot, e.g. "bg-red-600". */
  dotClass?: string;
  content: React.ReactNode;
};

/**
 * Simple pill tabs. Server-rendered panels are passed in as content, so the
 * data stays on the server — this only switches which panel is visible.
 */
export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const current = items.find((t) => t.id === active) ?? items[0];
  return (
    <div>
      <div
        role="tablist"
        className="inline-flex gap-1 rounded-lg bg-zinc-100 p-1"
      >
        {items.map((t) => {
          const selected = t.id === current?.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {t.dotClass ? (
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${t.dotClass}`}
                />
              ) : null}
              {t.label}
              <span className="tabular-nums text-zinc-600">{t.count}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4">{current?.content}</div>
    </div>
  );
}
