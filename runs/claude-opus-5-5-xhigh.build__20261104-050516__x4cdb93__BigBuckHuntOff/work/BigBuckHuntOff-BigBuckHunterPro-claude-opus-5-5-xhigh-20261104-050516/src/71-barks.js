// 71-barks: the emcee's short, loud calls and Uncle Dub's quieter tips: a caption, a gibberish voice, never the same
// line twice running; and what the HUD does when things happen (banners, score pops, flashes, stings).
const BARKS = {
  start: { p: 1, lines: ['BUCKS ONLY!', 'HERE THEY COME!', 'EYES SHARP, HUNTERS!', '{n} BUCKS ON THE MOVE!'] },
  startBull: { p: 1, lines: ['BULLS ONLY!', 'HERE THEY COME!', 'EYES SHARP, HUNTERS!', 'BIG BULLS ON THE MOVE!'] },
  kill: { p: 1, lines: ['NICE SHOT!', "BAGGED 'EM!", 'WHAT A SHOT!', 'DOWN HE GOES!', 'THAT ONE COUNTS!'] },
  wound: { p: 2, lines: ['GUT SHOT... FINISH HIM!', "HE'S HIT! FINISH IT!", 'STILL RUNNING! PUT HIM DOWN!'] },
  long: { p: 2, lines: ['LONG SHOT! CALL THE PAPER!', 'FROM THE NEXT COUNTY!', 'LONG SHOT!'] },
  running: { p: 2, lines: ['RUNNING SHOT!', 'ON THE RUN!', 'LED HIM PERFECT!'] },
  quick: { p: 2, lines: ['QUICK DRAW!', 'FASTEST GUN IN THE HOLLER!'] },
  double: { p: 3, lines: ['DOUBLE!', 'TWO FOR TWO!'] },
  triple: { p: 3, lines: ['TRIPLE! THE CROWD GOES MILD!', 'TRIPLE!!'] },
  miss: { p: 0, lines: ['MISSED HIM CLEAN!', "THAT'S A LOT OF DIRT YOU KILLED!", "MISSED! HE'S LAUGHING AT YOU!"] },
  bark: { p: 0, lines: ["BARK'S DEAD, BUCK AIN'T!", 'YOU GOT THE TREE!', 'TIMBER!'] },
  pump: { p: 2, lines: ['PUMP IT!', 'RACK IT, HOSS!'] },
  reload: { p: 1, lines: ['RELOAD, HOSS!', 'FEED THAT TUBE!'] },
  doe: { p: 4, lines: ["DOE! YOU'RE OUT!", "THAT'S A DOE! HOLSTER UP!", 'AW, NOT MAMA!'] },
  fawn: { p: 4, lines: ['A FAWN?! GO SIT IN THE TRUCK!', "THAT'S A BABY! YOU'RE DONE!"] },
  cow: { p: 4, lines: ["THAT'S A COW! YOU'RE OUT!", 'NO HORNS, NO SHOOTIN\'!'] },
  stink: { p: 4, lines: ['OH, THE STINK!', 'P-U! SKUNKED!'] }, bessie: { p: 4, lines: ["THAT'S BESSIE!!", 'NOT THE COW!'] },
  eagle: { p: 4, lines: ["THAT'S THE NATIONAL BIRD, BUDDY!", 'NOT THE EAGLE!'] }, loon: { p: 4, lines: ['NOT THE LOON!', 'LEAVE THE LOONS BE!'] },
  escape: { p: 2, lines: ["HE'S GETTIN' AWAY!", 'GONE LIKE A RUMOR!', 'THERE HE GOES...'] },
  lost: { p: 2, lines: ['WOUNDED AND LOST...', 'HE GOT AWAY HURT. SHAME.'] },
  trophy: { p: 4, lines: ['TROPHY SPOTTED!'] },
  clear: { p: 3, lines: ['SITE CLEAR!', 'CLEANED HOUSE!'] }, time: { p: 3, lines: ['TIME!', "THAT'S TIME!"] }, sweep: { p: 4, lines: ['CLEAN SWEEP!'] },
  critter: { p: 1, lines: ['CRITTER BONUS!', 'BONUS CRITTER!'] }, squirrel: { p: 1, lines: ['SQUIRREL!', 'GOT THE SQUIRREL!'] }, turkey: { p: 2, lines: ['TURKEY DINNER!', 'GOBBLE GOBBLE!'] },
  tipTree: { p: 0, who: 'dub', lines: ['Wait for him to clear that tree.', 'Trees soak up a lot of lead.'] },
  tipBreath: { p: 0, who: 'dub', lines: ['Hold your breath. Steady as a church pew.', "Breathe out, then squeeze. Don't yank."] },
  tipCall: { p: 0, who: 'dub', lines: ['Give him a call. He\'ll stop to listen.', 'Call him. Make him curious.'] },
  tipLead: { p: 0, who: 'dub', lines: ['Lead the runners a hair.', 'Aim where he\'s going, not where he was.'] }
};
const Barks = G.barks = {
  last: {}, at: -9, cur: 0, recent: [],
  say(cat, o = {}) {
    const B = BARKS[cat]; if (!B) return false;
    const now = G.game.real; if (now - this.at < 1.2 && B.p <= this.cur) return false;
    const r = FX(), last = this.last[cat] || [];
    let line = pickNoRepeat(B.lines, last, r); this.last[cat] = [line].concat(last).slice(0, 2);
    if (o.n !== undefined) line = line.replace('{n}', ['NO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][o.n] || String(o.n)); else line = line.replace('{n} ', '');
    const who = B.who || o.who || 'emcee';
    this.caption(who, line); this.at = now; this.cur = B.p;
    this.recent.push(cat); if (this.recent.length > 30) this.recent.shift();
    return line;
  },
  caption(who, line, o = {}) { const C = CAST[who] || CAST.emcee; HUD.caption(C.name, line, C.color, o.dur); G.bab.say(line, C.voice, { vol: who === 'emcee' ? 1 : .8 }); bus.emit('bark', { who, line }); }
};
// the HUD and the sound, reacting
bus.on('playStart', site => { if (!G.hunt || G.hunt.mode === 'attract' && false) return; Barks.say(G.hunt.species === 'whitetail' ? 'start' : 'startBull', { n: site.def.bucks }); });
bus.on('kill', e => {
  const k = e.kill, p = e.p, Z = ZONES[k.zone] || ZONES.body, H = G.hunt;
  if (Z.lethal && Z.call) HUD.banner(Z.call, { scale: 3 });
  HUD.pop(e.a.x, e.a.y, e.a.z + (e.a.rig.height || 20) * T('animalScale'), '+' + fmt(k.points) + (k.shared ? ' SHARED!' : ''), p.color, { sub: Z.label + ' ' + Math.round(k.dist) + ' M' });
  if (!H || !H.hubMode) G.game.freeze(.04); if (p.input.rumble) p.input.rumble(.6, .15);
  if (k.multiN >= 3) Barks.say('triple'); else if (k.multiN === 2) Barks.say('double');
  else if (k.dist >= 150) Barks.say('long'); else if (k.running) Barks.say('running'); else if (k.quick) Barks.say('quick'); else Barks.say('kill');
  if (k.multiN >= 2) HUD.banner(k.multiN >= 3 ? 'TRIPLE!' : 'DOUBLE!', { scale: 3, colors: ['#ffffff', '#7ad0ff', '#3a8ae8'] });
  if (H && H.site && H.site.bucksSpawned.length && H.site.bucksSpawned.every(a => a.resolved && !a.escaped && !a.lost) && H.site.def.bucks <= H.site.bucksSpawned.length) G.sfx && G.sfx.sting('siteclear');
});
bus.on('wound', e => { HUD.pop(e.a.x, e.a.y, e.a.z + (e.a.rig.height || 20), (ZONES[e.R.zone] || ZONES.body).call || 'HIT', '#ffd04a'); Barks.say('wound'); });
bus.on('ping', e => { HUD.pop(e.a.x, e.a.y, e.a.z + (e.a.rig.height || 20) * 1.1, 'ANTLER PING!', '#e8dcc0'); });
bus.on('miss', e => { const R = e.R; if (R.kind === 'prop' && FX()() < .5) Barks.say(FX()() < .5 ? 'bark' : 'tipTree'); else if (FX()() < .22) Barks.say('miss'); });
bus.on('dry', p => { if (p.rifle.dryCount <= 2) Barks.say('pump'); });
bus.on('reload', p => { if (FX()() < .25) Barks.say('reload'); });
bus.on('doe', e => {
  const a = e.a; G.game.flash('#ff2a1a', .25, .7); if (G.sfx) G.sfx.sting('doe');
  HUD.banner(e.benched ? (a.young ? (a.sp.id === 'whitetail' ? 'A FAWN?!' : 'A CALF?!') : a.sp.id === 'whitetail' ? "DOE! YOU'RE OUT!" : "COW! YOU'RE OUT!") : '-300 ' + a.label + '!', { scale: 3, colors: ['#ffe0d8', '#ff6a4a', '#a81a10'] });
  Barks.say(a.young ? 'fawn' : a.sp.id === 'whitetail' ? 'doe' : 'cow');
  if (e.p.input.rumble) e.p.input.rumble(.9, .4);
});
bus.on('critter', e => { const a = e.a, C = a.def; if (e.protected) { HUD.banner(fmt(e.points) + ' ' + C.label.toUpperCase() + '!', { scale: 2, colors: ['#ffe0d8', '#ff6a4a', '#a81a10'] }); Barks.say(C.bark); if (G.sfx) G.sfx.sting('escaped'); } else { HUD.pop(a.x, a.y, a.z + 1.2 * M, '+' + fmt(e.points) + ' ' + C.label.toUpperCase(), e.p.color); Barks.say(C.bark === 'squirrel' || C.bark === 'turkey' ? C.bark : 'critter'); } });
bus.on('escape', a => { Barks.say('escape'); if (G.sfx) G.sfx.sting('escaped'); });
bus.on('lost', a => { Barks.say('lost'); });
bus.on('siteEnd', site => { Barks.say(site.endReason === 'clear' ? 'clear' : 'time'); });
bus.on('trophySpotted', a => { const tr = has('trophy', a.trophy) ? reg('trophy', a.trophy) : null; HUD.banner('TROPHY!', { scale: 3, sub: tr ? tr.name.toUpperCase() : '', colors: ['#fff6d8', '#ffd040', '#c87a10'] }); Barks.caption('emcee', tr && tr.spotted || 'TROPHY SPOTTED!'); if (G.sfx) G.sfx.layer('tension', true); });
bus.on('appear', a => { if (G.sfx && a.cat === 'animal' && a.target) G.sfx.layer('drums', true); });
bus.on('scope', p => { if (G.hunt && G.hunt.site && G.hunt.actors.some(a => a.target && a.alive && Math.hypot(a.x - G.hunt.cam.x, a.y - G.hunt.cam.y) > 90 * M)) { if (!HUD.tip('breath', 'breath', 'HOLD TO STEADY', { times: 3, p })) {} } });
bus.on('spook', a => { if (a.target && G.hunt && G.hunt.players.some(p => p.call.charges > 0) && G.hunt.site) HUD.tip('call', 'call', 'CALL TO STOP HIM', { times: 3 }); });
