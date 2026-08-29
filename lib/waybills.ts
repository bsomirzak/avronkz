/**
 * Склейка накладных Kaspi: из ZIP-архивов и отдельных PDF собирается один файл,
 * по 4 наклейки на лист A4. Порт lib/print.py (pymupdf) на pdf-lib + pdf.js.
 *
 * Всё считается в браузере — файлы никуда не загружаются.
 */

export const A4_W = 595.275;
export const A4_H = 841.875;
export const LABELS_PER_PAGE = 4;
export const LABEL_SCALE = 0.9;

/** Прямоугольник в «человеческих» координатах: начало в левом верхнем углу. */
type Rect = { x0: number; y0: number; x1: number; y1: number };

/** Порядок квадрантов: слева-сверху, справа-сверху, слева-снизу, справа-снизу. */
function quadrants(w: number, h: number): Rect[] {
  const hw = w / 2;
  const hh = h / 2;
  return [
    { x0: 0, y0: 0, x1: hw, y1: hh },
    { x0: hw, y0: 0, x1: w, y1: hh },
    { x0: 0, y0: hh, x1: hw, y1: h },
    { x0: hw, y0: hh, x1: w, y1: h },
  ];
}

/** Плашка с номером страницы («1/2») в углу наклейки — её закрашиваем белым. */
const PAGE_INDICATOR: Rect = { x0: 248, y0: 16, x1: 290, y1: 42 };

export type SourcePdf = { name: string; data: Uint8Array };

export type Progress = { stage: "read" | "scan" | "build"; done: number; total: number };

export type MergeOptions = {
  /** Закрашивать нумерацию страниц Kaspi в углу наклейки. */
  maskPageIndicator?: boolean;
  /** Пунктирные линии реза по центру листа. */
  cutGuides?: boolean;
  onProgress?: (p: Progress) => void;
};

export type MergeResult = {
  pdf: Uint8Array;
  /** Сколько наклеек нашлось. */
  labels: number;
  /** Сколько листов A4 получилось. */
  pages: number;
  /** Файлы, которые не удалось прочитать. */
  skipped: string[];
};

const isPdfName = (n: string) => n.toLowerCase().endsWith(".pdf");
const isZipName = (n: string) => n.toLowerCase().endsWith(".zip");

/** Достаёт PDF-файлы из выбранных ZIP-архивов и просто PDF, в алфавитном порядке. */
export async function collectPdfs(files: File[]): Promise<SourcePdf[]> {
  const out: SourcePdf[] = [];
  for (const file of files) {
    if (isZipName(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const names = Object.keys(zip.files)
        .filter((n) => isPdfName(n) && !n.startsWith("__MACOSX") && !zip.files[n].dir)
        .sort((a, b) => a.localeCompare(b, "ru"));
      for (const name of names) {
        out.push({ name, data: await zip.files[name].async("uint8array") });
      }
    } else if (isPdfName(file.name) || file.type === "application/pdf") {
      out.push({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) });
    }
  }
  return out;
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    return pdfjs;
  });
  return pdfjsPromise;
}

const inside = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** m1 · m2 в нотации PDF (векторы-строки): сначала применяется m1. */
function mul(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

/**
 * Какие квадранты страницы заполнены. Пустые места на последнем листе Kaspi
 * не должны съедать позиции в готовом файле, поэтому ищем текст и картинки.
 */
async function filledQuadrants(
  page: import("pdfjs-dist").PDFPageProxy,
  ops: typeof import("pdfjs-dist").OPS,
  quads: Rect[],
): Promise<boolean[]> {
  const view = page.view; // [x0, y0, x1, y1] в пользовательских координатах
  const top = view[3];
  const left = view[0];
  const found = quads.map(() => false);
  const mark = (x: number, y: number) => {
    quads.forEach((q, i) => {
      if (!found[i] && inside(q, x, y)) found[i] = true;
    });
  };

  const text = await page.getTextContent();
  for (const item of text.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    mark(item.transform[4] - left, top - item.transform[5]);
  }

  if (found.every(Boolean)) return found;

  // Штрихкод/логотип может быть картинкой — прогоняем поток команд и следим за CTM.
  const list = await page.getOperatorList();
  const stack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i];
    if (fn === ops.save) {
      stack.push(ctm);
    } else if (fn === ops.restore) {
      ctm = stack.pop() ?? ctm;
    } else if (fn === ops.transform) {
      ctm = mul(list.argsArray[i] as number[], ctm);
    } else if (
      fn === ops.paintImageXObject ||
      fn === ops.paintInlineImageXObject ||
      fn === ops.paintImageMaskXObject ||
      fn === ops.paintImageXObjectRepeat
    ) {
      // Картинка рисуется в единичном квадрате, растянутом текущей матрицей.
      const xs: number[] = [];
      const ys: number[] = [];
      for (const [ux, uy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        xs.push(ux * ctm[0] + uy * ctm[2] + ctm[4] - left);
        ys.push(top - (ux * ctm[1] + uy * ctm[3] + ctm[5]));
      }
      const box: Rect = {
        x0: Math.min(...xs),
        y0: Math.min(...ys),
        x1: Math.max(...xs),
        y1: Math.max(...ys),
      };
      quads.forEach((q, j) => {
        if (!found[j] && overlaps(q, box)) found[j] = true;
      });
    }
  }
  return found;
}

