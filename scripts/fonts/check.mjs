import fs from 'node:fs';
for (const name of ['bricolage-grotesque-latin', 'instrument-sans-latin']) {
  const data = fs.readFileSync(`public/fonts/${name}.woff2`);
  if (data.subarray(0, 4).toString() !== 'wOF2') throw Error(`Invalid WOFF2: ${name}`);
}
for (const name of ['Bricolage-Grotesque', 'Instrument-Sans']) {
  if (!fs.readFileSync(`public/fonts/OFL-${name}.txt`, 'utf8').includes('SIL OPEN FONT LICENSE')) throw Error(`Missing OFL: ${name}`);
}
console.log('Vendored fonts and OFL licenses verified.');
