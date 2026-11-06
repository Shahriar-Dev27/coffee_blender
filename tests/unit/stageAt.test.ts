import { describe, expect, it } from 'vitest';
import { STAGES, stillFile } from '@/config/stages';
import { stageAt } from '@/lib/stageAt';

describe('stageAt', () => {
  it.each([
    [0, 1, 0],
    [0.07, 1, 0.5],
    [0.14, 2, 0],
    [0.24, 2, 0.5],
    [0.34, 3, 0],
    [0.54, 4, 0],
    [0.66, 4, 0.5],
    [0.78, 5, 0],
    [1, 5, 1],
    [-0.2, 1, 0],
    [1.3, 5, 1],
    [NaN, 1, 0],
  ])('maps progress %s to stage %i, local %f', (progress, stage, local) => {
    const result = stageAt(progress);
    expect(result.stage).toBe(stage);
    expect(result.local).toBeCloseTo(local, 6);
  });
});

describe('STAGES', () => {
  it('is contiguous from 0 to 1', () => {
    expect(STAGES[0].start).toBe(0);
    for (let i = 0; i < STAGES.length - 1; i++) {
      expect(STAGES[i].end).toBe(STAGES[i + 1].start);
    }
    expect(STAGES[STAGES.length - 1].end).toBe(1);
  });

  it('numbers stages 1 to 5 in order', () => {
    expect(STAGES.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('stillFile', () => {
  it('builds the desktop AVIF path for stage 1', () => {
    expect(stillFile(1, 'desktop', 'avif')).toBe('/assets/poster-s1-cup-2400x1350.avif');
  });

  it('builds the mobile WebP path for stage 3', () => {
    expect(stillFile(3, 'mobile', 'webp')).toBe('/assets/poster-s3-beans-in-1200x1500.webp');
  });
});
