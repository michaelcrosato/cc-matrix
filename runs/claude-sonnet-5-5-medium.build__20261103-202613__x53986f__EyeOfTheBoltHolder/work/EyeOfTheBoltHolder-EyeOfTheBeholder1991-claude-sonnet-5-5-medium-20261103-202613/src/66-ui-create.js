/* CHARACTER CREATION: a roster of four, an editor in five steps, Quick Start. */
(() => {
  const E = My3D2dge, P = () => UI.PAL, STEPS = ['race', 'class', 'look', 'stats', 'name'];
  const roll4 = () => { const d = [1, 2, 3, 4].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b); return d[1] + d[2] + d[3]; };
  UI.rollStats = (race, cls) => { const mods = B.RACES[race].mods, mn = B.CLASSES[cls].min; for (let tries = 0; tries < 200; tries++) { const s = {}; for (const k of ['str', 'dex', 'con', 'int', 'wis']) s[k] = B.clamp(roll4() + (mods[k] || 0), 3, 18); if (Object.keys(mn).every(k => s[k] >= mn[k])) return s; } const s = { str: 13, dex: 13, con: 12, int: 12, wis: 13 }; for (const k in mn) s[k] = Math.max(s[k], mn[k]); return s; };
  const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  UI.screens.create = {
    pause: true,
    enter() { this.F = new UI.Focus(); this.F.id = 'slot0'; this.slots = [null, null, null, null]; this.edit = null; this.kb = false; this.typed = null; this.keyH = e => { if (!this.edit || this.edit.step !== 4) return; if (e.key === 'Backspace') this.edit.name = this.edit.name.slice(0, -1); else if (e.key === 'Enter') { } else if (e.key.length === 1 && /[A-Za-z' -]/.test(e.key) && this.edit.name.length < 10) this.edit.name += this.edit.name.length ? e.key : e.key.toUpperCase(); }; window.addEventListener('keydown', this.keyH); },
    exit() { window.removeEventListener('keydown', this.keyH); },
    startEdit(i) { this.edit = { slot: i, step: 0, race: 'human', cls: 'fighter', sex: 'm', look: 0, stats: null, name: '' }; this.F.id = 'race:human'; },
    build(e) { return { name: e.name || B.pick({ rng: { w: 1 } , ...{} }, 'w', B.NAMES[e.race] || ['Hero']), race: e.race, cls: e.cls, sex: e.sex, stats: e.stats, look: e.look }; },
    update(dt) {
      const F = this.F, inp = UI.game.input, r = UI.game.r; F.begin(); const cx = Math.round(r.W / 2);
      if (!this.edit) {
        for (let i = 0; i < 4; i++) { const x = cx - 130 + (i & 1) * 134, y = 36 + (i >> 1) * 56; F.add('slot' + i, x, y, 126, 34); F.add('pre' + i, x, y + 36, 62, 12); F.add('clr' + i, x + 64, y + 36, 62, 12); }
        F.add('quick', cx - 130, 150, 126, 15); F.add('begin', cx + 4, 150, 126, 15, { dis: this.slots.some(s => !s) }); F.add('back', cx - 40, 168, 80, 13);
        const res = F.run(); if (!res) return; if (res.act === 'back') { UI.close(); return; } if (res.act !== 'confirm' && res.act !== 'click' || !res.item) return; const id = res.item.id;
        if (id.startsWith('slot')) this.startEdit(+id.slice(4)); else if (id.startsWith('pre')) { const i = +id.slice(3); this.slots[i] = B.PREMADE[i]; } else if (id.startsWith('clr')) this.slots[+id.slice(3)] = null;
        else if (id === 'quick') { this.slots = B.PREMADE.slice(); } else if (id === 'begin') { if (!res.item.dis) { UI.close(); B.premade(); UI.beginCampaign(this.slots.map(s => B.makeMember(s))); } else UI.sfx('ui_err'); } else if (id === 'back') UI.close();
        return;
      }
      const e = this.edit, step = STEPS[e.step];
      if (step === 'race') { Object.keys(B.RACES).forEach((k, i) => F.add('race:' + k, cx - 130 + (i & 1) * 134, 60 + (i >> 1) * 46, 126, 40)); }
      else if (step === 'class') { B.RACES[e.race].cls.forEach((k, i) => F.add('cls:' + k, cx - 130 + (i % 3) * 88, 60 + Math.floor(i / 3) * 46, 82, 40)); }
      else if (step === 'look') { F.add('prev', cx - 90, 100, 20, 20); F.add('next', cx + 70, 100, 20, 20); F.add('sex', cx - 30, 150, 60, 13); F.add('ok', cx - 30, 166, 60, 13); }
      else if (step === 'stats') { if (!e.stats) e.stats = UI.rollStats(e.race, e.cls); F.add('keep', cx - 100, 150, 90, 14); F.add('reroll', cx + 10, 150, 90, 14); }
      else if (step === 'name') { if (this.kb) { KEYS.forEach((k, i) => F.add('k:' + k, cx - 100 + (i % 10) * 20, 94 + Math.floor(i / 10) * 18, 18, 16)); F.add('k:del', cx - 100, 148, 50, 14); F.add('k:done', cx + 50, 148, 50, 14); } else { B.NAMES[e.race].forEach((n, i) => F.add('n:' + n, cx - 135 + (i % 4) * 68, 62 + Math.floor(i / 4) * 17, 64, 15)); F.add('type', cx - 100, 128, 60, 13); F.add('random', cx - 30, 128, 60, 13); F.add('done', cx + 40, 128, 60, 13); } }
      const res = F.run(); const back = () => { if (this.kb) { this.kb = false; return; } if (e.step === 0) { this.edit = null; F.id = 'slot' + e.slot; } else { e.step--; F.id = null; if (STEPS[e.step] === 'stats') { } } };
      if (step === 'look' && res && (res.act === 'left' || res.act === 'right')) { e.look = (e.look + (res.act === 'left' ? 5 : 1)) % 6; }
      if (step === 'stats' && inp.pressed('altB')) { e.stats = UI.rollStats(e.race, e.cls); UI.sfx('ui_ok'); }
      if (step === 'name' && inp.pressed('alt') && !this.kb) { e.name = B.NAMES[e.race][Math.floor(Math.random() * 12)]; UI.sfx('ui_ok'); }
      if (!res) return; if (res.act === 'back') { back(); return; } if (res.act !== 'confirm' && res.act !== 'click' || !res.item) return; const id = res.item.id;
      const adv = () => { e.step++; F.id = null; };
      if (step === 'race') { e.race = id.slice(5); if (!B.RACES[e.race].cls.includes(e.cls)) e.cls = B.RACES[e.race].cls[0]; adv(); }
      else if (step === 'class') { e.cls = id.slice(4); e.stats = null; adv(); }
      else if (step === 'look') { if (id === 'prev') e.look = (e.look + 5) % 6; else if (id === 'next') e.look = (e.look + 1) % 6; else if (id === 'sex') e.sex = e.sex === 'm' ? 'f' : 'm'; else adv(); }
      else if (step === 'stats') { if (id === 'reroll') e.stats = UI.rollStats(e.race, e.cls); else adv(); }
      else if (step === 'name') {
        if (id.startsWith('n:')) e.name = id.slice(2); else if (id === 'type') { this.kb = true; F.id = null; } else if (id === 'random') e.name = B.NAMES[e.race][Math.floor(Math.random() * 12)];
        else if (id.startsWith('k:')) { const k = id.slice(2); if (k === 'del') e.name = e.name.slice(0, -1); else if (k === 'done') this.kb = false; else if (e.name.length < 10) e.name += e.name.length ? k.toLowerCase() : k; }
        else if (id === 'done') { if (!e.name) e.name = B.NAMES[e.race][Math.floor(Math.random() * 12)]; this.slots[e.slot] = { name: e.name, race: e.race, cls: e.cls, sex: e.sex, stats: e.stats, look: e.look }; this.edit = null; F.id = 'slot' + e.slot; UI.sfx('ui_ok'); }
      }
    },
    draw(g, r) {
      const F = this.F, P2 = P(), cx = Math.round(r.W / 2); UI.veil(g, r, .82); UI.panel(g, cx - 140, 4, 280, r.H - 8); UI.title(g, 'YOUR PARTY OF FOUR', cx, 10, { scale: 2 });
      const portrait = (spec, x, y, sz) => { const m = { race: spec.race, cls: spec.cls, sex: spec.sex, look: spec.look, state: 'ok' }; const key = spec.race + spec.cls + spec.sex + spec.look; if (!UI._pc) UI._pc = {}; const rig = UI._pc[key] || (UI._pc[key] = B.rigFor(m)); rig.drawPortrait(g, x, y, sz, { zoom: sz / 11, turn: .4, bg: '#2a2438' }); };
      if (!this.edit) {
        for (let i = 0; i < 4; i++) { const q = F.items[F.index('slot' + i)]; if (!q) continue; const s = this.slots[i], sel = F.id === 'slot' + i; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sel }); if (s) { portrait(s, q.x + 4, q.y + 4, 26); UI.text(g, s.name, q.x + 34, q.y + 6, P2.text); UI.text(g, B.RACES[s.race].n + ' ' + B.CLASSES[s.cls].n, q.x + 34, q.y + 17, P2.dim, { font: 'tiny' }); } else UI.text(g, 'Create', q.x + q.w / 2, q.y + 12, sel ? P2.focus : P2.dim, { align: 'center' });
          for (const [pid, lab] of [['pre' + i, 'Premade'], ['clr' + i, 'Clear']]) { const b = F.items[F.index(pid)]; if (!b) continue; const sl = F.id === pid; UI.panel(g, b.x, b.y, b.w, b.h, { focus: sl }); UI.text(g, lab, b.x + b.w / 2, b.y + 2, sl ? P2.focus : P2.text, { align: 'center', font: 'tiny' }); } }
        for (const [id, lab] of [['quick', 'Quick Start'], ['begin', 'Begin the Descent'], ['back', 'Back']]) { const q = F.items[F.index(id)]; if (!q) continue; const sl = F.id === id; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, lab, q.x + q.w / 2, q.y + 3, q.dis ? '#4a4030' : sl ? P2.focus : P2.text, { align: 'center' }); }
        UI.prompts(g, [['confirm', 'Choose'], ['cancel', 'Back']], cx, r.H - 18, { center: true }); return;
      }
      const e = this.edit, step = STEPS[e.step]; UI.text(g, 'Member ' + (e.slot + 1) + ' - ' + ['Race', 'Class', 'Look', 'Stats', 'Name'][e.step], cx, 34, P2.focus, { align: 'center' });
      if (step === 'race') for (const k of Object.keys(B.RACES)) { const q = F.items[F.index('race:' + k)]; if (!q) continue; const sl = F.id === 'race:' + k, R = B.RACES[k]; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); portrait({ race: k, cls: 'fighter', sex: 'm', look: 0 }, q.x + 4, q.y + 5, 30); UI.text(g, R.n, q.x + 40, q.y + 5, sl ? P2.focus : P2.text); UI.wrap(R.trait, 80).forEach((l, i) => UI.text(g, l, q.x + 40, q.y + 16 + i * 8, P2.dim, { font: 'tiny' })); }
      else if (step === 'class') for (const k of B.RACES[e.race].cls) { const q = F.items[F.index('cls:' + k)]; if (!q) continue; const sl = F.id === 'cls:' + k, C = B.CLASSES[k]; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, C.n, q.x + 5, q.y + 4, sl ? P2.focus : P2.text); UI.wrap(C.note, 72).slice(0, 3).forEach((l, i) => UI.text(g, l, q.x + 5, q.y + 15 + i * 8, P2.dim, { font: 'tiny' })); }
      else if (step === 'look') { portrait(e, cx - 36, 78, 72); for (const [id, lab] of [['prev', '←'], ['next', '→'], ['sex', e.sex === 'm' ? 'Male' : 'Female'], ['ok', 'Accept']]) { const q = F.items[F.index(id)]; if (!q) continue; const sl = F.id === id; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, lab, q.x + q.w / 2, q.y + (q.h > 14 ? 6 : 2), sl ? P2.focus : P2.text, { align: 'center' }); } UI.text(g, B.RACES[e.race].n + ' ' + B.CLASSES[e.cls].n + ' - look ' + (e.look + 1) + ' of 6', cx, 64, P2.dim, { align: 'center' }); }
      else if (step === 'stats') { const s = e.stats || {}; portrait(e, cx - 100, 52, 40); ['str', 'dex', 'con', 'int', 'wis'].forEach((k, i) => { UI.text(g, k.toUpperCase(), cx - 40, 56 + i * 15, P2.dim); UI.text(g, String(s[k]), cx - 4, 56 + i * 15, P2.focus, { align: 'right' }); E.ui.bar(g, cx + 4, 58 + i * 15, 70, 5, (s[k] - 3) / 15, '#c8a040'); }); UI.text(g, 'HP ' + (B.CLASSES[e.cls].die + B.mod(s.con || 10)), cx - 100, 98, P2.hp); UI.text(g, 'Needs: ' + (Object.entries(B.CLASSES[e.cls].min).map(([k, v]) => k.toUpperCase() + ' ' + v).join(', ') || 'none'), cx - 100, 108, P2.dim, { font: 'tiny' }); for (const [id, lab] of [['keep', 'Keep'], ['reroll', 'Re-roll']]) { const q = F.items[F.index(id)]; const sl = F.id === id; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, lab, q.x + q.w / 2, q.y + 3, sl ? P2.focus : P2.text, { align: 'center' }); } }
      else if (step === 'name') { UI.text(g, e.name + (Math.floor(UI.game.real * 2) % 2 ? '_' : ' '), cx, 46, P2.focus, { align: 'center', scale: 2 }); if (this.kb) { KEYS.forEach(k => { const q = F.items[F.index('k:' + k)]; if (!q) return; const sl = F.id === 'k:' + k; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, k, q.x + 9, q.y + 4, sl ? P2.focus : P2.text, { align: 'center' }); }); for (const [id, lab] of [['k:del', 'Delete'], ['k:done', 'Done']]) { const q = F.items[F.index(id)]; const sl = F.id === id; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, lab, q.x + q.w / 2, q.y + 3, sl ? P2.focus : P2.text, { align: 'center' }); } }
        else { B.NAMES[e.race].forEach(n => { const q = F.items[F.index('n:' + n)]; if (!q) return; const sl = F.id === 'n:' + n; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl || e.name === n }); UI.text(g, n, q.x + q.w / 2, q.y + 4, sl ? P2.focus : P2.text, { align: 'center', font: 'tiny' }); }); for (const [id, lab] of [['type', 'Type'], ['random', 'Random'], ['done', 'Done']]) { const q = F.items[F.index(id)]; const sl = F.id === id; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sl }); UI.text(g, lab, q.x + q.w / 2, q.y + 3, sl ? P2.focus : P2.text, { align: 'center', font: 'tiny' }); } } }
      UI.prompts(g, [['confirm', 'Choose'], ...(step === 'stats' ? [['altB', 'Re-roll']] : []), ...(step === 'name' ? [['alt', 'Random']] : []), ['cancel', 'Back']], cx, r.H - 18, { center: true });
    }
  };
})();
