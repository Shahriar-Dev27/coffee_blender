import fs from 'node:fs/promises';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const chrome = await launch({ chromePath: process.env.CHROME_PATH || (process.env.CI ? chromium.executablePath() : undefined), chromeFlags: ['--headless=new', '--disable-extensions'], port: 0 });
await fs.mkdir('art/qa', { recursive: true });
const runs = [];
try {
 for (let i = 0; i < 3; i++) {
  const result = await lighthouse(base, { port: chrome.port, output: 'html', onlyCategories: ['performance','accessibility'], logLevel: 'error', formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false } });
  if (!result) throw Error('No Lighthouse result');
  const audits = result.lhr.audits;
  const metrics = { performance: result.lhr.categories.performance.score, accessibility: result.lhr.categories.accessibility.score, LCP: audits['largest-contentful-paint'].numericValue, CLS: audits['cumulative-layout-shift'].numericValue, TBT: audits['total-blocking-time'].numericValue, FCP: audits['first-contentful-paint'].numericValue };
  runs.push(metrics);
  await fs.writeFile('art/qa/lighthouse-'+(i+1)+'.html', result.report);
  console.log('Run '+(i+1), JSON.stringify(metrics));
 }
 const median = (key) => runs.map((run) => run[key]).sort((a,b) => a-b)[1];
 const result = { median: Object.fromEntries(Object.keys(runs[0]).map((key) => [key,median(key)])), runs };
 await fs.writeFile('art/qa/lighthouse.json', JSON.stringify(result,null,2));
 console.log('Median',JSON.stringify(result.median));
 if (result.median.LCP > 2500 || result.median.CLS > .1) process.exitCode = 1;
} finally { await chrome.kill(); }
