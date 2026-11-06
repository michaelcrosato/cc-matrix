const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dead = (x) => (Math.abs(x) < 0.18 ? 0 : (Math.sign(x) * (Math.abs(x) - 0.18)) / 0.82);
export class Input {
  constructor(app) {
    this.app = app;
    this.keys = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false, active: false };
    this.last = "keyboard";
    this.touch = new Map();
    this.padPrev = new Map();
    this.pulses = { rocket: false, flare: false };
    this.lastActivity = performance.now();
    this.menuRepeat = 0;
    this.padCount = 0;
    if (matchMedia("(pointer:coarse)").matches) {
      this.last = "touch";
      document.body.dataset.input = "touch";
    }
    window.addEventListener("keydown", (e) => this.key(e, true));
    window.addEventListener("keyup", (e) => this.key(e, false));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.mouse.down = false;
      this.touch.clear();
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") {
        const t = this.touch.get(e.pointerId);
        if (t) {
          t.x = e.clientX;
          t.y = e.clientY;
          this.activity("touch");
        }
        return;
      }
      if (Math.hypot(e.clientX - this.mouse.x, e.clientY - this.mouse.y) > 2)
        this.activity("keyboard");
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.app.screen === "play") this.mouse.active = true;
    });
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (this.activity(e.pointerType === "touch" ? "touch" : "keyboard")) {
          e.preventDefault();
          return;
        }
        this.app.audio.unlock();
        const control = e.target.closest("button,input,select,a");
        if (e.pointerType === "touch") {
          if (!control && this.app.screen === "play") {
            e.preventDefault();
            this.touch.set(e.pointerId, {
              sx: e.clientX,
              sy: e.clientY,
              x: e.clientX,
              y: e.clientY,
              side: e.clientX < innerWidth * 0.55 ? "left" : "right",
            });
          }
        } else if (!control && this.app.screen === "play") {
          this.mouse.active = true;
          this.mouse.down = e.button === 0;
          if (e.button === 2) this.pulses.rocket = true;
        }
      },
      { passive: false },
    );
    window.addEventListener("pointerup", (e) => {
      if (e.pointerType === "touch") this.touch.delete(e.pointerId);
      else this.mouse.down = false;
    });
    window.addEventListener("pointercancel", (e) => {
      this.touch.delete(e.pointerId);
      this.mouse.down = false;
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !window.AIHub.active && this.app.screen === "play")
        this.app.action("pause");
    });
  }
  activity(kind) {
    if (this.app.hubEnded) return true;
    this.lastActivity = performance.now();
    if (kind !== this.last) {
      this.last = kind;
      document.body.dataset.input = kind;
      this.app.ui?.prompts();
    }
    if (this.app.screen === "attract") {
      this.app.exitAttract();
      return true;
    }
    return false;
  }
  key(e, down) {
    const code =
      e.code ||
      {
        a: "KeyA",
        d: "KeyD",
        w: "KeyW",
        s: "KeyS",
        Enter: "Enter",
        Escape: "Escape",
        " ": "Space",
        ArrowLeft: "ArrowLeft",
        ArrowRight: "ArrowRight",
        ArrowUp: "ArrowUp",
        ArrowDown: "ArrowDown",
      }[e.key] ||
      e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(code))
      e.preventDefault();
    if (!down) {
      this.keys.delete(code);
      return;
    }
    if (this.activity("keyboard")) {
      this.keys.clear();
      return;
    }
    this.app.audio.unlock();
    this.keys.add(code);
    if (e.repeat) return;
    const screen = this.app.screen;
    if (screen === "play") {
      if (code === "KeyE") this.pulses.rocket = true;
      if (code === "KeyQ") this.pulses.flare = true;
      if (code === "Space") this.pulses.fire = true;
    }
    if (code === "KeyM") {
      this.app.audio.muted = !this.app.audio.muted;
      this.app.audio.apply();
      this.app.ui.toast(this.app.audio.muted ? "SOUND OFF" : "SOUND ON");
      return;
    }
    if (code === "Escape" || code === "KeyP") {
      this.app.action(screen === "play" ? "pause" : "back");
      return;
    }
    if (screen === "play") return;
    if (code === "ArrowDown" || code === "KeyS") {
      this.app.ui.moveFocus(1);
      return;
    }
    if (code === "ArrowUp" || code === "KeyW") {
      this.app.ui.moveFocus(-1);
      return;
    }
    if (code === "ArrowLeft" || code === "KeyA") {
      this.app.ui.adjust(-1);
      return;
    }
    if (code === "ArrowRight" || code === "KeyD") {
      this.app.ui.adjust(1);
      return;
    }
    if (code === "Enter" || code === "Space") this.app.ui.activate();
  }
  poll(game, dt) {
    const pads = Array.from(navigator.getGamepads?.() || []).filter((p) => p?.connected);
    this.padCount = pads.length;
    let menuNav = 0,
      menuAdjust = 0;
    for (let n = 0; n < pads.length; n++) {
      const p = pads[n],
        prev = this.padPrev.get(p.index) || [],
        buttons = p.buttons.map((b) => b.pressed || b.value > 0.5),
        edge = (i) => buttons[i] && !prev[i];
      const moving = p.axes.some((a) => Math.abs(a) > 0.22),
        pressed = buttons.some((b, i) => b && !prev[i]);
      if (moving || pressed) {
        if (this.activity("gamepad")) {
          this.padPrev.set(p.index, buttons);
          continue;
        }
        if (pressed) this.app.audio.unlock();
        this.mouse.active = false;
      }
      if (edge(9) && !buttons[8]) this.app.action(this.app.screen === "play" ? "pause" : "back");
      else if (this.app.screen !== "play" && this.app.screen !== "attract") {
        if (edge(0)) this.app.ui.activate();
        if (edge(1)) this.app.action("back");
        if (edge(12) || dead(p.axes[1] || 0) < -0.55) menuNav = -1;
        if (edge(13) || dead(p.axes[1] || 0) > 0.55) menuNav = 1;
        if (this.app.ui.focused()?.tagName === "INPUT" && Math.abs(dead(p.axes[0] || 0)) > 0.55)
          menuAdjust = Math.sign(p.axes[0]);
        if ((edge(14) || edge(15)) && this.app.ui.focused()?.tagName === "INPUT")
          this.app.ui.adjust(edge(14) ? -1 : 1);
        else if (edge(14)) this.app.ui.moveFocus(-1);
        else if (edge(15)) this.app.ui.moveFocus(1);
      }
      this.padPrev.set(p.index, buttons);
    }
    this.menuRepeat -= dt;
    if (menuNav && this.menuRepeat <= 0) {
      this.app.ui.moveFocus(menuNav);
      this.menuRepeat = 0.22;
    } else if (menuAdjust && this.menuRepeat <= 0) {
      this.app.ui.adjust(menuAdjust);
      this.menuRepeat = 0.12;
    }
    const press = (c) => (this.keys.has(c) ? 1 : 0);
    const inputs = game.players.map((player, id) => {
      const p = pads[id],
        b = (i) => !!p && (p.buttons[i]?.pressed || p.buttons[i]?.value > 0.45);
      let x = id
        ? press("KeyL") - press("KeyJ")
        : press("KeyD") + press("ArrowRight") - press("KeyA") - press("ArrowLeft");
      let y = id
        ? press("KeyI") - press("KeyK")
        : press("KeyW") + press("ArrowUp") - press("KeyS") - press("ArrowDown");
      if (p) {
        x += dead(p.axes[0] || 0);
        y -= dead(p.axes[1] || 0);
      }
      const i = {
        x: clamp(x, -1, 1),
        y: clamp(y, -1, 1),
        fire: id ? !!press("KeyO") : !!press("Space") || this.mouse.down || this.pulses.fire,
        rocket: id ? !!press("KeyU") : !!press("KeyE") || this.pulses.rocket,
        flare: id ? !!press("KeyH") : !!press("KeyQ") || this.pulses.flare,
        boost: id ? !!press("KeyN") : !!press("ShiftLeft") || !!press("ShiftRight"),
      };
      i.fire = i.fire || b(7) || b(0);
      i.rocket = i.rocket || b(2) || b(5);
      i.flare = i.flare || b(1) || b(4);
      i.boost = i.boost || b(10);
      if (p && Math.hypot(p.axes[2] || 0, p.axes[3] || 0) > 0.23) {
        i.aimX = p.axes[2];
        i.aimY = -p.axes[3];
        i.precise = true;
      } else if (id === 0 && this.mouse.active && this.last === "keyboard") {
        const world = this.app.gfx.toWorld(this.mouse.x, this.mouse.y);
        i.aimX = world.x - player.x;
        i.aimY = world.y - player.y;
        i.precise = true;
      }
      if (id === 0 && this.last === "touch") {
        for (const t of this.touch.values())
          if (t.side === "left") {
            i.x = clamp((t.x - t.sx) / 65, -1, 1);
            i.y = clamp((t.sy - t.y) / 65, -1, 1);
          }
        const target = game.nearestEnemy(player.x, player.y);
        if (target) {
          i.aimX = target.x - player.x;
          i.aimY = target.y - player.y;
          i.fire = true;
        }
        i.precise = false;
        i.flare =
          i.flare ||
          game.bullets.some(
            (b) =>
              b.team === "hostile" && b.rocket && Math.hypot(b.x - player.x, b.y - player.y) < 12,
          );
      }
      return i;
    });
    return inputs;
  }
}
