import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { describe, expect, it } from 'vitest';
import { registerEases } from '@/motion/tokens';

// Reference value for cubic-bezier(0.22, 1, 0.36, 1) at progress x, found by
// bisection on the curve parameter t, since y is only known as a function of t.
const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
function bezier(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}
function referenceEase(x: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, x1, x2) < x) lo = mid;
    else hi = mid;
  }
  return bezier((lo + hi) / 2, y1, y2);
}

describe('registerEases with the real gsap CustomEase', () => {
  it('registers twice without throwing and exposes a working breou ease', () => {
    expect(() => registerEases(gsap, CustomEase)).not.toThrow();
    expect(() => registerEases(gsap, CustomEase)).not.toThrow();

    const ease = gsap.parseEase('breou');
    expect(typeof ease).toBe('function');
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(Math.abs(ease(p) - referenceEase(p))).toBeLessThan(1e-3);
    }
  });
});
