function keyName(e) {
  if (e.code === "ShiftRight") return "rshift";
  const k = (e.key || "").toLowerCase();
  if (k === " " || e.code === "Space") return "space";
  return k;
}
const PS = {
  jump: ["×", "cross"],
  roll: ["○", "circle"],
  whip: ["□", "square"],
  interact: ["△", "triangle"],
  shoot: ["R2", ""],
  sprint: ["L2", ""],
  pause: ["OPTIONS", ""],
  confirm: ["×", "cross"],
  back: ["○", "circle"],
};
const XB = {
  jump: "A",
  roll: "B",
  whip: "X",
  interact: "Y",
  shoot: "RT",
  sprint: "LT",
  pause: "MENU",
  confirm: "A",
  back: "B",
};
const KB = {
  jump: "SPACE",
  roll: "CTRL",
  whip: "LMB",
  interact: "E",
  shoot: "RMB",
  sprint: "SHIFT",
  pause: "ESC",
  confirm: "ENTER",
  back: "ESC",
};
function glyph(action) {
  if (controls?.lastDevice === "pad") {
    if (settings.glyphs === "Xbox")
      return '<span data-glyph="' + action + '" class="key">' + XB[action] + "</span>";
    const a = PS[action];
    return (
      '<span data-glyph="' + action + '" class="key ' + (a[1] ? "ps " + a[1] : "") + '">' + a[0] + "</span>"
    );
  }
  if (controls?.lastDevice === "touch") return '<span data-glyph="' + action + '" class="key">TAP</span>';
  return '<span data-glyph="' + action + '" class="key">' + KB[action] + "</span>";
}
class Controls {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseHeld = new Set();
    this.mousePressed = new Set();
    this.mouse = { x: innerWidth * 0.5, y: innerHeight * 0.5 };
    this.lastDevice = "keyboard";
    this.lastInput = performance.now();
    this.pads = [];
    this.prevPads = [];
    this.menuRepeat = 0;
    this.touchLeft = null;
    this.touchRight = null;
    this.touchVector = { x: 0, z: 0 };
    this.padSuppressed = false;
    this.suppressUntil = 0;
    this.init();
  }
  activity(device) {
    this.lastInput = performance.now();
    if (this.lastDevice !== device) {
      this.lastDevice = device;
      document.body.classList.toggle("touch", device === "touch");
      if (typeof refreshPrompts === "function") refreshPrompts();
    }
    if (game?.attract) {
      exitAttract();
      this.keys.clear();
      this.pressed.clear();
      this.mouseHeld.clear();
      this.mousePressed.clear();
      this.padSuppressed = true;
      this.suppressUntil = performance.now() + 350;
      return false;
    }
    return performance.now() >= this.suppressUntil;
  }
  init() {
    addEventListener("keydown", (e) => {
      const key = keyName(e);
      if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(key))
        e.preventDefault();
      if (!this.activity("keyboard")) return;
      audio.unlock();
      if (!this.keys.has(key)) this.pressed.add(key);
      this.keys.add(key);
      if (ui.screen) {
        if (!e.repeat) menuKey(key);
        return;
      }
      if (key === "escape") {
        e.preventDefault();
        togglePause();
      } else if (key === "j" && !AIHub.active) openMenu("journal", "pause");
    });
    addEventListener("keyup", (e) => this.keys.delete(keyName(e)));
    addEventListener("wheel", () => this.activity("keyboard"), { passive: true });
    addEventListener("blur", () => {
      this.clear();
      if (game?.status === "playing" && !game.attract && !AIHub.active) openMenu("pause");
    });
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") {
        this.moveTouch(e);
        return;
      }
      if (Math.abs(e.clientX - this.mouse.x) + Math.abs(e.clientY - this.mouse.y) > 2)
        this.activity("keyboard");
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!this.activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        audio.unlock();
        if (ui.screen || e.target.closest("button,input,select")) return;
        if (e.pointerType === "touch") {
          this.startTouch(e);
          return;
        }
        this.mouseHeld.add(e.button);
        this.mousePressed.add(e.button);
        if (e.button === 0 && game?.status === "playing") {
          const target = contextFor(getLocalPlayer());
          const point = screenToWorld(e.clientX, e.clientY);
          if (target && point && Math.hypot(point.x - target.x, point.z - target.z) < 2) {
            this.pressed.add("e");
            this.mousePressed.delete(0);
            this.mouseHeld.delete(0);
          }
        }
      },
      true,
    );
    addEventListener("pointerup", (e) => {
      this.mouseHeld.delete(e.button);
      if (this.touchLeft?.id === e.pointerId) {
        this.touchLeft = null;
        this.touchVector = { x: 0, z: 0 };
      }
      if (this.touchRight?.id === e.pointerId) {
        this.touchRight = null;
      }
    });
    addEventListener("pointercancel", (e) => {
      if (this.touchLeft?.id === e.pointerId) {
        this.touchLeft = null;
        this.touchVector = { x: 0, z: 0 };
      }
      if (this.touchRight?.id === e.pointerId) this.touchRight = null;
    });
    addEventListener("contextmenu", (e) => e.preventDefault());
    $("pause-button").addEventListener("click", () => togglePause());
    $("context-button").addEventListener("click", () => {
      if (this.lastDevice === "touch" && game?.phase === "balance") {
        this.pressed.add("e");
      } else this.pressed.add("e");
    });
    $("balance").addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") this.pressed.add("e");
    });
    addEventListener("gamepadconnected", () => {
      toast("Controller ready · " + settings.glyphs + " prompts");
      this.lastDevice = "pad";
      refreshPrompts();
    });
  }
  startTouch(e) {
    if (e.clientX < innerWidth * 0.52 && !this.touchLeft) {
      this.touchLeft = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.touchVector = { x: 0, z: 0 };
    } else {
      this.touchRight = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now() };
      this.pressed.add("q");
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }
  }
  moveTouch(e) {
    if (this.touchLeft?.id === e.pointerId) {
      this.touchVector = {
        x: clamp((e.clientX - this.touchLeft.x) / 52, -1, 1),
        z: clamp((e.clientY - this.touchLeft.y) / 52, -1, 1),
      };
    } else if (this.touchRight?.id === e.pointerId) {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.mouseHeld.clear();
    this.mousePressed.clear();
    this.touchLeft = null;
    this.touchRight = null;
    this.touchVector = { x: 0, z: 0 };
    for (const p of this.pads) {
      p.jump = false;
      p.roll = false;
      p.interact = false;
    }
  }
  poll(dt) {
    this.menuRepeat -= dt;
    let pads = [];
    try {
      pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
    } catch {}
    this.pads = [];
    let any = false;
    pads.forEach((pad, index) => {
      const prev = this.prevPads[pad.index] || [];
      const held = pad.buttons.map((b) => b.pressed || b.value > 0.5),
        pressed = held.map((v, i) => v && !prev[i]);
      const axis = (v) => (Math.abs(v || 0) < 0.18 ? 0 : (Math.sign(v) * (Math.abs(v) - 0.18)) / 0.82);
      const mx = axis(pad.axes[0]),
        mz = axis(pad.axes[1]),
        ax = axis(pad.axes[2]),
        az = axis(pad.axes[3]);
      const active = held.some(Boolean) || Math.abs(mx) + Math.abs(mz) + Math.abs(ax) + Math.abs(az) > 0.1;
      any = any || active;
      if (active && !this.padSuppressed) this.activity("pad");
      this.pads[index] = {
        mx,
        mz,
        ax,
        az,
        jump: pressed[0],
        roll: pressed[1],
        whip: held[2],
        interact: pressed[3],
        shoot: held[7],
        sprint: held[6],
        held,
        pressed,
      };
      this.prevPads[pad.index] = held;
      if (!this.padSuppressed && active) {
        audio.unlock();
        if (ui.screen) {
          if (this.menuRepeat <= 0) {
            if (held[12] || mz < -0.5) {
              menuNavigate(-1);
              this.menuRepeat = 0.2;
            } else if (held[13] || mz > 0.5) {
              menuNavigate(1);
              this.menuRepeat = 0.2;
            }
            if (held[14] || mx < -0.5) {
              menuAdjust(-1);
              this.menuRepeat = 0.16;
            } else if (held[15] || mx > 0.5) {
              menuAdjust(1);
              this.menuRepeat = 0.16;
            }
          }
          if (pressed[0]) menuActivate();
          if (pressed[1] || (pressed[9] && !held[8])) menuBack();
          if (Math.abs(az) > 0.2)
            ($("menu").querySelector(".credits-scroll") || $("menu").querySelector(".sheet"))?.scrollBy(
              0,
              az * dt * 550,
            );
        } else {
          if (pressed[9] && !(AIHub.active && held[8])) togglePause();
          if (!AIHub.active && game?.localCoop && index >= game.players.length && pressed[0])
            joinLocalPlayer();
        }
      }
    });
    if (!any) this.padSuppressed = false;
  }
  frame(slot = 0) {
    const hub = AIHub.active;
    const pad = this.pads[hub ? 0 : slot];
    let mx = 0,
      mz = 0;
    const primary = slot === 0 || hub;
    if (primary) {
      mx = (this.keys.has("d") ? 1 : 0) - (this.keys.has("a") ? 1 : 0);
      mz = (this.keys.has("s") ? 1 : 0) - (this.keys.has("w") ? 1 : 0);
      if ((game?.players.length || 0) < 2) {
        mx += (this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("arrowleft") ? 1 : 0);
        mz += (this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("arrowup") ? 1 : 0);
      }
    } else if (slot === 1) {
      mx = (this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("arrowleft") ? 1 : 0);
      mz = (this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("arrowup") ? 1 : 0);
    }
    const touch = primary && this.lastDevice === "touch";
    if (touch) {
      mx = this.touchVector.x;
      mz = this.touchVector.z;
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    if (pad && !this.padSuppressed && Math.abs(pad.mx) + Math.abs(pad.mz) > 0.08) {
      mx = pad.mx;
      mz = pad.mz;
    }
    let ax = pad?.ax || 0,
      az = pad?.az || 0,
      mouseAim = false;
    if (primary && (this.lastDevice === "keyboard" || !!this.touchRight) && camera) {
      const p = getLocalPlayer(),
        world = screenToWorld(this.mouse.x, this.mouse.y);
      if (p && world) {
        ax = world.x - p.x;
        az = world.z - p.z;
        mouseAim = Math.hypot(ax, az) > 0.4;
        const l = Math.hypot(ax, az);
        if (l > 0) {
          ax /= l;
          az /= l;
        }
      }
    }
    const pk = (k) => this.pressed.has(k),
      hk = (k) => this.keys.has(k),
      secondary = slot === 1 && !hub;
    return {
      mx,
      mz,
      ax,
      az,
      mouseAim,
      whip: !!(
        pad?.whip ||
        (primary &&
          (this.mouseHeld.has(0) || hk("q") || (this.lastDevice === "touch" && !!this.touchRight))) ||
        (secondary && hk("/"))
      ),
      shoot: !!(
        pad?.shoot ||
        (primary &&
          (this.mouseHeld.has(2) ||
            hk("f") ||
            (this.lastDevice === "touch" &&
              this.touchRight &&
              performance.now() - this.touchRight.time > 450))) ||
        (secondary && hk("."))
      ),
      jump: !!(pad?.jump || (primary && pk("space")) || (secondary && pk("enter"))),
      roll: !!(pad?.roll || (primary && (pk("control") || pk("c"))) || (secondary && pk("rshift"))),
      interact: !!(pad?.interact || (primary && pk("e")) || (secondary && pk("'"))),
      sprint: !!(
        pad?.sprint ||
        (primary && (hk("shift") || (((game?.players.length || 0) < 2 || hub) && hk("rshift")))) ||
        (secondary && hk("0")) ||
        (touch && game?.phase === "escape")
      ),
      touch,
    };
  }
  consume() {
    this.pressed.clear();
    this.mousePressed.clear();
    for (const p of this.pads) {
      p.jump = false;
      p.roll = false;
      p.interact = false;
    }
  }
}
let controls;
