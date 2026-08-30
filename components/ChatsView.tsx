"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prettyPhone } from "@/lib/kaspi";
import type { ChatSummary, StoredMessage } from "@/lib/store";

/** Как часто подтягиваем новые сообщения, пока страница открыта. */
const POLL_MS = 10_000;

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const AUTHOR_LABEL: Record<StoredMessage["author"], string> = {
  client: "Клиент",
  bot: "Бот",
  manager: "Вы",
};

export function ChatsView() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    const res = await fetch("/api/chats", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить диалоги.");
    setChats(data.chats as ChatSummary[]);
  }, []);

  const loadMessages = useCallback(async (phone: string) => {
    const res = await fetch(`/api/chats?phone=${phone}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить переписку.");
    setMessages(data.messages as StoredMessage[]);
    setManual(Boolean(data.manual));
  }, []);

  // Первая загрузка и дальше опрос — новые сообщения приходят вебхуком,
  // страница о них узнать иначе не может.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        await loadChats();
        if (alive && active) await loadMessages(active);
        if (alive) setError(null);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoaded(true);
      }
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active, loadChats, loadMessages]);

  // Держим ленту прокрученной к последнему сообщению.
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = draft.trim();
    if (!text || !active || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: active, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось отправить.");
      setMessages((prev) => [...prev, data.message as StoredMessage]);
      setManual(true);
      setDraft("");
      loadChats().catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function resumeBot() {
    if (!active) return;
    await fetch("/api/chats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: active, action: "resume" }),
    });
    setManual(false);
  }

  const activeChat = chats.find((c) => c.phone === active);

  return (
    <div className="chats">
      <aside className="chats-list">
        {!loaded && <p className="chats-empty">Загружаем…</p>}
        {loaded && !chats.length && (
          <p className="chats-empty">
            Пока ни одного диалога. Как только клиент напишет боту, переписка появится здесь.
          </p>
        )}
        {chats.map((chat) => (
          <button
            key={chat.phone}
            type="button"
            className={`chats-item${chat.phone === active ? " active" : ""}`}
            onClick={() => {
              setActive(chat.phone);
              setMessages([]);
              loadMessages(chat.phone).catch((e) => setError((e as Error).message));
            }}
          >
            <div className="chats-item-head">
              <b>{chat.name || prettyPhone(chat.phone)}</b>
              <span className="chats-time">{fmtTime(chat.updated)}</span>
            </div>
            <div className="chats-preview">
              {chat.lastAuthor === "client" ? "" : `${AUTHOR_LABEL[chat.lastAuthor]}: `}
              {chat.last}
            </div>
            {chat.manual && <span className="chats-badge">отвечает менеджер</span>}
          </button>
        ))}
      </aside>

      <section className="chats-panel">
        {!active && <p className="chats-empty">Выберите диалог слева.</p>}

        {active && (
          <>
            <header className="chats-head">
              <div>
                <b>{activeChat?.name || prettyPhone(active)}</b>
                <span className="chats-phone">+{active}</span>
              </div>
              {manual ? (
                <button type="button" className="chats-resume" onClick={resumeBot}>
                  Вернуть бота
                </button>
              ) : (
                <span className="chats-state">отвечает бот</span>
              )}
            </header>

            <div className="chats-feed" ref={feedRef}>
              {messages.map((m) => (
                <div key={m.id} className={`chats-msg ${m.author}`}>
                  <div className="chats-msg-meta">
                    {AUTHOR_LABEL[m.author]} · {fmtTime(m.at)}
                  </div>
                  <div className="chats-msg-text">{m.text}</div>
                </div>
              ))}
            </div>

            <div className="chats-compose">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
                placeholder="Ответ клиенту… (⌘+Enter — отправить)"
                rows={3}
              />
              <button type="button" onClick={send} disabled={sending || !draft.trim()}>
                {sending ? "Отправляем…" : "Отправить"}
              </button>
            </div>
          </>
        )}

        {error && <p className="chats-error">{error}</p>}
      </section>
    </div>
  );
}
