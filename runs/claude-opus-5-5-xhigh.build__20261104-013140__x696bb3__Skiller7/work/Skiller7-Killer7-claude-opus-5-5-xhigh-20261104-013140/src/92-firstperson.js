/* FIRST PERSON (§9): the Seven's weapons on the overlay pen (the eye's frame: x ahead, y right, z up, engine units),
 * with gloved hands and sleeves in the persona's colours. Bob, sway as the view turns, a kick per shot, a muzzle glow,
 * and a reload each: the .38's cylinder swings out and spins, the poles dip, the bolt cycles, the pump racks, the
 * alphorn steams, the slide, the drum turns. The picture only: it reads the sim and changes nothing. */
const VMS = { kick: 0, lastYaw: null, lastPitch: 0, sx: 0, sy: 0, shotT: 9, alt: 0, t: 0, flash: 0 };
S7.bus.on('shot', d => { VMS.kick = Math.min(1.5, VMS.kick + 1); VMS.shotT = 0; VMS.alt = d.alt || 0; VMS.flash = .06; if (S7.pres) S7.pres.muzzleT = .06; });
S7.drawViewModel = (pen, sim, pres) => {
  const a = sim.aim, dt = 1 / 60; VMS.t += dt; VMS.shotT += dt; VMS.flash = Math.max(0, VMS.flash - dt);
  if (a.scope) return;   // down Ignaz's scope there is only the ring
  const id = sim.st.persona, P = S7.PERSONAS[id], C = P.rig.colors, m = sim.mag(id), W = S7.WEAPONS[P.weapon];
  // sway lags the turn; kick springs back
  if (VMS.lastYaw !== null) { VMS.sx += clamp(S7.angDiff(VMS.lastYaw, a.yaw) * 60 * .25, -1.4, 1.4); VMS.sy += clamp((a.pitch - VMS.lastPitch) * 60 * .25, -1.2, 1.2); }
  VMS.lastYaw = a.yaw; VMS.lastPitch = a.pitch;
  VMS.sx *= .86; VMS.sy *= .86; VMS.kick *= .8;
  const br = Math.sin(VMS.t * 1.6) * .25, moving = sim.W.v > 5 ? Math.sin(VMS.t * 9) * .5 : 0;
  const ox = 8 - VMS.kick * 1.6, oy = 4.4 + VMS.sx * .6 + moving * .3, oz = -6 + VMS.sy * .5 + br - Math.abs(moving) * .3 + VMS.kick * .4;
  const rel = m.reload > 0 ? 1 - m.reload / Math.max(.1, W.perShell ? 1 : W.reload) : -1;   // 0..1 through a reload
  const glove = C.glove || '#2a2420', sleeve = C.coat || C.cloth || '#444';
  const hand = (x, y, z) => pen.ball(x, y, z, 1.3, 1.2, 1.1, glove);
  const sleeveTo = (x, y, z) => pen.tube(x - 9, y + 2, z - 6, x - 1, y, z, 1.6, sleeve);
  pen.at(0, 0, 0, 0, 1, VMS.kick * .06 + (rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI) * .35 : 0), 0);
  const flash = (x, y, z, r) => { if (VMS.flash > 0) pen.glow(x, y, z, r, '#fff0b0').glow(x, y, z, r * .55, '#ffffff'); };
  switch (P.weapon) {
    case 'patrol38': {
      const swing = rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI) : 0, spin = rel * 18;
      pen.box(ox - 1, oy, oz - 1.6, 2, 1.4, 3.4, '#3a2a1a').box(ox + 1.6, oy, oz + .6, 3, 1.6, 1.6, '#4a4a52');
      pen.at(ox + 1.6, oy + swing * 1.8, oz + .6, spin).box(0, 0, 0, 2.2, 2, 2, '#5a5a62').at(0, 0, 0, 0, 1, VMS.kick * .06, 0);
      pen.tube(ox + 2.8, oy, oz + 1, ox + 7.5, oy, oz + 1, .55, '#5a5a62');
      hand(ox - .6, oy, oz - 1.6); sleeveTo(ox - .6, oy, oz - 1.6); flash(ox + 8.4, oy, oz + 1, 1.6);
      if (swing > .2) { hand(ox + 1.4, oy - 2.4, oz - .4); sleeveTo(ox + 1.4, oy - 2.4, oz - .4); }
      break;
    }
    case 'poleguns': {
      for (const sd of [-1, 1]) {
        const dip = rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI) * 3 : 0, y = sd * 3.6, z = oz - 1 - dip;
        hand(ox - 1, y, z); sleeveTo(ox - 1, y, z);
        pen.tube(ox - 1, y, z, ox + 13, y * .7, z + 2, .35, C.metal || '#c8ccd4').ball(ox + 9, y * .78, z + 1.4, 1.4, 1.4, .3, '#1a1a1e');
        if (VMS.alt === (sd > 0 ? 1 : 0)) flash(ox + 13.6, y * .7, z + 2, 1.1);
      }
      break;
    }
    case 'gamsbock': {
      const bolt = rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI * 2) : VMS.shotT < .6 ? Math.sin(VMS.shotT / .6 * Math.PI) : 0;
      pen.box(ox - 3, oy, oz - 1.4, 7, 2, 2.6, C.wood || '#6a3a1a').tube(ox + .5, oy, oz, ox + 16, oy, oz + .3, .5, '#2a2626');
      pen.tube(ox + 1, oy, oz + 2, ox + 7, oy, oz + 2, .9, '#1a1a1e').ball(ox + .8, oy, oz + 2, 1, 1, 1, '#4a6a8a');
      pen.box(ox + 1 - bolt * 1.2, oy + 1.2, oz + .8, 1, 1.4, .6, '#8a8a92');
      hand(ox - 1.6, oy, oz - 1.6); sleeveTo(ox - 1.6, oy, oz - 1.6); hand(ox + 5, oy - 1.4, oz - .6); sleeveTo(ox + 5, oy - 1.4, oz - .6);
      flash(ox + 16.8, oy, oz + .3, 2);
      break;
    }
    case 'bullion': {
      const pump = VMS.shotT < .5 ? Math.sin(VMS.shotT / .5 * Math.PI) : rel >= 0 ? Math.sin(rel * Math.PI) : 0;
      pen.box(ox - 2.6, oy, oz - 1.2, 5, 2, 2.4, C.wood || '#5a3a1a').tube(ox + .5, oy, oz + .3, ox + 12, oy, oz + .3, .8, '#d8b040').tube(ox + .5, oy, oz - .7, ox + 10, oy, oz - .7, .6, '#c8a030');
      pen.box(ox + 5 - pump * 2, oy, oz - .7, 4, 2.2, 1.8, '#8a5a2a');
      hand(ox - 1.4, oy, oz - 1.4); sleeveTo(ox - 1.4, oy, oz - 1.4); hand(ox + 5 - pump * 2, oy - 1, oz - 1.4); sleeveTo(ox + 5 - pump * 2, oy - 1, oz - 1.4);
      flash(ox + 12.8, oy, oz + .3, 2.6);
      break;
    }
    case 'alphorn': {
      const heat = 1 - m.n / W.mag;
      pen.tube(ox - 2, oy - 1, oz, ox + 30, oy - 6, oz - 6, 1.1, '#8a5a2a').cone(ox + 30, oy - 6, oz - 6, ox + 36, oy - 7, oz - 7, 4.4, '#9a6a3a');
      pen.ball(ox - 2.4, oy - 1, oz + .2, 1, 1, 1, '#2a1a0a');
      hand(ox, oy - 1.2, oz - 1); sleeveTo(ox, oy - 1.2, oz - 1); hand(ox + 7, oy - 2.4, oz - 2.2); sleeveTo(ox + 7, oy - 2.4, oz - 2.2);
      if (heat > .4) pen.glow(ox + 33, oy - 6.6, oz - 4 + Math.sin(VMS.t * 6) * .6, 1 + heat * 1.6, '#e8e8f0');
      if (VMS.flash > 0) pen.glow(ox + 37, oy - 7, oz - 7, 4, '#c8f0ff');
      break;
    }
    case 'lady25': {
      const slide = VMS.shotT < .12 ? 1 - VMS.shotT / .12 : rel >= 0 ? Math.sin(rel * Math.PI) : 0;
      pen.box(ox - .6, oy, oz - 1.4, 1.6, 1.2, 2.6, '#2a2a2e').box(ox + 1.4 - slide * .8, oy, oz + .3, 3.4, 1.3, 1.2, '#3a3a40');
      hand(ox - .4, oy, oz - 1.6); sleeveTo(ox - .4, oy, oz - 1.6); hand(ox + .2, oy - 1, oz - 1.8);
      flash(ox + 3.6, oy, oz + .3, 1.1);
      break;
    }
    case 'avalauncher': {
      const drum = (rel >= 0 ? rel * 4 : 0) + (4 - m.n) * .5;
      pen.tube(ox - 3, oy, oz, ox + 13, oy, oz + .4, 1.9, '#5a6068').tube(ox + 12, oy, oz + .4, ox + 13.6, oy, oz + .4, 2.1, '#1a1a1e');
      pen.at(ox + 2, oy, oz - 1.6, drum).box(0, 0, 0, 3, 3, 3, '#3a4048').at(0, 0, 0, 0, 1, VMS.kick * .06, 0);
      pen.tube(ox + 4, oy + 1.4, oz - 3.4, ox + 9, oy + 1.4, oz - 3.4, 1, '#d8c020');
      hand(ox - 1, oy + .4, oz - 2); sleeveTo(ox - 1, oy + .4, oz - 2); hand(ox + 6, oy - 1.6, oz - 1.4); sleeveTo(ox + 6, oy - 1.6, oz - 1.4);
      if (VMS.flash > 0) pen.glow(ox + 14, oy, oz + .4, 2.8, '#ffb060');
      if (rel >= 0 && rel < 1) pen.glow(ox + 8, oy + 1.4, oz - 3, .8 + Math.sin(VMS.t * 30) * .3, '#ffffff');
      break;
    }
  }
  // Mireille lifts the camera for her Flash
  if (id === 'mireille' && sim.flash && sim.flash.t > 0) pen.at(0, 0, 0).box(6, -3, 1, 3, 4, 3, '#1a1a1e').glow(7.6, -3, 1.4, 3, '#ffffff');
};
