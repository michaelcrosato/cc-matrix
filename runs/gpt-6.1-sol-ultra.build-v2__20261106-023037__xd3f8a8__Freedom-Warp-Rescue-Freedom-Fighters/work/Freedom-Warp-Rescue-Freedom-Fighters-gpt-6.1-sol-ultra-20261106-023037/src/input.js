/* Freedom Warp Rescue — semantic device adapters over the native E.Input. */
globalThis.FWR = globalThis.FWR || {};
((F) => {
  const ZERO = () => ({
    mx: 0,
    my: 0,
    ax: 0,
    ay: 0,
    fire: false,
    burst: false,
  });
  const norm = (x, y) => {
    const n = Math.hypot(x, y);
    return n > 1 ? [x / n, y / n] : [x, y];
  };
  const finite = (x) => (Number.isFinite(x) ? x : 0);
  const MAP = {
    up: ["KeyW", "ArrowUp", "Pad12"],
    down: ["KeyS", "ArrowDown", "Pad13"],
    left: ["KeyA", "ArrowLeft", "Pad14"],
    right: ["KeyD", "ArrowRight", "Pad15"],
    fire: ["Space", "Mouse0", "Pad7", "Pad2"],
    warp: ["ShiftLeft", "ShiftRight", "Pad6"],
    start: ["Enter", "Pad9"],
    pause: ["Escape", "KeyP", "Pad9"],
    confirm: ["Enter", "Pad0"],
    cancel: ["Escape", "Backspace", "Pad1"],
  };
  class Input {
    constructor(game, o = {}) {
      this.game = game;
      this.o = o;
      this.family = "keyboard";
      this.swapped = false;
      this.contacts = new Map();
      this._touchBurst = false;
      this._touchFire = false;
      this._lastRightTap = -10;
      this._primaryPad = null;
      this._padLast = new Map();
      this._installed = new WeakSet();
      this._lastPointer = null;
      this._abort = typeof AbortController !== "undefined" ? new AbortController() : null;
      this._installNative(game.input);
      game.allowJoin(false);
      if (typeof window !== "undefined" && game.screen.canvas) this._installDOM();
      this._notifySeats();
    }
    get seats() {
      return this.game.players.map((_, i) => `local-${i + 1}`);
    }
    get coOp() {
      return this.game.players.length > 1;
    }
    get blocked() {
      return !!this.o.isBlocked?.();
    }
    get settings() {
      return typeof this.o.settings === "function" ? this.o.settings() : this.o.settings || {};
    }
    _isHub() {
      return typeof this.o.isHub === "function" ? this.o.isHub() : !!this.o.isHub;
    }
    _activity(family, event) {
      this.family = family;
      if (this.game.input) this.game.input.lastDevice = family;
      const consumed = !!this.o.onActivity?.(family, event);
      if (consumed) {
        if (event && event.type === "pointerdown")
          this._consumeClickUntil = performance.now() + 700;
        this.clear();
        if (event?.cancelable) event.preventDefault();
        if (event?.stopImmediatePropagation) event.stopImmediatePropagation();
      }
      return consumed;
    }
    _installNative(I) {
      if (this._installed.has(I)) return;
      this._installed.add(I);
      I.use(MAP);
      I.names = {
        up: "Move up",
        down: "Move down",
        left: "Move left",
        right: "Move right",
        fire: "Cannon",
        warp: "Hyperspace",
      };
      I.touchEnabled = false;
      I.touchFilter = () => false;
      I.glyphs = this.settings.glyphs || "playstation";
      const tick = I.tick.bind(I);
      I.tick = (dt) => {
        tick(dt);
        let pads = [];
        try {
          pads =
            typeof navigator !== "undefined" && navigator.getGamepads
              ? navigator.getGamepads() || []
              : [];
        } catch (_) {
          /* permission-denied pads remain optional */
        }
        const p = I.padIndex === null ? null : pads[I.padIndex];
        if (!p) return;
        const active =
          (p.axes || []).some((v) => Math.abs(v) > 0.25) ||
          (p.buttons || []).some((b) => b && (b.pressed || b.value > 0.4));
        if (I._fwrConsumedPad) {
          if (active) {
            I.clear();
            I.padPrev = (p.buttons || []).map((b) => !!b.pressed);
            return;
          }
          I._fwrConsumedPad = false;
        }
        const signature =
          (p.axes || []).map((v) => (Math.abs(v) > 0.25 ? Math.round(v * 10) : 0)).join(",") +
          ":" +
          (p.buttons || []).map((b) => (b && (b.pressed || b.value > 0.4) ? 1 : 0)).join("");
        const changed = signature !== I._fwrPadSignature;
        I._fwrPadSignature = signature;
        if (active && changed) {
          if (I === this.game.input && !this.blocked) this._primaryPad = p.index;
          if (this._activity("gamepad")) {
            I._fwrConsumedPad = true;
            I.clear();
            I.padPrev = (p.buttons || []).map((b) => !!b.pressed);
          }
        }
      };
    }
    _installDOM() {
      const signal = this._abort.signal,
        canvas = this.game.screen.canvas;
      const on = (el, name, fn, extra = {}) => el.addEventListener(name, fn, { signal, ...extra });
      canvas.style.touchAction = "none";
      on(
        window,
        "click",
        (e) => {
          if (performance.now() < (this._consumeClickUntil || 0)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this._consumeClickUntil = 0;
          }
        },
        { capture: true },
      );
      on(
        window,
        "keydown",
        (e) => {
          if (e.repeat) return;
          if (this._activity("keyboard", e)) return;
          if (
            !this.blocked &&
            [
              "KeyW",
              "KeyA",
              "KeyS",
              "KeyD",
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "Space",
              "ShiftLeft",
              "ShiftRight",
            ].includes(e.code)
          )
            this._primaryPad = null;
          if (e.code === "Digit2" && !this._isHub() && !this.blocked) {
            e.preventDefault();
            this.coOp ? this.leave() : this.join();
          }
        },
        { capture: true },
      );
      on(
        window,
        "pointerdown",
        (e) => this._activity(e.pointerType === "mouse" ? "mouse" : "touch", e),
        { capture: true },
      );
      on(
        window,
        "pointermove",
        (e) => {
          if (e.pointerType !== "mouse") return;
          const q = this._lastPointer;
          this._lastPointer = [e.clientX, e.clientY];
          if (!q || Math.hypot(q[0] - e.clientX, q[1] - e.clientY) > 2) this._activity("mouse", e);
        },
        { capture: true },
      );
      on(window, "blur", () => this.clear());
      on(document, "visibilitychange", () => {
        if (document.hidden) this.clear();
      });
      on(window, "resize", () => this._clearTouch());
      on(
        canvas,
        "pointerdown",
        (e) => {
          if (e.pointerType === "mouse" || this.blocked) return;
          e.preventDefault();
          const r = canvas.getBoundingClientRect(),
            side = e.clientX < r.left + r.width * 0.5 ? "move" : "aim";
          if ([...this.contacts.values()].some((p) => p.side === side)) return;
          this.contacts.set(e.pointerId, {
            side,
            x0: e.clientX,
            y0: e.clientY,
            x: e.clientX,
            y: e.clientY,
          });
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch (_) {
            /* synthetic test pointers need no capture */
          }
          if (side === "aim") {
            const now = performance.now() / 1000;
            if (now - this._lastRightTap < 0.3) this._touchBurst = true;
            this._lastRightTap = now;
          }
          this._updateTouchButton();
        },
        { passive: false },
      );
      on(
        canvas,
        "pointermove",
        (e) => {
          const p = this.contacts.get(e.pointerId);
          if (!p) return;
          e.preventDefault();
          p.x = e.clientX;
          p.y = e.clientY;
          this._updateTouchButton();
        },
        { passive: false },
      );
      const off = (e) => {
        const contact = this.contacts.get(e.pointerId);
        if (contact && contact.side === "aim") this._touchBurst = false;
        if (this.contacts.delete(e.pointerId)) {
          if (!this.contacts.size) {
            this._touchBurst = this._touchFire = false;
          }
          this._updateTouchButton();
        }
      };
      on(window, "pointerup", off);
      on(window, "pointercancel", off);
      on(canvas, "lostpointercapture", off);
      this.touchWarp = document.createElement("button");
      const b = this.touchWarp;
      b.className = "fwr-touch-warp";
      b.textContent = "WARP";
      b.setAttribute("aria-label", "Commit hyperspace");
      b.hidden = true;
      b.style.cssText =
        "position:fixed;z-index:20;width:74px;height:74px;border:2px solid #9df7ee;border-radius:50%;color:#dafff7;background:#0b283bdd;font:800 13px system-ui;touch-action:none;box-shadow:0 0 22px #74e5df44";
      document.body.appendChild(b);
      on(b, "pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.blocked) this._touchBurst = true;
      });
      on(b, "pointerup", (e) => {
        e.preventDefault();
        this._touchBurst = false;
      });
      on(b, "pointercancel", () => {
        this._touchBurst = false;
      });
    }
    _updateTouchButton() {
      const b = this.touchWarp;
      if (!b) return;
      const right = [...this.contacts.values()].find((p) => p.side === "aim");
      const left = [...this.contacts.values()].find((p) => p.side === "move");
      const w = this.o.getWorld?.();
      const relevant = this.contacts.size && w?.ship && w.ship.energy >= 0;
      b.hidden = !relevant || this.blocked;
      if (b.hidden) return;
      const px = right ? right.x0 - 62 : Math.max(innerWidth * 0.75, (left ? left.x0 : 0) + 160);
      const py = right ? right.y0 - 108 : innerHeight - 110;
      b.style.left = `${Math.max(12, Math.min(innerWidth - 88, px))}px`;
      b.style.top = `${Math.max(70, Math.min(innerHeight - 88, py))}px`;
      b.style.opacity = w.ship.energy >= (this.o.warpCost ? this.o.warpCost() : 60) ? "1" : ".45";
    }
    _clearTouch() {
      this.contacts.clear();
      this._touchBurst = this._touchFire = false;
      if (this.touchWarp) this.touchWarp.hidden = true;
    }
    clear() {
      for (const p of this.game.players) p.clear();
      this._clearTouch();
    }
    _notifySeats() {
      if (this.o.onSeatsChange) this.o.onSeatsChange(this.seats, this.swapped);
    }
    _pads() {
      try {
        return typeof navigator !== "undefined" && navigator.getGamepads
          ? Array.from(navigator.getGamepads() || []).filter((p) => p && p.connected !== false)
          : [];
      } catch (_) {
        return [];
      }
    }
    join(index) {
      if (this._isHub() || this.coOp) return false;
      const I = this.game.input,
        pads = this._pads();
      const used =
        typeof I.pad === "number"
          ? I.pad
          : this._primaryPad !== null
            ? this._primaryPad
            : I.lastDevice === "gamepad"
              ? I.padIndex
              : pads.length > 1
                ? pads[0].index
                : null;
      const pad =
        index === undefined
          ? pads.find((p) => p.index !== used)
          : pads.find((p) => p.index === index && p.index !== used);
      if (!pad) {
        if (this.o.onJoin)
          this.o.onJoin(
            false,
            "Connect another controller, then choose Join. Keyboard + one controller also works.",
          );
        return false;
      }
      I.pad = used === null ? null : used;
      const q = this.game.addPlayer({ pad: pad.index });
      if (!q) return false;
      this._installNative(q);
      q.clear();
      this._notifySeats();
      if (this.o.onJoin)
        this.o.onJoin(true, "Pilot: steer and fire. Navigator: aim, fire, and hyperspace.");
      return true;
    }
    leave() {
      if (this._isHub() || !this.coOp) return false;
      this.game.removePlayer(2);
      this.game.input.pad = "any";
      this.swapped = false;
      this.clear();
      this._notifySeats();
      return true;
    }
    swap() {
      if (!this.coOp || this._isHub()) return false;
      this.swapped = !this.swapped;
      this.clear();
      this._notifySeats();
      return true;
    }
    _checkConnections() {
      if (!this.coOp) return;
      const P = this.game.players,
        pads = this._pads(),
        present = (i) => pads.some((p) => p.index === i);
      if (typeof P[1].pad === "number" && !present(P[1].pad)) {
        this.leave();
        if (this.o.onJoin) this.o.onJoin(false, "Navigator disconnected. Solo controls restored.");
      } else if (typeof P[0].pad === "number" && !present(P[0].pad)) {
        const remaining = P[1].pad;
        this.leave();
        P[0].pad = remaining;
        if (this.o.onJoin)
          this.o.onJoin(
            false,
            "Pilot disconnected. Remaining controller now has every solo action.",
          );
      }
    }
    _automaticJoin() {
      if (this._isHub() || this.coOp || this.blocked) return;
      const I = this.game.input;
      for (const p of this._pads()) {
        const start = !!p.buttons[9]?.pressed,
          create = !!p.buttons[8]?.pressed;
        const was = this._padLast.get(p.index) || false;
        this._padLast.set(p.index, start);
        if (
          start &&
          !was &&
          !create &&
          I.lastDevice === "gamepad" &&
          I.padIndex !== null &&
          p.index !== I.padIndex
        )
          this.join(p.index);
      }
    }
    _safeAutoAim(world) {
      if (!world?.ship) return null;
      const s = world.ship,
        entities = world.entities || [];
      const targets = entities.filter(
        (e) =>
          ["layer", "minelayer", "mine-layer", "interceptor", "guard", "organ", "core"].includes(
            e.type,
          ) &&
          e.state !== "dead" &&
          e.hp !== 0,
      );
      targets.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));
      for (const t of targets) {
        const dx = t.x - s.x,
          dy = t.y - s.y,
          d = Math.hypot(dx, dy);
        if (d < 25 || d > 750) continue;
        const ax = dx / d,
          ay = dy / d;
        const blocked = entities.some((c) => {
          if (c.type !== "crystal" || c.state === "rescued" || c.state === "lost") return false;
          const along = (c.x - s.x) * ax + (c.y - s.y) * ay;
          return (
            along > 0 &&
            along < d + (t.r || 20) &&
            Math.abs((c.x - s.x) * ay - (c.y - s.y) * ax) < (c.r || 22) + 20
          );
        });
        if (!blocked) return { ax, ay, fire: true };
      }
      return null;
    }
    _seatIntent(I, i, world) {
      const out = ZERO(),
        move = I.move();
      [out.mx, out.my] = norm(finite(move[0]), finite(move[1]));
      out.fire = I.down("fire");
      out.burst = I.down("warp");
      if (I.padAim) [out.ax, out.ay] = norm(finite(I.padAim[0]), finite(I.padAim[1]));
      if (
        i === 0 &&
        (I.aimSource === "mouse" || this.family === "mouse") &&
        I.mouse.active &&
        world?.ship
      ) {
        const p = this.o.screenToWorld ? this.o.screenToWorld(I.mouse.cx, I.mouse.cy) : I.pointer();
        if (p) {
          const x = Array.isArray(p) ? p[0] : p.x,
            y = Array.isArray(p) ? p[1] : p.y,
            dx = x - world.ship.x,
            dy = y - world.ship.y,
            d = Math.hypot(dx, dy);
          if (d > 2) {
            out.ax = dx / d;
            out.ay = dy / d;
          }
        }
      }
      if (i === 0 && this.contacts.size) {
        const l = [...this.contacts.values()].find((p) => p.side === "move"),
          r = [...this.contacts.values()].find((p) => p.side === "aim");
        if (l) [out.mx, out.my] = norm((l.x - l.x0) / 56, (l.y - l.y0) / 56);
        if (r && world?.ship) {
          const p = this.o.screenToWorld ? this.o.screenToWorld(r.x, r.y) : [r.x, r.y];
          const dx = (Array.isArray(p) ? p[0] : p.x) - world.ship.x,
            dy = (Array.isArray(p) ? p[1] : p.y) - world.ship.y,
            d = Math.hypot(dx, dy);
          if (d > 2) {
            out.ax = dx / d;
            out.ay = dy / d;
          }
        }
        if (this.settings.touchAssist !== false) {
          const auto = this._safeAutoAim(world);
          if (auto) {
            out.ax = auto.ax;
            out.ay = auto.ay;
            out.fire = auto.fire;
          } else out.fire = false;
        } else out.fire = !!r;
        out.burst = this._touchBurst;
      }
      return out;
    }
    poll(dt = 1 / 120) {
      void dt;
      this._checkConnections();
      this._automaticJoin();
      const world = this.o.getWorld?.();
      for (const I of this.game.players) {
        if (I.pressed("pause")) {
          const pads = this._pads(),
            p = pads.find((p) => p.index === I.padIndex);
          if (!p?.buttons[8]?.pressed && this.o.onPause) this.o.onPause();
        }
      }
      const out = {};
      for (const [i, I] of this.game.players.entries())
        out[`local-${i + 1}`] = this.blocked ? ZERO() : this._seatIntent(I, i, world);
      this._updateTouchButton();
      return out;
    }
    label(action, seat = 0) {
      const I = this.game.players[seat] || this.game.input;
      I.glyphs = this.settings.glyphs || "playstation";
      if (this.family === "touch")
        return (
          {
            move: "Left thumb",
            aim: "Right thumb",
            fire: this.settings.touchAssist !== false ? "Auto" : "Right thumb",
            warp: "Double tap right",
            pause: "Menu",
          }[action] || action
        );
      if (action === "move")
        return this.family === "gamepad"
          ? "L stick"
          : ["up", "left", "down", "right"].map((a) => I.label(a)).join(" / ");
      if (action === "aim") return this.family === "gamepad" ? "R stick" : "Mouse";
      I.lastDevice = this.family;
      return I.label(action);
    }
    dispose() {
      if (this._abort) this._abort.abort();
      if (this.touchWarp) this.touchWarp.remove();
      this.clear();
    }
  }
  F.Input = Input;
  F.INPUT_MAP = MAP;
  F.zeroIntent = ZERO;
})(globalThis.FWR);
