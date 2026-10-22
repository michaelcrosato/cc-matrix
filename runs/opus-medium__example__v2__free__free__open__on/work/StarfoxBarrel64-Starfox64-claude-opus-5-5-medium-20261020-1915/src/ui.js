// 10-foot, controller-first UI: menus, HUD, radio, cards, results.
import { THREE, gfx } from './gfx.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { settings, saveSettings, DEFAULT_SETTINGS, DIFFICULTY, GAME_TITLE, save, clamp } from './config.js';
import { CAST, MISSIONS } from './levels.js';
import { ABOUT_SECTIONS } from './about.js';

const CSS = `
:root{--hud:#eaf6ff;--accent:#39d0ff;--gold:#ffc83a;--red:#ff4d5e;--green:#5fe08a;--panel:rgba(8,14,34,.72);--edge:rgba(120,200,255,.55);--fs:1}
*{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden;background:#000;font-family:"Trebuchet MS","Segoe UI",system-ui,sans-serif;color:var(--hud);user-select:none;-webkit-user-select:none}
canvas{display:block}
#ui{position:fixed;inset:0;pointer-events:none;font-size:calc(1.9vmin * var(--fs))}
.layer{position:absolute;inset:0}
.hidden{display:none!important}
.safe{position:absolute;inset:4.5vmin 5vmin}
.panel{background:var(--panel);border:.25vmin solid var(--edge);border-radius:1.6vmin;box-shadow:0 0 3vmin rgba(40,160,255,.25),inset 0 0 2vmin rgba(40,160,255,.12);backdrop-filter:blur(4px)}
.glyph{display:inline-flex;align-items:center;justify-content:center;min-width:2.6em;height:2.1em;padding:0 .5em;border-radius:1.05em;font-weight:800;font-size:.85em;background:#1d2440;border:.18vmin solid #8aa0d8;color:#fff;margin:0 .2em;vertical-align:middle;letter-spacing:.02em;line-height:1}
.glyph.round{min-width:2.1em;width:2.1em;padding:0;border-radius:50%;font-size:1em}
.glyph.key{border-radius:.45em;background:#2a2f45;border-color:#c8d0e8;box-shadow:0 .25vmin 0 #8890a8}
.g-x{color:#8fb8ff;border-color:#8fb8ff}.g-o{color:#ff7b7b;border-color:#ff7b7b}.g-s{color:#ff9ae0;border-color:#ff9ae0}.g-t{color:#6ff0b0;border-color:#6ff0b0}
/* ---------- title ---------- */
#title{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:9vh}
.logo{font-size:10.5vmin;font-weight:900;font-style:italic;letter-spacing:.02em;line-height:.9;text-align:center;transform:skewX(-8deg);
  background:linear-gradient(180deg,#fff 0%,#bfe9ff 40%,#2aa8ff 55%,#0a4fb0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .6vmin 0 #071a40) drop-shadow(0 0 2.4vmin rgba(60,180,255,.6));-webkit-text-stroke:.25vmin #071a40}
.logo .num{display:inline-block;background:linear-gradient(180deg,#fff2a0,#ffb020 60%,#c04a00);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:1.25em;margin-left:.15em}
.tagline{margin-top:2vmin;font-size:2.4vmin;letter-spacing:.5em;color:#d8f0ff;text-shadow:0 0 1vmin #2aa8ff}
.press{position:absolute;bottom:16vh;width:100%;text-align:center;font-size:3.2vmin;font-weight:800;letter-spacing:.2em;animation:blink 1.4s infinite}
@keyframes blink{50%{opacity:.25}}
/* ---------- menus ---------- */
.menu{position:absolute;left:50%;transform:translateX(-50%);min-width:44vmin;max-width:84vw;padding:2.4vmin 2.8vmin;pointer-events:auto}
.menu h2{margin:0 0 1.6vmin;font-size:4vmin;font-style:italic;letter-spacing:.06em;color:#fff;text-shadow:0 0 1.2vmin var(--accent)}
.mlist{max-height:58vh;overflow:hidden;padding:.4vmin .8vmin;margin:0 -.8vmin}
.mi{display:flex;align-items:center;justify-content:space-between;gap:3vmin;padding:1.25vmin 2vmin;margin:.6vmin 0;border-radius:1.1vmin;font-size:2.9vmin;font-weight:700;cursor:pointer;border:.22vmin solid transparent;transition:transform .08s,background .08s}
.mi.focus{background:linear-gradient(90deg,rgba(57,208,255,.35),rgba(57,208,255,.08));border-color:var(--accent);transform:scale(1.03);box-shadow:0 0 2vmin rgba(57,208,255,.35)}
.mi.disabled{opacity:.4}
.mi .val{display:flex;align-items:center;gap:1vmin;font-weight:800;color:var(--gold)}
.mi .val .arr{opacity:.0;color:#fff}
.mi.focus .val .arr{opacity:.9}
.bar{width:18vmin;height:1.4vmin;background:#18213c;border-radius:1vmin;overflow:hidden;border:.15vmin solid #5a6a9a}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,#39d0ff,#9ff);}
.desc{min-height:3.2vmin;margin-top:1.4vmin;font-size:2.2vmin;color:#bcd3ea;text-align:center}
.footer{position:absolute;bottom:3.5vmin;right:5vmin;display:flex;gap:3vmin;font-size:2.4vmin;font-weight:700;text-shadow:0 0 .6vmin #000}
.tabs{display:flex;gap:1.5vmin;justify-content:center;margin-bottom:2vmin;font-size:2.5vmin;font-weight:800}
.tab{padding:.8vmin 2.4vmin;border-radius:1vmin;border:.2vmin solid #44507a;opacity:.6}.tab.on{opacity:1;border-color:var(--accent);background:rgba(57,208,255,.2)}
.cards{display:flex;gap:3vmin;justify-content:center}
.card{width:38vmin;padding:2.4vmin;border-radius:1.6vmin;border:.3vmin solid #3a4a7a;background:rgba(10,18,40,.8);cursor:pointer}
.card.focus{border-color:var(--accent);box-shadow:0 0 3vmin rgba(57,208,255,.5);transform:scale(1.04)}
.card h3{margin:0;font-size:3.6vmin;font-style:italic}.card .sub{color:#9fc8ff;font-size:2.2vmin;margin:.6vmin 0 1.6vmin}
.card .best{font-size:2.2vmin;color:#ddd}.card .planet{height:16vmin;border-radius:1.2vmin;margin-bottom:1.6vmin}
.ctrl-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.2vmin 4vmin;font-size:2.6vmin}
.ctrl-grid div{display:flex;align-items:center;justify-content:space-between;padding:.7vmin 1.2vmin;border-bottom:.15vmin solid rgba(120,160,255,.2)}
.about{max-height:66vh;overflow:hidden;font-size:2.15vmin;line-height:1.45;width:min(120vmin,88vw)}
.about .inner{transition:transform .15s}
.about h3{color:var(--gold);margin:2vmin 0 .6vmin;font-size:2.8vmin}
.about p{margin:.3vmin 0}
/* ---------- HUD ---------- */
#hud .tl{position:absolute;left:5vmin;top:4.5vmin;display:flex;flex-direction:column;gap:1vmin}
#hud .tr{position:absolute;right:5vmin;top:4vmin;text-align:right}
.shieldbox{display:flex;align-items:center;gap:1.2vmin}
.shield{width:34vmin;height:2.6vmin;border-radius:1.4vmin;background:rgba(0,0,0,.55);border:.3vmin solid #9fe3ff;overflow:hidden;position:relative}
.shield>i{position:absolute;inset:0;width:100%;background:linear-gradient(90deg,#29b8ff,#8ff0ff);transform-origin:left;transition:transform .15s}
.shield.low>i{background:linear-gradient(90deg,#ff3040,#ffa040)}
.shield.ext{border-color:var(--gold)}
.lbl{font-size:1.9vmin;font-weight:800;letter-spacing:.15em;color:#9fe3ff;text-shadow:0 0 .6vmin #000}
.rings{display:flex;gap:.8vmin}.rings i{width:2.2vmin;height:2.2vmin;border-radius:50%;border:.4vmin solid #6a5a2a}.rings i.on{border-color:var(--gold);box-shadow:0 0 1vmin var(--gold)}
.team{display:flex;gap:1vmin;margin-top:.4vmin}.team .tm{display:flex;align-items:center;gap:.5vmin}.team canvas{width:3.6vmin;height:3.6vmin;border-radius:.6vmin;border:.2vmin solid #8ab}
.team .hp{width:5vmin;height:.8vmin;background:#222;border-radius:.4vmin;overflow:hidden}.team .hp i{display:block;height:100%;background:var(--green)}
.team .tm.gone{opacity:.3}.team .tm.danger .hp i{background:var(--red)}
.hits{font-size:7vmin;font-weight:900;font-style:italic;line-height:1;text-shadow:0 .4vmin 0 #062048,0 0 1.6vmin rgba(60,190,255,.8)}
.hits small{font-size:2.4vmin;letter-spacing:.2em;display:block;color:#9fe3ff}
.medal{font-size:1.9vmin;color:#ffd060}
.lives{margin-top:.8vmin;font-size:2.6vmin;font-weight:800}
.bl{position:absolute;left:5vmin;bottom:4.5vmin;display:flex;flex-direction:column;gap:1vmin}
.bombs{display:flex;gap:.7vmin;align-items:center}.bombs i{width:2.4vmin;height:3.1vmin;border-radius:45%;background:radial-gradient(circle at 35% 30%,#ff9aa8,#d0283a 60%,#701020);border:.2vmin solid #fff3}
.laser{font-size:2vmin;font-weight:800;color:var(--green)}
.boost{position:absolute;left:50%;bottom:4.5vmin;transform:translateX(-50%);width:32vmin;text-align:center}
.boost .b{height:1.8vmin;border-radius:1vmin;background:rgba(0,0,0,.55);border:.25vmin solid #9fe3ff;overflow:hidden}
.boost .b i{display:block;height:100%;background:linear-gradient(90deg,#3cff9a,#d0ff60);transform-origin:left}
.boost.lock .b i{background:linear-gradient(90deg,#ff7040,#ffb040)}
.wings{position:relative;width:7vmin;height:3vmin}
.wings i{position:absolute;top:1vmin;height:1vmin;width:3vmin;background:var(--green);border-radius:.3vmin}.wings i.l{left:0}.wings i.r{right:0}.wings b{position:absolute;left:3vmin;top:0;width:1vmin;height:3vmin;background:#dff;border-radius:.4vmin}
.wings i.d1{background:#ffc040}.wings i.d2{background:#ff5050}.wings i.d3{background:#333}
.reticle{position:absolute;border:.32vmin solid #6aff9a;border-radius:.4vmin;transform:translate(-50%,-50%);box-shadow:0 0 1vmin #3f6;transition:border-color .08s}
.reticle.r1{width:5.6vmin;height:5.6vmin}.reticle.r2{width:3.6vmin;height:3.6vmin;opacity:.85}
.reticle.hot{border-color:#ff4d5e;box-shadow:0 0 1.4vmin #f45}
.reticle .ch{position:absolute;left:50%;top:50%;width:.6vmin;height:.6vmin;background:#6aff9a;transform:translate(-50%,-50%);border-radius:50%}
.chargering{position:absolute;width:9vmin;height:9vmin;border-radius:50%;transform:translate(-50%,-50%);border:.5vmin solid rgba(200,255,120,.9);box-shadow:0 0 2vmin #af6}
.lock{position:absolute;width:8vmin;height:8vmin;transform:translate(-50%,-50%) rotate(45deg);border:.45vmin solid #ff4d5e;box-shadow:0 0 1.5vmin #f45;animation:lockspin 1s linear infinite}
@keyframes lockspin{to{transform:translate(-50%,-50%) rotate(405deg)}}
.radar{position:absolute;right:5vmin;bottom:4.5vmin;width:24vmin;height:24vmin}
.bossbar{position:absolute;left:50%;top:4vmin;transform:translateX(-50%);width:56vmin;text-align:center}
.bossbar .name{font-size:2.4vmin;font-weight:900;letter-spacing:.2em;color:#ffb0b8;text-shadow:0 0 1vmin #f24}
.bossbar .b{height:2vmin;margin-top:.6vmin;background:rgba(0,0,0,.6);border:.3vmin solid #ff8a96;border-radius:1vmin;overflow:hidden}
.bossbar .b i{display:block;height:100%;background:linear-gradient(90deg,#ff3050,#ff9a60);transform-origin:left;transition:transform .2s}
.radio{position:absolute;left:5vmin;bottom:15vmin;min-width:min(62vmin,56vw);display:flex;gap:1.6vmin;align-items:stretch;max-width:min(78vmin,60vw);padding:1.2vmin;animation:pop .2s}
.radio canvas{width:13vmin;height:13vmin;border-radius:1vmin;border:.3vmin solid #9fe3ff;background:#0a1630;flex:none}
.radio .nm{font-weight:900;font-size:2.4vmin;letter-spacing:.08em}
.radio .tx{font-size:calc(2.7vmin * var(--sub));line-height:1.3;margin-top:.5vmin;text-shadow:0 .2vmin 0 #000}
@keyframes pop{from{transform:scale(.85);opacity:0}}
.hint{position:absolute;left:50%;bottom:12vmin;transform:translateX(-50%);padding:1.2vmin 2.4vmin;font-size:2.7vmin;font-weight:700;white-space:nowrap;animation:pop .25s}
.toasts{position:absolute;left:50%;top:22vh;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:1vmin}
.toast{font-size:3.6vmin;font-weight:900;font-style:italic;letter-spacing:.08em;text-shadow:0 .35vmin 0 #000,0 0 1.5vmin currentColor;animation:toast 2.2s forwards}
@keyframes toast{0%{transform:scale(1.6);opacity:0}10%{transform:scale(1);opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-2vmin)}}
.pop{position:absolute;font-weight:900;font-size:3vmin;color:#fff;text-shadow:0 0 1vmin #39d0ff,0 .3vmin 0 #000;transform:translate(-50%,-50%);animation:rise .9s forwards}
@keyframes rise{to{transform:translate(-50%,-260%);opacity:0}}
.card-big{position:absolute;left:0;right:0;top:30vh;text-align:center}
.card-big .k{font-size:3vmin;letter-spacing:.5em;color:#9fe3ff}
.card-big .t{font-size:11vmin;font-weight:900;font-style:italic;line-height:1;text-shadow:0 .6vmin 0 #062048,0 0 3vmin rgba(60,190,255,.9);animation:slidein .5s}
.card-big .s{font-size:3vmin;letter-spacing:.2em;margin-top:1.2vmin}
@keyframes slidein{from{transform:translateX(-30vw) skewX(-20deg);opacity:0}}
.warning{position:absolute;left:0;right:0;top:40vh;text-align:center;font-size:9vmin;font-weight:900;letter-spacing:.3em;color:#ff3a4a;text-shadow:0 0 3vmin #f00;animation:blink .5s 6}
.attract{position:absolute;left:0;right:0;top:3vh;text-align:center;font-size:3.4vmin;font-weight:900;letter-spacing:.4em;color:#fff;text-shadow:0 0 1.5vmin #39d0ff}
.attract2{position:absolute;left:0;right:0;bottom:17vh;text-align:center;font-size:3vmin;font-weight:800;animation:blink 1.4s infinite}
.center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}
.results{width:min(110vmin,90vw);padding:3vmin 4vmin;pointer-events:auto}
.results h2{font-size:5vmin;margin:0;font-style:italic}
.rrow{display:flex;justify-content:space-between;font-size:3vmin;padding:.8vmin 0;border-bottom:.15vmin solid rgba(120,160,255,.25)}
.rrow b{color:var(--gold)}
.medalbig{font-size:4vmin;font-weight:900;margin:2vmin 0;color:var(--gold);text-shadow:0 0 2vmin #fa0}
.teamres{display:flex;gap:3vmin;justify-content:center;margin:2vmin 0}
.teamres div{text-align:center;font-size:2.2vmin}.teamres canvas{width:11vmin;height:11vmin;border-radius:1vmin;border:.3vmin solid #9fe3ff;display:block;margin:0 auto .6vmin}
.brief{width:min(120vmin,90vw);padding:3vmin 4vmin;pointer-events:auto}
.brief .line{text-align:left;display:flex;gap:2vmin;align-items:center;margin:1.4vmin 0;font-size:2.8vmin;opacity:.25;transition:opacity .3s}
.brief .line.on{opacity:1}
.brief canvas{width:10vmin;height:10vmin;border-radius:1vmin;border:.25vmin solid #9fe3ff;flex:none}
.block{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,#0c2050,#02040c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vmin;text-align:center;padding:6vmin;pointer-events:auto}
.block h1{font-size:6vmin;margin:0}.block p{font-size:3vmin;max-width:80vmin;color:#cfe3ff}
.btn{pointer-events:auto;font-size:3.4vmin;font-weight:800;padding:2vmin 5vmin;border-radius:1.6vmin;border:.35vmin solid var(--accent);background:rgba(57,208,255,.2);color:#fff;cursor:pointer}
.fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .4s;pointer-events:none}.fade.on{opacity:1}
.loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:3vmin;letter-spacing:.3em;background:#02040c}
`;

