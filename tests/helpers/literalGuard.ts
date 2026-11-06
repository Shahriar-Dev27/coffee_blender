/**
 * Colour literals that must live only in tokens.css. The lookbehind exempts
 * href="#add"-style anchors, whose ids can be valid hex (add, bad, fee).
 */
export const COLOUR_LITERAL =
  /(?<!href=["'])#[0-9a-fA-F]{3,8}\b(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/;

/**
 * Removes comments while respecting quoted strings, so a "/*" or "//" inside a
 * string (e.g. url("//cdn...")) is left alone. `/* *\/` comments go in every
 * file type; `//` line comments only when `lineComments` is true (ts, tsx, glsl,
 * never css).
 */
export function stripComments(text: string, lineComments: boolean): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < text.length) {
        out += next;
        i += 2;
        continue;
      }
      // A bare apostrophe in JSX text must not swallow the rest of the file:
      // plain quotes end at a newline.
      if (ch === quote || (ch === '\n' && quote !== '`')) quote = null;
      i++;
    } else if (ch === '"' || ch === "'" || (lineComments && ch === '`')) {
      quote = ch;
      out += ch;
      i++;
    } else if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      out += ' ';
    } else if (lineComments && ch === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length : end;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

export function hasColourLiteral(filename: string, text: string): boolean {
  const lineComments = /\.(ts|tsx|glsl)$/.test(filename);
  return COLOUR_LITERAL.test(stripComments(text, lineComments));
}
