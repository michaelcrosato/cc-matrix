/* THUGBY TURBO — AI Hub (Session Protocol v1, client 1.4.0): parallel mode. Each player plays their own seven-a-side
 * match against the CPU from the same seed; the hub ranks players by points margin. Outside a session none of this runs. */
const HUB = typeof AIHub !== 'undefined' ? AIHub : null;
function marginScore(score) { return (score[0] - score[1]) * 100 + score[0]; }
async function hubBoot() {
  if (!HUB || !HUB.active) return null;
  let info = null; try { info = await HUB.connect({ mode: 'parallel', seats: [1, 4] }); } catch (e) { info = null; }
  if (!info) return null;
  const seed = Math.floor(HUB.rng('match')() * 1e9) >>> 0;
  const net = TT.net = { info, over: false, seed, reported: false, canPlay: () => HUB.time() >= 0, draw(g, W, H) { const t = HUB.time(); if (t < 0 && t > -Infinity) { E.font.title(g, String(Math.ceil(-t / 1000)), W / 2, 70, { scale: 5, colors: ['#ffe070', '#ff8020'], align: 'center', outline: '#000' }); E.font.text(g, 'GET READY: ' + info.players.length + ' PLAYER' + (info.players.length > 1 ? 'S' : ''), W / 2, 120, '#fff', { align: 'center', shadow: '#000', outline: false }); } },
    matchOver(sum) { if (net.reported) return; net.reported = true; HUB.result({ score: marginScore(sum.score), stats: { 'My points': sum.score[0], 'Their points': sum.score[1], Tries: sum.st[0].tries, 'Big hits': sum.st[0].bigHits }, awards: sum.st[0].bigHits >= 5 ? [{ title: 'Demolition Derby', detail: sum.st[0].bigHits + ' big hits' }] : [] }); net.over = true; } };
  HUB.on('time-up', () => { if (net.reported) return; net.reported = true; const S0 = TT.S; HUB.result({ score: marginScore(S0 ? S0.score : [0, 0]) }); });
  HUB.on('end', () => { net.over = true; try { TT.game.audio.mute(true); } catch (e) { /* ok */ } });
  setInterval(() => { const S0 = TT.S; if (S0 && !net.over && S0.cfg.mode === 'online') HUB.progress({ score: marginScore(S0.score), label: S0.score[0] + '-' + S0.score[1] }); }, 1000);
  return net;
}
TT.hubBoot = hubBoot;
