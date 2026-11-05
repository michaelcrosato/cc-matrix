// ---------------------------------------------------------------------------------------------
// 08 · HUB — AI Hub Session Protocol v1, ghost mode: each copy plays its own round of the town,
// and sends the others where its player is. The other players' characters are drawn in the same
// zone as yours (the ghosts), and they don't touch anything. A round ends with a result: the
// time to finish the last chapter, or the score when the hub calls time. Outside a session, HUB
// is null and none of this runs.
// ---------------------------------------------------------------------------------------------
const NET = {
  info: null, ready: false, readyCalled: false, remotes: {}, rigs: {}, sendT: 0, progressT: 0, ended: false,
  reported: false, unsub: [],
};
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

function hubConnect() {
  if (!HUB) return;
  HUB.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    NET.info = info;
    if (!info) return;
    NET.unsub.push(HUB.on('message', (data, from) => {
      if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;
      const r = NET.remotes[from] || (NET.remotes[from] = { x: data.x, y: data.y, z: 0, t: 0 });
      Object.assign(r, { tx: data.x, ty: data.y, f: data.f || 0, vx: data.vx || 0, vy: data.vy || 0, zone: data.zone || '', t: 0 });
    }));
    NET.unsub.push(HUB.on('leave', ({ id }) => { delete NET.remotes[id]; delete NET.rigs[id]; }));
    NET.unsub.push(HUB.on('time-up', () => {
      if (S.done) return;
      if (!NET.reported) { NET.reported = true; HUB.result({ score: scoreNow() }); }
      W.frozen = true; toast('TIME. THE ROUND IS IN THE HUB\'S HANDS.');
    }));
    NET.unsub.push(HUB.on('end', () => {
      NET.ended = true; W.frozen = true; game.audio.music(null); CUR_SONG = null;
    }));
    maybeReady();
  });
}
// the round can start once the world is built and the hub has the seats
function maybeReady() {
  if (!HUB || NET.readyCalled || !NET.info || !W) return;
  NET.readyCalled = true;
  HUB.ready();
}

// each step while a round plays: the hero's place for the others, and the progress once a second
function hubTick(dt) {
  if (!HUB || NET.ended) return;
  for (const id of Object.keys(NET.remotes)) {
    const r = NET.remotes[id];
    r.t += dt;
    const k = Math.min(1, dt * 12);
    r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k;
  }
  if (HUB.time() < 0 || W.frozen) return;
  NET.sendT -= dt;
  if (NET.sendT <= 0) {
    NET.sendT = .1;
    const h = W.hero;
    HUB.send({ x: Math.round(h.x), y: Math.round(h.y), f: Math.round(h.facing * 100) / 100, vx: Math.round(h.vx), vy: Math.round(h.vy), zone: zoneAt(h.x, h.y) }, { reliable: false });
  }
  NET.progressT -= dt;
  if (NET.progressT <= 0 && !NET.reported) {
    NET.progressT = 1;
    HUB.progress({ score: scoreNow(), label: CHAPTERS[S.chapter].title + '  $' + S.cash });
  }
}

// the others: drawn where they are, when they are in this player's zone (a copy's own rules)
function drawGhosts(r) {
  if (!HUB || NET.ended || !W) return;
  const here = zoneAt(W.hero.x, W.hero.y);
  for (const id of Object.keys(NET.remotes)) {
    const g = NET.remotes[id];
    if (g.zone !== here || g.t > 3) continue;
    const players = (NET.info && NET.info.players) || [];
    const p = players.find(q => String(q.id) === String(id));
    const color = (p && p.color) || SEAT_COLORS[Number(id) % 4] || '#ffffff';
    if (!NET.rigs[id]) NET.rigs[id] = new E.Humanoid({ size: 1.25, build: 'heroic', hair: 'short', outfit: 'coat', colors: { coat: color, cloth: '#2a2a2a', pants: '#15151d', skin: '#d9a27a', hair: '#1a1414' } });
    const rig = NET.rigs[id];
    rig.update(0, { x: g.x, y: g.y, z: 0, vx: g.vx, vy: g.vy, facing: g.f });
    r.actor(g.x, g.y, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), { alpha: .7 });
    if (p) r.textAt(g.x, g.y, 46, p.name, color, { outline: true });   // the name, as the hub gave it
  }
}

// the countdown or the waiting, for the play screen: the hub's clock, never a key press
function hubCountdown() {
  if (!HUB) return null;
  const t = HUB.time();
  if (t === -Infinity) return 'WAITING FOR THE ROUND';
  if (t < 0) return 'STARTING IN ' + Math.ceil(-t / 1000);
  return null;
}
