/* RESULTS, HALFTIME TILES and the HALL OF FIASCO records. Few big things: the final score huge, the player of the game,
 * four stat tiles, two or three buttons. Records live in E.store (never written in sessions or the attract mode). */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, S = FF.sim, UI = FF.ui;

FF.results = {
  compute() {
    const st = S.stats, all = S.all.filter(a => a.stats);
    const score = a => a.stats.td * 30 + a.stats.rush + a.stats.rec + a.stats.pass * .5 + a.stats.tkl * 4 + a.stats.sack * 12 + a.stats.int * 20 + a.stats.bigHits * 6;
    const w = S.winner >= 0 ? S.winner : 0, pog = all.filter(a => a.team === w).sort((x, y) => score(y) - score(x))[0] || all[0];
    const keyStats = a => { const o = []; if (a.stats.td) o.push(a.stats.td + ' TD'); if (a.stats.pass) o.push(a.stats.pass + ' PASS YD'); if (a.stats.rush) o.push(a.stats.rush + ' RUSH YD'); if (a.stats.rec) o.push(a.stats.rec + ' REC YD'); if (a.stats.tkl) o.push(a.stats.tkl + ' TKL'); if (a.stats.sack) o.push(a.stats.sack + ' SACK'); if (a.stats.int) o.push(a.stats.int + ' INT'); return o.slice(0, 2).join(' · ') || 'HEART OF A CHAMPION'; };
    return { score: S.score.slice(), winner: S.winner, teams: [S.teams[0].id, S.teams[1].id], pog: pog && { name: pog.name, num: pog.num, team: pog.team, stats: keyStats(pog), id: pog.id },
      tiles: [[st.team[0].yards + ' / ' + st.team[1].yards, 'TOTAL YARDS'], [st.team[0].to + ' / ' + st.team[1].to, 'TURNOVERS'], [st.biggestHit ? st.biggestHit.yards.toFixed(1) + ' YD' : '-', 'BIGGEST HIT'], [st.longest ? st.longest.yards + ' YD' : '-', 'LONGEST PLAY']],
      longest: st.longest, biggestHit: st.biggestHit, longestFg: st.longestFg, sacks: [st.team[0].sacks, st.team[1].sacks], turnovers: [st.team[0].to, st.team[1].to] };
  },
  actions(M) {
    const out = [];
    if (FF.replay.highlights.length) out.push({ id: 'hl', label: 'HIGHLIGHTS', fn: () => M.watchHighlights() });
    if (M.mode === 'story') out.push({ id: 'cont', label: 'CONTINUE', fn: () => FF.story.matchDone(M.results) });
    else if (M.mode === 'exhibition') { out.push({ id: 'rem', label: 'REMATCH', fn: () => M.restart() }); out.push({ id: 'teams', label: 'CHANGE TEAMS', fn: () => game.go('setup') }); out.push({ id: 'menu', label: 'MAIN MENU', fn: () => game.go('menu') }); }
    else if (M.mode === 'practice') out.push({ id: 'menu', label: 'PRACTICE MENU', fn: () => game.go('practice') });
    return out;
  },
  draw(g, M) {
    const R = M.results, W = game.W, H = game.H; if (!R) return;
    px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#05050c'));
    UI.title(g, 'FINAL', W / 2, 10, 3);
    const t0 = FF.team(R.teams[0]), t1 = FF.team(R.teams[1]);
    for (const [t, x] of [[t0, W / 2 - 90], [t1, W / 2 + 90]]) { FF.hud.logo(g, t, x - 18, 46, 3); E.font.text(g, t.short, x, 86, '#ffffff', { align: 'center', outline: false, shadow: '#000' }); }
    E.font.title(g, R.score[0] + ' - ' + R.score[1], W / 2, 52, { scale: 4, align: 'center', colors: ['#ffffff', '#ffe890', '#ffb030'] });
    const wtxt = R.winner < 0 ? "IT'S A TIE!" : FF.team(R.teams[R.winner]).short + ' WIN!';
    E.font.text(g, wtxt, W / 2, 96, '#ffe040', { align: 'center', scale: 2, outline: '#000' });
    if (R.pog) { E.ui.box(g, W / 2 - 110, 116, 220, 30, { bg: ['#2a1a4a', '#14082a'], border: '#ffb02e', alpha: .95 }); const a = S.athlete(R.pog.id); if (a) FF.Rigs.of(a).drawPortrait(g, W / 2 - 106, 118, 26, { zoom: 3, turn: .5, frame: true }); E.font.text(g, 'PLAYER OF THE GAME', W / 2 - 74, 119, '#ffb02e', { font: 'tiny', outline: false }); E.font.text(g, '#' + R.pog.num + ' ' + R.pog.name, W / 2 - 74, 126, '#ffffff', { outline: false }); E.font.text(g, R.pog.stats, W / 2 - 74, 136, '#c8c4e0', { font: 'tiny', outline: false }); }
    R.tiles.forEach(([v, l], i) => { const x = W / 2 - 162 + i * 82, y = 152; E.ui.box(g, x, y, 78, 30, { bg: ['#1a1a2e', '#0c0c18'], border: '#4a4a6a', alpha: .95 }); E.font.text(g, v, x + 39, y + 4, '#ffffff', { align: 'center', outline: false }); E.font.text(g, l, x + 39, y + 18, '#a9a6c0', { align: 'center', font: 'tiny', outline: false }); });
    if (M.resultsMenu) M.resultsMenu.draw(g, { style: { scale: 1 } });
    FF.glyph.bar(g, [['confirm', 'SELECT', { mouse: 'L' }], ['left', 'MOVE']]);
  },
  halftime(g) {
    const W = game.W, H = game.H;
    UI.panel(g, W / 2 - 150, H * .08, 300, 70, { alpha: .88 });
    UI.title(g, 'HALFTIME SHOW', W / 2, H * .08 + 6, 2);
    const st = S.stats.team, tiles = [[st[0].yards + '-' + st[1].yards, 'YARDS'], [st[0].to + '-' + st[1].to, 'TURNOVERS'], [st[0].sacks + '-' + st[1].sacks, 'SACKS'], [st[0].bigHits + '-' + st[1].bigHits, 'BIG HITS']];
    tiles.forEach(([v, l], i) => { const x = W / 2 - 142 + i * 72; E.font.text(g, v, x + 34, H * .08 + 34, '#ffffff', { align: 'center', outline: false }); E.font.text(g, l, x + 34, H * .08 + 46, '#a9a6c0', { align: 'center', font: 'tiny', outline: false }); });
    FF.glyph.bar(g, [['b1', 'SKIP']]);
  }
};
FF.bus.on('final', () => {});
S.recordHit = (a, yards, mega) => { if (!S.stats.biggestHit || yards > S.stats.biggestHit.yards) S.stats.biggestHit = { yards, name: a.name, team: a.team, mega }; };

