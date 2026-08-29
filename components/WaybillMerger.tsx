"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collectPdfs,
  mergeWaybills,
  LABELS_PER_PAGE,
  type Progress,
  type MergeResult,
} from "@/lib/waybills";

const OUT_NAME = "nakladnye.pdf";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function countLabels(n: number): string {
  const t = n % 10;
  const h = n % 100;
  if (t === 1 && h !== 11) return "наклейка";
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return "наклейки";
  return "наклеек";
}

function countSheets(n: number): string {
  const t = n % 10;
  const h = n % 100;
  if (t === 1 && h !== 11) return "лист";
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return "листа";
  return "листов";
}

const ACCEPTED = /\.(zip|pdf)$/i;

export function WaybillMerger() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mask, setMask] = useState(true);
  const [guides, setGuides] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Blob живёт до следующей сборки — иначе утекает память вкладки.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const picked = Array.from(incoming).filter((f) => ACCEPTED.test(f.name));
    if (!picked.length) {
      setError("Подходят только ZIP-архивы и PDF-файлы.");
      return;
    }
    reset();
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const fresh = picked.filter((f) => !seen.has(`${f.name}:${f.size}`));
      return [...prev, ...fresh].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    });
  }, [reset]);

  const removeFile = (idx: number) => {
    reset();
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    reset();
    setFiles([]);
  };

  async function build() {
    if (!files.length || busy) return;
    setBusy(true);
    reset();
    setProgress({ stage: "read", done: 0, total: files.length });
    try {
      const sources = await collectPdfs(files);
      if (!sources.length) {
        setError("В выбранных файлах нет PDF-накладных.");
        return;
      }
      const res = await mergeWaybills(sources, {
        maskPageIndicator: mask,
        cutGuides: guides,
        onProgress: setProgress,
      });
      if (!res.labels) {
        setError("Не удалось найти ни одной наклейки — похоже, это не накладные Kaspi.");
        return;
      }
      const blob = new Blob([new Uint8Array(res.pdf)], { type: "application/pdf" });
      setUrl(URL.createObjectURL(blob));
      setResult(res);
    } catch (e) {
      setError((e as Error).message || "Не удалось обработать файлы.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const progressText = progress
    ? progress.stage === "read"
      ? "Читаем файлы…"
      : progress.stage === "scan"
        ? `Разбираем накладные: ${progress.done} из ${progress.total}`
        : `Собираем лист: ${Math.min(progress.done + LABELS_PER_PAGE, progress.total)} из ${progress.total}`
    : null;

  return (
    <div className="wb">
      <div
        className={`wb-drop${dragging ? " dragover" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="34" height="34">
          <path d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <b>Перетащите ZIP с накладными или PDF-файлы</b>
        <span>или нажмите, чтобы выбрать. Файлы обрабатываются прямо в браузере.</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".zip,.pdf,application/pdf,application/zip"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          onClick={(e) => e.stopPropagation()}
          hidden
        />
      </div>

      {files.length > 0 && (
        <div className="wb-files">
          <div className="wb-files-head">
            <span>Выбрано файлов: {files.length}</span>
            <button type="button" className="wb-link" onClick={clearAll} disabled={busy}>Очистить</button>
          </div>
          <ul>
            {files.map((f, i) => (
              <li key={`${f.name}:${f.size}:${i}`}>
                <span className="wb-file-name">{f.name}</span>
                <span className="wb-file-size">{humanSize(f.size)}</span>
                <button type="button" aria-label={`Убрать ${f.name}`} onClick={() => removeFile(i)} disabled={busy}>×</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="wb-options">
        <label>
          <input type="checkbox" checked={guides} onChange={(e) => { reset(); setGuides(e.target.checked); }} />
          Линии реза
        </label>
        <label>
          <input type="checkbox" checked={mask} onChange={(e) => { reset(); setMask(e.target.checked); }} />
          Закрасить нумерацию страниц Kaspi
        </label>
      </div>

      <div className="wb-actions">
        <button type="button" className="wb-build" onClick={build} disabled={!files.length || busy}>
          {busy ? "Собираем…" : "Собрать PDF"}
        </button>
        {progressText && <span className="wb-progress">{progressText}</span>}
      </div>

      {error && <p className="wb-error">{error}</p>}

      {result && url && (
        <div className="wb-result">
          <div className="wb-summary">
            <b>{result.labels}</b> {countLabels(result.labels)} → <b>{result.pages}</b> {countSheets(result.pages)} A4,
            по {LABELS_PER_PAGE} на лист.
          </div>
          {result.skipped.length > 0 && (
            <p className="wb-warn">Пропущены нечитаемые файлы: {result.skipped.join(", ")}</p>
          )}
          <div className="wb-result-actions">
            <a className="wb-download" href={url} download={OUT_NAME}>Скачать {OUT_NAME}</a>
            <a className="wb-open" href={url} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке</a>
          </div>
          <iframe className="wb-preview" src={url} title="Предпросмотр накладных" />
        </div>
      )}
    </div>
  );
}
