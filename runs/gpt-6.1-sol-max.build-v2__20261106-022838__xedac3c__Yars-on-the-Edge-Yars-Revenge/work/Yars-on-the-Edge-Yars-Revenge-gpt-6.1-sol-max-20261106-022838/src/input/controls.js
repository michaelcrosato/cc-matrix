(() => {
  const G = globalThis.Edge,
    E = My3D2dge;
  G.INPUT = {
    ...E.Input.DEFAULT,
    fire: ["Mouse0", "KeyJ", "KeyZ", "Pad7"],
    cannon: ["Mouse2", "Space", "Pad6"],
  };
  delete G.INPUT.attack;
  delete G.INPUT.dash;
  delete G.INPUT.skill;
  delete G.INPUT.jump;
  class Controls {
    constructor(game, app) {
      this.game = game;
      this.app = app;
      this.edge = [0, 0];
      this.aim = [
        [1, 0],
        [1, 0],
      ];
      this.touch = new Map();
      this.touchMove = null;
      this.touchAim = null;
      this.touchFire = false;
      this.touchCannon = false;
      this.suppressedUntil = 0;
      this.lastActivity = 0;
      const canvas = game.screen?.canvas;
      if (game.headless || !canvas) return;
      // Native menus, settings and rebinding remain the engine's. Only the invisible dual touch regions are bespoke.
      game.input.touchButtons([]);
      game.input.touchEnabled = false;
      game.input.touchFilter = () => false;
      const activity = (e) => {
        if (this.dead) {
          e?.preventDefault?.();
          e?.stopImmediatePropagation?.();
          return true;
        }
        if (e?.type === "pointermove") {
          const old = this.activityPointer;
          this.activityPointer = { x: e.clientX, y: e.clientY };
          if (old && Math.hypot(e.clientX - old.x, e.clientY - old.y) < 2) return false;
        }
        this.lastActivity = game.real;
        if (e?.pointerType === "touch") game.input.lastDevice = "touch";
        if (e?.type === "pointermove" && e.pointerType === "mouse") game.input.lastDevice = "mouse";
        if (app.attract) {
          e?.preventDefault?.();
          e?.stopImmediatePropagation?.();
          app.exitAttract();
          this.suppressedUntil = game.real + 0.2;
          this.clear();
          return true;
        }
        return false;
      };
      for (const name of ["keydown", "pointerdown", "pointermove", "touchstart"])
        addEventListener(name, (e) => activity(e), { capture: true, passive: false });
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener(
        "pointerdown",
        (e) => {
          if (
            this.dead ||
            e.pointerType !== "touch" ||
            app.ui?.screen ||
            game.paused ||
            game.real < this.suppressedUntil
          )
            return;
          e.preventDefault();
          game.input.lastDevice = "touch";
          game.input._touched = true;
          const b = canvas.getBoundingClientRect(),
            side = e.clientX < b.left + b.width * 0.5 ? "move" : "aim";
          if ([...this.touch.values()].some((p) => p.side === side)) return;
          this.touch.set(e.pointerId, { side, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY });
          canvas.setPointerCapture?.(e.pointerId);
          this.refreshTouch();
        },
        { passive: false },
      );
      canvas.addEventListener(
        "pointermove",
        (e) => {
          const p = this.touch.get(e.pointerId);
          if (!p) return;
          p.cx = e.clientX;
          p.cy = e.clientY;
          this.refreshTouch();
          e.preventDefault();
        },
        { passive: false },
      );
      const cancel = (e) => {
        this.touch.delete(e.pointerId);
        this.refreshTouch();
      };
      for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
        canvas.addEventListener(ev, cancel);
      for (const ev of ["blur", "resize", "orientationchange"]) addEventListener(ev, () => this.clear());
      this.activity = activity;
    }
    refreshTouch() {
      const vec = (p) => {
        if (!p) return null;
        let x = (p.cx - p.x) / 48,
          y = (p.cy - p.y) / 48;
        const n = Math.hypot(x, y);
        if (n < 0.12) return [0, 0];
        if (n > 1) {
          x /= n;
          y /= n;
        }
        return [x, y];
      };
      this.touchMove = vec([...this.touch.values()].find((p) => p.side === "move"));
      this.touchAim = vec([...this.touch.values()].find((p) => p.side === "aim"));
      this.touchFire = !!this.touchAim && Math.hypot(...this.touchAim) > 0.16;
    }
    clear() {
      this.touch.clear();
      this.touchMove = this.touchAim = null;
      this.touchFire = false;
      this.touchCannon = false;
      for (const i of this.game.players) i.clear();
    }
    meaningfulPad() {
      if (typeof navigator === "undefined") return;
      const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
      const active = pads.some(
        (p) => p.axes.some((a) => Math.abs(a) > 0.24) || p.buttons.some((b) => b.pressed),
      );
      if (this.padExitLatch) {
        if (!active) this.padExitLatch = false;
        else {
          for (const I of this.game.players) {
            I.consumeAll();
            I.padMove = [0, 0];
            I.padAim = null;
          }
          return;
        }
      }
      if (active) {
        this.lastActivity = this.game.real;
        if (this.app.attract) {
          this.app.exitAttract();
          this.padExitLatch = true;
          this.suppressedUntil = this.game.real + 0.25;
          this.clear();
        }
      }
    }
    read(i, p, state) {
      const I = this.game.players[i] || this.game.input;
      if (this.game.real < this.suppressedUntil || this.app.ui?.screen || this.game.paused || !p?.alive)
        return G.blankAction();
      let [mx, my] = I.move(),
        aim = this.aim[i] || [1, 0],
        fire = I.down("fire");
      if (I.lastDevice === "gamepad") {
        if (I.padAim && Math.hypot(...I.padAim) > 0.05) {
          aim = [...I.padAim];
          if (this.game.settings.stickFire) fire = true;
        }
      } else if (
        I.lastDevice === "mouse" ||
        (I.aimSource === "mouse" && I.mouse.active && I.lastDevice !== "touch")
      ) {
        const pos = this.game.mouseGround();
        if (pos) {
          const off = this.app.art.offset(this.game.screen),
            dx = pos[0] - off.x - p.x,
            dy = pos[1] - off.y - p.y,
            n = Math.hypot(dx, dy);
          if (n > 0.1) aim = [dx / n, dy / n];
        }
      } else if (Math.hypot(mx, my) > 0.1 && this.game.settings.keyboardAim) aim = [mx, my];
      if (i === 0 && I.lastDevice === "touch") {
        [mx, my] = this.touchMove || [0, 0];
        if (this.touchAim && Math.hypot(...this.touchAim) > 0.1) aim = this.touchAim;
        fire = this.touchFire;
      }
      const assist = I.lastDevice === "touch" || (I.lastDevice === "gamepad" && this.game.settings.aimAssist);
      if (assist && fire && state) {
        let best = null,
          d = Infinity;
        for (const c of state.cells)
          if (c.alive) {
            const dx = c.x - p.x,
              dy = G.wrapDy(c.y, p.y),
              dd = Math.hypot(dx, dy),
              dot = (dx * aim[0] + dy * aim[1]) / (dd || 1);
            if (dot > 0.95 && dd < d) {
              d = dd;
              best = [dx / dd, dy / dd];
            }
          }
        if (best) aim = [aim[0] * 0.5 + best[0] * 0.5, aim[1] * 0.5 + best[1] * 0.5];
      }
      this.aim[i] = aim;
      let cannon = 0;
      if (I.pressed("cannon") || (i === 0 && this.touchCannon)) {
        cannon = ++this.edge[i];
        this.touchCannon = false;
        if (I.lastDevice === "touch") {
          this.touchEvadeUntil = this.game.real + 0.65;
          this.touchEvadeDir = p.y > 140 ? -1 : 1;
        }
      }
      if (i === 0 && I.lastDevice === "touch" && this.game.real < this.touchEvadeUntil)
        my = this.touchEvadeDir;
      return { mx, my, ax: aim[0], ay: aim[1], fire, cannon };
    }
    prompt(action) {
      return this.game.input.label(action);
    }
  }
  G.Controls = Controls;
})();