/* ---------------- THE HALL OF FIASCO ---------------- */
const REC = FF.records = {
  KEYS: [['longestTd', 'LONGEST TD', ' YD'], ['longestFg', 'LONGEST FIELD GOAL', ' YD'], ['biggestHit', 'BIGGEST HIT', ' YD LAUNCH'], ['mostPoints', 'MOST POINTS IN A GAME', ' PTS'], ['mostSacks', 'MOST SACKS IN A GAME', ' SACKS'], ['cupTime', 'FASTEST FIASCO CUP', ''], ['wins', 'EXHIBITION WINS', ''], ['games', 'GAMES PLAYED', '']],
  all() { return FF.store.get('records', {}); },
  update(R) {
    if (FF.noSave || S.hub) return;
    const rec = REC.all(), date = new Date().toISOString ? new Date().toISOString().slice(0, 10) : '';
    const human = [...new Set(FF.control.humans.filter(h => !h.remote).map(h => h.team))]; if (!human.length) return;
    const set = (k, v, name, team) => { if (v === undefined || v === null) return; if (!rec[k] || v > rec[k].v) rec[k] = { v, name, team, date }; };
    const t = human[0];
    if (R.longest && R.longest.team === t) set('longestTd', R.longest.yards, R.longest.name, S.teams[t].id);
    if (R.longestFg && R.longestFg.team === t) set('longestFg', R.longestFg.yards, S.teams[t].short, S.teams[t].id);
    if (R.biggestHit && R.biggestHit.team !== t) set('biggestHit', Math.round(R.biggestHit.yards * 10) / 10, R.biggestHit.name, S.teams[1 - R.biggestHit.team].id);
    set('mostPoints', R.score[t], S.teams[t].short, S.teams[t].id);
    set('mostSacks', R.sacks[t], S.teams[t].short, S.teams[t].id);
    rec.games = { v: ((rec.games && rec.games.v) || 0) + 1, name: '', date };
    if (R.winner === t && FF.match.mode === 'exhibition') rec.wins = { v: ((rec.wins && rec.wins.v) || 0) + 1, name: S.teams[t].short, team: S.teams[t].id, date };
    FF.store.set('records', rec);
  },
  setCup(seconds) { const rec = REC.all(); if (!rec.cupTime || seconds < rec.cupTime.v || rec.cupTime.v === 0) { rec.cupTime = { v: Math.round(seconds), name: 'TUMBLEWEED FIASCOS', team: 'fiascos', date: new Date().toISOString().slice(0, 10) }; FF.store.set('records', rec); } }
};
})();
