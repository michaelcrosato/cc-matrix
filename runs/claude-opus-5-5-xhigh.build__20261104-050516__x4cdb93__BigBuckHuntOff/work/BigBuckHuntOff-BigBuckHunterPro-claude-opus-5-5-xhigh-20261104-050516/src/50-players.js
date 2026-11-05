// 50-players: up to four hunters on one screen: each a device, a seat colour and a reticle shape, a rifle, a scope and
// a call, a score; P1 is the keyboard and mouse (or a pad); the others join on their own pads.
class Player {
  constructor(n, input, o = {}) {
    this.n = n; this.i = n - 1; this.input = input; this.color = SEAT_COLORS[this.i]; this.shape = SHAPES[this.i]; this.name = o.name || SEAT_NAMES[this.i];
    this.rifle = new Rifle(this); this.scope = new Scope(this); this.call = new Call(this);
    this.score = 0; this.benched = false; this.rx = 240; this.ry = 140; this.vx = 0; this.vy = 0; this.ramp = 0; this.bot = null; this.device = 'keyboard';
    this.stats = { shots: 0, hits: 0, bucks: 0, does: 0, longest: 0, critters: 0 }; this.siteScores = []; this.kick = 0; this.bloom = 0; this.ghost = !!o.ghost;
  }
  get autoPump() { return this.forceAuto || G.game.settings.autoPump || (G.hunt && G.hunt.diff && G.hunt.diff.autoPump); }
  addScore(v) { this.score = Math.max(0, this.score + v); }
  resetSite(o = {}) { this.rifle.setup(o); this.call.reset(); this.benched = false; this.scope.on = false; this.scope.raise = 0; this.scope.breath = T('breath'); this.scope.shaky = 0; this.multiN = 1; this.lastKillT = -9; }
  /** this step's input: fire (a shot request), pump, scope, breath, call */
  update(dt, H) {
    const I = this.input;
    this.rifle.update(dt); this.call.update(dt); if (this.kick > 0) this.kick = Math.max(0, this.kick - dt * 4); if (this.bloom > 0) this.bloom = Math.max(0, this.bloom - dt * 5);
    if (this.bot) { this.bot.update(dt, this, H); return; }
    if (G.ui.screen || H.inputBlocked) { this.scope.update(dt, false, false); return; }
    aimUpdate(this, dt, H);
    const tog = G.game.settings.scopeMode === 'toggle';
    if (tog) { if (I.pressed('scope')) this.scope.toggle = !this.scope.toggle; } else this.scope.toggle = I.down('scope');
    this.scope.update(dt, this.scope.toggle && !this.benched && H.canScope !== false, I.down('breath'));
    if (I.pressed('pump')) this.rifle.pump();
    if (I.pressed('call') && H.canCall !== false) H.useCall(this);
    if (I.pressed('fire')) H.trigger(this);
  }
  /** where the round goes: the reticle, plus the scope's sway */
  aimPoint() { const s = this.scope.raise > .05 ? this.scope.sway() : [0, 0]; return [this.rx + s[0], this.ry + s[1]]; }
}
