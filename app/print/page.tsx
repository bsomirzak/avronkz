import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { WaybillMerger } from "@/components/WaybillMerger";

export const metadata: Metadata = {
  title: "Накладные Kaspi — печать по 4 на лист",
  // Внутренний инструмент продавца, в выдаче ему делать нечего.
  robots: { index: false, follow: false, nocache: true },
};

export default function PrintPage() {
  return (
    <>
      <Header />
      <main className="container wb-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Накладные</span>
        </nav>

        <h1 className="wb-title">Накладные Kaspi в один файл</h1>
        <p className="wb-lead">
          Загрузите ZIP-архив с накладными из кабинета Kaspi (или сами PDF) — соберём один файл,
          по 4 наклейки на лист A4: пустые места пропускаются, к краям добавляются линии реза.
          Всё считается в браузере, файлы никуда не отправляются.
        </p>

        <WaybillMerger />
      </main>
    </>
  );
}
