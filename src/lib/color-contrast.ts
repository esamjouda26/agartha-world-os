export type Rgba = Readonly<{ r: number; g: number; b: number; a: number }>;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGBA_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

export function parseColor(value: string): Rgba {
  const v = value.trim();

  const hex = HEX_RE.exec(v);
  if (hex) {
    let h = hex[1] as string;
    if (h.length === 3 || h.length === 4) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgba = RGBA_RE.exec(v);
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }

  throw new Error(`color-contrast: cannot parse "${value}"`);
}

/** Composite a (potentially translucent) foreground over an opaque background. */
export function compositeOver(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a),
    g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a),
    b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a),
    a: 1,
  };
}

/** WCAG 2.x relative luminance per https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
export function relativeLuminance(color: Rgba): number {
  const channel = (n: number) => {
    const v = n / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** WCAG contrast ratio. Both colors must be opaque; composite alpha first. */
export function contrastRatio(fg: string, bg: string): number {
  const bgRgba = parseColor(bg);
  const fgRgba = parseColor(fg);
  const fgComposed = fgRgba.a < 1 ? compositeOver(fgRgba, bgRgba) : fgRgba;
  const l1 = relativeLuminance(fgComposed);
  const l2 = relativeLuminance(bgRgba);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export type WcagVerdict = "AAA" | "AA" | "AA-large" | "FAIL";

export function classifyText(ratio: number): WcagVerdict {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "FAIL";
}

export function classifyUi(ratio: number): "PASS" | "FAIL" {
  return ratio >= 3 ? "PASS" : "FAIL";
}
