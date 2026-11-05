// Dipout HD: the race HUD, drawn in game pixels over the 3D picture (browser only). Few items, big type.
(() => {
  const SN = globalThis.SN;

  const fmt = (t) => {
    if (!(t >= 0)) return '--:--.---';
    const m = Math.floor(t / 60), s = Math.floor(t % 60), ms = Math.floor((t * 1000) % 1000);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(ms).padStart(3, '0');
  };
  SN.fmtTime = fmt;

  const ordinal = (n) => ['', '1ST', '2ND', '3RD'][n] || n + 'TH';

  // Button labels: the controller's symbols when the setting says PlayStation (default) or Xbox.
  SN.padLabel = (name, style) => {
    const ps = { thrust: '✕ THRUST', fire: '□ FIRE', absorb: '○ ABSORB', cam: '△ CAMERA', brake: 'L2 R2 BRAKE' };
    const xb = { thrust: 'A THRUST', fire: 'X FIRE', absorb: 'B ABSORB', cam: 'Y CAMERA', brake: 'LT RT BRAKE' };
    return (style === 'xbox' ? xb : ps)[name];
  };

  // The race HUD for the human craft.
  SN.drawHUD = (E, r, o) => {
    const { race, me, lapsTotal, message, msgT, glyphStyle, device, hint } = o;
    const W = r.W, H = r.H;
    r.overlay((g) => {
      // Shield (top left) and the speed (bottom left).
      E.font.text(g, 'SHIELD', 6, 6, '#9fd8ff', { scale: 1, shadow: '#000' });
      E.ui.bar(g, 6, 14, 84, 7, Math.max(0, me.energy) / me.energyMax, me.energy < 30 ? '#ff5a6a' : '#36c8ff');
      const kmh = Math.round(me.v * SN.KMH);
      E.font.text(g, String(kmh), 6, H - 36, '#ffffff', { scale: 3, shadow: '#000' });
      E.font.text(g, 'KM/H', 6, H - 16, '#9fd8ff', { scale: 1, shadow: '#000' });
      // Place and lap (top right), time under.
      E.font.text(g, ordinal(me.rank) + ' / ' + race.ships.length, W - 6, 6, '#ffffff', { scale: 2, align: 'right', shadow: '#000' });
      E.font.text(g, 'LAP ' + Math.min(lapsTotal, Math.max(1, me.lap + 1)) + ' / ' + lapsTotal, W - 6, 26, '#ffd36a', { scale: 1, align: 'right', shadow: '#000' });
      E.font.text(g, fmt(race.time), W - 6, 36, '#ffffff', { scale: 1, align: 'right', shadow: '#000' });
      // Weapon (bottom right).
      const wpn = me.weapon ? SN.WEAPONS[me.weapon] : null;
      E.font.text(g, 'WEAPON', W - 6, H - 30, '#9fd8ff', { scale: 1, align: 'right', shadow: '#000' });
      E.font.text(g, wpn ? wpn.name : 'NONE', W - 6, H - 20, wpn ? wpn.color : '#6a6488', { scale: 2, align: 'right', shadow: '#000' });
      // Prompt line (bottom centre) follows the last device used.
      const fire = device === 'gamepad' ? SN.padLabel('fire', glyphStyle) : 'SPACE FIRE';
      const thr = device === 'gamepad' ? SN.padLabel('thrust', glyphStyle) : 'W THRUST';
      const line = hint || (thr + '   ' + fire);
      E.font.text(g, line, W / 2, H - 12, '#e8e4ff', { scale: 1, align: 'center', shadow: '#000' });
      // Callouts.
      if (message && msgT > 0) {
        E.font.title(g, message, W / 2, H * 0.36, { scale: 3, colors: ['#ffffff', '#ffd36a'], align: 'center', depth: 2, depthColor: '#000' });
      }
    });
  };
})();
