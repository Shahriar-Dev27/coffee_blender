export const CHAPTERS = [
  { id: 'arrival', progress: 0 },
  { id: 'ritual', progress: .14 },
  { id: 'flavor', progress: .27 },
  { id: 'pour', progress: .43 },
  { id: 'make-yours', progress: .62 },
  { id: 'order', progress: 1 },
] as const;

/** Measured document offsets keep scene events aligned after resize, zoom and font load. */
export function progressAt(scrollY: number, positions: readonly number[]): number {
  if (!Number.isFinite(scrollY) || positions.length !== CHAPTERS.length) return 0;
  if (scrollY <= positions[0]) return 0;
  for (let i = 0; i < positions.length - 1; i++) {
    if (scrollY <= positions[i + 1]) {
      const local = (scrollY - positions[i]) / Math.max(1, positions[i + 1] - positions[i]);
      return CHAPTERS[i].progress + local * (CHAPTERS[i + 1].progress - CHAPTERS[i].progress);
    }
  }
  return 1;
}
