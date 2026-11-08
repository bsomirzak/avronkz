"use client";

import { useTransition } from "react";
import { setStatusAction } from "@/app/admin/docs/actions";
import { DOC_STATUS_LABEL, DOC_STATUSES, type DocStatus } from "@/lib/docs/types";

export function StatusSelect({ id, value }: { id: string; value: DocStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      className={`docs-status ${value}`}
      defaultValue={value}
      disabled={pending}
      onChange={(e) => start(() => setStatusAction(id, e.target.value as DocStatus))}
    >
      {DOC_STATUSES.map((s) => (
        <option key={s} value={s}>{DOC_STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}
