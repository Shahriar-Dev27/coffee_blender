// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOOT_SCRIPT } from '@/lib/bootScript';
import { initialTier, type TierEnv } from '@/lib/tier';

interface Stub {
  viewportLimited?: boolean;
  reducedMotion?: boolean;
  coarsePointer?: boolean;
  webgl?: boolean | 'throw';
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

const loseContext = vi.fn();
const gl = {
  getExtension: (name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null),
};
let getContextSpy: ReturnType<typeof vi.spyOn>;

function runWith(stub: Stub): void {
  vi.stubGlobal(
    'matchMedia',
    (q: string) => ({
      matches: q.includes('prefers-reduced-motion') ? !!stub.reducedMotion : q.includes('pointer: coarse') ? !!stub.coarsePointer : q.includes('max-width') ? !!stub.viewportLimited : false,
    }),
  );
  vi.stubGlobal('navigator', {
    connection: stub.saveData === undefined ? undefined : { saveData: stub.saveData },
    deviceMemory: stub.deviceMemory,
    hardwareConcurrency: stub.hardwareConcurrency,
  });
  getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => {
    if (stub.webgl === 'throw') throw new Error('no canvas');
    return stub.webgl && (kind === 'webgl2' || kind === 'webgl') ? gl : null;
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
  loseContext.mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BOOT_SCRIPT', () => {
  it('does not create a WebGL context for the intentionally static small viewport', () => {
    runWith({ viewportLimited: true, webgl: true });
    expect(html().dataset.tier).toBe('low');
    expect(getContextSpy).not.toHaveBeenCalled();
  });
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

  it('does not create a WebGL context when reduced motion is on', () => {
    runWith({ reducedMotion: true, webgl: true });
    expect(getContextSpy).not.toHaveBeenCalled();
    expect(loseContext).not.toHaveBeenCalled();
  });

  it('does not create a WebGL context on low-end devices', () => {
    runWith({ deviceMemory: 2, webgl: true });
    expect(getContextSpy).not.toHaveBeenCalled();
    runWith({ saveData: true, webgl: true });
    expect(getContextSpy).not.toHaveBeenCalled();
    runWith({ hardwareConcurrency: 2, webgl: true });
    expect(getContextSpy).not.toHaveBeenCalled();
  });

  it('releases the probe context after a successful probe', () => {
    runWith({ webgl: true });
    expect(getContextSpy).toHaveBeenCalled();
    expect(loseContext).toHaveBeenCalledTimes(1);
    expect(html().dataset.tier).toBe('high');
  });

  it('is a static string with no template placeholders or dangerous APIs', () => {
    expect(BOOT_SCRIPT).toMatch(/^[ -~]*$/);
    expect(BOOT_SCRIPT).not.toMatch(/\$\{/);
    expect(BOOT_SCRIPT).not.toMatch(/`/);
    const banned = [
      'eval', 'Function(', 'fetch', 'XMLHttpRequest', 'localStorage', 'sessionStorage',
      'document.cookie', '</script', '<script', '<!--', 'document.write', 'innerHTML',
      'outerHTML', 'WebSocket', 'sendBeacon', 'indexedDB', 'postMessage', 'location',
      'setTimeout', 'setInterval', 'import',
    ];
    for (const token of banned) expect(BOOT_SCRIPT, token).not.toContain(token);
  });

  it('source builds BOOT_SCRIPT only from string literals joined with +', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/bootScript.ts'), 'utf8');
    const m = /export const BOOT_SCRIPT =([\s\S]*?);\s*$/.exec(src);
    expect(m).not.toBeNull();
    const expr = m![1];
    // Strip every single-quoted literal; only whitespace and + may remain.
    const rest = expr.replace(/'(?:[^'\\\n]|\\.)*'/g, '');
    expect(rest).toMatch(/^[\s+]*$/);
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
