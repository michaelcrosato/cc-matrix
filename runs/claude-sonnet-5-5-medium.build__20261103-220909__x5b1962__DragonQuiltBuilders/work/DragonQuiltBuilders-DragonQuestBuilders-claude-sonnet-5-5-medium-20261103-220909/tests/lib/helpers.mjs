import { load } from './load.mjs';
export function boot(hub) {
  const ctx = load({ hub }); const DQ = ctx.DQ, game = DQ.game, I = game.input;
  const T = 16, cellC = c => c * T + 8;
  const H = {
    ctx, DQ, game, I, T, cellC, S: () => DQ.S, fails: [], count: 0,
    check(what, ok, detail = '') { H.count++; if (!ok) { H.fails.push(what + (detail ? ': ' + detail : '')); } return ok; },
    tick(sec) { game.advance(sec); },
    skipTalk(max = 80) { let n = 0; while ((DQ.talk.open || (DQ.S && DQ.S.cut)) && n++ < max) { I.tap('confirm'); game.advance(.25); if (DQ.talk.open && DQ.talk.choices) { /* pick first choice */ } } return !DQ.talk.open; },
    newGame() { game.go('play', { new: true, name: 'Tester' }); game.advance(.3); H.skipTalk(); },
    here() { const h = DQ.S.hero; return [Math.floor(h.x / T), Math.floor(h.y / T)]; },
    tp(cx, cy) { const h = DQ.S.hero; h.x = cellC(cx); h.y = cellC(cy); h.z = 0; h.vx = h.vy = 0; DQ.snapCam(); },
    place(cx, cy, item) { const S = DQ.S; DQ.inv.add(item, 1, true); S.hotbar[S.sel] = item; DQ.forceTarget = { cx, cy }; const ok = DQ.placeAction(); DQ.forceTarget = null; return ok; },
    wall(x0, y0, size = 5, hgt = 2, doorAt = null, block = 'cobble') {
      for (let k = 0; k < hgt; k++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1; if (!edge) continue; if (doorAt && x === doorAt[0] && y === doorAt[1]) continue; H.place(x0 + x, y0 + y, block); }
    },
    done(label) { const f = H.fails; console.log(f.length ? f.map(x => 'FAIL ' + label + ': ' + x).join('\n') : ''); return f.length; }
  };
  globalThis.__H = H; return H;
}