const GLYPHS = {
  gamepad: {
    fire: ['✕', 'round g-x'], bomb: ['□', 'round g-s'], boost: ['R2', ''], brake: ['L2', ''], rollL: ['L1', ''], rollR: ['R1', ''],
    loop: ['△', 'round g-t'], uturn: ['○', 'round g-o'], pause: ['OPTIONS', ''], move: ['L-STICK', ''], confirm: ['✕', 'round g-x'], back: ['○', 'round g-o'],
    adjust: ['◀ ▶', ''], tabs: ['L1/R1', ''], nav: ['D-PAD', ''],
  },
  keyboard: {
    fire: ['SPACE', 'key'], bomb: ['B', 'key'], boost: ['SHIFT', 'key'], brake: ['C', 'key'], rollL: ['Q', 'key'], rollR: ['E', 'key'],
    loop: ['F', 'key'], uturn: ['R', 'key'], pause: ['ESC', 'key'], move: ['WASD', 'key'], confirm: ['ENTER', 'key'], back: ['ESC', 'key'],
    adjust: ['← →', 'key'], tabs: ['Q/E', 'key'], nav: ['↑ ↓', 'key'],
  },
};
export function glyph(action, dev = input.device) {
  const g = GLYPHS[dev === 'gamepad' ? 'gamepad' : 'keyboard'][action] || [action, ''];
  return `<span class="glyph ${g[1]}">${g[0]}</span>`;
}
function fillGlyphs(text) { return text.replace(/\{(\w+)\}/g, (_, a) => glyph(a)); }

