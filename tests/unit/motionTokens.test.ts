import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FLAGS } from '@/config/flags';
import { MOTION, registerEases } from '@/motion/tokens';
import { parseTokensCss } from '@/lib/tokens';

const tokensCss = readFileSync(
  fileURLToPath(new URL('../../src/styles/tokens.css', import.meta.url)),
  'utf8',
);
const tokens = parseTokensCss(tokensCss);

function ms(name: string): number {
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`missing token ${name}`);
  return Number(raw.replace(/ms$/, ''));
}

describe('MOTION tokens match tokens.css', () => {
  it('pins the whole MOTION object', () => {
    expect(MOTION).toEqual({
      ease: 'breou',
      easeCss: 'cubic-bezier(0.22, 1, 0.36, 1)',
      feedback: 0.12,
      ui: 0.24,
      panel: 0.48,
      stageText: 0.9,
      scrub: 0.8,
      wordStagger: 0.05,
      lineStagger: 0.1,
      magnetic: { duration: 0.45, maxScale: 1.02, strength: 0.3 },
    });
  });

  it('easeCss equals --ease-out', () => {
    expect(MOTION.easeCss).toBe(tokens['--ease-out']);
  });

  it('feedback, ui, panel and stageText match the duration tokens in ms', () => {
    expect(Math.round(MOTION.feedback * 1000)).toBe(ms('--dur-micro'));
    expect(Math.round(MOTION.ui * 1000)).toBe(ms('--dur-short'));
    expect(Math.round(MOTION.panel * 1000)).toBe(ms('--dur-long'));
    expect(Math.round(MOTION.stageText * 1000)).toBe(ms('--dur-stage-text'));
  });

  it('scrub is 0.8', () => {
    expect(MOTION.scrub).toBe(0.8);
  });

  it('magnetic maxScale stays below 1.03', () => {
    expect(MOTION.magnetic.maxScale).toBeLessThan(1.03);
  });
});

describe('FLAGS', () => {
  it('smoothScroll is disabled', () => {
    expect(FLAGS.smoothScroll).toBe(false);
  });
});

describe('registerEases', () => {
  function fakeGsap() {
    const plugins: unknown[] = [];
    return {
      plugins,
      registerPlugin(...items: unknown[]) {
        plugins.push(...items);
      },
    };
  }

  // Same shape as the real gsap CustomEase: a class (typeof 'function') with a static create.
  function fakeCustomEase() {
    const created: Array<{ name: string; path: string }> = [];
    const CustomEase = function CustomEase() {};
    return Object.assign(CustomEase, {
      created,
      create(name: string, path: string) {
        created.push({ name, path });
        return {};
      },
    });
  }

  it('registers the plugin and creates the breou ease once, even when called twice', () => {
    const gsap = fakeGsap();
    const CustomEase = fakeCustomEase();

    registerEases(gsap as unknown as Parameters<typeof registerEases>[0], CustomEase);
    registerEases(gsap as unknown as Parameters<typeof registerEases>[0], CustomEase);

    expect(gsap.plugins).toEqual([CustomEase]);
    expect(CustomEase.created).toEqual([
      { name: 'breou', path: 'M0,0 C0.22,1 0.36,1 1,1' },
    ]);
  });

  it('throws a TypeError when CustomEase does not look like the plugin', () => {
    const gsap = fakeGsap();
    expect(() =>
      registerEases(gsap as unknown as Parameters<typeof registerEases>[0], {}),
    ).toThrow(TypeError);
    expect(() =>
      registerEases(gsap as unknown as Parameters<typeof registerEases>[0], null),
    ).toThrow(TypeError);
    expect(gsap.plugins).toEqual([]);
  });
});
