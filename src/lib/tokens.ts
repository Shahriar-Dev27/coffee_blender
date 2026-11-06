/**
 * Splits a declaration block body on top-level semicolons, ignoring any
 * semicolon inside quotes or parentheses (e.g. `url("data:image/svg+xml;...")`).
 */
function splitDeclarations(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

/** Returns the body of the first `:root { ... }` block, honouring quotes and parentheses. */
function rootBody(css: string): string | null {
  const open = /:root\s*\{/.exec(css);
  if (!open) return null;
  const from = open.index + open[0].length;
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === '}' && depth === 0) return css.slice(from, i);
  }
  return css.slice(from);
}

/** Maps each custom property declared in the `:root` block to its trimmed value. */
export function parseTokensCss(css: string): Record<string, string> {
  const body = rootBody(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  const tokens: Record<string, string> = {};
  if (body === null) return tokens;
  for (const decl of splitDeclarations(body)) {
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const name = decl.slice(0, colon).trim();
    if (!name.startsWith('--')) continue;
    tokens[name] = decl.slice(colon + 1).trim();
  }
  return tokens;
}

/** Computed value of a colour token. Client only: needs a DOM. */
export function readColorToken(
  name: `--color-${string}`,
  root: Element = document.documentElement,
): string {
  return getComputedStyle(root).getPropertyValue(name).trim();
}
