// Lists every request the built file makes, opened from file://.
import { chromium } from 'playwright'; import { dirname, join } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(dirname(fileURLToPath(import.meta.url))); const url = pathToFileURL(join(here, '..', `${here.split('/').pop()}.html`)).href;
const b = await chromium.launch({ args: ['--no-sandbox'] }); const p = await b.newPage(); const req = []; p.on('request', r => { if (!r.url().startsWith('data:') && !r.url().startsWith('blob:')) req.push(r.url()); }); await p.goto(url); await p.waitForTimeout(8000); await b.close(); const ext = req.filter(u => u !== url); console.log(`requests beyond the file itself: ${ext.length}`, ext.slice(0, 5));
