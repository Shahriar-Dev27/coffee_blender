// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOT_SCRIPT } from '@/lib/bootScript';
import { initialTier, type TierEnv } from '@/lib/tier';

interface Stub {
  reducedMotion?: boolean;
  coarsePointer?: boolean;
  webgl?: boolean | 'throw';
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

function runWith(stub: Stub): void {
  vi.stubGlobal(
    'matchMedia',
    (q: string) => ({
      matches: q.includes('prefers-reduced-motion') ? !!stub.reducedMotion : q.includes('pointer: coarse') ? !!stub.coarsePointer : false,
    }),
  );
  vi.stubGlobal('navigator', {
    connection: stub.saveData === undefined ? undefined : { saveData: stub.saveData },
    deviceMemory: stub.deviceMemory,
    hardwareConcurrency: stub.hardwareConcurrency,
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => {
    if (stub.webgl === 'throw') throw new Error('no canvas');
    return stub.webgl && (kind === 'webgl2' || kind === 'webgl') ? {} : null;
  }) as never);
  // Evaluate exactly as the browser would: a classic inline script.
  new Function(BOOT_SCRIPT)();
}

const html = () => document.documentElement;

beforeEach(() => {
  html().className = '';
  delete html().dataset.tier;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BOOT_SCRIPT', () => {
  it('reduced motion: js only, tier low', () => {
    runWith({ reducedMotion: true, webgl: true });
    expect(html().classList.contains('js')).toBe(true);
    expect(html().classList.contains('has-motion')).toBe(false);
    expect(html().dataset.tier).toBe('low');
  });

  it('no WebGL: low', () => {
    runWith({ webgl: false });
    expect(html().dataset.tier).toBe('low');
    expect(html().classList.contains('has-motion')).toBe(false);
  });

  it('fine pointer with WebGL: has-motion and high', () => {
    runWith({ webgl: true });
    expect(html().classList.contains('js')).toBe(true);
    expect(html().classList.contains('has-motion')).toBe(true);
    expect(html().dataset.tier).toBe('high');
  });

  it('coarse pointer: medium with has-motion', () => {
    runWith({ webgl: true, coarsePointer: true });
    expect(html().dataset.tier).toBe('medium');
    expect(html().classList.contains('has-motion')).toBe(true);
  });

  it('getContext throwing: low and the script does not throw', () => {
    expect(() => runWith({ webgl: 'throw' })).not.toThrow();
    expect(html().classList.contains('js')).toBe(true);
    expect(html().classList.contains('has-motion')).toBe(false);
    expect(html().dataset.tier).toBe('low');
  });

  it('matchMedia missing: low and does not throw', () => {
    vi.stubGlobal('matchMedia', undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(() => new Function(BOOT_SCRIPT)()).not.toThrow();
    expect(html().dataset.tier).toBe('low');
  });

  it('is a static string with no template placeholders or dangerous APIs', () => {
    expect(BOOT_SCRIPT).not.toMatch(/\$\{/);
    expect(BOOT_SCRIPT).not.toMatch(/eval|Function\(|fetch|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|<\/script/);
  });

  it('agrees with initialTier across a table of environments', () => {
    const bools = [false, true];
    const mems = [undefined, 1, 2, 4, 8];
    const cores = [undefined, 1, 2, 4, 8];
    for (const reducedMotion of bools)
      for (const webgl of bools)
        for (const coarsePointer of bools)
          for (const saveData of bools)
            for (const deviceMemory of mems)
              for (const hardwareConcurrency of cores) {
                html().className = '';
                delete html().dataset.tier;
                vi.restoreAllMocks();
                const env: TierEnv = { reducedMotion, webgl, coarsePointer, saveData, deviceMemory, hardwareConcurrency };
                runWith({ reducedMotion, webgl, coarsePointer, saveData, deviceMemory, hardwareConcurrency });
                const expected = initialTier(env);
                expect(html().dataset.tier, JSON.stringify(env)).toBe(expected);
                expect(html().classList.contains('has-motion'), JSON.stringify(env)).toBe(expected !== 'low');
              }
  });
});
