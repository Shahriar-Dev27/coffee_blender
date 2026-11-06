import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EDITORIAL_BASE, editorialAt } from '@/motion/editorial';

const ritualCss = readFileSync('src/styles/ritual.css', 'utf8');

describe('editorialAt', () => {
  it('starts exactly at the CSS rest pose so arming causes no jump', () => {
    expect(editorialAt(0)).toEqual(EDITORIAL_BASE);
    expect(ritualCss).toMatch(/\.hero-orbit\s*\{[^}]*rotate\(-15deg\)/);
    expect(ritualCss).toMatch(/\.ritual-stamp\s*\{[^}]*rotate\(12deg\)/);
    expect(EDITORIAL_BASE.heroOrbit.rotation).toBe(-15);
    expect(EDITORIAL_BASE.stamp.rotation).toBe(12);
  });
  it('completes the hero exit when the Invitation chapter reaches the top (0.14)', () => {
    const pose = editorialAt(0.14);
    expect(pose.heroWord.yPercent).toBeCloseTo(-16, 10);
    expect(pose.heroWord.scale).toBeCloseTo(0.94, 10);
    expect(pose.heroOrbit.rotation).toBeCloseTo(10, 10);
    expect(pose.heroOrbit.scale).toBeCloseTo(1.1, 10);
  });
  it('completes the stamp turn when Flavor reaches the top (0.27) and holds afterwards', () => {
    expect(editorialAt(0.27).stamp.rotation).toBeCloseTo(-8, 10);
    expect(editorialAt(1)).toEqual(editorialAt(0.27));
  });
  it('is continuous, clamped and NaN-safe', () => {
    let prev = editorialAt(0);
    for (let i = 1; i <= 1000; i++) {
      const next = editorialAt(i / 1000);
      expect(Math.abs(next.heroWord.yPercent - prev.heroWord.yPercent)).toBeLessThan(0.25);
      expect(Math.abs(next.heroOrbit.rotation - prev.heroOrbit.rotation)).toBeLessThan(0.25);
      expect(Math.abs(next.stamp.rotation - prev.stamp.rotation)).toBeLessThan(0.25);
      prev = next;
    }
    expect(editorialAt(-1)).toEqual(EDITORIAL_BASE);
    expect(editorialAt(Number.NaN)).toEqual(EDITORIAL_BASE);
    expect(editorialAt(2)).toEqual(editorialAt(1));
  });
  it('never scales hero type above 1 or the orbit above 1.1 (no horizontal overflow)', () => {
    for (let i = 0; i <= 100; i++) {
      const pose = editorialAt(i / 100);
      expect(pose.heroWord.scale).toBeLessThanOrEqual(1);
      expect(pose.heroOrbit.scale).toBeLessThanOrEqual(1.1 + 1e-12);
    }
  });
});
