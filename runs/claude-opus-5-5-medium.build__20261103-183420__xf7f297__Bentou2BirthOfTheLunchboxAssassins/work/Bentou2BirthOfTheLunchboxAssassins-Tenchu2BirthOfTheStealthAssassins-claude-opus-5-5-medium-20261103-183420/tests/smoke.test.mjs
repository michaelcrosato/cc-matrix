// every level loads and plays 12 seconds of wandering input without errors
export default async ({ makeContext, check }) => {
  for (const id of ['training', 'm1', 'm2', 'm3', 'delivery']) {
    const t = makeContext(); t.step(.3);
    const M = t.load(id, { mode: id === 'delivery' ? 'trial' : 'missions' });
    check(id + ' loads into the mission scene', t.snap().scene === 'mission' && !!M, t.snap().scene);
    let k = 0;
    t.intent(() => { k++; const a = Math.floor(k / 120) * 1.3; return { move: [Math.cos(a), Math.sin(a)], jumpPressed: k % 150 === 0, attackPressed: k % 97 === 0, crouchPressed: k % 400 === 0, usePressed: k % 311 === 0, grapplePressed: k % 200 === 0, grappleReleased: k % 200 === 1 }; }, 12);
    check(id + ' plays without errors', !t.game.errors.length, t.game.errors.map(e => (e.message || e) + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')).join(' || '));
  }
};
