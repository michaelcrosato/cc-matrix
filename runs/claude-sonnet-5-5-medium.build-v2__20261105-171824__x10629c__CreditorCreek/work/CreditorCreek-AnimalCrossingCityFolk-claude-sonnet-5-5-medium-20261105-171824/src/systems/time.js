// Time: Village Time / Real Clock, day rollover, sky, weather visuals, hourly bell and tunes.
import { THREE, applySky, skyAt, Precipitation, PALETTE, groundFog } from '../engine.js';
import { tuning } from '../data/tuning.js';
import { hourOf, seasonOf, dayTypeOf, weatherAt, isWet, MIN_PER_DAY, realClockInfo, fmtClock, SEASONS } from '../core/calendar.js';
import { hourSong, songNamed, chimeSong } from '../audio/composer.js';
export const time = {
  onLoad(g) { this.lastHour = Math.floor(g.hour); this.lastMinute = -1; this.weatherNow = g.weather; this.initWeather(g); this.applyReal(g, true); this.visual(g, 0, true); },
  initWeather(g) { if (this.rain) return; this.rain = new Precipitation({ kind: 'rain', count: 1800, area: [22, 12, 22] }); this.snow = new Precipitation({ kind: 'snow', count: 1400, area: [22, 12, 22] }); g.ctx.scene.add(this.rain, this.snow); this.rain.visible = false; this.snow.visible = false; },
  applyReal(g, init) {
    const w = g.world; if (!w || w.clockMode !== 'real') return; const now = new Date(g.realNow ?? Date.now()); const info = realClockInfo(now);
    const typeIdx = info.type; w.day = info.season * 4 + typeIdx + 1; const h = info.hour; w.min = ((h * 60 - 300) + 1440) % 1440;
  },
  step(g, dt) {
    const w = g.world; if (!w || g.ui.busy && g.ui.top?.freezeTime !== false) return;
    if (w.clockMode === 'real') { this.realAcc = (this.realAcc ?? 0) + dt; if (this.realAcc > 1) { this.realAcc = 0; const prev = w.day; this.applyReal(g); if (w.day !== prev) this.newDay(g, 'real'); } return; }
    const rate = tuning.minPerSec * (g.flags.slowDayOne ? 0.5 : 1); w.min += dt * rate;
    if (w.min >= MIN_PER_DAY) { w.min -= MIN_PER_DAY; this.newDay(g, 'night'); }
    const h = Math.floor(g.hour); if (h !== this.lastHour) { this.lastHour = h; this.onHour(g, h); }
  },
  onHour(g, h) {
    const w = g.world; g.sys.chime.hourly(g, h);
    if (h === 9) g.sys.mail.deliver(g);
    g.npcs.schedule(false); g.sys.nature.hourly?.(g, h);
    this.updateWeather(g); g.sys.festivals?.hourly?.(g, h); g.sys.contests?.hourly?.(g, h);
    if (h === 4 && g.sys.pimm) { /* bedtime nag handled in bed */ }
    g.autosave?.('hour');
  },
  updateWeather(g) { const wx = g.weather; if (wx !== this.weatherNow) { const wasWet = isWet(this.weatherNow); g.town.rainbow(wasWet && !isWet(wx) && wx !== 'snow' && g.hour > 7 && g.hour < 18); this.weatherNow = wx; g.updateMusic(true); if (wx === 'storm') g.sfx('thunder'); } },
  /** Roll to the next calendar day. reason: 'night' (passed 5am) | 'bed' | 'real' | 'dev'. */
  newDay(g, reason, o = {}) {
    const w = g.world; const prevSeason = seasonOf(w.day); if (w.coffeeUntil && w.coffeeUntil > 1440) { w.coffeeUntil -= 1440; w.coffeeDay = w.day + 1 > 16 ? 1 : w.day + 1; } else if (w.coffeeUntil) w.coffeeUntil = 0;
    if (reason !== 'real') { w.day++; if (w.day > 16) { w.day = 1; w.year++; } }
    if (reason !== 'real') { w.min = o.min ?? 60; }
    w.daysPlayed++; const s = seasonOf(w.day);
    g.sys.nature.daily(g); g.sys.mail.daily(g); g.sys.economy.daily(g); g.sys.festivals?.daily?.(g); g.sys.cheese?.daily?.(g); g.sys.story2?.daily?.(g); g.sys.plant?.grow?.(g); g.sys.lostFound?.daily?.(g); g.sys.favours?.daily?.(g);
    g.npcs.reset(); g.npcs.schedule(true); this.lastHour = Math.floor(g.hour); this.weatherNow = g.weather;
    if (s !== prevSeason || o.force) { g.syncAll(); g.sys.seasons?.turn(g, s); } else g.syncAll();
    this.visual(g, 0, true); g.updateMusic(true);
    g.autosave?.('day');
  },
  setFog(g, sky) {
    if (!this.fog) { try { this.fog = groundFog({ color: sky.sky, top: 1.2, amount: 0.1, near: 12, far: 40 }); g.ctx.scene.fogNode = this.fog.node; } catch { this.fog = null; return; } }
    const wx = g.weather; this.fog.color.value.setHex(wx === 'fog' ? PALETTE.mist : sky.sky); this.fog.amount.value = wx === 'fog' ? 0.45 : isWet(wx) ? 0.25 : g.season === 2 && g.hour < 9 ? 0.4 : 0.08;
  },
  visual(g, dt, force) {
    const w = g.world; if (!w) return; g.town.gold = !!w.flags.goldBell; const min = Math.floor(w.min);
    if (min !== this.lastMinute || force) {
      this.lastMinute = min; const sky = skyAt(g.hour); this.sky = sky; applySky(g.engine, sky);
      const wx = g.weather; const dim = wx === 'rain' || wx === 'storm' ? 0.75 : wx === 'fog' ? 0.85 : 1; if (dim < 1) g.engine.sun.intensity *= dim;
      this.setFog(g, sky); g.town.setNight(sky.night); g.town.setFestival?.(g.dayType === 3 && g.hour >= 6 ? g.world.day : null, g.season); g.sys.nature.setNight?.(g, sky.night); if (g.place === 'city') g.sys.city.applyLight?.(g); else if (g.place !== 'town') g.sys.places.indoorLight(g, g.place);
    }
    if (this.rain) {
      const wx = g.weather; const wet = isWet(wx); this.rain.visible = wet && g.place === 'town'; this.snow.visible = wx === 'snow' && g.place === 'town'; this.rain.intensity = wet ? (wx === 'storm' ? 1 : 0.7) : 0; this.snow.intensity = wx === 'snow' ? 0.8 : 0;
      const f = g.player.pos; const focus = new THREE.Vector3(f.x, 0, f.z); if (dt > 0) { if (this.rain.visible) this.rain.update(dt, focus); if (this.snow.visible) this.snow.update(dt, focus); }
      if (wx === 'storm' && this.cosmetic !== false && g.cosmetic() < dt * 0.06) { g.engine.screen.flash('white', { duration: 0.12 }); g.after(0.6, () => g.sfx('thunder')); }
    }
  },
  music(g, force) {
    if (g.place !== 'town') return; const h = Math.floor(g.hour); const wx = g.weather; const mood = isWet(wx) ? 'rain' : wx === 'snow' ? 'snow' : 'x'; const key = 'h' + h + mood;
    if (!force && g.musicName === key) return; g.musicName = key; g.ctx.audio.playMusic(hourSong(h, wx), key);
  },
  sleepTo(g, kind) { // kind: morning | noon | dusk | festival
    const w = g.world; const target = { morning: 60, noon: 420, dusk: 780 }[kind];
    if (kind === 'festival') { while (dayTypeOf(w.day) !== 3) { w.day++; if (w.day > 16) { w.day = 1; w.year++; } } w.day--; if (w.day < 1) w.day = 16; this.newDay(g, 'bed', { force: true }); return; }
    if (kind === 'morning' || w.min > target) this.newDay(g, 'bed'); else { w.min = target; this.lastHour = Math.floor(g.hour) - 1; g.npcs.schedule(true); this.visual(g, 0, true); g.updateMusic(true); }
  },
};
