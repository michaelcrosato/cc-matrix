// Bundles the sources (per src/manifest.json) into the one HTML file TASK.md names, writes the dev page, and writes the exit interview from
// src/about-data.json, so the About screen, the file and the final reply can't disagree. node tools/build.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const root = new URL('..', import.meta.url), R = f => readFileSync(new URL(f, root), 'utf8');
const NAME = 'TraumaBenderSecondOpinion-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-054007';
const man = JSON.parse(R('src/manifest.json')), files = [...man.sim, ...man.game];
const ENGINE = 'vendor/my-3d2dge/dist/handoff/my-3d2dge.js', SESSION = 'vendor/hub/session.js';
const cfgSrc = R('src/config.js'), GAME_TITLE = cfgSrc.match(/G\.GAME_TITLE = '([^']+)'/)[1], TITLE_MAIN = cfgSrc.match(/G\.TITLE_MAIN = '([^']+)'/)[1];
const cfg = { title: GAME_TITLE, goal: 'Save the patient together; best hands top the board', howto: 'Aim: right stick or mouse. Use tool: R2 or click. Tools: left stick or 1-8' };
const style = 'html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}html .esh-row small{display:none}html .esh-row:focus-within small{display:block}';
const splash = title => `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">${title}</b><span>Starting · my-3D2dge v0.89.1</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#5ff0e0;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const head = sessionTag => `<!doctype html><html lang="en"><head><meta charset="utf-8">
${sessionTag}
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="${cfg.goal}">
<meta name="hub:session-howto" content="${cfg.howto}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${cfg.title}</title>
<style>${style}</style></head>`;
const aboutPath = new URL('src/about-data.json', root);
const about = existsSync(aboutPath) ? JSON.parse(readFileSync(aboutPath, 'utf8')) : null;
const aboutJs = `window.GAME_ABOUT = ${JSON.stringify(about)};`;

// the dev page: the sources one by one
writeFileSync(new URL('index.dev.html', root), head(`<script src="${SESSION}"></script>`) + `\n<body>${splash(TITLE_MAIN)}<canvas id="screen"></canvas>\n<script src="${ENGINE}"></script>\n<script>${esc(aboutJs)}</script>\n` + files.map(f => `<script src="${f}"></script>`).join('\n') + `\n</body></html>\n`);

// the one file: session.js verbatim first, then the engine, then the game
const session = R(SESSION), engine = R(ENGINE), game = files.map(f => `// ${f}\n` + R(f)).join('\n');
const page = head(`<script>${session}</script>`) + `\n<body>${splash(TITLE_MAIN)}<canvas id="screen"></canvas>\n<script>${esc(engine)}</script>\n<script>${esc(aboutJs)}\n${esc(game)}</script>\n</body></html>\n`;
const out = new URL(`../${NAME}.html`, root); writeFileSync(out, page);
// a copy for the Hub harness, which serves the game beside it
mkdirSync(new URL('notes/harness/', root), { recursive: true }); writeFileSync(new URL('notes/harness/game.html', root), page);
for (const f of ['harness.html', 'bridge.js', 'round.js']) writeFileSync(new URL('notes/harness/' + f, root), R('vendor/hub/' + f));

// the exit interview, in exactly TASK.md's shape
if (about) writeFileSync(new URL('../exit-interview.json', root), JSON.stringify({ sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub }, null, 2) + '\n');
if (process.argv.includes('-v')) console.log('built', (page.length / 1024 | 0) + ' KB');
