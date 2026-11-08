"use client";

/**
 * Загрузка печати или подписи: фото на белом листе (JPG/PNG/HEIC с iPhone) →
 * удаление фона по синему каналу → обрезка → поворот → предпросмотр → PNG на
 * сервер. Вся обработка — в браузере, на сервер уходит только готовый PNG.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanInk, rotate, type Rgba } from "@/lib/docs/image";

type Props = { keyName: string; kind: "stamp" | "sign"; label: string; onSaved: () => void };

const MAX_IN = 1800;
const MAX_OUT = { stamp: 900, sign: 1000 };

async function decode(file: File): Promise<ImageBitmap> {
  const heic = /\.hei[cf]$/i.test(file.name) || /heic|heif/i.test(file.type);
  if (heic) {
    const { heicTo } = await import("heic-to/next");
    return heicTo({ blob: file, type: "bitmap" });
  }
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function toCanvas(img: Rgba): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

export function SealUploader({ keyName, kind, label, onSaved }: Props) {
  const [src, setSrc] = useState<Rgba | null>(null);
  const [threshold, setThreshold] = useState(18);
  const [deg, setDeg] = useState<0 | 90 | 180 | 270>(0);
  const [clean, setClean] = useState(true);
    const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = useRef<HTMLDivElement>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr("");
    setBusy(true);
    try {
      const bmp = await decode(f);
      const k = Math.min(1, MAX_IN / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      // PNG с уже прозрачным фоном чистить не нужно.
      let hasAlpha = false;
      for (let i = 3; i < data.data.length; i += 400) if (data.data[i] < 250) { hasAlpha = true; break; }
      setClean(!hasAlpha);
      setSrc({ data: data.data, width: c.width, height: c.height });
    } catch (e) {
      setErr(`Не удалось открыть файл: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const result = useMemo((): { canvas: HTMLCanvasElement | null; error: string } => {
    if (!src) return { canvas: null, error: "" };
    try {
      const img = clean ? cleanInk(src, { threshold, rotate: deg }) : rotate(src, deg);
      let c = toCanvas(img);
      const k = Math.min(1, MAX_OUT[kind] / Math.max(c.width, c.height));
      if (k < 1) {
        const s = document.createElement("canvas");
        s.width = Math.round(c.width * k);
        s.height = Math.round(c.height * k);
        s.getContext("2d")!.drawImage(c, 0, 0, s.width, s.height);
        c = s;
      }
      return { canvas: c, error: "" };
    } catch (e) {
      return { canvas: null, error: (e as Error).message };
    }
  }, [src, threshold, deg, clean, kind]);
  const out = result.canvas;

  useEffect(() => {
    const box = preview.current;
    if (!box) return;
    box.replaceChildren();
    if (out) box.appendChild(out);
  }, [out]);

  async function save() {
    if (!out) return;
    setBusy(true);
    const blob: Blob = await new Promise((r) => out.toBlob((b) => r(b!), "image/png"));
    const res = await fetch(`/api/admin/docs/image?key=${encodeURIComponent(keyName)}&kind=${kind}`, { method: "POST", body: blob });
    setBusy(false);
    if (!res.ok) setErr(await res.text());
    else {
      setSrc(null);
      onSaved();
    }
  }

  return (
    <div className="docs-seal-up">
      <label className="docs-btn secondary">
        {busy ? "Обработка…" : `Загрузить ${label}`}
        <input type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {src && (
        <>
          <div className="docs-row">
            <label className="docs-check">
              <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} /> удалить фон (по синему)
            </label>
            {clean && (
              <label className="docs-field inline">
                <span>Порог {threshold}</span>
                <input type="range" min={0} max={80} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              </label>
            )}
            {([0, 90, 180, 270] as const).map((d) => (
              <button key={d} type="button" className={`docs-chip${deg === d ? " active" : ""}`} onClick={() => setDeg(d)}>
                {d}°
              </button>
            ))}
          </div>
          <div className="docs-checker" ref={preview} />
          <div className="docs-row">
            <button type="button" className="docs-btn" disabled={!out || busy} onClick={save}>Сохранить</button>
            <button type="button" className="docs-btn secondary" onClick={() => setSrc(null)}>Отмена</button>
          </div>
        </>
      )}
      {(err || result.error) && <p className="docs-warn">{err || result.error}</p>}
    </div>
  );
}
