import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Документы — AVRON",
  // Внутренний раздел (пароль — proxy.ts): реквизиты покупателей, печати.
  robots: { index: false, follow: false, nocache: true },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}
