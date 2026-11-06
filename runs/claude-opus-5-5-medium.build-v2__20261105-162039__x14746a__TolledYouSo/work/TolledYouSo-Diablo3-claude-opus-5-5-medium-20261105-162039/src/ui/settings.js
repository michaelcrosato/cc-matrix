// Our own Settings screen: the engine's panel on a pad, plus the game's options.
import { LOOK_PRESETS } from '../../pixel-engine.js';
import { footer } from './glyphs.js';

const LOOKS = [['NATIVE', undefined], ['SPOOKY', 'spooky'], ['NOIR', 'noir'], ['PLAYSTATION', 'playstation'], ['OLD PHOTO', 'old_photo'], ['SIXTEEN BIT', 'sixteen_bit']];
export const DEFAULT_SETTINGS = { glyphs: 'playstation', shake: 1, numbers: true, zoom: 1, voices: 0.8, look: 0 };
export class SettingsScreen {
  constructor(ctx, host) { this.ctx = ctx; this.host = host; this.v = { ...DEFAULT_SETTINGS }; }
  load(o) { this.v = { ...DEFAULT_SETTINGS, ...(o ?? {}) }; this.apply(); }
  apply() { const { ctx, v } = this; this.host.ui.glyphs = v.glyphs; this.host.voice.volume = v.voices; const lk = LOOKS[v.look]?.[1]; if (ctx.engine.settings.values.look !== lk) ctx.engine.settings.set({ look: lk }); }
  draw(ui, s, m) {
    const a = this.ctx.audio; const eng = this.ctx.engine; const v = this.v;
    ui.rect(0, 0, ui.W, ui.H, 'ink'); ui.frame(0, 0, ui.W, 22, 'slate', 'night'); ui.text(12, 7, 'SETTINGS', { color: 'sand' });
    const pct = (x) => `${Math.round(x * 100)}%`;
    const vol = (ch, d) => { a.unlock(); a.setVolume(ch, Math.max(0, Math.min(1, Math.round((a.volume[ch] + d) * 20) / 20))); };
    const rows = [
      ['MASTER VOLUME', pct(a.volume.master), (d) => vol('master', d * 0.05)],
      ['MUSIC VOLUME', pct(a.volume.music), (d) => vol('music', d * 0.05)],
      ['SOUND VOLUME', pct(a.volume.sfx), (d) => vol('sfx', d * 0.05)],
      ['VOICES VOLUME', pct(v.voices), (d) => { v.voices = Math.max(0, Math.min(1, Math.round((v.voices + d * 0.05) * 20) / 20)); this.apply(); }],
      ['BUTTON GLYPHS', v.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION', () => { v.glyphs = v.glyphs === 'xbox' ? 'playstation' : 'xbox'; this.apply(); }],
      ['SCREEN SHAKE', pct(v.shake), (d) => { v.shake = Math.max(0, Math.min(1.5, Math.round((v.shake + d * 0.25) * 4) / 4)); }],
      ['DAMAGE NUMBERS', v.numbers ? 'ON' : 'OFF', () => { v.numbers = !v.numbers; }],
      ['ZOOM', pct(v.zoom), (d) => { v.zoom = Math.max(0.7, Math.min(1.3, Math.round((v.zoom + d * 0.05) * 20) / 20)); }],
      ['LOOK', LOOKS[v.look][0], (d) => { v.look = (v.look + d + LOOKS.length) % LOOKS.length; this.apply(); }],
      ['PIXEL SIZE', (eng.settings.values.pixelSize ?? 'fine').toUpperCase(), () => { eng.settings.set({ pixelSize: (eng.settings.values.pixelSize ?? 'fine') === 'fine' ? 'chunky' : 'fine' }); }],
      ['QUALITY', String(eng.quality).toUpperCase(), () => { const L = ['low', 'medium', 'high']; const i = (L.indexOf(eng.quality) + 1) % 3; eng.settings.set({ quality: L[i] }); }],
      ['FULLSCREEN', typeof document !== 'undefined' && document.fullscreenElement ? 'ON' : 'OFF', () => { if (typeof document === 'undefined') return; if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {}); else document.documentElement.requestFullscreen?.()?.catch?.(() => {}); }],
      ['RESET TO DEFAULTS', '', () => { a.resetVolumes(); eng.settings.reset(); this.v = { ...DEFAULT_SETTINGS }; this.apply(); ui.ctx.audio.play('ui_ok'); }],
    ];
    const rowH = Math.min(16, Math.floor((ui.H - 44) / rows.length)); const x = Math.max(12, ui.W / 2 - 170); const w = Math.min(340, ui.W - 24);
    rows.forEach(([label, val, change], i) => {
      const y = 26 + i * rowH; const id = `set:${label}`; const st = ui.widget(id, x, y, w, rowH - 1, {});
      ui.frame(x, y, w, rowH - 1, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'night'); ui.text(x + 5, y + Math.floor((rowH - 8) / 2), label, { color: 'white' }); if (val) ui.textR(x + w - 5, y + Math.floor((rowH - 8) / 2), val, { color: 'sand' });
      if (st.act) change(1);
      if (st.focused) { if (m.left) { m.left = false; change(-1); ui.ctx.audio.play('ui_move'); } if (m.right) { m.right = false; change(1); ui.ctx.audio.play('ui_move'); } }
    });
    footer(ui, [['confirm', 'CHANGE'], ['back', 'BACK']]);
    this.host.settingsChanged?.();
  }
}
export { LOOK_PRESETS };
