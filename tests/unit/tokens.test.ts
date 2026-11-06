import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTokensCss } from '@/lib/tokens';

const srcDir = 'src';
const tokensCss = readFileSync(join(srcDir, 'styles', 'tokens.css'), 'utf8');
const globalCss = readFileSync(join(srcDir, 'styles', 'global.css'), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Comments are stripped before matching, so the stamp's oklch(...) text in
// global.css (which is prose inside a comment) does not trip the literal guard.
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
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

  it('keeps colour literals out of src except tokens.css', () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/;
    const offenders = sources
      .filter((f) => basename(f) !== 'tokens.css')
      .filter((f) => literal.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders).toEqual([]);
  });

  it('keeps quoted font-family names out of CSS except tokens.css and base.css', () => {
    const quoted = /font-family\s*:[^;}]*["']/;
    const offenders = sources
      .filter((f) => f.endsWith('.css'))
      .filter((f) => !['tokens.css', 'base.css'].includes(basename(f)))
      .filter((f) => quoted.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders).toEqual([]);
  });

  it('starts global.css with the Hallmark stamp', () => {
    const first = globalCss.split(/\r?\n/).find((l) => l.trim() !== '');
    expect(first?.startsWith('/* Hallmark · shape:')).toBe(true);
  });
});
