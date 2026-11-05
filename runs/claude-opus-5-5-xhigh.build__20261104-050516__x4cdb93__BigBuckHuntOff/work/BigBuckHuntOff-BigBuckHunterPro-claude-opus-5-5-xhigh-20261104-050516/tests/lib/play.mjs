// helpers that play the game headless
export function startSite(L, hunt, id, o = {}) {
  const X = L.game.debug.internals; X.startHunt(Object.assign({ mode: 'single', hunt, seed: o.seed || 1 }, o.hunt || {})); L.step(.5);
  const H = X.G.hunt; H.skipTo(o.kind || 'site', id); L.step(.05); return H;
}
/** run the current site until its segment ends: { reason, bagged, escaped, lost, spawned, scheduled, score, t } */
export function finishSite(L, H, max = 140) {
  const seg = H.seg, site = H.site; let t = 0;
  while (H.seg === seg && t < max) { L.step(.25); t += .25; }
  return { reason: site.endReason, bagged: site.bucksSpawned.filter(a => a.bagger).length, escaped: site.bucksSpawned.filter(a => a.escaped).length, lost: site.bucksSpawned.filter(a => a.lost).length, spawned: site.bucksSpawned.length, scheduled: site.def.bucks, score: site.results[0].score, t: site.t, clean: site.results[0].clean, benched: site.results[0].benched, segAfter: H.seg && H.seg.kind };
}
