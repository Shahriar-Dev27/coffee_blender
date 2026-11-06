import { describe, expect, it } from 'vitest';
import { SCENE_SETTLE_EPSILON, dampSettled } from '@/scene/settle';

describe('dampSettled', () => {
  it('eases without snapping while the gap is still above the epsilon', () => {
    const next = dampSettled(1, 0, 10, 1 / 60);
    expect(next).toBeGreaterThan(SCENE_SETTLE_EPSILON);
    expect(next).toBeLessThan(1);
  });
  it('snaps exactly onto the target once the gap is below the epsilon', () => {
    expect(dampSettled(SCENE_SETTLE_EPSILON / 2, 0, 10, 1 / 60)).toBe(0);
    expect(dampSettled(0.9995, 1, 10, 1 / 60)).toBe(1);
  });
  it('reaches a true fixed point in both directions and stays there', () => {
    for (const [from, to] of [[1, 0], [0, 1], [0.3, 0.8]]) {
      let value = from;
      let frames = 0;
      while (value !== to && frames < 600) { value = dampSettled(value, to, 10, 1 / 60); frames++; }
      expect(value).toBe(to);
      expect(frames).toBeLessThan(120);
      expect(dampSettled(value, to, 10, 1 / 60)).toBe(to);
    }
  });
});
