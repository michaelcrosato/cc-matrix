import sys
def rep(path, old, new, count=1):
    s = open(path, encoding='utf8').read()
    n = s.count(old)
    if n != count: sys.exit(f'{path}: expected {count} of {old[:60]!r}, found {n}')
    open(path, 'w', encoding='utf8').write(s.replace(old, new))
E2 = 'engine/my-3d2dge.js'; E3 = 'engine/my-3d2dge-3d.js'
# E4 analog pad values
rep(E2, "      p.buttons.forEach((b, i) => { const on = b.pressed;", "      this.padValues = p.buttons.map(b => b.value ?? (b.pressed ? 1 : 0));\n      p.buttons.forEach((b, i) => { const on = b.pressed;")
rep(E2, "  /** wire every element with data-act=\"<action>\" inside root to the action */\n  bindButtons(root) {",
 "  /** CRACKMANIA (E4): how far an action is pressed, 0..1: a pad trigger's value, 1 for a held key or button */\n  analog(a) {\n    const m = this.map[a]; if (!m) return 0; let v = 0;\n    for (const c of m) { if (/^Pad\\d+$/.test(c) && this.padValues) v = Math.max(v, this.padValues[+c.slice(3)] || 0); if (this.down && this._codeDown && this._codeDown(c)) v = 1; }\n    return Math.max(v, this.down(a) && !(m.every(c => /^Pad\\d+$/.test(c))) ? (this._anyKeyDown(m) ? 1 : v) : v);\n  }\n  _anyKeyDown(m) { const H = this.held || this._held; if (!H) return true; for (const c of m) if (!/^Pad\\d+$/.test(c) && (H.has ? H.has(c) : H[c])) return true; return false; }\n  /** wire every element with data-act=\"<action>\" inside root to the action */\n  bindButtons(root) {")
rep(E2, "this.glyphs = 'auto';", "this.glyphs = 'playstation';")
rep(E2, "label: 'Button symbols', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['xbox', 'Xbox'], ['playstation', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Positions']]",
        "label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']]")
# E1 pen.frame
rep(E3, "  _p(x, y, z, out) {\n    const k = this.k, M = this.M;",
 "  /** CRACKMANIA (E1): set the frame from forward, right and up unit vectors (engine axes): any orientation, upside down in a loop */\n  frame(x, y, z, f, r, u, k = 1) { this.ox = x; this.oy = y; this.oz = z; this.k = k; this.ca = 1; this.sa = 0; this.M = [f[0], r[0], u[0], f[1], r[1], u[1], f[2], r[2], u[2]]; return this; }\n  _p(x, y, z, out) {\n    const k = this.k, M = this.M;")
# E2 camera up
rep(E3, "    cam.up.set(0, 1, 0); if (Math.abs(fy) > .999) cam.up.set(Math.cos(p.yaw), 0, Math.sin(p.yaw));   // (straight down: up on the screen is where it heads)\n    cam.lookAt(_v0.set(cam.position.x + fx, cam.position.y + fy, cam.position.z + fz));\n    if (p.roll) cam.rotateZ(p.roll);",
 "    if (p.up) cam.up.set(p.up[0], p.up[2], p.up[1]);   // CRACKMANIA (E2): a pose's own up (engine axes): a chase camera round a loop\n    else { cam.up.set(0, 1, 0); if (Math.abs(fy) > .999) cam.up.set(Math.cos(p.yaw), 0, Math.sin(p.yaw)); }   // (straight down: up on the screen is where it heads)\n    cam.lookAt(_v0.set(cam.position.x + fx, cam.position.y + fy, cam.position.z + fz));\n    if (p.roll && !p.up) cam.rotateZ(p.roll);")
# E3 ghost batches
rep(E3, "    blob: new Batch(sc, new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, opacity: .45, depthWrite: false }), { order: 1 })\n  };",
 "    blob: new Batch(sc, new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, opacity: .45, depthWrite: false }), { order: 1 }),\n    // CRACKMANIA (E3): translucent parts for ghost cars (pen.ghost = true routes box, ball, tube and cone here)\n    gbox: new Batch(sc, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonNodeMaterial({ color: '#ffffff', gradientMap: TOON_BANDS, transparent: true, opacity: .42, depthWrite: false }), { order: 3 }),\n    gball: new Batch(sc, new THREE.SphereGeometry(1, 9, 6), new THREE.MeshToonNodeMaterial({ color: '#ffffff', gradientMap: TOON_BANDS, transparent: true, opacity: .42, depthWrite: false }), { order: 3 }),\n    gtube: new Batch(sc, new THREE.CylinderGeometry(.85, 1, 1, 7, 1, true), new THREE.MeshToonNodeMaterial({ color: '#ffffff', gradientMap: TOON_BANDS, transparent: true, opacity: .42, depthWrite: false }), { order: 3 }),\n    gcone: new Batch(sc, new THREE.ConeGeometry(1, 1, 6), new THREE.MeshToonNodeMaterial({ color: '#ffffff', gradientMap: TOON_BANDS, transparent: true, opacity: .42, depthWrite: false }), { order: 3 })\n  };")
rep(E3, "  ball(x, y, z, rx, ry = rx, rz = rx, color = '#ffffff') { this._rot(this.B.ball, rx, ry, rz, 0, x, y, z, color); return this; }\n  box(x, y, z, w, d, h, color = '#ffffff', yaw = 0) { this._rot(this.B.box, w, d, h, yaw, x, y, z, color); return this; }\n  tube(x0, y0, z0, x1, y1, z1, r, color = '#ffffff') { this.B.tube.tube(",
 "  ball(x, y, z, rx, ry = rx, rz = rx, color = '#ffffff') { this._rot(this.ghost ? this.B.gball : this.B.ball, rx, ry, rz, 0, x, y, z, color); return this; }\n  box(x, y, z, w, d, h, color = '#ffffff', yaw = 0) { this._rot(this.ghost ? this.B.gbox : this.B.box, w, d, h, yaw, x, y, z, color); return this; }\n  tube(x0, y0, z0, x1, y1, z1, r, color = '#ffffff') { (this.ghost ? this.B.gtube : this.B.tube).tube(")
rep(E3, "  cone(x0, y0, z0, x1, y1, z1, r, color = '#ffffff') { this.B.cone.tube(", "  cone(x0, y0, z0, x1, y1, z1, r, color = '#ffffff') { (this.ghost ? this.B.gcone : this.B.cone).tube(")
rep(E3, "    this.B.box.box(a, b, l > 1e-6 ? [-hz / l, 0, hx / l] : [1, 0, 0], w * this.k / U", "    (this.ghost ? this.B.gbox : this.B.box).box(a, b, l > 1e-6 ? [-hz / l, 0, hx / l] : [1, 0, 0], w * this.k / U")
rep(E3, "    this.B.box.box(a, b, across, w * this.k / U", "    (this.ghost ? this.B.gbox : this.B.box).box(a, b, across, w * this.k / U")
# E6 toon bands
rep(E3, "World3D.U = U; World3D.toThree = toThree;", "World3D.U = U; World3D.TOON_BANDS = TOON_BANDS; World3D.lambert = (map) => lambert(map); World3D.toThree = toThree;")
print('ok')
