/**
 * Маленький слой вёрстки поверх pdf-lib: координаты от левого верхнего угла
 * в пунктах, перенос строк по словам, ячейки таблиц, картинки.
 *
 * Шрифт — Arimo (метрически совместим с Arial / Liberation Sans, как в
 * прежних счетах), с полной казахской кириллицей. Файлы шрифтов заранее урезаны (fonttools) до латиницы, кириллицы с казахскими буквами и знаков,
 * встраиваются целиком: подмножество pdf-lib теряет глифы Arimo.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

export const MM = 72 / 25.4;
export const A4: [number, number] = [595.28, 841.89];
export const A4L: [number, number] = [841.89, 595.28];

type FontName = "r" | "b" | "i";
export type Fonts = Record<FontName, PDFFont>;

const FONT_FILES: Record<FontName, string> = { r: "Arimo-Regular.ttf", b: "Arimo-Bold.ttf", i: "Arimo-Italic.ttf" };
let fontBytes: Promise<Record<FontName, Buffer>> | null = null;

function loadFontBytes() {
  fontBytes ??= (async () => {
    const dir = path.join(process.cwd(), "lib", "docs", "fonts");
    const [r, b, i] = await Promise.all((["r", "b", "i"] as FontName[]).map((k) => readFile(path.join(dir, FONT_FILES[k]))));
    return { r, b, i };
  })();
  return fontBytes;
}

export async function newPdf(title: string): Promise<{ pdf: PDFDocument; fonts: Fonts }> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const bytes = await loadFontBytes();
  const [r, b, i] = await Promise.all([
    pdf.embedFont(bytes.r, { subset: false }),
    pdf.embedFont(bytes.b, { subset: false }),
    pdf.embedFont(bytes.i, { subset: false }),
  ]);
  pdf.setTitle(title);
  pdf.setCreator("avron.kz");
  pdf.setProducer("avron.kz");
  return { pdf, fonts: { r, b, i } };
}

export type Align = "left" | "center" | "right";
export type TextOpts = { size?: number; font?: FontName; align?: Align; color?: [number, number, number] };

export class Canvas {
  readonly W: number;
  readonly H: number;
  readonly page: PDFPage;
  readonly fonts: Fonts;
  constructor(page: PDFPage, fonts: Fonts) {
    this.page = page;
    this.fonts = fonts;
    this.W = page.getWidth();
    this.H = page.getHeight();
  }

  width(s: string, size = 9, font: FontName = "r"): number {
    return this.fonts[font].widthOfTextAtSize(s, size);
  }

  /** Текст одной строкой; y — верх строки. w задаёт ширину для center/right. */
  text(s: string, x: number, y: number, o: TextOpts & { w?: number } = {}): void {
    const size = o.size ?? 9;
    const font = this.fonts[o.font ?? "r"];
    const tw = font.widthOfTextAtSize(s, size);
    let tx = x;
    if (o.align === "center") tx = x + ((o.w ?? 0) - tw) / 2;
    if (o.align === "right") tx = x + (o.w ?? 0) - tw;
    const c = o.color ?? [0, 0, 0];
    this.page.drawText(s, { x: tx, y: this.H - y - size * 0.86, size, font, color: rgb(c[0], c[1], c[2]) });
  }

  /** Перенос по словам; слишком длинное слово режется по буквам. */
  wrap(s: string, w: number, size = 9, font: FontName = "r"): string[] {
    const out: string[] = [];
    for (const para of s.split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const cand = line ? `${line} ${word}` : word;
        if (this.width(cand, size, font) <= w) {
          line = cand;
          continue;
        }
        if (line) out.push(line);
        line = "";
        let rest = word;
        while (this.width(rest, size, font) > w) {
          let cut = rest.length - 1;
          while (cut > 1 && this.width(rest.slice(0, cut), size, font) > w) cut--;
          out.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      out.push(line);
    }
    return out;
  }

  /** Абзац с переносами; возвращает высоту. */
  para(s: string, x: number, y: number, w: number, o: TextOpts & { lead?: number } = {}): number {
    const size = o.size ?? 9;
    const lead = o.lead ?? size * 1.22;
    const lines = this.wrap(s, w, size, o.font);
    lines.forEach((l, i) => this.text(l, x, y + i * lead, { ...o, w }));
    return lines.length * lead;
  }

  paraHeight(s: string, w: number, size = 9, font: FontName = "r", lead = size * 1.22): number {
    return this.wrap(s, w, size, font).length * lead;
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.5): void {
    this.page.drawLine({ start: { x: x1, y: this.H - y1 }, end: { x: x2, y: this.H - y2 }, thickness: width, color: rgb(0, 0, 0) });
  }

  rect(x: number, y: number, w: number, h: number, width = 0.5): void {
    this.page.drawRectangle({ x, y: this.H - y - h, width: w, height: h, borderWidth: width, borderColor: rgb(0, 0, 0) });
  }

  fill(x: number, y: number, w: number, h: number, gray = 0.93): void {
    this.page.drawRectangle({ x, y: this.H - y - h, width: w, height: h, color: rgb(gray, gray, gray) });
  }

  /** Текст в ячейке с отступами, переносом и вертикальным выравниванием. */
  cell(
    s: string,
    x: number,
    y: number,
    w: number,
    h: number,
    o: TextOpts & { pad?: number; valign?: "top" | "middle"; border?: number; lead?: number } = {},
  ): void {
    const pad = o.pad ?? 3;
    const size = o.size ?? 8;
    const lead = o.lead ?? size * 1.2;
    if (o.border !== 0) this.rect(x, y, w, h, o.border ?? 0.5);
    const lines = s ? this.wrap(s, w - pad * 2, size, o.font) : [];
    const th = lines.length * lead;
    const top = o.valign === "top" ? y + pad : y + (h - th) / 2 + (lead - size) / 2;
    lines.forEach((l, i) => this.text(l, x + pad, top + i * lead, { ...o, size, w: w - pad * 2 }));
  }

  /** Высота ячейки под текст. */
  cellHeight(s: string, w: number, o: { size?: number; font?: FontName; pad?: number; lead?: number } = {}): number {
    const size = o.size ?? 8;
    const pad = o.pad ?? 3;
    const lead = o.lead ?? size * 1.2;
    return this.wrap(s, w - pad * 2, size, o.font).length * lead + pad * 2;
  }

  image(img: PDFImage, x: number, y: number, w: number, h: number, opacity = 1): void {
    this.page.drawImage(img, { x, y: this.H - y - h, width: w, height: h, opacity });
  }
}

/** Картинка по центру точки (cx, cy) шириной w, высота — по пропорциям. */
export function drawCentered(c: Canvas, img: PDFImage, cx: number, cy: number, w: number): void {
  const h = (w * img.height) / img.width;
  c.image(img, cx - w / 2, cy - h / 2, w, h);
}
