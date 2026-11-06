import { describe, expect, it } from 'vitest';
import { REVEAL, REVEAL_KINDS, headingLabel, isRevealKind, lineText, pastStartLine, revealVars, splitWords, startsHidden } from '@/motion/reveal';
import { MOTION } from '@/motion/tokens';

const ALLOWED = new Set(['opacity', 'y', 'yPercent', 'scale', 'filter']);

describe('reveal tokens', () => {
  it('choreographs label, heading, body, media, then cards', () => {
    expect(REVEAL_KINDS).toEqual(['label', 'heading', 'body', 'media', 'card']);
    const offsets = REVEAL_KINDS.map((kind) => REVEAL.offsets[kind]);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(new Set(offsets).size).toBe(offsets.length);
  });
  it('stays inside the cinematic timing ranges and reuses the shared tokens', () => {
    expect(REVEAL.duration).toBe(MOTION.stageText);
    expect(REVEAL.duration).toBeGreaterThanOrEqual(0.75);
    expect(REVEAL.duration).toBeLessThanOrEqual(1.1);
    expect(REVEAL.wordStagger).toBe(MOTION.wordStagger);
    expect(REVEAL.wordStagger).toBeGreaterThanOrEqual(0.035);
    expect(REVEAL.wordStagger).toBeLessThanOrEqual(0.07);
    expect(REVEAL.itemStagger).toBeGreaterThanOrEqual(0.06);
    expect(REVEAL.itemStagger).toBeLessThanOrEqual(0.1);
    expect(REVEAL.start).toBe('top 82%');
    expect(REVEAL.start).toBe(`top ${Math.round(REVEAL.startFraction * 100)}%`);
  });
});

describe('revealVars', () => {
  it.each(REVEAL_KINDS)('%s animates only transform, opacity and filter and ends at rest', (kind) => {
    const { from, to } = revealVars(kind);
    expect(Object.keys(from).sort()).toEqual(Object.keys(to).sort());
    for (const key of Object.keys(from)) expect(ALLOWED.has(key)).toBe(true);
    if ('opacity' in to) expect(to.opacity).toBe(1);
    if ('y' in to) expect(to.y).toBe(0);
    if ('yPercent' in to) expect(to.yPercent).toBe(0);
    if ('scale' in to) expect(to.scale).toBe(1);
    if ('filter' in to) expect(to.filter).toBe('blur(0px)');
  });
  it('blurs only labels and body text', () => {
    expect(REVEAL_KINDS.filter((kind) => 'filter' in revealVars(kind).from)).toEqual(['label', 'body']);
  });
  it('hides heading words fully below their line mask', () => {
    expect(revealVars('heading').from.yPercent).toBeGreaterThanOrEqual(110);
  });
  it('returns fresh objects', () => {
    const vars = revealVars('body');
    vars.from.opacity = 0.5;
    expect(revealVars('body').from.opacity).toBe(0);
  });
});

describe('viewport rules', () => {
  it('treats a chapter as already revealed once its anchor passed the start line', () => {
    expect(pastStartLine(100, 800)).toBe(true);
    expect(pastStartLine(650, 800)).toBe(true);
    expect(pastStartLine(660, 800)).toBe(false);
    expect(pastStartLine(Number.NaN, 800)).toBe(false);
  });
  it('only hides elements that start fully below the viewport, and fails visible', () => {
    expect(startsHidden(800, 800)).toBe(true);
    expect(startsHidden(799, 800)).toBe(false);
    expect(startsHidden(-50, 800)).toBe(false);
    expect(startsHidden(Number.NaN, 800)).toBe(false);
    expect(startsHidden(900, Number.NaN)).toBe(false);
  });
});

describe('heading text helpers', () => {
  const lines = ['Not just coffee.', 'A small', { text: 'reset.', className: 'outline-type' }] as const;
  it('splits words on any whitespace', () => {
    expect(splitWords('  Not just\tcoffee. ')).toEqual(['Not', 'just', 'coffee.']);
    expect(splitWords('   ')).toEqual([]);
  });
  it('reads line text and builds one spoken sentence', () => {
    expect(lineText(lines[2])).toBe('reset.');
    expect(headingLabel(lines)).toBe('Not just coffee. A small reset.');
  });
  it('recognises reveal kinds', () => {
    expect(isRevealKind('card')).toBe(true);
    expect(isRevealKind('hero')).toBe(false);
    expect(isRevealKind(undefined)).toBe(false);
  });
});
