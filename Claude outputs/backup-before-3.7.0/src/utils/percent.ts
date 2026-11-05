/** Percentages are shown with one decimal place everywhere: 35.0%, 12.4%. */
export const r1 = (n: number) => Math.round(n * 10) / 10;
/** "35.4" (no % sign); templates add the sign themselves. */
export const p1 = (n: number) => r1(n).toFixed(1);
