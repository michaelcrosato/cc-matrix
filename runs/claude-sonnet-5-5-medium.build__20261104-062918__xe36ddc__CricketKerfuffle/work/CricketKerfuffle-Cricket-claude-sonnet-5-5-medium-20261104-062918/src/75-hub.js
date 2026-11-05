/* ---------- AI Hub session (parallel mode): a seeded Super Over, scores reported to the hub ---------- */
const HUBON = () => typeof AIHub !== 'undefined' && AIHub && AIHub.active;
function hubOverlay(r) {
  if (!HUBON()) return;
  const t = AIHub.time(), done = MS && MS.hubDone;
  r.overlay(g => {
    if (t < 0) {
      const txt = isFinite(t) ? 'PLAY BALL IN ' + Math.ceil(-t / 1000) : 'WAITING FOR THE OTHER PLAYERS...';
      dark(g, 0, r.H * .4, r.W, 40, .7); E.font.text(g, txt, r.W / 2, r.H * .4 + 10, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' });
    } else if (done) {
      dark(g, 0, r.H * .4, r.W, 52, .75); E.font.text(g, 'ROUND COMPLETE', r.W / 2, r.H * .4 + 8, GOLD, { scale: 2, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, MS.M.sides[0].score + ' runs - waiting for the others', r.W / 2, r.H * .4 + 30, INK, { align: 'center', outline: false, shadow: '#000' });
    }
  });
}
const hubScene = {
  enter() {
    AIHub.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
      if (!info) { game.go('title'); return; }
      startMatch({ mode: 'super', hub: true, single: true, overs: 1, wickets: 2, opp: 'witt', ground: 'green', seed: info.seed || 1 });
      AIHub.ready();
      AIHub.on('time-up', () => { if (MS && MS.hub && !MS.hubDone) { MS.hubDone = true; AIHub.result({ score: MS.M.sides[0].score }); } });
      AIHub.on('end', () => { if (MS) { MS.hubDone = true; MS.attract = false; } game.input.clear(); });
    });
  },
  update() {}, draw(r) { r.sky(['#0a1a10', '#1c4a28']); r.overlay(g => E.font.text(g, 'CRICKET KERFUFFLE', r.W / 2, r.H / 2 - 10, GOLD, { scale: 2, align: 'center', outline: false })); },
};
