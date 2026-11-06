import { describe, expect, it } from 'vitest';
import {
  TIER_SETTINGS,
  createFrameBudget,
  initialTier,
  stepDown,
  type TierEnv,
} from '@/lib/tier';

const base: TierEnv = {
  reducedMotion: false,
  webgl: true,
  coarsePointer: false,
  saveData: false,
};

describe('initialTier', () => {
  it('returns high for a capable fine-pointer device', () => {
    expect(initialTier(base)).toBe('high');
  });
  it('returns high when optional hints are undefined', () => {
    expect(initialTier({ ...base, deviceMemory: undefined, hardwareConcurrency: undefined })).toBe('high');
  });
  it('returns low for reduced motion', () => {
    expect(initialTier({ ...base, reducedMotion: true })).toBe('low');
  });
  it('returns low without WebGL', () => {
    expect(initialTier({ ...base, webgl: false })).toBe('low');
  });
  it('returns low for saveData', () => {
    expect(initialTier({ ...base, saveData: true })).toBe('low');
  });
  it('returns low for deviceMemory 2 but not 4', () => {
    expect(initialTier({ ...base, deviceMemory: 2 })).toBe('low');
    expect(initialTier({ ...base, deviceMemory: 4 })).toBe('high');
  });
  it('returns low for hardwareConcurrency 2 but not 4', () => {
    expect(initialTier({ ...base, hardwareConcurrency: 2 })).toBe('low');
    expect(initialTier({ ...base, hardwareConcurrency: 4 })).toBe('high');
  });
  it('returns medium for a coarse pointer', () => {
    expect(initialTier({ ...base, coarsePointer: true })).toBe('medium');
  });
  it('low wins over coarse pointer', () => {
    expect(initialTier({ ...base, coarsePointer: true, reducedMotion: true })).toBe('low');
  });
});

describe('stepDown', () => {
  it('steps high -> medium -> low -> low', () => {
    expect(stepDown('high')).toBe('medium');
    expect(stepDown('medium')).toBe('low');
    expect(stepDown('low')).toBe('low');
  });
});

describe('TIER_SETTINGS', () => {
  it('matches the spec', () => {
    expect(TIER_SETTINGS.high).toEqual({ maxDpr: 2, beans: 600, shadows: true });
    expect(TIER_SETTINGS.medium).toEqual({ maxDpr: 1.5, beans: 300, shadows: false });
  });
});

describe('createFrameBudget', () => {
  it('never steps down on steady 16ms frames', () => {
    const b = createFrameBudget();
    for (let t = 0; t <= 5000; t += 16) expect(b.push(16, t)).toBe('ok');
  });

  it('stays ok until 2000ms above the threshold, then steps down once', () => {
    const b = createFrameBudget();
    const steps: number[] = [];
    for (let t = 0; t < 4000; t += 40) {
      const r = b.push(40, t);
      if (r === 'stepDown') steps.push(t);
      else expect(r).toBe('ok');
    }
    // Step down at t=2000; the reset means the next one is not before t=4040.
    expect(steps).toEqual([2000]);
  });

  it('steps down again exactly 2000ms after the reset', () => {
    const b = createFrameBudget();
    let t = 0;
    let first = -1;
    for (; first < 0; t += 40) if (b.push(40, t) === 'stepDown') first = t;
    const resetAt = t; // next frame time after the step down
    let second = -1;
    for (; second < 0 && t < 20000; t += 40) if (b.push(40, t) === 'stepDown') second = t;
    expect(second - resetAt).toBe(2000);
  });

  it('ignores a single 100ms spike among 16ms frames', () => {
    const b = createFrameBudget();
    for (let t = 0, i = 0; t <= 6000; t += 16, i++) {
      expect(b.push(i === 50 ? 100 : 16, t)).toBe('ok');
    }
  });

  it('a brief slow patch that recovers below the threshold never steps down', () => {
    const b = createFrameBudget();
    let t = 0;
    for (let i = 0; i < 3; i++, t += 40) expect(b.push(40, t)).toBe('ok');
    for (; t < 6000; t += 16) expect(b.push(16, t)).toBe('ok');
  });

  it.each([
    ['NaN frameMs', Number.NaN, 0],
    ['Infinity frameMs', Number.POSITIVE_INFINITY, 0],
    ['negative frameMs', -5, 0],
    ['NaN nowMs', 40, Number.NaN],
    ['Infinity nowMs', 40, Number.POSITIVE_INFINITY],
  ])('ignores bad input (%s) without poisoning later behaviour', (_name, frameMs, nowMs) => {
    const b = createFrameBudget();
    expect(b.push(frameMs, nowMs)).toBe('ok');
    const steps: number[] = [];
    for (let t = 0; t <= 2000; t += 40) if (b.push(40, t) === 'stepDown') steps.push(t);
    expect(steps).toEqual([2000]);
  });

  it('resets when the clock goes backwards', () => {
    const b = createFrameBudget();
    for (let t = 1000; t < 2900; t += 40) b.push(40, t);
    // Clock jumps back: prior breach must not count.
    expect(b.push(40, 0)).toBe('ok');
    const steps: number[] = [];
    for (let t = 40; t <= 2000; t += 40) if (b.push(40, t) === 'stepDown') steps.push(t);
    expect(steps).toEqual([2000]);
  });

  it('reset() clears state', () => {
    const b = createFrameBudget();
    for (let t = 0; t < 1900; t += 40) b.push(40, t);
    b.reset();
    for (let t = 1900; t < 3800; t += 40) expect(b.push(40, t)).toBe('ok');
  });

  it('honours custom thresholds', () => {
    const b = createFrameBudget({ thresholdMs: 20, windowMs: 500 });
    let stepped = false;
    for (let t = 0; t <= 600; t += 25) if (b.push(25, t) === 'stepDown') stepped = true;
    expect(stepped).toBe(true);
  });
});
