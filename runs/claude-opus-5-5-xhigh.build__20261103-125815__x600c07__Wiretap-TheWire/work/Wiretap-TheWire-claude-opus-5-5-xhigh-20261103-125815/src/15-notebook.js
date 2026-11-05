/* 15-notebook: Create / Tab. Six tabs, L1/R1: Objectives, Map, People, Evidence, Phones, Case. At most six items a page;
   ✕ on a map place sets it as the waypoint where a mission asks for a place (the re-up riddle). */
const MAP_PLACES = [['gas', 'Arundel Gas (closed)', 63, 49], ['court', 'Basketball court', 18, 49], ['v1412', '1412 Gaither (vacant)', 27.5, 36], ['mamab', 'Mama B\'s Soul Food', 46.5, 24], ['garage', 'The garage behind the Courts', 52.5, 50.5],
  ['church', 'Greater Hope Baptist', 64, 22], ['market', 'Gaither Market', 27.5, 24], ['lot', 'The vacant lot', 65, 36], ['courts', 'Delancey Courts', 44, 40], ['laundry', 'Suds City', 35.5, 24]];
const Notebook = {
  tab: 0, page: 0, tabs: ['Objectives', 'Map', 'People', 'Evidence', 'Phones', 'Case'], pickPlace: null,
  open(which, o = {}) {
    this.tab = typeof which === 'string' ? Math.max(0, this.tabs.findIndex(t => t.toLowerCase() === which)) : 0; this.page = 0; this.pickPlace = o.pickPlace || null; this.o = o;
    const s = this.s = UI.open({ id: 'notebook', cls: 'notebookscr',
      html: () => this.html(), legend: () => [this.pickPlace && ['confirm', 'Pick this place'], ['tabPrev', 'Tab'], ['tabNext', 'Tab'], this.pages() > 1 && ['uiAlt', 'Next page'], ['cancel', 'Close']],
      onTab: d => { this.tab = (this.tab + d + this.tabs.length) % this.tabs.length; this.page = 0; UI.render(s); },
      onAlt: () => { this.page = (this.page + 1) % Math.max(1, this.pages()); UI.render(s); },
      onSelect: id => { if (id.startsWith('tab:')) { this.tab = +id.slice(4); this.page = 0; UI.render(s); } else if (id.startsWith('place:') && this.pickPlace) { const f = this.pickPlace; this.pickPlace = null; UI.close(s); f(id.slice(6)); } else if (id.startsWith('ev:')) { const ev = STATE.evidence[+id.slice(3)], ph = ev && ev.photo && STATE.photos.find(p => p.id === ev.photo); if (ph) UI.notice({ kicker: 'Evidence', title: ev.text, lines: [ph.place + ' · ' + ph.t] }); } },
      onBack: () => { if (this.pickPlace && this.o.mustPick) return; UI.close(s); } });
    return s;
  },
  items() {
    const T0 = this.tabs[this.tab];
    if (T0 === 'People') return Board.cards().filter(c => PEOPLE[c]).map(c => ({ c, html: `<div class="item"><div style="height:3em;width:3em;float:left;margin-right:.5em;background:url(${HEADLESS ? '' : portraitURL(c, { bg: '#2a2620' })}) center/cover"></div><b>${esc(nameOf(c))}</b><small>${esc(hasFact('name:' + c) || hasFact('face:' + c) ? PEOPLE[c].name : 'Unknown')}</small><small>${esc(Board.pinnedTo(c) ? 'On the Board: ' + Board.slot(Board.pinnedTo(c)).label : (STATE.facts.find(f => f.startsWith('obs:' + c + ':')) || 'role unknown').split(':').pop())}</small></div>` }));
    if (T0 === 'Evidence') return STATE.evidence.map((e, i) => ({ html: `<button class="item" data-f="ev:${i}"><b>${esc(e.kind.toUpperCase())}${e.pts ? ' · ' + e.pts + ' pt' : ''}</b><small>${esc(e.text)}</small></button>` }));
    if (T0 === 'Phones') return Object.keys(STATE.numbers).filter(k => STATE.numbers[k].known).map(k => { const n = STATE.numbers[k]; return { html: `<div class="item"><b>${esc(k)} · ${esc(n.n)}</b><small>${esc(PHONE_LABEL[k] || '')}</small><small>${n.dead ? 'DEAD' : n.tapped ? 'TAPPED' : 'not tapped'}${n.user && (hasFact('num:' + k + ':' + n.user) || Board.pinnedTo(n.user)) ? ' · ' + esc(nameOf(n.user)) : ''}</small></div>` }; })
      .concat(Object.keys(STATE.cipher.decoded || {}).map(k => ({ html: `<div class="item"><b>PAGE ${esc(k)}</b><small>${esc(STATE.cipher.decoded[k])}</small></div>` })));
    return [];
  },
  pages() { return Math.ceil(this.items().length / 6) || 1; },
  html() {
    const T0 = this.tabs[this.tab], M = Mission.M, inField = game.sceneName === 'field' && M;
    let body = '';
    if (T0 === 'Objectives') {
      const obs = inField ? M.obj : (typeof Annex !== 'undefined' && Annex.tasks ? Annex.tasks().map(t => ({ text: t.label, ok: t.ok, optional: false })) : []);
      body = `<ul style="list-style:none;padding:0">${obs.slice(0, 7).map(o => `<li style="margin:.35em 0"><span class="chk">${o.ok ? '✓' : ''}</span>${esc(o.text)}${o.optional ? ' <span class="muted">(optional)</span>' : ''}</li>`).join('') || '<li>Nothing pressing. Check the Board.</li>'}</ul>
        <p class="muted">Episode ${STATE.ep}: ${esc(EPISODES[STATE.ep - 1].title)}. ${esc(this.hint())}</p>`;
    } else if (T0 === 'Map') {
      this.drawMap();
      body = `<div style="display:flex;gap:1em;flex-wrap:wrap;align-items:flex-start"><canvas id="nbmap" width="576" height="448" style="width:min(52vw,72vh);image-rendering:pixelated;border:2px solid #3a2a14;background:#222"></canvas>
        <div style="flex:1;min-width:12em">${this.pickPlace ? '<p><b>Pick the place.</b></p>' : ''}<div class="choices">${MAP_PLACES.filter(p => this.pickPlace || ['gas', 'v1412', 'mamab', 'court', 'market', 'church'].includes(p[0])).slice(0, this.pickPlace ? 8 : 6).map(p => `<button class="btn" data-f="place:${p[0]}">${esc(p[1])}</button>`).join('')}</div>
        <p class="muted">◆ objective · ● payphones · ▲ you</p></div></div>`;
    } else if (T0 === 'Case') {
      const M2 = STATE.meters;
      body = `<div class="grid">${[['Case strength', M2.case, 150, Meters.caseBand().toUpperCase()], ['Major\'s patience (Brass)', M2.brass, 100, M2.brass < 30 ? 'THIN' : 'HOLDING'], ['Street heat', M2.heat, 100, Meters.heatWord()], ['Legal risk', M2.legal, 100, M2.legal >= 70 ? 'DANGER' : 'OK']].map(([l, v, mx, w]) => `<div class="item"><b>${esc(l)}</b><div class="bar"><i style="width:${Math.min(100, v / mx * 100)}%"></i></div><small>${v} · ${esc(w)}</small></div>`).join('')}</div>
        <p>Photos ${STATE.stats.photos} · made ${STATE.stats.made} times · calls minimized ${STATE.stats.minimized} · violations ${STATE.stats.violations} · fund ${money(M2.fund)}</p>`;
    } else {
      const it = this.items(), pg = it.slice(this.page * 6, this.page * 6 + 6);
      body = `<div class="grid">${pg.map(x => x.html).join('') || '<p class="muted">Nothing yet.</p>'}</div>${this.pages() > 1 ? `<p class="muted">Page ${this.page + 1} / ${this.pages()}</p>` : ''}`;
    }
    return `<div class="panel file"><div class="kicker">Notebook · Det. D. Whitlock</div><div class="tabs">${this.tabs.map((t, i) => `<span class="tab${i === this.tab ? ' on' : ''}" data-f="tab:${i}">${t}</span>`).join('')}</div>${body}</div>`;
  },
  hint() { const b = Director.beat; return b && b.kind === 'annex' ? 'Stations that matter now are lit.' : ''; },
  drawMap() {
    if (HEADLESS) return; requestAnimationFrame(() => {
      const c = document.getElementById('nbmap'); if (!c) return; const g = c.getContext('2d'), m = World.map;
      for (let cy = 0; cy < m.h; cy++) for (let cx = 0; cx < m.w; cx++) {
        const id = m.cell(cx, cy), fl = m.floorTags && m.floorTags[cy * m.w + cx];
        g.fillStyle = id > 0 ? (id >= 6 && id <= 13 ? '#7a5a3a' : id === 14 || id === 15 ? '#6a6458' : id === 16 ? '#8a6a4a' : '#4a3a32') : fl === 'road' ? '#3a3a3e' : fl === 'alley' ? '#4a4642' : fl === 'lot' ? '#5a5a3a' : fl === 'ball' ? '#3a4a5a' : fl === 'fence' || fl === 'edge' ? '#2a2a2a' : '#9a968e';
        g.fillRect(cx * 8, cy * 8, 8, 8);
      }
      const dot = (x, y, col, r = 5) => { g.fillStyle = '#000'; g.fillRect(x / 2 - r / 2 - 1, y / 2 - r / 2 - 1, r + 2, r + 2); g.fillStyle = col; g.fillRect(x / 2 - r / 2, y / 2 - r / 2, r, r); };
      for (const [x, y] of [[28.5, 26], [35.5, 26], [42, 30]]) dot(x * T, y * T, '#7aa7ff');
      const M = Mission.M; if (game.sceneName === 'field' && M) { for (const mk of M.marks) dot(mk.x, mk.y, '#ffd040', 7); dot(M.P.x, M.P.y, '#ff5a4a', 7); }
      g.fillStyle = '#1a1208'; g.font = 'bold 18px monospace'; g.fillText('RIDLEY AVE', 330, 448 / 56 * 28.5 + 6); g.fillText('GAITHER', 248, 300); g.fillText('DUNMORE', 330, 113);
    });
  }
};
const PHONE_LABEL = { P1: 'Payphone outside Gaither Market', P2: 'Payphone outside Suds City', P3: 'Payphone at the bus stop', P4: 'Mama B\'s (on the menu)', P5: 'Harstad Auto Parts, Dundalk', PG: 'The stash pager (clone)', B1: 'Throwaway', B2: 'Throwaway', B3: 'Throwaway', B4: 'Throwaway', B5: 'Throwaway' };
