/* 20-meters: the institutions as numbers. Brass (the Major's patience), Heat (how wary the crew is), Legal (how close
   the wire is to being pulled), Case (what you can prove), Fund (the detail's cash). Each change says why. */
let shell = null;   // E.Shell, made at start
const Toast = (title, text = '', secs = 3.5) => { if (shell && !Globals.attract) shell.toast(title, text, secs); bus.emit('toast', { title, text }); };
const Tut = { say(title, text) { if (shell && !Globals.attract) shell.tutorial(title, text, 14); }, off() { if (shell) shell.tutorial(null); } };
const METER_LABEL = { brass: 'Brass', heat: 'Heat', legal: 'Legal', case: 'Case', fund: 'Fund' };
const Meters = {
  add(k, d, why, quiet) {
    const M = STATE.meters; if (!d) return M[k];
    if (k === 'brass' && d < 0) d = Math.round(d * DIFF.brass);
    const was = M[k]; M[k] = k === 'case' || k === 'fund' ? Math.max(0, M[k] + d) : clamp(M[k] + d, 0, 100);
    if (!quiet && !Globals.attract) Toast(METER_LABEL[k] + ' ' + (d > 0 ? '+' : '') + d + (k === 'fund' ? '' : ''), why || '', 3);
    if (k === 'case' && d > 0) Snd.sting('casePoint');
    bus.emit('meter', { k, d, was, now: M[k], why });
    if (k === 'brass' && M.brass <= 0 && was > 0) game.after(1.2, () => Director.shutDown());
    if (k === 'heat') { if (M.heat >= 90 && was < 90) { bus.emit('darkDay'); Meters.add('brass', -15, 'The corner went dark for a day. The Major counts that against you.'); } }
    if (k === 'legal' && M.legal >= 100 && was < 100) bus.emit('wirePulled');
    return M[k];
  },
  caseBand() { const c = STATE.meters.case; return c >= 120 ? 'high' : c >= 60 ? 'mid' : 'low'; },
  heatWord() { const h = STATE.meters.heat; return h >= 90 ? 'Gone dark' : h >= 60 ? 'Spooked' : h >= 30 ? 'Wary' : 'Calm'; },
  /** start-of-episode drift (§6.7) */
  episodeStart(ep) {
    const M = STATE.meters; if (ep > 1) { Meters.add('heat', -5, 'A quiet week on the corner', true); Meters.add('legal', -10, '', true); }
    if (ep > 1 && !STATE.arrestsThisEp) Meters.add('brass', -10, 'No new stats for the Major this week');
    STATE.arrestsThisEp = 0;
    if (M.heat >= 30 && M.heat < 50) Toast('The corner is wary', 'A third lookout. They check faces before they sell.');
  },
  stat(k, d, why) { STATE.arrestsThisEp = (STATE.arrestsThisEp || 0) + 1; Meters.add('brass', d, why); }
};
/* ---- case points: everything provable adds to Case (§6.7) ---- */
const CASE_PTS = { face: 2, read: 1, act: 5, stmt: 2, page: 3, int: 4, voice: 2, plate: 5, seizure: 5, easy: 20, obs: 1 };
function casePoint(kind, why) { Meters.add('case', CASE_PTS[kind] || 1, why); }
