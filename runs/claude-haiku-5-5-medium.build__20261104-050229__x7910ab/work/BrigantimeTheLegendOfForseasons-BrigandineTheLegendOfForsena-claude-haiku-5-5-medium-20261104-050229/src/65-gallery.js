// The gallery (dev mode, §10.3): every monster species in its three forms, drawn with its own rig, to look at and to check.
// Left and right move through the species; up and down move through the forms; Escape goes back to dev mode.
(() => {
  const H = G;
  H.galleryScene = {
    enter() { this.i = 0; this.form = 0; this.t = 0; this.rig = null; this.load(); this.game.audio.music(H.SONGS.title); },
    load() {
      const id = H.ids('species')[this.i];
      this.id = id;
      this.rig = H.rigFor({ kind: 'monster', ref: id, form: this.form, species: id });
    },
    update(dt) {
      const I = this.game.input;
      this.t += dt;
      this.game.focus(0, 0, 0);   // the overhead view's origin is the middle of the screen
      if (I.pressed('right') || I.pressed('left')) { const n = H.ids('species').length; this.i = (this.i + (I.pressed('right') ? 1 : n - 1)) % n; this.form = 0; this.load(); }
      if (I.pressed('down') || I.pressed('up')) { this.form = (this.form + (I.pressed('down') ? 1 : 2)) % 3; this.load(); }
      if (I.pressed('cancel')) this.game.go('dev');
      this.rig.rig.update(dt, { x: 0, y: 0, z: 0, vx: 8, vy: 0, facing: 0, walk: 1, flap: 1, stance: 'ready' });
    },
    draw(r) {
      const sp = H.get('species', this.id), f = sp.forms[this.form];
      r.sky(['#101838', '#2a2050']);
      r.actor(0, 0, 0, (g, ox, oy) => this.rig.rig.draw(g, ox, oy, r.view));
      r.overlay(g => {
        E.font.title(g, sp.name.toUpperCase(), r.W / 2, 8, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
        E.font.text(g, f.name + '  •  form ' + (this.form + 1) + ' of 3', r.W / 2, 34, '#e8e0ff', { align: 'center', shadow: '#000' });
        E.font.text(g, H.get('element', sp.element).name + '  •  HP ' + f.hp + '  ATK ' + f.atk + '  DEF ' + f.def + '  MOV ' + f.mov + '  RNG ' + f.rng + '  size ' + f.size, r.W / 2, r.H - 42, '#cfc6ec', { align: 'center', shadow: '#000' });
        E.font.text(g, 'Skill: ' + (f.skill ? H.get('skill', f.skill).name : 'none'), r.W / 2, r.H - 30, '#ffe9a8', { align: 'center', shadow: '#000' });
      });
      H.promptRow(r, this.game, [['left', 'Species'], ['up', 'Form'], ['cancel', 'Back']], 6, r.H - 12);
    }
  };
})();
