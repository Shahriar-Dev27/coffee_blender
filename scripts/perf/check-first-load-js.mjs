import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const html = await (await fetch(base)).text();
const tags = [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)];
const paths = [...new Set(tags.filter((match) => !/\bnomodule\b/i.test(match[0])).map((match) => match[1]))];
let total = 0;
const rows = [];
for (const path of paths) {
 const bytes = Buffer.from(await (await fetch(new URL(path, base))).arrayBuffer());
 const gzip = gzipSync(bytes).length; total += gzip; rows.push({ path, bytes: bytes.length, gzip });
}
const result = { initialJavaScriptGzip: total, budget: 150 * 1024, pass: total <= 150 * 1024, excluded: 'noModule compatibility script (modern browsers do not download it)', chunks: rows };
console.log(JSON.stringify(result, null, 2));
await fs.mkdir('art/qa', { recursive: true });
await fs.writeFile('art/qa/js-budget.json', JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
