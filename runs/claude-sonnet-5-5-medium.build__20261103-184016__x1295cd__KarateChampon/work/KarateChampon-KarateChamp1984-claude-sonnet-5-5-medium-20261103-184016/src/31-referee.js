/* ---------- Judge Genkotsu and the two corner judges: signals, flags ---------- */
const blazer = (size, hair) => new E.Humanoid({ size, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair, colors: { skin: '#e0b090', hair: '#dcdcdc', coat: '#1f2a4a', cloth: '#f0f0f0', pants: '#6a6a74', trim: '#c8302a', boot: '#2a2a30', belt: '#1f2a4a', glove: '#e0b090' } });
KC.makeReferee = () => ({ ref: blazer(2.1, 'bald'), j: [blazer(1.6, 'short'), blazer(1.6, 'short')], sig: 'idle', t: 0, votes: null, voteT: 0 });
KC.updateReferee = (b, dt) => {
  const R = b.refActor || (b.refActor = KC.makeReferee()); R.t += dt;
  const ph = b.phase, lp = b.lastPoint || {}, mid = (b.f[0].x + b.f[1].x) / 2;
  let rp = 'hips', atk = null, jp = [undefined, undefined];
  if (ph === 'hajime') { atk = E.move('overhead', clamp(b.pt / (b.dur * .8), 0, 1), b.pt < b.dur * .4 ? 'wind' : 'active'); rp = null; }
  else if (ph === 'yame' || (ph === 'award' && b.pt < 20)) rp = 'wave';
  else if (ph === 'award') rp = lp.aiuchi ? 'cast' : lp.full ? 'cheer' : 'wave';
  else if (ph === 'rei' || ph === 'matchEnd') rp = 'crouch';
  else if (ph === 'roundEnd') rp = 'cheer';
  else if (ph === 'hantei' && b.hantei) { const k = Math.floor(b.pt / b.pace(.5)); rp = k >= 3 ? 'cheer' : 'point'; jp = [k >= 0 && b.hantei.votes[0] != null ? 'cheer' : undefined, k >= 1 ? 'cheer' : undefined]; R.votes = b.hantei.votes.slice(0, k + 0); R.vcount = Math.min(3, k + 1); }
  else R.votes = null;
  const st = { x: mid, y: 14, z: 0, facing: Math.PI / 2 * 0, vx: 0, vy: 0, pose: rp || undefined, attack: atk || undefined, stance: undefined };
  st.facing = 0; // faces the camera sideways like the fighters (a profile referee)
  R.ref.update(dt, st);
  R.j[0].update(dt, { x: 18, y: 34, z: 0, facing: 0, vx: 0, vy: 0, pose: ph === 'hantei' && b.pt > b.pace(.5) ? 'cheer' : 'hips' });
  R.j[1].update(dt, { x: 382, y: 34, z: 0, facing: Math.PI, vx: 0, vy: 0, pose: ph === 'hantei' && b.pt > b.pace(1) ? 'cheer' : 'hips' });
  R.flag = ph === 'award' && b.pt > 20 ? (lp.side === 0 ? 'white' : lp.side === 1 ? 'red' : null) : ph === 'roundEnd' ? (b.winner === 0 ? 'white' : 'red') : null;
  R.mid = mid; R.hantei = ph === 'hantei' ? b.hantei : null; R.hp = ph === 'hantei' ? b.pt : 0; R.pace = b.pace(.5);
};
KC.drawReferee = (r, b) => {
  const R = b.refActor; if (!R) return;
  const wob = Math.sin(KC.game.time * 6) * 2;
  // the main referee, behind the fighters (y = +14)
  const gap = Math.abs(b.f[0].x - b.f[1].x), fade = clamp(.35 + .65 * (gap - 30) / 90, .35, 1);   // see-through while the fighters are close, so he never hides the action
  r.actor(R.mid, 14, 0, (g, ox, oy) => { R.ref.draw(g, ox, oy, r.view); }, fade < .99 ? { alpha: fade } : {});
  // a white beard overlay at the head joint
  r.queue(R.mid, 13.5, 0, g => { const hd = R.ref.worldOffset(R.ref.J.head), [sx, sy] = r.w(R.mid + hd[0], 14 + hd[1], hd[2]); px.rect(g, Math.round(sx) - 3, Math.round(sy) + 1, 6, 3, '#f0f0f0'); });
  for (let i = 0; i < 2; i++) r.actor(i === 0 ? 18 : 382, 34, 0, (g, ox, oy) => R.j[i].draw(g, ox, oy, r.view));
  // flags: a pole from the hand and a waving cloth, red and white
  const flag = (rig, x, y, col, up) => r.queue(x, y - .5, 0, g => {
    const h = rig.hand('R'), [sx, sy] = r.w(h[0], h[1], h[2]), len = 15, k = Math.sin(KC.game.time * 9 + x) * 2;
    px.line(g, Math.round(sx), Math.round(sy), Math.round(sx + (up ? 2 : 6)), Math.round(sy - len), '#c8a060', 1);
    px.poly(g, [[sx + (up ? 2 : 6), sy - len], [sx + (up ? 14 : 18) + k, sy - len + 2], [sx + (up ? 13 : 17) + k, sy - len + 8], [sx + (up ? 2 : 6), sy - len + 7]], col === 'white' ? '#f4f4f4' : '#d8302a');
  });
  const raised = R.hantei ? R.hantei.votes : null;
  flag(R.j[0], 18, 34, raised && R.hp > R.pace ? (raised[0] === 0 ? 'white' : 'red') : 'white', raised && R.hp > R.pace);
  flag(R.j[1], 382, 34, raised && R.hp > R.pace * 2 ? (raised[1] === 0 ? 'white' : 'red') : 'red', raised && R.hp > R.pace * 2);
  if (R.flag) flag(R.ref, R.mid, 14, R.flag, true);
  if (raised && R.hp > R.pace * 3) flag(R.ref, R.mid, 14, raised[2] === 0 ? 'white' : 'red', true);
};
