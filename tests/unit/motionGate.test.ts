import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOTION_VIEWPORT_QUERY, REDUCED_MOTION_QUERY, SMOOTH_SCROLL, motionAllowed, type MotionEnv } from '@/motion/gate';

const base: MotionEnv = { search: '', viewportOk: true, reducedMotion: false, tier: 'high' };

describe('motionAllowed', () => {
  it('allows the high and medium tiers on a large viewport', () => {
    expect(motionAllowed(base)).toBe(true);
    expect(motionAllowed({ ...base, tier: 'medium' })).toBe(true);
  });
  it('keeps the previous behaviour when no tier was set', () => {
    expect(motionAllowed({ ...base, tier: undefined })).toBe(true);
  });
  it.each(['?capture', '?capture=0.43', '?x=1&capture'])('opts out for %s', (search) => {
    expect(motionAllowed({ ...base, search })).toBe(false);
  });
  it('ignores unrelated query strings', () => {
    expect(motionAllowed({ ...base, search: '?utm=1' })).toBe(true);
  });
  it('opts out for small viewports, reduced motion and the low tier', () => {
    expect(motionAllowed({ ...base, viewportOk: false })).toBe(false);
    expect(motionAllowed({ ...base, reducedMotion: true })).toBe(false);
    expect(motionAllowed({ ...base, tier: 'low' })).toBe(false);
  });
});

describe('gate constants', () => {
  it('uses the same media queries as StageVisual', () => {
    const stageVisual = readFileSync('src/components/stage/StageVisual.tsx', 'utf8');
    expect(stageVisual).toContain(`'${MOTION_VIEWPORT_QUERY}'`);
    expect(stageVisual).toContain(`'${REDUCED_MOTION_QUERY}'`);
  });
  it('pins the Lenis options', () => {
    expect(SMOOTH_SCROLL).toEqual({ lerp: 0.08, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false, anchors: true, autoRaf: false });
  });
});
