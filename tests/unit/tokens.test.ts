import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTokensCss } from '@/lib/tokens';
import { hasColourLiteral, stripComments } from '../helpers/literalGuard';

const srcDir = 'src';
const tokensCss = readFileSync(join(srcDir, 'styles', 'tokens.css'), 'utf8');
const globalCss = readFileSync(join(srcDir, 'styles', 'global.css'), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sources = walk(srcDir).filter((f) => /\.(ts|tsx|css|glsl)$/.test(f));

describe('design tokens', () => {
  const tokens = parseTokensCss(tokensCss);

  it('holds the locked palette and motion values', () => {
    expect(tokens['--color-paper']).toBe('#1A0F0A');
    expect(tokens['--color-accent']).toBe('#E0953F');
    expect(tokens['--color-ink']).toBe('#F4E8D8');
    expect(tokens['--color-error']).toBe('#FF8A7A');
    expect(tokens['--ease-out']).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(tokens['--dur-stage-text']).toBe('900ms');
  });

  it('leaves no scaffold placeholder', () => {
    for (const [name, value] of Object.entries(tokens)) {
      expect(value, name).not.toContain('FILL ME');
    }
  });

  // Comments are stripped before matching, so the stamp's oklch(...) text in
  // global.css (prose inside a comment) does not trip the guard.
  it('keeps colour literals out of src except tokens.css', () => {
    const offenders = sources
      .filter((f) => basename(f) !== 'tokens.css')
      .filter((f) => hasColourLiteral(f, readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('keeps quoted font-family names out of CSS except tokens.css and base.css', () => {
    const quoted = /font-family\s*:[^;}]*["']/;
    const offenders = sources
      .filter((f) => f.endsWith('.css'))
      .filter((f) => !['tokens.css', 'base.css'].includes(basename(f)))
      .filter((f) => quoted.test(stripComments(readFileSync(f, 'utf8'), false)));
    expect(offenders).toEqual([]);
  });

  it('starts global.css with the Hallmark stamp', () => {
    const first = globalCss.split(/\r?\n/).find((l) => l.trim() !== '');
    expect(first?.startsWith('/* Hallmark · shape:')).toBe(true);
  });
});

describe('literal guard self-test', () => {
  it.each(['#1A0F0A', 'rgb(0,0,0)', 'oklab(0.5 0 0)', 'hsl(0 0% 0%)', 'color(srgb 1 0 0)'])(
    'flags %s',
    (literal) => {
      expect(hasColourLiteral('x.css', `a { color: ${literal}; }`)).toBe(true);
    },
  );

  it('ignores anchors, comments and url(//) in css', () => {
    expect(hasColourLiteral('x.tsx', '<a href="#hero">a</a> <a href="#add">b</a>')).toBe(false);
    expect(hasColourLiteral('x.css', '/* oklch(1 0 0) #fff */ a { background: url(//cdn.test/x.png); }')).toBe(false);
    expect(hasColourLiteral('x.ts', "// rgb(0,0,0)\nconst a = 1;")).toBe(false);
  });
});

describe('parseTokensCss', () => {
  it('skips a leading @font-face and ignores comments', () => {
    const css = `@font-face { font-family: "X"; src: url(x.woff2); }
:root { /* note: --z: 9; */ --a: 1; --b: url(x); }`;
    expect(parseTokensCss(css)).toEqual({ '--a': '1', '--b': 'url(x)' });
  });

  it('keeps semicolons inside quotes and parentheses', () => {
    const css = ':root { --img: url("data:image/svg+xml;utf8,<svg/>"); --c: 2; color-scheme: dark; }';
    expect(parseTokensCss(css)).toEqual({
      '--img': 'url("data:image/svg+xml;utf8,<svg/>")',
      '--c': '2',
    });
  });
});
