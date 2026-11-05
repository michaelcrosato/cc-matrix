// online (a fake hub): connect, the card, ready() with no key, Enter answers ready; the start at time 0; inputs reach the
// host, snapshots the guests; every copy agrees on bout winners; kachinuki rotation; a leaver forfeits; under 2 players
// finishes; time-up finishes in grace with valid standings; a server copy runs and sends; nothing after end; limits;
// the guest's predicted wind-up; outside a session the title
import { makeHub } from './lib/fakehub.mjs';
import { fresh } from './lib/util.mjs';
const boot = async H => { H.run(.2); await H.settle(); H.run(.3); await H.settle(); };
const tapAll = (H, a) => { for (const c of H.copies) if (!c.client.gone && !c.client.server) c.game.input.tap(a); };
export default async t => {
  // ---- 2 players ----
  { const H = makeHub(2); await boot(H);
    t.check('every copy connects with shared-world, seats 2-4 and its own card', H.copies.every(c => c.client.caps && c.client.caps.mode === 'shared-world' && c.client.caps.seats.join() === '2,4' && c.client.caps.card === true));
    t.check('ready() with no key press', H.copies.every(c => c.client.isReady));
    t.check('the session scene shows the card', H.copies.every(c => c.game.sceneName === 'session' && c.game.scene.state === 'card'), H.copies.map(c => c.game.scene.state).join());
    H.card(); tapAll(H, 'confirm'); H.run(.1); t.check('Enter answers ready on the card', H.answers.ready.size === 2);
    H.start(); H.run(2.9); t.check('a countdown before time 0', H.copies.every(c => c.game.scene.state === 'countdown'));
    H.run(.3); t.check('play begins at time 0', H.copies.every(c => c.game.scene.state === 'play'), H.copies.map(c => c.game.scene.state).join());
    const host = H.copy(0), guest = H.copy(1);
    // the guest strikes: its inputs reach the host; snapshots reach the guest
    for (let k = 0; k < 40; k++) { guest.game.input.hold('left'); H.run(.25); guest.game.input.hold('left', false); guest.game.input.tap('tRight'); H.run(.25); }
    t.check('the guest sends its inputs (in) and the host receives them', guest.client.sentN > 10 && host.game.scene.remote[1] && host.game.scene.remote[1].seq > 5, JSON.stringify(host.game.scene.remote[1] && host.game.scene.remote[1].seq));
    t.check('snapshots reach the guest (puppets)', !!guest.game.scene.pb && guest.game.scene.snaps.length > 0);
    const hf = host.game.scene.sub.fighters, gf = guest.game.scene.pb.f; t.check('the guest sees the host\'s world (within 30 units)', Math.abs(hf[0].x - gf[0].x) < 30 && Math.abs(hf[1].x - gf[1].x) < 30, hf.map(f => f.x.toFixed(0)) + ' vs ' + gf.map(f => f.x.toFixed(0)));
    t.check('traffic both ways', host.client.sentN > 0 && guest.client.sentN > 0);
    // a bout to its end: every copy agrees on the winner
    H.run(40, () => host.game.scene.K && host.game.scene.K.bouts >= 1); H.run(2);
    t.check('a bout ends and the host counts it', host.game.scene.K.bouts >= 1, host.game.scene.K.bouts);
    t.check('the guest agrees on the bout winner', guest.game.scene.lastWinner === host.game.scene.lastWinner && guest.game.scene.lastWinner !== undefined, guest.game.scene.lastWinner + ' vs ' + host.game.scene.lastWinner);
    // the guest's prediction: a press shows its wind-up at once, confirmed or rolled back within 250 ms
    H.run(6, () => guest.game.scene.pb && guest.game.scene.pb.f[guest.game.scene.mySide] && guest.game.scene.pb.f[guest.game.scene.mySide].free && guest.game.scene.pb.f[guest.game.scene.mySide].ctlOn);
    const me = guest.game.scene.mySide; if (me >= 0) { guest.game.input.tap('tUp'); H.run(1 / 120 * 2); const pf = guest.game.scene.pb.f[me]; t.check('the guest\'s own press starts its wind-up at once', pf.st === 'tech' || !!guest.game.scene.pred, pf.st); H.run(.3); t.check('the prediction is settled within 250 ms', !guest.game.scene.pred); }
    // limits
    t.check('no protocol problems (16 KB, 20 a second)', H.issues.length === 0, H.issues.slice(0, 3).join('; '));
    // time-up: the host finishes in grace with valid standings
    H.timeUp(); H.run(.2);
    t.check('time-up: the host calls finish() at once', !!H.finished && Array.isArray(H.finished.standings) && H.finished.standings.flat().sort().join() === '0,1', JSON.stringify(H.finished && H.finished.standings));
    t.check('finish carries scores, stats and awards', H.finished && H.finished.scores && H.finished.stats && H.finished.stats[0]['Bouts won'] !== undefined && Array.isArray(H.finished.awards));
    const before = H.copies.map(c => c.client.sentN); H.run(2);
    t.check('after end nothing is sent', H.copies.every((c, i) => c.client.sentN === before[i]), before + ' -> ' + H.copies.map(c => c.client.sentN));
    t.check('every copy shows the end (ROUND OVER) and the sound stops', H.copies.every(c => c.game.scene.ended && c.game.audio.muted));
    t.check('no errors (2 players)', H.copies.every(c => c.game.errors.length === 0), H.copies.flatMap(c => c.game.errors.map(e => e.message)).join(' | '));
  }
  // ---- 4 players with latency, jitter and loss; rotation; a leaver mid-bout forfeits ----
  { const H = makeHub(4, { latency: 150, jitter: 50, loss: 5 }); await boot(H); H.card(); tapAll(H, 'confirm'); H.start(); H.run(3.3);
    const host = H.copy(0), K = () => host.game.scene.K; host.copies = null;
    for (const c of H.copies) c.KC.TUNE.sessionTarget = 3;
    t.check('4 players: the first bout is seats 0 and 1', K() && K().current().join() === '0,1', K() && K().current().join());
    H.run(45, () => K().bouts >= 1); H.run(2.2);
    const q = K().queue.slice(); t.check('kachinuki: the winner stays, the loser goes to the back', K().bouts >= 1 && q[q.length - 1] === (K().lastWinner === 0 ? 1 : 0) && q[0] === K().lastWinner, q.join() + ' winner ' + K().lastWinner);
    const [w, r] = K().current(), leaver = r; H.run(5); H.leave(leaver); H.run(4);
    t.check('a fighter leaving mid-bout loses by forfeit; the queue goes on', !K().queue.includes(leaver) && K().bouts >= 2, K().queue.join() + ' bouts ' + K().bouts);
    t.check('the guests heard the bouts (events reliable under loss)', H.copies.filter(c => c.id !== 0 && !c.client.gone).every(c => c.game.scene.lastWinner !== undefined));
    t.check('no protocol problems with 4 players under latency and loss', H.issues.length === 0, H.issues.slice(0, 3).join('; '));
    // down to one player: finish at once
    for (const c of H.copies.filter(c => c.id !== 0 && !c.client.gone)) H.leave(c.id); H.run(.5);
    t.check('under two players the host finishes at once', !!H.finished, JSON.stringify(H.finished && H.finished.standings));
    t.check('no errors (4 players)', H.copies.every(c => c.game.errors.length === 0), H.copies.flatMap(c => c.game.errors.map(e => e.message)).join(' | '));
  }
  // ---- the host leaves: the hub voids the round; every copy shows HOST LEFT ----
  { const H = makeHub(3); await boot(H); H.card(); tapAll(H, 'confirm'); H.start(); H.run(6); H.leave(0); H.run(1);
    t.check('host left: the others show HOST LEFT and stop', H.copies.filter(c => c.id !== 0).every(c => c.game.scene.ended && c.game.scene.endReason === 'host-left')); }
  // ---- a server copy (no player of its own) runs the world and sends ----
  { const H = makeHub(2, { server: true }); await boot(H); H.card(); tapAll(H, 'confirm'); H.start(); H.run(10);
    const srv = H.copy(99); t.check('server: the copy with no player hosts the bout and sends', srv.game.scene.isHost && srv.game.scene.server && srv.client.sentN > 20 && srv.game.scene.sub && srv.game.scene.sub.bout.phase !== undefined, srv.client.sentN);
    t.check('server: both players are guests with puppets', H.copies.filter(c => c.id !== 99).every(c => c.game.scene.pb && c.game.scene.mySide >= 0));
    H.timeUp(); H.run(.2); t.check('server: finish() from the server', !!H.finished); }
  // ---- outside a session: the title ----
  { const { game } = fresh(); t.check('with no hub the game opens on its title', game.sceneName === 'title'); }
};
