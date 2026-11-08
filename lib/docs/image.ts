/**
 * Печать или подпись с фото на белом листе → PNG с прозрачным фоном.
 *
 * Синие чернила отличаются от бумаги и серых теней тем, что синий канал у них
 * заметно больше красного: alpha ≈ (B − R − порог) × усиление. Серые штампы,
 * тени и желтизна бумаги (B ≈ R или B < R) уходят в прозрачность.
 *
 * Чистая функция над RGBA-буфером: её зовёт и браузер (canvas), и скрипт (sharp).
 */

export type Rgba = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };

export type CleanOpts = {
  /** Порог B − R, ниже которого пиксель — бумага. По умолчанию 18. */
  threshold?: number;
  /** Насколько резко нарастает непрозрачность. По умолчанию 7. */
  gain?: number;
  /** Поворот по часовой: 0 / 90 / 180 / 270. */
  rotate?: 0 | 90 | 180 | 270;
  /** Поля вокруг обрезки, px. */
  margin?: number;
  /** Цвет чернил на выходе; по умолчанию тёмно-синий, как у шариковой ручки. */
  ink?: [number, number, number];
};

export function cleanInk(src: Rgba, o: CleanOpts = {}): Rgba {
  const th = o.threshold ?? 18;
  const gain = o.gain ?? 7;
  const ink = o.ink ?? [24, 40, 140];
  const { width: w, height: h, data } = src;
  const out = new Uint8ClampedArray(w * h * 4);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const a = Math.max(0, Math.min(255, (b - r - th) * gain));
      if (a > 0) {
        out[i] = ink[0];
        out[i + 1] = ink[1];
        out[i + 2] = ink[2];
        out[i + 3] = a;
        if (a > 60) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  }
  if (x1 < 0) throw new Error("Синих чернил не нашлось — уменьшите порог или переснимите при хорошем свете");
  const m = o.margin ?? 6;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
  x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
  return rotate(crop({ data: out, width: w, height: h }, x0, y0, x1 - x0 + 1, y1 - y0 + 1), o.rotate ?? 0);
}

export function crop(src: Rgba, x0: number, y0: number, cw: number, ch: number): Rgba {
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const from = ((y0 + y) * src.width + x0) * 4;
    out.set(src.data.subarray(from, from + cw * 4), y * cw * 4);
  }
  return { data: out, width: cw, height: ch };
}

export function rotate(src: Rgba, deg: 0 | 90 | 180 | 270): Rgba {
  if (deg === 0) return src;
  const { width: w, height: h, data } = src;
  const nw = deg === 180 ? w : h;
  const nh = deg === 180 ? h : w;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx: number, ny: number;
      if (deg === 90) { nx = h - 1 - y; ny = x; }
      else if (deg === 180) { nx = w - 1 - x; ny = h - 1 - y; }
      else { nx = y; ny = w - 1 - x; }
      const si = (y * w + x) * 4;
      const di = (ny * nw + nx) * 4;
      out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3];
    }
  }
  return { data: out, width: nw, height: nh };
}
