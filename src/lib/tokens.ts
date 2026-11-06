/** Maps each custom property declared in the `:root` block to its trimmed value. */
export function parseTokensCss(css: string): Record<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const block = /:root\s*\{([^}]*)\}/.exec(withoutComments);
  const tokens: Record<string, string> = {};
  if (!block) return tokens;
  for (const decl of block[1].split(';')) {
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
