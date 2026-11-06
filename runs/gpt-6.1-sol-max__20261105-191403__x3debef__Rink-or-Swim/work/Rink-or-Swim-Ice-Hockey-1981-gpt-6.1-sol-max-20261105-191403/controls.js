export class Controls {
  constructor({ onMenu, onActivity, isMenu, isLocal, onPause, onAudio }) {
    this.onMenu = onMenu;
    this.onActivity = onActivity;
    this.isMenu = isMenu;
    this.isLocal = isLocal;
    this.onPause = onPause;
    this.onAudio = onAudio;
    this.keys = new Set();
    this.type = "keyboard";
    this.mouse = {
      x: innerWidth * 0.7,
      y: innerHeight * 0.5,
      active: false,
      held: false,
      released: false,
    };
    this.padPrevious = new Map();
    this.padInputs = [];
    this.padNav = 0;
    this.keyShot = false;
    this.keyShot2 = false;
    this.keyReleased = false;
    this.keyReleased2 = false;
    this.once = { pass: false, check: false, switch: false, pass2: false, check2: false };
    this.touches = new Map();
    this.touchMove = { x: 0, z: 0 };
    this.touchAim = { x: 0, z: 0, manual: false };
    this.touchShot = false;
    this.touchPass = false;
    this.touchCheck = false;
    window.addEventListener("keydown", (e) => this.down(e));
    window.addEventListener("keyup", (e) => this.up(e));
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) {
        this.activity("keyboard");
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.active = true;
      }
    });
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      const wasMenu = this.isMenu();
      const consumed = this.activity("keyboard");
      this.onAudio();
      if (!wasMenu && !consumed && e.target.tagName === "CANVAS") {
        if (e.button === 0) this.mouse.held = true;
        if (e.button === 2) this.once.pass = true;
      }
    });
    window.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch" && e.button === 0 && this.mouse.held) {
        this.mouse.held = false;
        this.mouse.released = true;
      }
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("touchstart", (e) => this.touchStart(e), { passive: false });
    window.addEventListener("touchmove", (e) => this.touchMoveEvent(e), { passive: false });
    window.addEventListener("touchend", (e) => this.touchEnd(e), { passive: false });
    window.addEventListener("touchcancel", () => this.clear(), { passive: true });
  }
  activity(type) {
    this.type = type;
    return this.onActivity(type);
  }
  down(e) {
    const k = e.key.toLowerCase(),
      typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (typing) {
      if (k === "escape") e.target.blur();
      return;
    }
    const menu = this.isMenu();
    const consumed = this.activity("keyboard");
    this.onAudio();
    if (consumed) {
      e.preventDefault();
      return;
    }
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(k))
      e.preventDefault();
    if (k === "escape" || k === "p") {
      if (!e.repeat) this.onPause();
      return;
    }
    if (menu) {
      if (e.repeat && performance.now() - this.padNav < 140) return;
      this.padNav = performance.now();
      const actions = {
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
        enter: "confirm",
        " ": "confirm",
        backspace: "back",
      };
      if (actions[k]) this.onMenu(actions[k]);
      return;
    }
    this.keys.add(k);
    if (k === " ") {
      this.keyShot = true;
    }
    if (k === "enter" || k === "0") {
      this.keyShot2 = true;
    }
    if (!e.repeat) {
      if (k === "e") this.once.pass = true;
      if (k === "q") this.once.check = true;
      if (k === "tab" || k === "r") this.once.switch = true;
      if (k === "/") this.once.pass2 = true;
      if (k === ".") this.once.check2 = true;
    }
  }
  up(e) {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    if (k === " " && this.keyShot) {
      this.keyReleased = true;
      this.keyShot = false;
    }
    if ((k === "enter" || k === "0") && this.keyShot2) {
      this.keyReleased2 = true;
      this.keyShot2 = false;
    }
  }
  clear() {
    this.keys.clear();
    this.padInputs = [];
    this.keyShot = false;
    this.keyShot2 = false;
    this.keyReleased = false;
    this.keyReleased2 = false;
    this.mouse.held = false;
    this.mouse.released = false;
    this.touches.clear();
    this.touchMove = { x: 0, z: 0 };
    this.touchAim.manual = false;
    document.getElementById("stickViz").hidden = true;
    for (const k in this.once) this.once[k] = false;
  }
  poll(_dt) {
    const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
    const pending = this.padInputs;
    this.padInputs = [];
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i],
        previous = this.padPrevious.get(pad.index) || [],
        btn = (n) => !!pad.buttons[n]?.pressed,
        rise = (n) => btn(n) && !previous[n],
        released = (n) => !btn(n) && !!previous[n],
        axis = (n) => (Math.abs(pad.axes[n] || 0) > 0.17 ? pad.axes[n] : 0);
      const x = axis(0),
        z = axis(1),
        ax = axis(2),
        az = axis(3);
      const active =
        Math.abs(x) + Math.abs(z) + Math.abs(ax) + Math.abs(az) > 0.1 ||
        pad.buttons.some((b, j) => b.pressed && !previous[j]);
      let consumed = false;
      if (active) {
        consumed = this.activity("gamepad");
        this.onAudio();
      }
      const menu = this.isMenu();
      if (!consumed) {
        if (rise(9) && !btn(8)) this.onPause();
        if (menu) {
          const now = performance.now();
          let nav = "";
          if (rise(0)) nav = "confirm";
          else if (rise(1)) nav = "back";
          else if (now - this.padNav > 180) {
            if (btn(12) || z < -0.6) nav = "up";
            else if (btn(13) || z > 0.6) nav = "down";
            else if (btn(14) || x < -0.6) nav = "left";
            else if (btn(15) || x > 0.6) nav = "right";
          }
          if (nav) {
            this.onMenu(nav);
            this.padNav = now;
          }
        } else
          this.padInputs[i] = {
            x: x || (btn(15) ? 1 : btn(14) ? -1 : 0),
            z: z || (btn(13) ? 1 : btn(12) ? -1 : 0),
            ax,
            az,
            manual: Math.abs(ax) + Math.abs(az) > 0.1,
            charging: btn(0) || btn(7),
            shoot: released(0) || released(7) || !!pending[i]?.shoot,
            pass: rise(2) || rise(5) || !!pending[i]?.pass,
            check: rise(1) || !!pending[i]?.check,
            switch: rise(3) || rise(4) || !!pending[i]?.switch,
          };
      }
      this.padPrevious.set(
        pad.index,
        pad.buttons.map((b) => b.pressed),
      );
    }
  }
  sample(player = 0, arena = null, skater = null) {
    const local = this.isLocal();
    if (this.padInputs[player] && this.type === "gamepad") return { ...this.padInputs[player] };
    if (player === 1) {
      return {
        x: (this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("arrowleft") ? 1 : 0),
        z: (this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("arrowup") ? 1 : 0),
        shoot: this.keyReleased2,
        charging: this.keyShot2,
        pass: this.once.pass2,
        check: this.once.check2,
      };
    }
    const k = this.keys;
    let x = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0),
      z = (k.has("s") ? 1 : 0) - (k.has("w") ? 1 : 0);
    if (!local) {
      x += (k.has("arrowright") ? 1 : 0) - (k.has("arrowleft") ? 1 : 0);
      z += (k.has("arrowdown") ? 1 : 0) - (k.has("arrowup") ? 1 : 0);
    }
    let ax = 0,
      az = 0,
      manual = false;
    if (this.mouse.active && arena && skater) {
      const p = arena.worldPoint(this.mouse.x, this.mouse.y);
      if (p) {
        ax = p.x - skater.x;
        az = p.z - skater.z;
        manual = true;
      }
    }
    if (this.type === "touch") {
      x = this.touchMove.x;
      z = this.touchMove.z;
      ax = this.touchAim.x;
      az = this.touchAim.z;
      manual = this.touchAim.manual;
    }
    return {
      x,
      z,
      ax,
      az,
      manual,
      charging: this.keyShot || this.mouse.held,
      shoot: this.keyReleased || this.mouse.released || this.touchShot,
      pass: this.once.pass || this.touchPass,
      check: this.once.check || this.touchCheck,
      switch: this.once.switch,
    };
  }
  consume() {
    this.keyReleased = false;
    this.keyReleased2 = false;
    this.mouse.released = false;
    this.touchShot = false;
    this.touchPass = false;
    this.touchCheck = false;
    for (const k in this.once) this.once[k] = false;
    for (const input of this.padInputs)
      if (input) {
        input.shoot = false;
        input.pass = false;
        input.check = false;
        input.switch = false;
      }
  }
  touchStart(e) {
    const wasMenu = this.isMenu(),
      consumed = this.activity("touch");
    this.onAudio();
    if (wasMenu || consumed) return;
    if (e.target.tagName === "BUTTON") {
      const id = e.target.id;
      if (!["touchShoot", "touchPass", "touchCheck"].includes(id)) return;
      if (id === "touchShoot") this.touchShot = true;
      if (id === "touchPass") this.touchPass = true;
      if (id === "touchCheck") this.touchCheck = true;
      e.preventDefault();
      return;
    }
    e.preventDefault();
    for (const t of e.changedTouches) {
      const side = t.clientX < innerWidth * 0.55 ? "move" : "aim";
      this.touches.set(t.identifier, {
        x: t.clientX,
        y: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
        side,
        time: performance.now(),
      });
      if (side === "move") {
        const v = document.getElementById("stickViz");
        v.hidden = false;
        v.style.left = `${t.clientX - 42}px`;
        v.style.top = `${t.clientY - 42}px`;
      }
    }
  }
  touchMoveEvent(e) {
    if (this.isMenu()) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const start = this.touches.get(t.identifier);
      if (!start) continue;
      start.lastX = t.clientX;
      start.lastY = t.clientY;
      const x = (t.clientX - start.x) / 55,
        z = (t.clientY - start.y) / 55,
        d = Math.max(1, Math.hypot(x, z));
      if (start.side === "move") this.touchMove = { x: x / d, z: z / d };
      else this.touchAim = { x: x / d, z: z / d, manual: true };
    }
  }
  touchEnd(e) {
    if (this.isMenu()) return;
    for (const t of e.changedTouches) {
      const start = this.touches.get(t.identifier);
      if (!start) continue;
      if (start.side === "move") {
        this.touchMove = { x: 0, z: 0 };
        document.getElementById("stickViz").hidden = true;
      } else {
        this.touchShot = true;
        this.touchAim.manual = false;
      }
      this.touches.delete(t.identifier);
    }
  }
}
