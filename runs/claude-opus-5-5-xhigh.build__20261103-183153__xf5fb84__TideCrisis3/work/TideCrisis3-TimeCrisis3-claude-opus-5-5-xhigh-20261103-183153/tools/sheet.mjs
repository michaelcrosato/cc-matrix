// node tools/sheet.mjs <out.png> <cols> <width> <image ...>: lays screenshots out in a grid, each labelled with its file
// name, for reviewing a test run's frames at once (headless Chromium over a generated page; file:// only)
import { chromium } from 'playwright';
import { resolve, basename } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
const [out, cols, width, ...imgs] = process.argv.slice(2), n = +cols, w = +width;
process.env.TMPDIR = process.env.TMPDIR || resolve('.tmp'); mkdirSync(process.env.TMPDIR, { recursive: true });
const cell = Math.floor(w / n), html = '<!DOCTYPE html><meta charset="utf-8"><body style="margin:0;background:#111;color:#ddd;font:12px monospace"><div style="display:grid;grid-template-columns:repeat(' + n + ',' + cell + 'px)">' +
  imgs.map(f => '<div><img src="file://' + resolve(f) + '" style="width:' + cell + 'px;display:block"><div style="padding:2px 4px">' + basename(f) + '</div></div>').join('') + '</div></body>';
const page0 = resolve(process.env.TMPDIR, 'sheet.html'); writeFileSync(page0, html);
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: cell * n, height: 400 } });
await p.goto('file://' + page0); await p.waitForLoadState('load'); await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true }); await b.close();
