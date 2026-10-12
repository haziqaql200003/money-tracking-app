/**
 * Font size that makes `text` fit on one line in `availableWidth`, never below `minScale` of `base`.
 * Worked out from the text length instead of the native adjustsFontSizeToFit, which on iOS can collapse to a tiny size
 * when the text sits in a flexible card layout (the balance on the Home cards).
 */
const DIGIT_WIDTH = 0.6; // average glyph width as a fraction of the font size (bold, tabular digits)

export function fitFontSize(text: string, availableWidth: number, base: number, minScale = 0.6): number {
  if (!availableWidth || availableWidth <= 0 || text.length === 0) return base;
  const needed = text.length * base * DIGIT_WIDTH;
  if (needed <= availableWidth) return base;
  const scaled = Math.floor((availableWidth / needed) * base);
  return Math.max(Math.floor(base * minScale), scaled);
}
