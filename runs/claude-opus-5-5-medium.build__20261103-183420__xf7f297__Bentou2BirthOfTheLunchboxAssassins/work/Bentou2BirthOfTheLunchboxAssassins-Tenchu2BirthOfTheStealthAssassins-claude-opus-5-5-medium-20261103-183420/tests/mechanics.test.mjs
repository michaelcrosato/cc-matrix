// movement, grapple, swimming, perception, Silent Cuts, tools, combat: each from fixed spots in the campaign maps
const cc = v => (v + .5) * 16;
export default async ({ makeContext, check }) => {
  { // movement and the grapple onto the training storehouse (kura, h 48)
    const t = makeContext(); t.step(.2); const M = t.load('training'); M.talk.close(); M.tut = null;
    for (const g of M.guards) g.alive = true;
    t.game.debug.teleport(cc(22), cc(19), 0, 0);
    t.intent({ move: [1, 0] }, 1); const h = t.H();
    check('running east moves the hero', h.x > cc(22) + 60, h.x);
    t.game.debug.teleport(cc(34), cc(15), 0, -Math.PI / 2); t.step(.2);
    const near = M.world.anchorsNear(h, 112, 96);
    check('a kura edge is a grapple anchor', near.some(a => a.z === 48), JSON.stringify(near.slice(0, 3)));
    t.intent({ grapplePressed: true, grappleDown: true }, 1 / 120); t.intent({ grappleReleased: true }, 1 / 120); t.intent({}, 2);
    check('a tap of the grapple pulls the hero onto the roof (z 48)', Math.abs(h.z - 48) < 2, 'z=' + h.z + ' action=' + (h.action && h.action.name));
    t.game.debug.teleport(cc(31), cc(15), 0, 0); h.crouch = false; t.step(.2);
    t.game.debug.teleport(cc(20), cc(9), 0, Math.PI); t.intent({ move: [-1, 0], jumpPressed: true }, 1 / 120); t.intent({ move: [-1, 0] }, 1);
    check('jumping at a 30-high wall climbs onto it', h.z >= 28 || h.x < cc(18), 'z ' + h.z + ' x ' + h.x);
  }
  { // swimming and diving in the koi pond
    const t = makeContext(); t.step(.2); const M = t.load('training'); M.talk.close();
    t.game.debug.teleport(cc(18), cc(13), 0, 0); t.intent({}, .3); const h = t.H();
    check('deep water makes the hero swim', h.swim, JSON.stringify(t.snap().hero));
    t.intent({ crouchPressed: true }, 1 / 120); t.intent({}, 2);
    check('crouch in deep water dives, and breath runs down', h.dive && h.breath < 11, 'dive ' + h.dive + ' breath ' + h.breath);
    check('a diving hero is unseen (exposure 0)', h.exposure === 0, h.exposure);
  }
  { // perception: lit and in front vs crouched in shadow
    const t = makeContext(); t.step(.2); const M = t.load('m1'); M.talk.close();
    const g = M.guards.find(q => q.id === 'gate1'); g.mode = 'post'; const h = t.H();
    t.game.debug.teleport(g.x + Math.cos(g.facing) * 50, g.y + Math.sin(g.facing) * 50, 0, g.facing + Math.PI);
    t.intent({}, 2.5);
    check('a hero standing in the open in front of a lantern guard is detected', g.mind.state === 'alert' || g.mind.state === 'search', g.mind.state + ' ' + g.mind.level + ' exp ' + h.exposure);
    const t2 = makeContext(); t2.step(.2); const M2 = t2.load('m1'); M2.talk.close();
    const g2 = M2.guards.find(q => q.id === 'ash5'); g2.mode = 'post'; const h2 = t2.H();
    t2.game.debug.teleport(g2.x - Math.cos(g2.facing) * 40, g2.y - Math.sin(g2.facing) * 40, 0, g2.facing); h2.crouch = true;
    t2.intent({}, 3);
    check('a crouched hero behind a guard stays unnoticed', g2.mind.state === 'calm', g2.mind.state);
    check('Ki reads a nearby guard', M2.ki > 50, M2.ki);
  }
  { // Silent Cut from behind (a training mark), counters and slow motion restored
    const t = makeContext(); t.step(.2); const M = t.load('training'); M.talk.close(); const h = t.H();
    const g = M.guards.find(q => q.id === 'masa'); g.facing = Math.PI / 2; g.home.facing = g.facing; g.mode = 'post';
    t.game.debug.teleport(g.x - Math.cos(g.facing) * 12, g.y - Math.sin(g.facing) * 12, 0, g.facing); h.crouch = true; t.step(.1);
    const c = t.B.cutCandidate(h, M);
    check('a back cut is offered behind a calm guard', c && c.kind === 'back' && c.g === g, c ? c.kind + ' ' + c.g.id : 'none; facing ' + g.facing + ' lookT ' + g.lookT);
    t.intent({ attackPressed: true }, 1 / 120); t.intent({}, 3);
    check('the Silent Mark lands: the disciple is down, the flag set', !g.alive && M.flags.marks === 1, 'alive ' + g.alive + ' flags ' + JSON.stringify(M.flags));
    check('time scale is back to 1 after the cut', t.game.timeScale === 1, t.game.timeScale);
    const tt = makeContext(); tt.step(.2); const MM = tt.load('m1'); MM.talk.close(); const hh = tt.H();
    const vg = MM.guards.find(q => q.id === 'ash5'); vg.mode = 'post';
    tt.game.debug.teleport(vg.x - Math.cos(vg.facing) * 12, vg.y - Math.sin(vg.facing) * 12, 0, vg.facing); hh.crouch = true; tt.step(.05);
    tt.intent({ attackPressed: true }, 1 / 120); tt.intent({}, 2.5);
    check('a real Silent Cut counts and scores', !vg.alive && MM.stats.silentCuts === 1 && MM.score().rows.find(r => r[0] === 'Silent Cuts')[1] === 150, MM.stats.silentCuts + ' alive ' + vg.alive);
  }
  { // from above and the undertow
    const t = makeContext(); t.step(.2); const M = t.load('training'); M.talk.close(); const h = t.H();
    const g = M.guards.find(q => q.id === 'masa'); t.game.debug.teleport(cc(32.3), cc(11), 48, Math.PI); t.step(.1);
    const c = t.B.cutCandidate(h, M); check('a cut from above is offered from the kura roof', c && c.kind === 'above', c ? c.kind : 'none');
    const k = M.guards.find(q => q.id === 'kiku'); t.game.debug.teleport(cc(24.2), cc(13.5), 0, 0); t.intent({}, .3); h.crouch = true; t.intent({}, .3);
    const c2 = t.B.cutCandidate(h, M); check('an Undertow is offered from the water', c2 && c2.kind === 'water' && c2.g === k, c2 ? c2.kind + ' ' + c2.g.id : 'none; swim ' + h.swim);
  }
  { // tools: a firecracker draws a guard; poison bait kills
    const t = makeContext(); t.step(.2); const M = t.load('m1'); M.talk.close(); const h = t.H();
    const g = M.guards.find(q => q.id === 'ash3'); g.mode = 'post';
    t.game.debug.teleport(g.x - 60, g.y, 0, 0); h.crouch = true;
    M.bento.slots[0] = { tool: 'firecracker', n: 3 }; M.bento.sel = 0;
    t.intent({ usePressed: true, aimPoint: { x: g.x - 10, y: g.y - 30 } }, 1 / 120); t.intent({}, 2.5);
    check('a firecracker pops and the guard turns to look', g.mind.state !== 'calm', g.mind.state + ' traps ' + M.traps.length);
    const t2 = makeContext(); t2.step(.2); const M2 = t2.load('m1'); M2.talk.close(); const h2 = t2.H(); M2.guards = M2.guards.filter(q => q.type !== 'hound');
    const g2 = M2.guards.find(q => q.id === 'ash3'); g2.mode = 'post';
    t2.game.debug.teleport(g2.x - 70, g2.y, 0, 0); h2.crouch = true;
    M2.baits.push({ kind: 'poison', x: g2.x + 26, y: g2.y - 10, z: 0, t: 0, eaten: false });
    t2.intent({}, 9);
    check('a calm guard eats a poisoned rice ball and dies', !g2.alive && M2.stats.cleanKills === 1, 'alive ' + g2.alive + ' eating ' + g2.eating + ' poison ' + g2.poisonT);
  }
  { // combat: parry inside the window staggers, riposte kills
    const t = makeContext(); t.step(.2); const M = t.load('m1'); M.talk.close(); const h = t.H();
    const g = M.guards.find(q => q.id === 'sam3'); t.game.debug.teleport(g.x + 15, g.y, 0, Math.PI); g.mind.level = 1.2; g.mind.last = { x: h.x, y: h.y, z: 0 };
    let parried = false; for (let i = 0; i < 400 && !parried; i++) { if (g.swing && g.swing.phase === 'wind' && (1 - g.swing.u) * g.swing.o.wind < .12) { t.intent({ blockPressed: true, blockDown: true }, 1 / 120); parried = g.staggerT > 0; } else t.intent({ blockDown: false }, 1 / 120); }
    check('a parry inside the window staggers the samurai', parried, 'stagger ' + g.staggerT);
    t.intent({ attackPressed: true }, 1 / 120); t.intent({}, 1);
    check('a riposte kills a staggered guard', !g.alive, 'alive ' + g.alive);
  }
};