// ---------------- portraits ----------------
const portraitCache = new Map();
export function portrait(id, mouth = 0) {
  const key = id + mouth;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const sp = (CAST[id] || CAST.kit).species;
  const bgc = { redpanda: '#1f3a6a', frog: '#1b4a3a', badger: '#3a3a4a', owl: '#2a2a6a', tortoise: '#2f4a2a', jackal: '#4a1a22', rat: '#3a2a4a', vulture: '#3a2e22', robot: '#300a10' }[sp] || '#223';
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, bgc); g.addColorStop(1, '#05070f');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  // scanlines
  x.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = 0; i < 128; i += 4) x.fillRect(0, i, 128, 1);
  const P = {
    redpanda: { face: '#d8642a', muzzle: '#fff2e0', ear: 'round', earC: '#7a2a10', eye: '#2a1408', extra: 'mask' },
    frog: { face: '#5fcf5a', muzzle: '#cff5a0', ear: 'none', earC: '#3a8a3a', eye: '#101010', extra: 'goggles' },
    badger: { face: '#8a8f9a', muzzle: '#f0f0f0', ear: 'small', earC: '#444', eye: '#111', extra: 'stripe' },
    owl: { face: '#6a6ad8', muzzle: '#e8e0ff', ear: 'tuft', earC: '#4a3ab0', eye: '#ffb020', extra: 'beak' },
    tortoise: { face: '#8fb06a', muzzle: '#c8e0a0', ear: 'none', earC: '#5a7a3a', eye: '#111', extra: 'cap' },
    jackal: { face: '#b06a3a', muzzle: '#f0d0a0', ear: 'pointy', earC: '#5a2a10', eye: '#e02030', extra: 'scar' },
    rat: { face: '#9a8aa8', muzzle: '#e8d8e8', ear: 'big', earC: '#e0a0c0', eye: '#111', extra: 'whisk' },
    vulture: { face: '#6a5a4a', muzzle: '#d0b090', ear: 'none', earC: '#3a2a1a', eye: '#ffd020', extra: 'beakLong' },
    robot: { face: '#5a5f6e', muzzle: '#3a3d4a', ear: 'antenna', earC: '#ff3344', eye: '#ff2233', extra: 'visor' },
  }[sp];
  const ol = '#0a0a14';
  x.lineWidth = 4; x.strokeStyle = ol; x.lineJoin = 'round';
  const shape = (fn, fill) => { x.beginPath(); fn(); x.fillStyle = fill; x.fill(); x.stroke(); };
  // shoulders / flight suit
  shape(() => { x.moveTo(14, 128); x.quadraticCurveTo(20, 96, 64, 94); x.quadraticCurveTo(108, 96, 114, 128); x.closePath(); }, sp === 'jackal' || sp === 'rat' || sp === 'vulture' ? '#3a1a2a' : '#e8eef8');
  x.fillStyle = sp === 'jackal' ? '#e0283c' : '#18c8c8'; x.fillRect(52, 100, 24, 28);
  // ears
  if (P.ear === 'round') { shape(() => x.arc(34, 34, 16, 0, Math.PI * 2), P.earC); shape(() => x.arc(94, 34, 16, 0, Math.PI * 2), P.earC); }
  if (P.ear === 'small') { shape(() => x.arc(36, 38, 10, 0, Math.PI * 2), P.earC); shape(() => x.arc(92, 38, 10, 0, Math.PI * 2), P.earC); }
  if (P.ear === 'pointy') { shape(() => { x.moveTo(26, 50); x.lineTo(34, 6); x.lineTo(54, 36); x.closePath(); }, P.earC); shape(() => { x.moveTo(102, 50); x.lineTo(94, 6); x.lineTo(74, 36); x.closePath(); }, P.earC); }
  if (P.ear === 'tuft') { shape(() => { x.moveTo(28, 40); x.lineTo(30, 10); x.lineTo(50, 30); x.closePath(); }, P.earC); shape(() => { x.moveTo(100, 40); x.lineTo(98, 10); x.lineTo(78, 30); x.closePath(); }, P.earC); }
  if (P.ear === 'big') { shape(() => x.arc(30, 36, 20, 0, Math.PI * 2), P.earC); shape(() => x.arc(98, 36, 20, 0, Math.PI * 2), P.earC); }
  if (P.ear === 'antenna') { x.beginPath(); x.moveTo(64, 30); x.lineTo(64, 8); x.stroke(); shape(() => x.arc(64, 8, 6, 0, Math.PI * 2), P.earC); }
  // head
  shape(() => x.ellipse(64, 60, 38, 36, 0, 0, Math.PI * 2), P.face);
  if (P.extra === 'mask') { x.fillStyle = '#fff2e0'; x.beginPath(); x.ellipse(46, 50, 9, 7, 0, 0, Math.PI * 2); x.ellipse(82, 50, 9, 7, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#7a2a10'; x.fillRect(40, 58, 10, 12); x.fillRect(78, 58, 10, 12); }
  if (P.extra === 'stripe') { x.fillStyle = '#f4f4f4'; x.beginPath(); x.moveTo(56, 24); x.lineTo(72, 24); x.lineTo(68, 70); x.lineTo(60, 70); x.fill(); x.fillStyle = '#222'; x.fillRect(38, 46, 14, 10); x.fillRect(76, 46, 14, 10); }
  if (P.extra === 'cap') { shape(() => { x.ellipse(64, 30, 36, 14, 0, Math.PI, 0); x.closePath(); }, '#3a5a2a'); x.fillStyle = '#ffd040'; x.fillRect(58, 20, 12, 6); }
  if (P.extra === 'visor') { shape(() => { x.rect(30, 44, 68, 16); }, '#111'); }
  // muzzle
  if (P.extra === 'beak' || P.extra === 'beakLong') {
    shape(() => x.ellipse(64, 74, 22, 16, 0, 0, Math.PI * 2), P.muzzle);
    shape(() => { x.moveTo(56, 66); x.lineTo(72, 66); x.lineTo(64, P.extra === 'beakLong' ? 96 : 84 + mouth * 4); x.closePath(); }, '#f0b030');
  } else if (P.extra !== 'visor') {
    shape(() => x.ellipse(64, 76, 22, 15, 0, 0, Math.PI * 2), P.muzzle);
    shape(() => x.ellipse(64, 68, 6, 4, 0, 0, Math.PI * 2), '#1a1010');
    // mouth
    x.beginPath();
    if (mouth) { x.ellipse(64, 82, 7, 5, 0, 0, Math.PI * 2); x.fillStyle = '#5a1018'; x.fill(); x.stroke(); }
    else { x.moveTo(56, 80); x.quadraticCurveTo(64, 86, 72, 80); x.stroke(); }
  } else {
    x.fillStyle = '#ff2233'; x.fillRect(46, 76, 36, mouth ? 8 : 3);
  }
  // eyes
  if (P.extra !== 'visor') {
    for (const ex of [48, 80]) {
      shape(() => x.ellipse(ex, 52, 7, 8, 0, 0, Math.PI * 2), '#ffffff');
      x.fillStyle = P.eye; x.beginPath(); x.arc(ex + 1, 53, 4, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + 2.5, 51, 1.5, 0, Math.PI * 2); x.fill();
    }
  } else { x.fillStyle = '#ff2233'; x.fillRect(40, 48, 16, 6); x.fillRect(72, 48, 16, 6); }
  if (P.extra === 'goggles') { x.lineWidth = 5; x.strokeStyle = '#ffd040'; x.beginPath(); x.arc(48, 52, 11, 0, Math.PI * 2); x.moveTo(91, 52); x.arc(80, 52, 11, 0, Math.PI * 2); x.stroke(); x.lineWidth = 4; x.strokeStyle = ol; }
  if (P.extra === 'scar') { x.strokeStyle = '#601010'; x.lineWidth = 3; x.beginPath(); x.moveTo(84, 40); x.lineTo(92, 62); x.stroke(); x.strokeStyle = ol; x.lineWidth = 4; }
  if (P.extra === 'whisk') { x.lineWidth = 2; x.beginPath(); x.moveTo(44, 74); x.lineTo(20, 70); x.moveTo(44, 78); x.lineTo(20, 80); x.moveTo(84, 74); x.lineTo(108, 70); x.moveTo(84, 78); x.lineTo(108, 80); x.stroke(); x.lineWidth = 4; }
  // headset mic for the team
  if (['redpanda', 'frog', 'badger', 'owl'].includes(sp)) { x.strokeStyle = '#333'; x.lineWidth = 3; x.beginPath(); x.moveTo(28, 64); x.quadraticCurveTo(30, 88, 48, 88); x.stroke(); x.fillStyle = '#333'; x.beginPath(); x.arc(49, 88, 3, 0, Math.PI * 2); x.fill(); }
  portraitCache.set(key, c);
  return c;
}
function drawPortraitInto(canvas, id, mouth) { const src = portrait(id, mouth); canvas.width = 128; canvas.height = 128; canvas.getContext('2d').drawImage(src, 0, 0); }

// =====================================================================
export class UI {
  constructor() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    this.root = document.createElement('div'); this.root.id = 'ui'; document.body.appendChild(this.root);
    this.root.innerHTML = `
      <div id="hud" class="layer hidden">
        <div class="tl">
          <div class="lbl">SHIELD</div>
          <div class="shieldbox"><div class="shield"><i></i></div><div class="wings"><i class="l"></i><b></b><i class="r"></i></div></div>
          <div class="rings"><i></i><i></i><i></i></div>
          <div class="team"></div>
        </div>
        <div class="tr"><div class="hits"><small>HITS</small><span>0</span></div><div class="medal"></div><div class="lives"></div></div>
        <div class="bl"><div class="bombs"></div><div class="laser"></div></div>
        <div class="boost"><div class="lbl">BOOST</div><div class="b"><i></i></div></div>
        <canvas class="radar hidden" width="240" height="240"></canvas>
        <div class="reticle r1"><div class="ch"></div></div><div class="reticle r2"></div>
        <div class="chargering hidden"></div><div class="lock hidden"></div>
        <div class="bossbar hidden"><div class="name"></div><div class="b"><i></i></div></div>
      </div>
      <div id="pops" class="layer"></div>
      <div id="radio" class="layer"></div>
      <div id="hintL" class="layer"></div>
      <div id="toasts" class="layer"><div class="toasts"></div></div>
      <div id="cards" class="layer"></div>
      <div id="screen" class="layer"></div>
      <div id="overlay" class="layer"></div>
      <div class="fade" id="fade"></div>`;
    this.$ = (s) => this.root.querySelector(s);
    this.hudEl = this.$('#hud');
    this.radioEl = this.$('#radio');
    this.screenEl = this.$('#screen');
    this.overlayEl = this.$('#overlay');
    this.cardsEl = this.$('#cards');
    this.menu = null;
    this.radar = this.$('.radar').getContext('2d');
    this.lastRadioId = null;
    this.applyTextSize();
    input.onDevice = () => { if (this.menu) this.renderMenu(); this.refreshFooter && this.refreshFooter(); };
  }
  applyTextSize() {
    this.root.style.setProperty('--fs', [1, 1.12, 1.25][settings.subtitlesSize] || 1);
    this.root.style.setProperty('--sub', [1, 1.15, 1.35][settings.subtitlesSize] || 1);
  }
  fade(on) { this.$('#fade').classList.toggle('on', on); }
  showHUD(on) { this.hudEl.classList.toggle('hidden', !on); if (!on) { this.radioEl.innerHTML = ''; this.$('#hintL').innerHTML = ''; } }
  clearCards() { this.cardsEl.innerHTML = ''; }

  // ------------------------------------------------------------------ cards
  missionCard(m) {
    if (!m) { const el = this.cardsEl.querySelector('.mcard'); el && el.remove(); return; }
    this.cardsEl.innerHTML = `<div class="card-big mcard"><div class="k">MISSION ${MISSIONS.indexOf(m) + 1}</div><div class="t">${m.name}</div><div class="s">${m.subtitle.toUpperCase()}</div></div>`;
  }
  bossCard(b) {
    if (!b) { const el = this.cardsEl.querySelector('.bcard'); el && el.remove(); return; }
    this.cardsEl.innerHTML = `<div class="card-big bcard"><div class="k" style="color:#ff9aa8">WARNING · BOSS</div><div class="t" style="text-shadow:0 .6vmin 0 #400,0 0 3vmin #f24">${b.name}</div><div class="s">${b.subtitle.toUpperCase()}</div></div>`;
  }
  clearCard(m) { this.cardsEl.innerHTML = `<div class="card-big"><div class="k">${m.name}</div><div class="t" style="color:#fff">MISSION COMPLETE</div></div>`; }
  warning() { const el = document.createElement('div'); el.className = 'warning'; el.textContent = 'WARNING'; this.cardsEl.appendChild(el); setTimeout(() => el.remove(), 3200); }
  toast(text, color = 'blue') {
    const col = { gold: '#ffd050', red: '#ff6070', green: '#70ff9a', blue: '#7ad8ff', silver: '#e8f0ff' }[color] || color;
    const box = this.$('.toasts');
    const el = document.createElement('div'); el.className = 'toast'; el.style.color = col; el.textContent = text;
    box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), 2300);
  }
  hint(text) {
    const L = this.$('#hintL');
    L.innerHTML = `<div class="hint panel">${fillGlyphs(text)}</div>`;
    clearTimeout(this._hintT); this._hintT = setTimeout(() => (L.innerHTML = ''), 5500);
  }
  hitPopup(pos, n) {
    const p = this.project(pos); if (!p) return;
    const el = document.createElement('div'); el.className = 'pop';
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.textContent = n > 1 ? `+${n}` : '+1';
    if (n >= 3) { el.style.fontSize = '4.4vmin'; el.style.color = '#ffd050'; }
    this.$('#pops').appendChild(el); setTimeout(() => el.remove(), 900);
  }
  project(pos) {
    const v = new THREE.Vector3().copy(pos).project(gfx.camera);
    if (v.z > 1 || v.z < -1) return null;
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, v };
  }
  radio(msg, chars) {
    if (!msg) { this.radioEl.innerHTML = ''; this.lastRadioId = null; return; }
    if (this.lastRadioId !== msg) {
      this.lastRadioId = msg;
      const c = CAST[msg.who];
      this.radioEl.innerHTML = `<div class="radio panel"><canvas></canvas><div><div class="nm" style="color:${c.color}">${c.name.toUpperCase()}</div><div class="tx"></div></div></div>`;
      this.radioCanvas = this.radioEl.querySelector('canvas'); this.radioTx = this.radioEl.querySelector('.tx');
      this._mouth = -1;
    }
    const talking = chars < msg.text.length;
    const mouth = talking ? (Math.floor(performance.now() / 90) % 2) : 0;
    if (mouth !== this._mouth) { drawPortraitInto(this.radioCanvas, msg.who, mouth); this._mouth = mouth; }
    this.radioTx.textContent = msg.text.slice(0, chars);
  }
  bossBar(b) {
    const el = this.$('.bossbar');
    if (!b || !b.alive) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.querySelector('.name').textContent = b.name;
    el.querySelector('i').style.transform = `scaleX(${b.hpFrac})`;
  }

  // ------------------------------------------------------------------ HUD
  hud(g) {
    const P = g.player;
    if (this.hudEl.classList.contains('hidden')) return;
    const sh = this.$('.shield');
    sh.querySelector('i').style.transform = `scaleX(${P.shield / P.maxShield})`;
    sh.style.width = (34 * P.maxShield / 100) + 'vmin';
    sh.classList.toggle('low', P.shield < P.maxShield * 0.25); sh.classList.toggle('ext', P.maxShield > 100);
    this.$('.rings').querySelectorAll('i').forEach((r, i) => r.classList.toggle('on', i < P.goldRings));
    const wl = this.$('.wings .l'), wr = this.$('.wings .r');
    wl.className = 'l d' + (3 - P.wingHP[0]); wr.className = 'r d' + (3 - P.wingHP[1]);
    this.$('.hits span').textContent = g.hits;
    this.$('.medal').textContent = g.attract ? '' : (g.hits >= g.medal ? '★ MEDAL EARNED' : `MEDAL AT ${g.medal}`);
    this.$('.lives').innerHTML = `<span style="color:#ffb060">✈</span> × ${P.lives}`;
    const bombs = this.$('.bombs');
    if (bombs.childElementCount !== P.bombs) bombs.innerHTML = P.bombs ? '<i></i>'.repeat(P.bombs) : '<span class="lbl">NO BOMBS</span>';
    this.$('.laser').textContent = ['LASER · SINGLE', 'LASER · TWIN', 'LASER · HYPER'][P.laser];
    this.$('.boost i').style.transform = `scaleX(${P.boost})`;
    this.$('.boost').classList.toggle('lock', P.boostLock);
    // team
    const team = this.$('.team');
    if (!team.childElementCount) {
      team.innerHTML = ['hopper', 'brock', 'nova'].map((id) => `<div class="tm" data-id="${id}"><canvas width="128" height="128"></canvas><div class="hp"><i></i></div></div>`).join('');
      team.querySelectorAll('canvas').forEach((c, i) => drawPortraitInto(c, ['hopper', 'brock', 'nova'][i], 0));
    }
    team.querySelectorAll('.tm').forEach((el) => {
      const id = el.dataset.id; const w = g.wingmen.find((x) => x.id === id);
      const hp = g.team[id].hp;
      el.querySelector('.hp i').style.width = hp + '%';
      el.classList.toggle('gone', !w || w.state === 'gone');
      el.classList.toggle('danger', !!w && w.state === 'rescue');
    });
    // reticles
    const r1 = this.$('.reticle.r1'), r2 = this.$('.reticle.r2');
    const show = P.alive && (g.state === 'play');
    r1.style.display = r2.style.display = show ? '' : 'none';
    if (show) {
      const a = this.project(new THREE.Vector3().copy(P.pos).addScaledVector(P.forward, 38));
      const b = this.project(new THREE.Vector3().copy(P.pos).addScaledVector(P.forward, 95));
      if (a) { r1.style.left = a.x + 'px'; r1.style.top = a.y + 'px'; }
      if (b) { r2.style.left = b.x + 'px'; r2.style.top = b.y + 'px'; }
      const hot = !!g.findLockTarget(P.pos, P.forward, 0.996, 450);
      r1.classList.toggle('hot', hot); r2.classList.toggle('hot', hot);
      const cr = this.$('.chargering');
      if (P.charging && P.charge > 0.05 && a) { cr.classList.remove('hidden'); cr.style.left = a.x + 'px'; cr.style.top = a.y + 'px'; const s = 1.6 - P.charge * 0.9; cr.style.transform = `translate(-50%,-50%) scale(${s})`; cr.style.opacity = P.charge >= 1 ? 1 : 0.5; }
      else cr.classList.add('hidden');
    }
    const lk = this.$('.lock');
    if (P.lockTarget && P.lockTarget.alive && show) { const p = this.project(P.lockTarget.pos); if (p) { lk.classList.remove('hidden'); lk.style.left = p.x + 'px'; lk.style.top = p.y + 'px'; } else lk.classList.add('hidden'); }
    else lk.classList.add('hidden');
    // radar (all-range)
    const rc = this.$('.radar');
    rc.classList.toggle('hidden', g.mode !== 'allrange');
    if (g.mode === 'allrange') this.drawRadar(g);
    if (g.boss && g.boss.alive) this.$('.bossbar i').style.transform = `scaleX(${g.boss.hpFrac})`;
  }
  drawRadar(g) {
    const x = this.radar, P = g.player, W = 240, R = 112;
    x.clearRect(0, 0, W, W);
    x.save(); x.translate(W / 2, W / 2);
    x.fillStyle = 'rgba(6,14,34,0.75)'; x.strokeStyle = 'rgba(120,200,255,0.8)'; x.lineWidth = 3;
    x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(120,200,255,0.25)'; x.lineWidth = 1.5;
    x.beginPath(); x.arc(0, 0, R * 0.5, 0, Math.PI * 2); x.moveTo(-R, 0); x.lineTo(R, 0); x.moveTo(0, -R); x.lineTo(0, R); x.stroke();
    const yaw = Math.atan2(P.forward.x, P.forward.z);
    const range = 900;
    const plot = (p, col, size, shape = 'dot') => {
      const dx = p.x - P.pos.x, dz = p.z - P.pos.z;
      const rx = dx * Math.cos(-yaw) + dz * Math.sin(-yaw);
      const rz = -dx * Math.sin(-yaw) + dz * Math.cos(-yaw);
      let px = -rx / range * R, py = -rz / range * R;
      const L = Math.hypot(px, py); if (L > R - 4) { px *= (R - 4) / L; py *= (R - 4) / L; }
      x.fillStyle = col;
      x.beginPath();
      if (shape === 'tri') { x.moveTo(px, py - size); x.lineTo(px + size, py + size); x.lineTo(px - size, py + size); x.closePath(); }
      else x.arc(px, py, size, 0, Math.PI * 2);
      x.fill();
      const dy = p.y - P.pos.y; if (Math.abs(dy) > 40) { x.fillRect(px - 1, py, 2, -Math.sign(dy) * 8); }
    };
    for (const it of g.items) if (it.alive) plot(it.pos, '#ffd050', 3.5);
    for (const e of g.enemies) if (e.alive && e.sensor) plot(e.pos, e.kind === 'ace' ? '#ff9a30' : '#ff4050', e.kind === 'ace' ? 7 : 4.5, e.kind === 'ace' ? 'tri' : 'dot');
    for (const w of g.wingmen) if (w.state !== 'gone') plot(w.pos, w.state === 'rescue' ? '#ffee50' : '#60ff90', 5, 'tri');
    if (g.boss && g.boss.alive) plot(g.boss.pos, '#c070ff', 11);
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -9); x.lineTo(7, 7); x.lineTo(-7, 7); x.closePath(); x.fill();
    // arena edge warning
    if (P.pos.length() > g.arena * 0.85) { x.strokeStyle = '#ff5060'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, R - 2, 0, Math.PI * 2); x.stroke(); }
    x.restore();
  }

  // ------------------------------------------------------------------ generic menu
  // items: {label, type:'action'|'toggle'|'slider'|'choice', get, set, choices, action, desc, disabled}
  openMenu(def) {
    this.menu = { ...def, focus: def.focus || 0 };
    this.renderMenu();
  }
  closeMenu() { this.menu = null; this.screenEl.innerHTML = ''; }
  renderMenu() {
    const m = this.menu; if (!m) return;
    const items = m.items.map((it, i) => {
      let val = '';
      if (it.type === 'toggle') val = `<span class="val"><span class="arr">◀</span>${it.get() ? 'ON' : 'OFF'}<span class="arr">▶</span></span>`;
      if (it.type === 'slider') val = `<span class="val"><span class="arr">◀</span><span class="bar"><i style="width:${Math.round(it.get() * 100)}%"></i></span><span class="arr">▶</span></span>`;
      if (it.type === 'choice') val = `<span class="val"><span class="arr">◀</span>${it.choices[it.get()]}<span class="arr">▶</span></span>`;
      return `<div class="mi ui-clickable ${i === m.focus ? 'focus' : ''} ${it.disabled ? 'disabled' : ''}" data-i="${i}"><span>${it.label}</span>${val}</div>`;
    }).join('');
    const desc = m.items[m.focus] && m.items[m.focus].desc ? m.items[m.focus].desc : (m.desc || '');
    const top = m.top ?? '34vh';
    this.screenEl.innerHTML = `${m.pre || ''}<div class="menu panel ui-clickable" style="top:${top}">${m.title ? `<h2>${m.title}</h2>` : ''}<div class="mlist">${items}</div><div class="desc">${desc}</div></div>
      <div class="footer">${m.items.some((i) => i.type && i.type !== 'action') ? `<span>${glyph('adjust')} Change</span>` : ''}<span>${glyph('confirm')} Select</span>${m.onBack ? `<span>${glyph('back')} Back</span>` : ''}</div>`;
    const list = this.screenEl.querySelector('.mlist'), fe = this.screenEl.querySelector('.mi.focus');
    if (list && fe) { list.scrollTop = m.scroll || 0; const top = fe.offsetTop - list.offsetTop, bot = top + fe.offsetHeight; if (top < list.scrollTop) list.scrollTop = top - 8; else if (bot > list.scrollTop + list.clientHeight) list.scrollTop = bot - list.clientHeight + 8; m.scroll = list.scrollTop; }
    if (list) list.addEventListener('wheel', (e) => { list.scrollTop += e.deltaY; m.scroll = list.scrollTop; }, { passive: true });
    this.screenEl.querySelectorAll('.mi').forEach((el) => {
      el.addEventListener('mouseenter', () => { const i = +el.dataset.i; if (m.focus !== i) { m.focus = i; audio.menuMove(); this.renderMenu(); } });
      el.addEventListener('click', (ev) => {
        const i = +el.dataset.i; m.focus = i; const it = m.items[i];
        if (it.type && it.type !== 'action') this.adjust(it, ev.clientX > el.getBoundingClientRect().left + el.offsetWidth * 0.75 ? 1 : (ev.clientX < el.getBoundingClientRect().left + el.offsetWidth * 0.55 ? 1 : -1));
        else this.activate(it);
      });
    });
  }
  adjust(it, dir) {
    if (it.disabled) return;
    if (it.type === 'toggle') it.set(!it.get());
    if (it.type === 'slider') it.set(clamp(Math.round((it.get() + dir * 0.1) * 10) / 10, 0, 1));
    if (it.type === 'choice') it.set((it.get() + dir + it.choices.length) % it.choices.length);
    audio.menuMove(); this.renderMenu();
  }
  activate(it) {
    if (it.disabled) { audio.menuBack(); return; }
    if (it.type && it.type !== 'action') { this.adjust(it, 1); return; }
    audio.menuConfirm(); it.action && it.action();
  }
  updateMenu() {
    const m = this.menu; if (!m) return false;
    if (m.custom) return m.custom();
    const n = m.items.length;
    if (input.nav.up) { m.focus = (m.focus - 1 + n) % n; audio.menuMove(); this.renderMenu(); }
    if (input.nav.down) { m.focus = (m.focus + 1) % n; audio.menuMove(); this.renderMenu(); }
    const it = m.items[m.focus];
    if (it && it.type && it.type !== 'action') {
      if (input.nav.left) this.adjust(it, -1);
      if (input.nav.right) this.adjust(it, 1);
    }
    if (input.pressed('confirm')) this.activate(it);
    else if (input.pressed('back') && m.onBack) { audio.menuBack(); m.onBack(); }
    return true;
  }

  // ------------------------------------------------------------------ screens
  title(show) {
    this.screenEl.innerHTML = '';
    this.overlayEl.innerHTML = show ? `<div id="title" class="layer"><div class="logo">STARFOX<br>BARREL<span class="num">64</span></div><div class="tagline">A BARREL TEAM ADVENTURE</div></div>` : '';
  }
  pressStart() {
    this.overlayEl.innerHTML += `<div class="press" id="pressStart">PRESS ANY BUTTON</div>`;
  }
  settingsItems(onChange) {
    const S = settings;
    const mk = (label, key, type, desc, extra = {}) => ({ label, type, desc, get: () => S[key], set: (v) => { S[key] = v; saveSettings(); onChange && onChange(key); }, ...extra });
    return [
      mk('Invert Horizontal', 'invertX', 'toggle', 'Flip left/right stick input. Fixes controllers that report the X axis inverted.'),
      mk('Invert Vertical', 'invertY', 'toggle', 'Flip up/down stick input. ON = classic pilot controls (push up to dive).'),
      mk('Difficulty', 'difficulty', 'choice', 'Cadet: gentle damage · Pilot: standard · Ace: tougher enemies, more fire.', { choices: DIFFICULTY.map((d) => d.name) }),
      mk('Aim Assist', 'aimAssist', 'toggle', 'Lasers gently curve toward targets near your reticle.'),
      mk('Master Volume', 'masterVol', 'slider', ''),
      mk('Music Volume', 'musicVol', 'slider', ''),
      mk('Effects Volume', 'sfxVol', 'slider', ''),
      mk('Radio Voice Volume', 'voiceVol', 'slider', ''),
      mk('Vibration', 'rumble', 'toggle', 'Controller rumble on hits, bombs and explosions.'),
      mk('Screen Shake', 'shake', 'slider', 'Camera shake strength.'),
      mk('Tutorial Hints', 'hints', 'toggle', 'Show button prompts the first time each manoeuvre is needed.'),
      mk('Text Size', 'subtitlesSize', 'choice', 'Radio subtitles and HUD text size for couch distance.', { choices: ['Normal', 'Large', 'Huge'] }),
      { label: 'Reset to Defaults', type: 'action', desc: 'Restore every setting to its default value.', action: () => { Object.assign(S, DEFAULT_SETTINGS); saveSettings(); onChange && onChange('all'); this.renderMenu(); } },
    ];
  }
  controlsScreen(onBack) {
    let tab = input.device === 'gamepad' ? 0 : 1;
    const rows = [['Fly / steer', 'move'], ['Fire lasers (tap)', 'fire'], ['Charge + lock-on (hold, release)', 'fire'], ['Smart bomb / detonate', 'bomb'],
      ['Boost', 'boost'], ['Brake', 'brake'], ['Bank left (hold) · roll (double-tap)', 'rollL'], ['Bank right (hold) · roll (double-tap)', 'rollR'],
      ['Somersault', 'loop'], ['U-turn (all-range)', 'uturn'], ['Pause', 'pause']];
    const render = () => {
      const dev = tab === 0 ? 'gamepad' : 'keyboard';
      this.screenEl.innerHTML = `<div class="menu panel" style="top:14vh;width:min(110vmin,92vw)"><h2>CONTROLS</h2>
        <div class="tabs"><span class="tab ${tab === 0 ? 'on' : ''}">CONTROLLER</span><span class="tab ${tab === 1 ? 'on' : ''}">KEYBOARD + MOUSE</span></div>
        <div class="ctrl-grid">${rows.map(([l, a]) => `<div><span>${l}</span>${glyph(a, dev)}</div>`).join('')}</div>
        <div class="desc">${tab === 1 ? 'Mouse: left click fires, right click launches a bomb. Menus: arrows + Enter, Esc to go back.' : 'PS5 DualSense / any standard-mapping gamepad. D-pad also steers. Invert axes in Settings if needed.'}</div></div>
        <div class="footer"><span>${glyph('tabs')} Switch tab</span><span>${glyph('back')} Back</span></div>`;
    };
    render();
    this.menu = { custom: () => {
      if (input.pressed('tabL') || input.pressed('tabR') || input.nav.left || input.nav.right) { tab = 1 - tab; audio.menuMove(); render(); }
      if (input.pressed('back') || input.pressed('confirm')) { audio.menuBack(); onBack(); }
      return true;
    } };
  }
  aboutScreen(onBack) {
    const html = ABOUT_SECTIONS.map((s) => `<h3>${s.h}</h3>${s.p.map((p) => `<p>${p}</p>`).join('')}`).join('');
    this.screenEl.innerHTML = `<div class="menu panel" style="top:8vh"><h2>ABOUT · CREDITS</h2><div class="about"><div class="inner">${html}</div></div></div>
      <div class="footer"><span>${glyph('nav')} Scroll</span><span>${glyph('back')} Back</span></div>`;
    const inner = this.screenEl.querySelector('.inner'), box = this.screenEl.querySelector('.about');
    let y = 0;
    const scroll = (d) => { const max = Math.max(0, inner.scrollHeight - box.clientHeight); y = clamp(y + d, 0, max); inner.style.transform = `translateY(${-y}px)`; };
    box.addEventListener('wheel', (e) => scroll(e.deltaY), { passive: true });
    this.menu = { custom: () => {
      if (input.held.down || input.ly < -0.4) scroll(innerHeight * 0.012);
      if (input.held.up || input.ly > 0.4) scroll(-innerHeight * 0.012);
      if (input.pressed('back') || input.pressed('confirm')) { audio.menuBack(); onBack(); }
      return true;
    } };
  }
  missionSelect(onPick, onBack) {
    let f = 0;
    const render = () => {
      this.screenEl.innerHTML = `<div class="menu panel" style="top:16vh;width:min(100vmin,92vw)"><h2>MISSION SELECT</h2><div class="cards">${MISSIONS.map((m, i) => {
        const best = save.best[m.id] ?? '—'; const medal = save.medals[m.id] ? ' ★' : '';
        const bg = i === 0 ? 'linear-gradient(180deg,#5ab0ff,#bfe6ff 55%,#3a9a50 56%,#2b8fe0)' : 'radial-gradient(circle at 70% 60%,#d77a4a 0 20%,transparent 21%),radial-gradient(circle at 30% 30%,#6a2a9a,#0a0624)';
        return `<div class="card ui-clickable ${i === f ? 'focus' : ''}" data-i="${i}"><div class="planet" style="background:${bg}"></div><h3>${i + 1}. ${m.name}</h3><div class="sub">${m.subtitle}${i === 0 ? ' · On-rails' : ' · Free flight'}</div><div class="best">Best hits: ${best}${medal}</div></div>`;
      }).join('')}</div><div class="desc">${f === 0 ? 'Coastal assault, branching routes, walker boss.' : 'Open-space dogfight vs. Jackal Squadron and the Dread Carrier.'}</div></div>
      <div class="footer"><span>${glyph('confirm')} Launch</span><span>${glyph('back')} Back</span></div>`;
      this.screenEl.querySelectorAll('.card').forEach((el) => {
        el.addEventListener('mouseenter', () => { f = +el.dataset.i; render(); });
        el.addEventListener('click', () => { audio.menuConfirm(); onPick(+el.dataset.i); });
      });
    };
    render();
    this.menu = { custom: () => {
      if (input.nav.left || input.nav.right || input.nav.up || input.nav.down) { f = 1 - f; audio.menuMove(); render(); }
      if (input.pressed('confirm')) { audio.menuConfirm(); onPick(f); }
      else if (input.pressed('back')) { audio.menuBack(); onBack(); }
      return true;
    } };
  }
  briefing(m, onDone) {
    let i = 0, t = 0;
    const render = () => {
      this.screenEl.innerHTML = `<div class="center"><div class="brief panel"><div style="font-size:2.4vmin;letter-spacing:.4em;color:#9fe3ff">MISSION ${MISSIONS.indexOf(m) + 1} BRIEFING</div>
        <h2 style="margin:.4vmin 0 1vmin;font-size:6vmin;font-style:italic">${m.name}</h2>
        ${m.briefing.map(([who, text], k) => `<div class="line ${k <= i ? 'on' : ''}"><canvas width="128" height="128"></canvas><div><b style="color:${CAST[who].color}">${CAST[who].name}</b><br>${text}</div></div>`).join('')}
        </div></div><div class="footer"><span>${glyph('confirm')} ${i >= m.briefing.length - 1 ? 'Launch' : 'Next'}</span><span>${glyph('pause')} Skip</span></div>`;
      this.screenEl.querySelectorAll('canvas').forEach((c, k) => drawPortraitInto(c, m.briefing[k][0], k === i ? 1 : 0));
      this.screenEl.querySelector('.brief').classList.add('ui-clickable');
      this.screenEl.querySelector('.brief').onclick = () => next();
    };
    const next = () => {
      audio.menuConfirm();
      if (i >= m.briefing.length - 1) { onDone(); return; }
      i++; t = 0; audio.radioOpen(); render();
    };
    render(); audio.radioOpen();
    this.menu = { custom: () => {
      t += 1 / 60;
      if (input.pressed('confirm') || input.pressed('fire')) next();
      else if (input.pressed('pause')) { audio.menuConfirm(); onDone(); }
      return true;
    } };
  }
  results(res, g) {
    this.showHUD(false); this.clearCards();
    const m = res.mission;
    const prevBest = save.best[m.id] ?? 0;
    const routeName = res.route ? (res.route === 'canyon' ? 'Canyon Pass' : 'Corvalis Bay') : 'Asteria Belt';
    this.screenEl.innerHTML = `<div class="center"><div class="results panel">
      <div style="font-size:2.4vmin;letter-spacing:.4em;color:#9fe3ff">MISSION ACCOMPLISHED</div><h2>${m.name}</h2>
      <div class="rrow"><span>Enemies hit</span><b id="cnt">0</b></div>
      <div class="rrow"><span>Medal requirement</span><b>${res.medalNeed}</b></div>
      <div class="rrow"><span>Laser accuracy</span><b>${res.accuracy}%</b></div>
      <div class="rrow"><span>Route</span><b>${routeName}</b></div>
      <div class="rrow"><span>Shots deflected · Multi-hit bonus</span><b>${res.stats.deflects} · +${res.stats.multiBonus}</b></div>
      <div class="medalbig" id="medal" style="opacity:0">${res.medal ? '★ MEDAL EARNED ★' : 'NO MEDAL · TRY FOR ' + res.medalNeed + ' HITS'}</div>
      <div class="teamres">${res.team.map((t) => `<div><canvas width="128" height="128" data-id="${t.id}"></canvas>${CAST[t.id].name.split(' ')[0]}<br><b style="color:${t.hp > 50 ? '#70ff9a' : t.hp > 0 ? '#ffc040' : '#ff5060'}">${t.hp > 0 ? Math.round(t.hp) + '%' : 'REPAIRS'}</b></div>`).join('')}</div>
      ${res.hits > prevBest ? '<div style="font-size:2.6vmin;color:#7ad8ff">NEW BEST!</div>' : ''}
      </div></div><div class="footer"><span>${glyph('confirm')} Continue</span></div>`;
    this.screenEl.querySelectorAll('.teamres canvas').forEach((c) => drawPortraitInto(c, c.dataset.id, 0));
    let n = 0; const cnt = this.screenEl.querySelector('#cnt');
    const iv = setInterval(() => { n = Math.min(res.hits, n + Math.max(1, Math.ceil(res.hits / 50))); cnt.textContent = n; audio.menuMove(); if (n >= res.hits) { clearInterval(iv); this.screenEl.querySelector('#medal').style.opacity = 1; res.medal ? audio.oneUp() : audio.menuBack(); } }, 40);
    if (res.hits > prevBest) save.best[m.id] = res.hits;
    if (res.medal) save.medals[m.id] = true;
  }
  gameOver(g, onContinue, onQuit) {
    this.showHUD(false); this.clearCards();
  }
}
