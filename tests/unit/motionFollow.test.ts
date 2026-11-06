import { describe, expect, it } from 'vitest';
import { MAX_STEP_SECONDS, SETTLE_EPSILON, followProgress } from '@/motion/follow';
import { MOTION } from '@/motion/tokens';

const FRAME = 1 / 60;
function run(from: number, to: number, frames: number, dt = FRAME): number[] {
  let value = from;
  const trace: number[] = [];
  for (let i = 0; i < frames; i++) { value = followProgress(value, to, dt); trace.push(value); }
  return trace;
}

describe('followProgress', () => {
  it('defaults to the 0.8 s story scrub (~98% after one scrub period)', () => {
    expect(MOTION.scrub).toBe(0.8);
    const last = run(0, 1, 48).at(-1)!;
    expect(last).toBeGreaterThan(0.97);
    expect(last).toBeLessThan(0.99);
  });
  it('settles exactly on the target within two seconds, in both directions', () => {
    expect(run(0, 1, 120).at(-1)).toBe(1);
    expect(run(1, 0, 120).at(-1)).toBe(0);
  });
  it('approaches monotonically and never overshoots', () => {
    for (const [from, to] of [[0, 1], [1, 0], [0.43, 0.62]] as const) {
      const trace = [from, ...run(from, to, 150)];
      for (let i = 1; i < trace.length; i++) {
        expect(Math.abs(to - trace[i])).toBeLessThanOrEqual(Math.abs(to - trace[i - 1]));
        expect(trace[i] === to || Math.sign(to - trace[i]) === Math.sign(to - from)).toBe(true);
      }
    }
  });
  it('is frame-rate independent', () => {
    expect(run(0, 1, 60, 1 / 120).at(-1)!).toBeCloseTo(run(0, 1, 30, 1 / 60).at(-1)!, 10);
  });
  it('caps a long frame so a resumed tab does not teleport the story', () => {
    expect(followProgress(0, 1, 5)).toBeCloseTo(1 - Math.exp((-4 * MAX_STEP_SECONDS) / MOTION.scrub), 12);
  });
  it('snaps inside the settle epsilon', () => {
    expect(followProgress(1 - SETTLE_EPSILON / 2, 1, FRAME)).toBe(1);
  });
  it('handles degenerate input without NaN', () => {
    expect(followProgress(Number.NaN, 0.5, FRAME)).toBe(0.5);
    expect(followProgress(0.2, Number.NaN, FRAME)).toBe(0.2);
    expect(followProgress(0.2, 0.6, Number.NaN)).toBe(0.2);
    expect(followProgress(0.2, 0.6, -1)).toBe(0.2);
    expect(followProgress(0.2, 0.6, FRAME, 0)).toBe(0.6);
  });
});
