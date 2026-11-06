import { STAGES, type StageId } from '@/config/stages';

/**
 * Maps the single scroll progress value (0 to 1) to the current stage and the
 * progress inside it. NaN is treated as 0; out-of-range values are clamped.
 * Each stage covers [start, end), and progress 1 maps to the last stage at local 1.
 */
export function stageAt(progress: number): { stage: StageId; local: number } {
  const p = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  const last = STAGES[STAGES.length - 1];

  if (p >= last.end) {
    return { stage: last.id, local: 1 };
  }

  for (const s of STAGES) {
    if (p >= s.start && p < s.end) {
      return { stage: s.id, local: (p - s.start) / (s.end - s.start) };
    }
  }

  // Unreachable for a contiguous table starting at 0; keep the first stage as a safe default.
  return { stage: STAGES[0].id, local: 0 };
}
