// Menus. All follow the 10-foot rules: at most six choices, big tags, never a web form.
import { el, txt } from '../ui.js';
import { TITLE, SEATS } from '../../data/config.js';
import { EVENTS, FREE_ORDER } from '../../data/events.js';
import { TIER_NAMES, DAYS, MEDALS, TEST_NAMES } from '../../data/programme.js';
import { tierOpen, highestTier, medalFor, newProfile, liveDays } from '../../game/programme.js';
import { genName } from '../../data/names.js';
import { START_PAINTS, UNLOCKS } from '../../data/unlocks.js';
import { HATS } from '../../art/doll.js';
import { cosmetic } from '../../core/rng.js';
import { wipeSave } from '../../core/save.js';
import { openDev } from '../../game/devmode.js';
import { openGroupLobby } from '../../game/groupclass.js';
import { aboutPages } from '../../game/ending.js';
import { resetTuning, T } from '../../core/tuning.js';
const hdr = (e, t) => e.appendChild(txt('div', 'title-h', t));
const pager = (ui, e, page, n, set) => { if (n <= 1) return; const row = el('div', 'row'); row.append(ui.btn('‹', () => set(page - 1), { cls: `small ${page > 0 ? '' : 'locked'}` }), txt('div', 'gaugeTag', `Page ${page + 1} of ${n}`), ui.btn('›', () => set(page + 1), { cls: `small ${page < n - 1 ? '' : 'locked'}` })); e.appendChild(row); };
export function openTitle(g) {
  const ui = g.ui;
  if (ui.has('title')) return;
  const touch = g.input.touchOnly && !g.input.padSeen && !g.touchCleared;
  ui.open('title', (e) => {
    const beam = el('div', 'beam'); const letters = el('div', 'letters'); const spans = []; for (const ch of TITLE) { const s = txt('span', 'l', ch === ' ' ? ' ' : ch); letters.appendChild(s); spans.push(s); } beam.appendChild(letters); e.appendChild(beam);
    e.appendChild(el('div', 'grow'));
    g.titleBeam = (dt) => { if (!beam.isConnected) { g.titleBeam = null; return; } const a = -g.island.tx * 57.3 * .9; beam.style.transform = `rotate(${a.toFixed(2)}deg)`; const t = performance.now() * .001; spans.forEach((s, i) => { s.style.transform = `translateX(${(a * 1.1 + Math.sin(t * .8 + i) * 2).toFixed(1)}px) translateY(${Math.abs(a) * .1}px) rotate(${(a * .6).toFixed(1)}deg)`; }); };
    const wrap = el('div', 'titlepress');
    if (touch) {
      const col = el('div', 'col'); col.append(txt('div', 'warn', 'Controller or keyboard required'), ui.btn('Settings', () => openSettings(g), { def: true })); wrap.appendChild(col); e.appendChild(wrap); e.dataset.touch = '1';
    } else { const b = ui.btn('Press', () => openMenu(g), { def: true, cls: 'wood' }); const gl = el('span'); gl.dataset.verb = 'use'; b.appendChild(gl); wrap.appendChild(b); e.appendChild(wrap); }
  }, { tick: touch ? () => { if (g.input.padSeen || g.input.anyKey) { g.touchCleared = true; ui.closeAll(); openTitle(g); } } : undefined });
  if (touch) { const once = (ev) => { if (ev.type === 'keydown') { removeEventListener('keydown', once); g.touchCleared = true; g.input.swallow(); ui.closeAll(); openTitle(g); } }; addEventListener('keydown', once); }
}
export function openMenu(g) {
  const ui = g.ui; const hasP = g.save.profiles.some(Boolean);
  ui.open('menu', (e) => {
    e.appendChild(el('div', 'grow'));
    const c = el('div', 'col');
    c.append(ui.btn(hasP ? 'Continue' : 'Programme', () => openWho(g, () => g.enterProgramme()), { def: true }), ui.btn('Group Class', () => openGroupLobby(g)), ui.btn('Free Play', () => openWho(g, () => openFreePlay(g))), ui.btn('Journal', () => openWho(g, () => openJournal(g))), ui.btn('Settings', () => openSettings(g)), ui.btn('About / Credits', () => openAbout(g)));
    e.appendChild(c); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'Choose'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
export function openWho(g, then) {
  const ui = g.ui;
  ui.open('who', (e, layer) => {
    hdr(e, "Who's here today?"); const mats = el('div', 'mats');
    g.save.profiles.forEach((p, i) => {
      const m = ui.cardBtn('mat', () => { if (p) { g.save.current = i; g.persist(); ui.close(); then(); } else openNewProfile(g, i, then); }, (b) => { if (p) { const ch = el('div', 'chip'); ch.style.background = p.paint; b.append(ch, txt('div', '', p.name), txt('div', 'small', p.day > DAYS.length ? 'Maintenance' : `Day ${p.day}`), txt('div', 'small', `${p.marbles} marbles`)); } else { b.append(txt('div', '', 'Empty mat'), txt('div', 'small', 'Step on')); } });
      if (i === Math.max(0, g.save.current)) m.dataset.default = '1'; mats.appendChild(m);
    });
    e.appendChild(mats); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'Step on'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
export function openNewProfile(g, slot, then) {
  const ui = g.ui; let name = genName(cosmetic);
  ui.open('newprofile', (e, layer) => {
    hdr(e, 'A new guest'); e.appendChild(el('div', 'grow')); const c = el('div', 'bigcard'); c.append(txt('div', 'small', 'Your name, I think, is'), txt('div', 'line', name)); c.children[1].style.fontSize = 'calc(84px*var(--vh,1))'; c.children[1].style.fontWeight = '700'; e.appendChild(c);
    const row = el('div', 'row'); row.append(ui.btn('That is me', () => openPaint(g, slot, name, then), { def: true }), ui.btn('Another name', () => { name = genName(cosmetic); layer.rebuild(); })); e.appendChild(row); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['use', 'Choose'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
function openPaint(g, slot, name, then) {
  const ui = g.ui;
  ui.open('paint', (e) => {
    hdr(e, 'Pick your paint'); e.appendChild(el('div', 'grow')); const sw = el('div', 'swatches'); for (const col of START_PAINTS) { const s = el('div', 'swatch'); s.style.background = col; s.style.width = s.style.height = 'calc(150px*var(--vh,1))'; s.dataset.focus = '1'; s._act = () => { const p = newProfile(name, col); g.save.profiles[slot] = p; g.save.current = slot; g.persist(); ui.closeTo('who'); ui.close(); then(); }; sw.appendChild(s); } e.appendChild(sw); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'This one'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
export function openQuestion(g, q, cb) {
  const ui = g.ui;
  ui.open('question', (e) => {
    e.appendChild(el('div', 'grow')); const c = el('div', 'bigcard'); c.append(txt('div', 'small', 'Trudy would like to know'), txt('div', 'title-h', q.q)); c.querySelector('.title-h').style.color = '#1A1420'; c.querySelector('.title-h').style.webkitTextStroke = '0'; c.querySelector('.title-h').style.textShadow = 'none'; e.appendChild(c);
    const row = el('div', 'row'); row.append(ui.btn(q.a, () => cb('a'), { def: true }), ui.btn(q.b, () => cb('b'))); e.appendChild(row); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'Answer']]));
  }, {});
  g.audio.speak('trudy', q.q);
}
export function openPlan(g) {
  const ui = g.ui; const p = g.profile, plan = g.planFor(), def = g.dayDef();
  if (ui.has('plan') || (g.hub && g.hub.locked && !g.planAllowed)) return;
  g.input.menu.confirm = false;
  ui.open('plan', (e) => {
    e.classList.add('dim'); hdr(e, `Day ${p.day}: ${def ? def.name : 'Maintenance'}`); const row = el('div', 'row');
    for (const id of plan) {
      const C = EVENTS[id]; const done = p.doneToday.includes(id);
      const card = ui.cardBtn('card', () => { ui.close(); if (!done) g.playClass(id, 'programme'); else g.playClass(id, { kind: 'hub-free', tier: g.tierFor(id) }); }, (b) => { b.append(txt('div', 'big', C.title), txt('div', '', C.discipline), txt('div', 'small', C.place)); if (done) b.appendChild(txt('div', 'stamp', 'DONE')); });
      if (!done && !row.querySelector('[data-default]')) card.dataset.default = '1';
      row.appendChild(card);
    }
    e.appendChild(row); const rem = g.remaining().length; e.appendChild(txt('div', 'sub-h', rem ? `${rem} left today. Walk there, or pick a card.` : 'All done. The Bed Hut is open.'));
    const r2 = el('div', 'row'); r2.append(ui.btn('Back to the island', () => ui.close(), { cls: 'small' }), ui.btn('Journal', () => openJournal(g), { cls: 'small' })); if (!rem) r2.appendChild(ui.btn('Go to bed', () => { ui.close(); g.tryBed(); }, { cls: 'small', def: true })); e.appendChild(r2);
    e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'Go'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
export function openLandmarkPick(g, evs) {
  const ui = g.ui;
  ui.open('landmark', (e) => { e.classList.add('dim'); hdr(e, 'Which class?'); const row = el('div', 'row'); for (const id of evs) row.appendChild(ui.cardBtn('card', () => { ui.close(); openTierPick(g, id, 'hub-free'); }, (b) => b.append(txt('div', 'big', EVENTS[id].title), txt('div', 'small', EVENTS[id].place)))); e.appendChild(row); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['use', 'Go'], ['back', 'Back']])); }, { onBack: () => ui.close() });
}
export function openTierPick(g, id, kind) {
  const ui = g.ui, p = g.profile; const best = p?.medals[id]?.tiers; const C = EVENTS[id]; const tiers = C.tiers.length;
  const open = [0, 1, 2].slice(0, tiers).filter(i => tierOpen(best, i) || (p && p.allOpen));
  if (open.length <= 1) { g.playClass(id, { kind, tier: 0 }); return; }
  ui.open('tierpick', (e) => { e.classList.add('dim'); hdr(e, C.title); const row = el('div', 'row'); for (const t of open) row.appendChild(ui.cardBtn('card', () => { ui.closeAll(); g.playClass(id, { kind, tier: t }); }, (b) => b.append(txt('div', 'big', TIER_NAMES[t]), txt('div', 'small', best?.[t] != null ? `Best form ${Math.round(best[t])}` : 'Not tried yet')))); e.appendChild(row); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['use', 'Go'], ['back', 'Back']])); }, { onBack: () => ui.close() });
}
export function openFreePlay(g) {
  const ui = g.ui, p = g.profile; let page = 0; const list = FREE_ORDER.filter(id => EVENTS[id]); const per = 6, pages = Math.ceil(list.length / per);
  ui.open('freeplay', (e, layer) => {
    e.classList.add('dim'); hdr(e, 'Free Play'); const row = el('div', 'row');
    for (const id of list.slice(page * per, page * per + per)) { const met = p?.met.includes(id) || p?.levelled; const C = EVENTS[id]; const rec = p?.medals[id]; row.appendChild(ui.cardBtn(`card ${met ? '' : 'locked'}`, () => { if (!met) { g.audio.sfx('back'); ui.toast('You have not met this class yet.'); return; } openTierPick(g, id, 'free'); }, (b) => { b.append(txt('div', 'big', met ? C.title : '???'), txt('div', 'small', met ? (rec ? medalFor(rec.best).name : 'Not done yet') : 'Not met yet')); })); }
    e.appendChild(row); pager(ui, e, page, pages, (n) => { page = Math.max(0, Math.min(pages - 1, n)); layer.rebuild(false); }); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'Go'], ['back', 'Back']]));
  }, { onBack: () => ui.close(), onLeft: () => {}, onRight: () => {} });
}
export function openMirror(g) {
  const ui = g.ui, p = g.profile; const hub = g.hub;
  const hats = [['none', 0, 'No hat'], ...UNLOCKS.filter(u => u.kind === 'hat').map(u => [u.id, u.at, u.name])]; if (p.levelled) hats.push(['wizard', 0, 'A Wizard Hat, For Finishing']);
  const paints = [...START_PAINTS.slice(0, 5), ...UNLOCKS.filter(u => u.kind === 'paint').map(u => u.id)];
  if (hub) { hub.locked = true; hub.doll.setPaint(p.paint); }
  let page = 0; const per = 5, hatPages = Math.ceil(hats.length / per), pages = hatPages + 1;
  ui.open('mirror', (e, layer) => {
    hdr(e, page < hatPages ? 'The Mirror: Hats' : 'The Mirror: Paint'); const row = el('div', 'row');
    if (page < hatPages) for (const [id, at, name] of hats.slice(page * per, page * per + per)) { const ok = p.marbles >= at; row.appendChild(ui.cardBtn(`card ${ok ? '' : 'locked'}`, () => { if (!ok) { g.audio.sfx('back'); return; } p.hat = id; hub?.doll.setHat(id); g.persist(); layer.rebuild(); }, (b) => { b.append(txt('div', '', ok ? name : '???'), txt('div', 'small', ok ? (p.hat === id ? 'Wearing' : 'Try it') : `${at} marbles`)); })); }
    else { const sw = el('div', 'swatches'); for (const col of paints.slice(0, 6)) sw.appendChild(swatch(col)); row.appendChild(sw); }
    function swatch(col) { const un = START_PAINTS.includes(col) || p.marbles >= (UNLOCKS.find(u => u.id === col)?.at ?? 0); const s = el('div', `swatch ${col === p.paint ? 'sel' : ''}`); s.style.background = un ? col : '#999'; s.dataset.focus = '1'; s._act = () => { if (!un) return; p.paint = col; hub?.doll.setPaint(col); g.persist(); layer.rebuild(); }; return s; }
    e.appendChild(row); pager(ui, e, page, pages, (n) => { page = Math.max(0, Math.min(pages - 1, n)); layer.rebuild(false); }); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'Choose'], ['back', 'Back']]));
  }, { onBack: () => { ui.close(); if (hub) hub.locked = false; }, tick: (dt) => { if (hub) hub.face += dt * .9; } });
}
export function openJournal(g) {
  const ui = g.ui, p = g.profile; let page = 0;
  const medalIds = Object.keys(p.medals); const medalPages = Math.max(1, Math.ceil(medalIds.length / 8)); const total = 2 + medalPages + 1;
  ui.open('journal', (e, layer) => {
    e.classList.add('solid');
    if (page === 0) { hdr(e, 'The Calendar'); const c = el('div', 'calendar'); const n = Math.max(14, p.day + 2); for (let i = 1; i <= Math.min(14, n); i++) { const d = el('div', `d ${i < p.day ? 'st' : ''}`); d.textContent = String(i); c.appendChild(d); } e.appendChild(c); e.appendChild(txt('div', 'sub-h', `You are on Day ${p.day}. It has been noticed.`)); }
    else if (page === 1) {
      hdr(e, 'Your Wobble Age'); const ages = p.ages.length ? p.ages : [0]; const W = 1000, H = 300, n = ages.slice(-12); const pts = n.map((a, i) => `${60 + i / Math.max(1, n.length - 1) * (W - 120)},${H - 20 - (a - 18) / 81 * (H - 40)}`).join(' ');
      const g2 = el('div'); g2.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${Math.round(innerWidth * .62)}" style="background:#FFF8EE;border:6px solid #1A1420;border-radius:18px"><polyline points="${pts}" fill="none" stroke="#1A1420" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>${n.map((a, i) => `<circle cx="${60 + i / Math.max(1, n.length - 1) * (W - 120)}" cy="${H - 20 - (a - 18) / 81 * (H - 40)}" r="14" fill="#E8443A" stroke="#1A1420" stroke-width="5"/>`).join('')}</svg>`; e.appendChild(g2);
      const nums = el('div', 'bignums'); const big = (lb, v) => { const d = el('div', 'n'); d.appendChild(txt('b', '', String(v))); d.appendChild(document.createTextNode(lb)); return d; }; nums.append(big('Today', p.ages.at(-1) ?? '—'), big('First', p.ages[0] ?? '—'), big('Best', p.ages.length ? Math.min(...p.ages) : '—')); e.appendChild(nums);
    } else if (page < 2 + medalPages) {
      hdr(e, 'The Medal Shelf'); const sh = el('div', 'shelf'); const off = (page - 2) * 8; for (const id of medalIds.slice(off, off + 8)) { const r = p.medals[id], M = MEDALS.find(m => m.id === r.medal) || MEDALS[4]; const d = el('div', 'medal'); const b = el('div', 'blob'); b.style.background = M.colour; d.append(b, txt('div', '', EVENTS[id]?.title || id), txt('div', '', M.name)); sh.appendChild(d); } if (!medalIds.length) sh.appendChild(txt('div', 'sub-h', 'Nothing yet. The shelf is very patient.')); e.appendChild(sh);
    } else {
      hdr(e, 'Silly Totals'); const nums = el('div', 'bignums'); const big = (lb, v) => { const d = el('div', 'n'); d.appendChild(txt('b', '', String(v))); d.appendChild(document.createTextNode(lb)); return d; }; nums.append(big('Floor Exercises', p.falls), big('Minutes', Math.round(p.minutes)), big('Marbles', p.marbles)); e.appendChild(nums); e.appendChild(txt('div', 'sub-h', 'I was not counting. Those are just the numbers.'));
    }
    e.appendChild(el('div', 'grow')); pager(ui, e, page, total, (n) => { page = Math.max(0, Math.min(total - 1, n)); layer.rebuild(false); }); e.appendChild(ui.bottom([['move', 'Turn the page'], ['back', 'Back']]));
  }, { onBack: () => ui.close(), onLeft: () => { page = Math.max(0, page - 1); ui.top().rebuild(false); }, onRight: () => { page = Math.min(total - 1, page + 1); ui.top().rebuild(false); } });
}
export function openPause(g, msg) {
  const ui = g.ui; g.simPaused = true; g.input.menu.back = false; document.body.classList.remove('hidecursor'); const ev = g.mode?.event;
  const resume = () => { ui.closeTo('pause'); ui.close(); g.simPaused = false; if (ev && !g.attractOn) document.body.classList.add('hidecursor'); };
  ui.open('pause', (e) => {
    e.classList.add('dim'); hdr(e, 'Paused'); if (msg) e.appendChild(txt('div', 'warn', msg)); else e.appendChild(txt('div', 'sub-h', g.line('trudy', 'pauseTip') || ''));
    const c = el('div', 'col'); c.append(ui.btn('Resume', resume, { def: true }));
    if (ev) c.appendChild(ui.btn('Restart', () => { resume(); if (g.onRestart) g.onRestart(); }));
    c.append(ui.btn('How to Play', () => openHowTo(g)), ui.btn('Settings', () => openSettings(g)), ui.btn('Dev Mode', () => openDev(g)));
    c.appendChild(ui.btn(ev ? 'Leave Class' : 'Main Menu', () => { ui.closeAll(); g.simPaused = false; g.speech.clear(); document.body.classList.remove('hidecursor'); if (ev) { g.leaveClass(); } else { g.scripts.killTag('flow'); g.goTitle(true); } }));
    e.appendChild(c); e.appendChild(el('div', 'grow')); e.appendChild(ui.bottom([['move', 'Move'], ['use', 'Choose'], ['back', 'Resume']]));
  }, { onBack: resume });
}
export function openHowTo(g) {
  const ui = g.ui; const C = g.mode?.event?.cls;
  const pages = [
    C ? { t: C.title, body: [C.sentence, C.can, C.cant], verbs: C.verbs } : { t: 'The Island', body: ['Walk to the classes, or pick them from the plan. Then go to bed.', 'Every class puts marbles in the jar, and the island comes up.', "You can't get stuck. The island cares about attendance, not skill."], verbs: [['walk', 'Walk'], ['useIsl', 'Use'], ['ask', 'Ask Trudy'], ['look', 'Look']] },
    { t: 'Your Weight', body: ['The dot is where you are leaning. The ring is where you are asking to go.', 'The dot is slow. Ask early and small. Whip it and you will fall.', 'Falling costs you only the current hold. It is also very funny.'], verbs: [['lean', 'Lean'], ['recentre', 'Recentre']] },
    { t: 'Flail', body: ['Flail makes your ankles briefly heroic. It lasts a moment, then rests for two seconds.', 'Use it as you pass the point of no return. Too early, and it wears off.'], verbs: [['flail', 'Flail']] },
    { t: 'Breathe', body: ['In stillness classes, hold Breathe while the ring grows and let go while it shrinks.', 'In time with it, your body settles and your form counts for more.'], verbs: [['breath', 'Breathe']] },
  ]; let page = 0;
  ui.open('howto', (e, layer) => { e.classList.add('dim'); const P = pages[page]; hdr(e, P.t); const c = el('div', 'bigcard'); for (const b of P.body) c.appendChild(txt('div', 'line', b)); c.appendChild(ui.promptBar(P.verbs)); e.appendChild(c); e.appendChild(el('div', 'grow')); pager(ui, e, page, pages.length, (n) => { page = Math.max(0, Math.min(pages.length - 1, n)); layer.rebuild(false); }); e.appendChild(ui.bottom([['back', 'Back']])); }, { onBack: () => ui.close(), onLeft: () => { page = Math.max(0, page - 1); ui.top().rebuild(false); }, onRight: () => { page = Math.min(pages.length - 1, page + 1); ui.top().rebuild(false); } });
}
export function openSettings(g) {
  const ui = g.ui, S = g.settings; let page = 0; const save = () => { g.applySettings(); g.persist(); }; const names = ['Sound', 'Controls', 'Display', 'Game'];
  ui.open('settings', (e, layer) => {
    e.classList.add('dim'); hdr(e, `Settings: ${names[page]}`); const c = el('div', 'col');
    if (page === 0) { c.append(ui.slider('Music', () => S.music, (v) => { S.music = v; save(); }, 0, 100, 5), ui.slider('Sound', () => S.sfx, (v) => { S.sfx = v; save(); g.audio.sfx('move'); }, 0, 100, 5), ui.slider('Voice', () => S.voice, (v) => { S.voice = v; save(); }, 0, 100, 5)); }
    if (page === 1) { c.append(ui.choice('Controller glyphs', [['ps', 'PlayStation'], ['xbox', 'Xbox']], () => S.glyph, (v) => { S.glyph = v; save(); }), ui.toggle('Rumble', () => S.rumble, (v) => { S.rumble = v; save(); }), ui.toggle('Auto-breathe', () => S.autoBreathe, (v) => { S.autoBreathe = v; save(); }), ui.slider('Rhythm offset (ms)', () => S.rhythmOffset, (v) => { S.rhythmOffset = v; save(); }, -200, 200, 10)); }
    if (page === 2) { c.append(ui.slider('UI scale', () => S.uiScale, (v) => { S.uiScale = v; save(); }, 1, 1.3, .05, (v) => `${Math.round(v * 100)}%`), ui.slider('Ink strength', () => S.ink, (v) => { S.ink = v; save(); }, 0, 2, .1), ui.toggle('Reduce shake', () => S.reduceShake, (v) => { S.reduceShake = v; save(); }), ui.toggle('Fullscreen', () => !!document.fullscreenElement, (v) => { try { if (v) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); } catch { ui.toast('This browser would rather not.'); } })); }
    if (page === 3) { c.append(ui.choice('Difficulty', [['gentle', 'Gentle'], ['standard', 'Standard'], ['honest', 'Honest']], () => S.difficulty, (v) => { S.difficulty = v; save(); }), ui.btn('Reset save', () => openConfirm(g, 'Erase every guest and every marble?', () => { const s = wipeSave(); g.save = s; s.settings = S; g.scripts.killTag('flow'); ui.closeAll(); g.simPaused = false; g.goTitle(true); }))); }
    e.appendChild(c); e.appendChild(el('div', 'grow')); pager(ui, e, page, 4, (n) => { page = Math.max(0, Math.min(3, n)); layer.rebuild(false); }); e.appendChild(ui.bottom([['move', 'Move and adjust'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
export function openConfirm(g, text, yes) { const ui = g.ui; ui.open('confirmbox', (e) => { e.classList.add('dim'); e.appendChild(el('div', 'grow')); const c = el('div', 'bigcard'); c.appendChild(txt('div', 'line', text)); e.appendChild(c); const r = el('div', 'row'); r.append(ui.btn('No', () => ui.close(), { def: true }), ui.btn('Yes', () => { ui.close(); yes(); })); e.appendChild(r); e.appendChild(el('div', 'grow')); }, { onBack: () => ui.close() }); }
export function openAbout(g) {
  const ui = g.ui; const pages = aboutPages(); let page = 0;
  ui.open('about', (e, layer) => {
    e.classList.add('solid'); const P = pages[page]; const c = el('div', 'about'); c.appendChild(txt('div', 'sub-h', P.title)); for (const [k, v] of P.rows) { const d = el('div'); if (k) { d.appendChild(txt('b', '', /[?)]$/.test(k) ? `${k} ` : `${k}: `)); } d.appendChild(document.createTextNode(v)); c.appendChild(d); } e.appendChild(c); e.appendChild(el('div', 'grow')); pager(ui, e, page, pages.length, (n) => { page = Math.max(0, Math.min(pages.length - 1, n)); layer.rebuild(false); }); e.appendChild(ui.bottom([['move', 'Turn the page'], ['back', 'Back']]));
  }, { onBack: () => ui.close(), onLeft: () => { page = Math.max(0, page - 1); ui.top().rebuild(false); }, onRight: () => { page = Math.min(pages.length - 1, page + 1); ui.top().rebuild(false); } });
}
export const openGroup = (g) => openGroupLobby(g);
export { resetTuning, T, liveDays, SEATS, highestTier, TEST_NAMES, HATS };
