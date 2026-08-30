import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ChatsView } from "@/components/ChatsView";
import { persistent } from "@/lib/store";

export const metadata: Metadata = {
  title: "Диалоги WhatsApp — AVRON",
  // Здесь переписка и телефоны клиентов — в поиске разделу делать нечего.
  robots: { index: false, follow: false, nocache: true },
};

export default function ChatsPage() {
  return (
    <>
      <Header />
      <main className="container chats-page">
        <nav className="breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span className="current">Диалоги</span>
        </nav>

        <h1 className="chats-title">Диалоги WhatsApp</h1>
        <p className="chats-lead">
          Переписка клиентов с ботом в WhatsApp. Ответьте сами — бот перестанет вмешиваться
          в этот диалог на два часа, вернуть его можно кнопкой.
        </p>

        {!persistent && (
          <p className="chats-warn">
            Хранилище не подключено: переписка живёт только до перезапуска сервера и может
            пропадать. Подключите Upstash Redis в Vercel (Storage → Marketplace) и нажмите
            Redeploy — переменные добавятся сами.
          </p>
        )}

        <ChatsView />
      </main>
    </>
  );
}
