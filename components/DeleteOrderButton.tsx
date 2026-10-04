"use client";

import { useState, useTransition } from "react";
import { deleteOrderAction } from "@/app/orders/site/actions";

/**
 * Удаление заказа в два нажатия: первое показывает «Точно?», второе удаляет.
 * Без window.confirm — он блокирует страницу и ломает автоматизацию.
 */
export function DeleteOrderButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button type="button" className="orders-delete" onClick={() => setArmed(true)} title="Удалить заказ">
        Удалить
      </button>
    );
  }

  return (
    <span className="orders-delete-confirm">
      <button
        type="button"
        className="orders-delete danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { ok } = await deleteOrderAction(id);
            if (!ok) setError(true);
          })
        }
      >
        {pending ? "Удаляю…" : error ? "Не вышло, ещё раз" : "Точно удалить"}
      </button>
      <button type="button" className="orders-delete" disabled={pending} onClick={() => setArmed(false)}>
        Отмена
      </button>
    </span>
  );
}
