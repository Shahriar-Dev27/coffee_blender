import { readFileSync } from 'node:fs';
import path from 'node:path';

// The local authored SVG is inlined at build time, with no logo request or client bundle.
const lockup = readFileSync(path.join(process.cwd(), 'public/brand/breou-lockup.svg'), 'utf8').replace(' id="lockup"', '');

export function Wordmark() {
  return <span className="wordmark"><span className="sr-only">BREOU CAFFEE</span><span aria-hidden="true" dangerouslySetInnerHTML={{ __html: lockup }} /></span>;
}
