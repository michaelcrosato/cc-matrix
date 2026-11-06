// The belt fight: hooked off your feet by Mate Ansgar's gaff, riding the conveyor toward the can press.
// An interactive cutscene: 4 press QTEs and 1 mash. A failure restarts it with a new quip, no reload.
import { Humanoid } from '../actor.js';

const QUIPS = ['A POOR SHOWING, MISS RANSOM.', 'YOUR CANNED COUSIN SENDS HIS REGARDS.', 'IN THE BRINE WITH YOU.', 'THE TIDE TAKES WHAT IT IS OWED.'];

export function startBeltFight(area, { X, Z, onDone }) {
  const { ctx, player: P } = area;
  const rowZ = Z(13.5);
  const press = area.level.props.find((p) => p.id === 'can-press');
  const stamp = press?.obj.getObjectByName('Stamp');
  const ansgar = new Humanoid('ansgar');
  ansgar.attach('HandR', 'w-gaff', { at: [0, -0.1, 0], rot: [Math.PI / 2, 0, 0] });
  ctx.scene.add(ansgar.root);
  area.npcs.ansgar = ansgar;
  const fight = { x: X(14), fails: 0, step: 0, over: false };
  area.beltFight = fight;
  const beltSpeed = 1.5;
  const endX = X(36.5);

  const place = () => {
    ansgar.root.position.set(fight.x + 1.1, 0.03, rowZ);
    ansgar.root.rotation.y = -Math.PI / 2;
    P.root.position.set(fight.x, 0.03, rowZ);
    P.facing = Math.PI / 2;
    P.root.rotation.y = Math.PI / 2;
  };

  P.teleport(X(14), 0, rowZ);
  P.state = 'script';
  P.actor.play('KnockedDown', { once: true });
  ansgar.play('AnsgarSwing', { once: true });
  ctx.audio.play('chain');
  ctx.audio.play('bellow', { volume: 0.5 });
  ctx.engine.shake.add(0.5);
  area.hideEnemies = true;
  place();
  area.fixedView = () => ({ position: [fight.x - 2.6, 2.2, rowZ - 2.8], target: [fight.x + 0.5, 0.6, rowZ], fov: 40 });

  const SEQUENCE = [
    { key: 'dodge', label: 'ROLL', ok: () => { P.actor.play('Roll', { once: true }); ansgar.play('AnsgarSwing', { once: true }); ctx.audio.play('kickWhoosh'); }, fail: 'HOOK' },
    { key: 'action', label: 'KICK', ok: () => { P.actor.play('Kick', { once: true }); ansgar.play('HitReact', { once: true }); ctx.audio.play('kickImpact'); ctx.engine.shake.add(0.3); }, fail: 'HOOK' },
    { key: 'dodge', label: 'DUCK', ok: () => { P.actor.play('Crouch'); ansgar.play('AnsgarHook', { once: true }); ctx.audio.play('kickWhoosh'); }, fail: 'HOOK' },
    { key: 'action', label: 'ELBOW', ok: () => { P.actor.play('Punch', { once: true }); ansgar.play('HitReact', { once: true }); ctx.audio.play('kickImpact'); ctx.engine.shake.add(0.3); }, fail: 'HOOK' },
  ];

  const nextBeat = () => {
    if (fight.over) return;
    if (fight.step < SEQUENCE.length) {
      const s = SEQUENCE[fight.step];
      ansgar.play('AnsgarSwing', { once: true });
      area.qte.press({
        key: s.key, label: s.label,
        onOk: () => { s.ok(); fight.step++; fight.wait = 1.4; },
        onFail: () => {
          fight.fails++;
          P.hurt(12, { x: fight.x + 1, z: rowZ }, { noStagger: true });
          if (!P.alive) { fight.over = true; return; }
          area.talk.bark('islander', QUIPS[fight.fails % QUIPS.length], { prio: 3 });
          P.actor.play('Stagger', { once: true });
          ctx.engine.shake.add(0.4);
          fight.wait = 1.2;
        },
      });
      return;
    }
    // The last moment: at the press, mash.
    ansgar.play('Push');
    P.actor.play('Push');
    area.qte.mash({
      key: 'action', label: 'SHOVE', time: 3.4,
      onOk: () => finish(),
      onFail: () => {
        fight.fails++;
        P.hurt(16, { x: fight.x + 1, z: rowZ }, { noStagger: true });
        if (!P.alive) { fight.over = true; return; }
        area.talk.bark('islander', QUIPS[fight.fails % QUIPS.length], { prio: 3 });
        fight.wait = 0.8;
      },
    });
  };

  const finish = () => {
    fight.over = true;
    area.fixedView = null;
    ctx.audio.play('kickImpact');
    ansgar.play('KnockedDown', { once: true });
    ctx.tweens.to(ansgar.root.position, { x: X(38.5) }, { duration: 0.45, ease: 'inSine' });
    area.startCutscene([
      { cam: [[X(35), 2.2, rowZ - 3.4], [X(38.5), 1.2, rowZ], 36] },
      { wait: 0.45 },
      { cue: () => {
        if (stamp) ctx.tweens.to(stamp.position, { y: 0.9 }, { duration: 0.12, ease: 'inSine' });
        ctx.audio.play('stomp'); ctx.engine.shake.add(0.9); ctx.engine.hitstop(0.08);
        ctx.particles.burst('gore', [X(38.5), 0.8, rowZ]);
        ansgar.root.visible = false;
      } },
      { wait: 0.5 },
      { cue: () => { if (stamp) ctx.tweens.to(stamp.position, { y: 2.4 }, { duration: 0.8 }); } },
      { wait: 0.9 },
      { cue: () => {
        // A can rolls out.
        const can = area.level.place('can-stack', X(37), rowZ, { collide: false, scale: 0.5 });
        ctx.tweens.to(can.obj.position, { x: X(33) }, { duration: 1.6, ease: 'outSine' });
        ctx.audio.play('metalClang', { volume: 0.5 });
      } },
      { wait: 1.6 },
      { cam: [[P.root.position.x - 1.4, 1.5, rowZ - 1.6], [P.root.position.x + 0.6, 1.3, rowZ], 30] },
      { say: ['max', 'Contents may have settled.'], hold: 1.4 },
    ], { onEnd: () => {
      delete area.npcs.ansgar;
      P.teleport(P.root.position.x, 0, rowZ - 1.6);
      P.state = 'free';
      area.beltFight = null;
      onDone?.();
    } });
  };

  fight.wait = 1.2;
  fight.tick = (dt) => {
    if (fight.over) return;
    // Everyone rides the belt: they arrive at the press whatever you do.
    const target = fight.step >= SEQUENCE.length ? endX : X(14) + (endX - X(14)) * (fight.step / SEQUENCE.length);
    if (fight.x < target) fight.x = Math.min(target, fight.x + beltSpeed * dt * 2.2);
    place();
    if (!area.qte.active) {
      fight.wait -= dt;
      if (fight.wait <= 0 && fight.x >= target - 0.05) nextBeat();
    }
  };
}