type Tile = { file: number; page: number; quad: Rect; pageH: number };

export async function mergeWaybills(sources: SourcePdf[], opts: MergeOptions = {}): Promise<MergeResult> {
  const { maskPageIndicator = true, cutGuides = true, onProgress } = opts;
  const [pdfjs, { PDFDocument, rgb }] = await Promise.all([loadPdfjs(), import("pdf-lib")]);

  const tiles: Tile[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < sources.length; i++) {
    onProgress?.({ stage: "scan", done: i, total: sources.length });
    const src = sources[i];
    try {
      // pdf.js забирает буфер себе — отдаём копию, оригинал ещё нужен pdf-lib.
      const task = pdfjs.getDocument({ data: src.data.slice() });
      const doc = await task.promise;
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const [vx0, vy0, vx1, vy1] = page.view;
        const quads = quadrants(vx1 - vx0, vy1 - vy0);
        const filled = await filledQuadrants(page, pdfjs.OPS, quads);
        quads.forEach((quad, q) => {
          if (filled[q]) {
            tiles.push({ file: i, page: p - 1, quad, pageH: vy1 - vy0 });
          }
        });
        page.cleanup();
      }
      await task.destroy();
    } catch {
      skipped.push(src.name);
    }
  }

  const out = await PDFDocument.create();
  const docs = new Map<number, import("pdf-lib").PDFDocument>();
  const destQuads = quadrants(A4_W, A4_H);
  let pages = 0;

  for (let start = 0; start < tiles.length; start += LABELS_PER_PAGE) {
    onProgress?.({ stage: "build", done: start, total: tiles.length });
    const chunk = tiles.slice(start, start + LABELS_PER_PAGE);
    const sheet = out.addPage([A4_W, A4_H]);
    pages++;

    for (let k = 0; k < chunk.length; k++) {
      const tile = chunk[k];
      let doc = docs.get(tile.file);
      if (!doc) {
        doc = await PDFDocument.load(sources[tile.file].data, { ignoreEncryption: true });
        docs.set(tile.file, doc);
      }
      const srcPage = doc.getPage(tile.page);
      const mb = srcPage.getMediaBox();

      const embedded = await out.embedPage(srcPage, {
        left: mb.x + tile.quad.x0,
        right: mb.x + tile.quad.x1,
        bottom: mb.y + (tile.pageH - tile.quad.y1),
        top: mb.y + (tile.pageH - tile.quad.y0),
      });

      const dest = destQuads[k];
      const dw = (dest.x1 - dest.x0) * LABEL_SCALE;
      const dh = (dest.y1 - dest.y0) * LABEL_SCALE;
      sheet.drawPage(embedded, { x: dest.x0, y: A4_H - dest.y0 - dh, width: dw, height: dh });

      if (maskPageIndicator) {
        const kx = dw / (tile.quad.x1 - tile.quad.x0);
        const ky = dh / (tile.quad.y1 - tile.quad.y0);
        const mw = (PAGE_INDICATOR.x1 - PAGE_INDICATOR.x0) * kx;
        const mh = (PAGE_INDICATOR.y1 - PAGE_INDICATOR.y0) * ky;
        sheet.drawRectangle({
          x: dest.x0 + PAGE_INDICATOR.x0 * kx,
          y: A4_H - dest.y0 - PAGE_INDICATOR.y0 * ky - mh,
          width: mw,
          height: mh,
          color: rgb(1, 1, 1),
        });
      }
    }

    if (cutGuides) {
      const line = { thickness: 0.4, color: rgb(0.6, 0.6, 0.6), dashArray: [4, 3] };
      sheet.drawLine({ start: { x: 0, y: A4_H / 2 }, end: { x: A4_W, y: A4_H / 2 }, ...line });
      sheet.drawLine({ start: { x: A4_W / 2, y: 0 }, end: { x: A4_W / 2, y: A4_H }, ...line });
    }
  }

  onProgress?.({ stage: "build", done: tiles.length, total: tiles.length });
  return { pdf: await out.save(), labels: tiles.length, pages, skipped };
}
