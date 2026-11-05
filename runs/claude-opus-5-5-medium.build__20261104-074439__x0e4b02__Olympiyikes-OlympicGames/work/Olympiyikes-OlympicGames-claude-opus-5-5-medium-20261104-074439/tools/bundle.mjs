// Builds the single-file deliverable from index.html's script list: the hub client first (byte-for-byte), then the engine and the game.
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url), OUT = new URL('../../Olympiyikes-OlympicGames-claude-opus-5-5-medium-20261104-074439.html', import.meta.url);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = readFileSync(new URL('vendor/hub/session.js', ROOT), 'utf8');
if (session.includes('</script')) throw new Error('session.js contains </script>');
const body = srcs.filter(s => !s.includes('session.js')).map(s => esc(readFileSync(new URL(s, ROOT), 'utf8'))).join('\n;\n');
const head = html.slice(html.indexOf('<meta name="viewport"'), html.indexOf('</head>'));
const icon = '<link rel="icon" href="data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#0c1028" stroke="#f2b632" stroke-width="2"/><path d="M16 4 C9 12 9 22 16 27Z" fill="#ff7a2a"/><path d="M16 4 C23 12 23 22 16 27Z" fill="#3fa8e8"/></svg>') + '">';
const out = '<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>' + session + '</script>\n' + head + icon + '\n</head>\n<body>\n<canvas id="screen"></canvas>\n<script>\n' + body + '\n</script>\n</body>\n</html>\n';
writeFileSync(OUT, out);
console.log('bundle', (out.length / 1024 / 1024).toFixed(2) + ' MB', OUT.pathname.split('/').pop());
