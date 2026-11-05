// story: every briefing, debrief and cutscene exists and runs to its end when skipped; both apprentices have their own
// lines; every line a level or a boss speaks exists
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const S = B.Story, missing = [];
  for (const id of B.STORY_ORDER) { const m = B.get('mission', id); for (const k of ['briefing', 'debrief']) if (m[k] && !S.scenes[m[k]]) missing.push(id + '.' + k); }
  check('every briefing and debrief scene exists', !missing.length, missing.join(' '));
  for (const id of Object.keys(S.scenes)) {
    let done = false; B.Cutscene.play(id, 'kaede', () => { done = true; }); t.step(.4); t.hold('start'); t.step(1); t.hold('start', false); t.step(.3);
    check('scene ' + id + ' runs to its end when skipped', done, game.sceneName);
  }
  const both = Object.values(S.lines).filter(l => typeof l === 'object' && l.sojiro && l.kaede).length + Object.values(S.scenes).reduce((n, sc) => n + sc.steps.filter(s => s[0] === 'say' && typeof s[2] === 'object' && s[2].sojiro && s[2].kaede).length, 0);
  check('lines of their own for Sojiro and Kaede', both >= 6, both);
  const lv = [], bad = [];
  for (const L of B.all('level')) for (const tr of L.triggers || []) for (const a of tr.do || []) if (a[0] === 'say') lv.push([L.id, a[2]]);
  for (const [id, line] of lv) if (S.lines[line] === undefined) bad.push(id + ':' + line);
  for (const b of B.ids('boss')) for (const k of ['_intro', '_defeat']) if (S.lines[b + k] === undefined) bad.push(b + k);
  check('every spoken line exists', !bad.length, bad.join(' '));
  for (const c of ['idle', 'notice', 'search', 'lost', 'alert', 'body', 'bait', 'poisoned', 'sleepy', 'hurt', 'civilian', 'tobei', 'unmask', 'chat']) if (!S.barks[c] || !S.barks[c].length) bad.push('bark ' + c);
  check('every bark category has lines', !bad.length, bad.join(' '));
  check('every rank has Granny\'s word', B.RANKS.every(r => S.results[r[1]]), '');
  // the poses the scenes call for: Granny's paddle tap, the lord's toast, the bow
  for (const [sc, who, pose] of [['prologue', 'granny', 'tap'], ['m3_fail', 'takanori', 'toast'], ['ending2', 'sojiro', 'bow']]) {
    B.Cutscene.play(sc, 'sojiro', () => {}); t.step(.5); let seen = false, moved = false;
    for (let i = 0; i < 40 && game.sceneName === 'story'; i++) { const c = B.storyScene.cast && B.storyScene.cast.find(c => c.id === who); if (c && c.pose === pose) { const a = c.rig.hand('R').join(); t.step(.15); seen = true; moved = moved || c.rig.hand('R').join() !== a; break; } B.Cutscene.clear(); t.step(.25); }
    check(sc + ': ' + who + ' ' + pose + 's', seen && moved, seen + ' ' + moved);
  }
}
