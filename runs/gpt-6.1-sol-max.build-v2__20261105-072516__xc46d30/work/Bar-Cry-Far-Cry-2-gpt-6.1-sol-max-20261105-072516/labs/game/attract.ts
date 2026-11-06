/** @file A looping director that uses the real game and its dev actions to stage field vignettes. */
import type { Context } from './ui/context';
const SCENES = [
  ['A ROAD WITH NO PROMISES', 'km40', 0],
  ['THE WIND TAKES A CONTRACT', 'pump', 1],
  ['EVERYTHING WEARS OUT', 'km40', 2],
  ['THE BITTER ONES', 'mission', 3],
  ['AN ACCOUNT STILL OPEN', 'salt', 4],
  ['PAPERWORK IN THE FIELD', 'tower', 5],
  ['THE RIVER REMEMBERS', 'estate', 6],
  ['ALL SALES FINAL', 'airstrip', 7],
] as const;
export class Attract {
  active = false;
  last = performance.now();
  startAt = 0;
  vignette = -1;
  timer: ReturnType<typeof setInterval>;
  banner: HTMLElement;
  view: [number, number] | null = null;
  ctx: Context;
  constructor(ctx: Context) {
    this.ctx = ctx;
    this.banner = document.createElement('div');
    this.banner.id = 'attract-banner';
    this.banner.hidden = true;
    document.body.append(this.banner);
    this.timer = setInterval(() => this.update(), 150);
  }
  activity(): void {
    this.last = performance.now();
    if (this.active) this.stop();
  }
  start(): void {
    const e = this.ctx.inspector();
    if (!e) return;
    this.active = true;
    this.startAt = performance.now();
    this.vignette = -1;
    this.ctx.start('attract');
    e.pause();
    this.ctx.screen = 'attract';
    this.ctx.root.hidden = true;
    this.banner.hidden = false;
  }
  stop(): void {
    if (!this.active) return;
    this.active = false;
    if (this.ctx.frame?.setting('game.attract') === 'on') this.ctx.inspector()?.set('game.attract', 'auto');
    this.view = null;
    this.banner.hidden = true;
    this.ctx.quit();
    this.last = performance.now();
  }
  update(): void {
    if (this.ctx.inHub) return;
    const now = performance.now(),
      mode = this.ctx.frame?.setting('game.attract') ?? new URLSearchParams(location.search).get('game.attract');
    if (!this.ctx.engine?.ready) return;
    if (this.ctx.screen === 'lobby' && this.ctx.net) {
      this.last = now;
      return;
    }
    if (!this.active) {
      if (
        mode !== 'off' &&
        this.ctx.c?.mode === 'title' &&
        ['title', 'settings', 'about', 'controls', 'merc', 'lobby'].includes(this.ctx.screen) &&
        (mode === 'on' || now - this.last >= 10000)
      )
        this.start();
      return;
    }
    const n = Math.floor((now - this.startAt) / 15000) % SCENES.length,
      [label, where, kind] = SCENES[n],
      e = this.ctx.inspector();
    if (!e) return;
    if (n !== this.vignette) {
      this.vignette = n;
      if ((this.ctx.p?.seat?.data.vehicle ?? -1) >= 0) {
        e.step(1, { p: ['interact'] });
        e.step(1);
      }
      if (this.ctx.p?.seat?.data.map && kind !== 5) e.step(1, { p: ['map'] });
      e.actions.run('place', { place: where });
      e.actions.run('give', { pills: 8, syr: 5, condition: kind === 2 ? 0.13 : 0.9, jam: kind === 2 });
      this.banner.innerHTML = `<strong>${label}</strong>Bar Cry · Press any button`;
      if (kind === 1 || kind === 6) {
        const p = this.ctx.p;
        if (p) e.actions.run('ignite', { x: p.actor.x + 20, z: p.actor.z - 25, radius: 2 });
      }
      if (kind === 2) e.step(1, { p: ['weapon2'] });
      if (kind === 3) e.actions.run('fever', { late: true });
      if (kind === 4) {
        for (const b of this.ctx.c?.buddies ?? []) e.actions.run('debt', { key: b.key, debt: 0, alive: true });
        e.actions.run('hurt', { hp: 0 });
      }
      if (kind === 0 || kind === 6) {
        const rides = e
          .entities('ride')
          .map(
            (x) => e.get(x.id) as unknown as { ride: { data: { kind: string } }; sceneProp: { x: number; z: number } },
          );
        const r = rides.find((r) => r.ride.data.kind === (kind === 6 ? 'boat' : 'jeep'));
        if (r) {
          e.actions.run('place', { x: r.sceneProp.x + 2.2, z: r.sceneProp.z });
          e.step(1, { p: ['interact'], look: [-Math.PI / 2, 0] });
        }
      }
      e.camera.set(
        kind === 0 || kind === 6
          ? 'cam3=fieldChase'
          : kind === 4
            ? 'cam3=fieldDown'
            : kind === 5
              ? 'cam3=fieldWalk'
              : 'cam3=first',
        { blend: false },
      );
    }
    const phase = ((now - this.startAt) % 15000) / 15000,
      yaw = Math.PI + Math.sin(phase * 2) * 0.7;
    this.view = [yaw, -0.03];
    const buttons =
      kind === 0 || kind === 6
        ? ['throttle']
        : kind === 2
          ? ['reload']
          : kind === 3 && phase > 0.5
            ? ['pill']
            : kind === 5
              ? ['map']
              : kind === 1
                ? [...(Math.floor((now - this.startAt) / 400) % 2 === 0 ? ['fire'] : []), 'quickfire']
                : phase < 0.6
                  ? ['fire']
                  : [];
    e.step(9, {
      move: kind === 0 ? [Math.sin(yaw) * 0.8, Math.cos(yaw) * 0.8] : [0, 0],
      look: [yaw, -0.03],
      b: buttons,
    });
  }
}
