export type Tier = 'high' | 'medium' | 'low';

export interface TierEnv {
  reducedMotion: boolean;
  webgl: boolean;
  coarsePointer: boolean;
  saveData: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export const TIER_SETTINGS = {
  high: { maxDpr: 2, beans: 600, shadows: true },
  medium: { maxDpr: 1.5, beans: 300, shadows: false },
} as const;

/**
 * Picks the starting quality tier. NOTE: the boot script in `bootScript.ts`
 * duplicates this logic as a static string; tests assert the two agree.
 * Keep them in sync.
 */
export function initialTier(env: TierEnv): Tier {
  const lowEnd =
    (env.deviceMemory !== undefined && env.deviceMemory <= 2) ||
    env.saveData ||
    (env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 2);
  if (env.reducedMotion || !env.webgl || lowEnd) return 'low';
  if (env.coarsePointer) return 'medium';
  return 'high';
}

export function stepDown(t: Tier): Tier {
  if (t === 'high') return 'medium';
  return 'low';
}

/**
 * Watches frame times. `push` returns 'stepDown' once the p95 frame time over
 * the trailing window has stayed above the threshold continuously for a full
 * window; it then resets itself.
 */
export function createFrameBudget(opts: { thresholdMs?: number; windowMs?: number } = {}): {
  push(frameMs: number, nowMs: number): 'ok' | 'stepDown';
  reset(): void;
} {
  const thresholdMs = opts.thresholdMs ?? 33;
  const windowMs = opts.windowMs ?? 2000;
  let samples: Array<{ ms: number; at: number }> = [];
  let breachStart: number | null = null;

  function p95(): number {
    const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
  }

  function reset(): void {
    samples = [];
    breachStart = null;
  }

  function push(frameMs: number, nowMs: number): 'ok' | 'stepDown' {
    samples.push({ ms: frameMs, at: nowMs });
    while (samples.length > 0 && nowMs - samples[0].at > windowMs) samples.shift();

    if (p95() > thresholdMs) {
      if (breachStart === null) breachStart = nowMs;
      if (nowMs - breachStart >= windowMs) {
        reset();
        return 'stepDown';
      }
    } else {
      breachStart = null;
    }
    return 'ok';
  }

  return { push, reset };
}
