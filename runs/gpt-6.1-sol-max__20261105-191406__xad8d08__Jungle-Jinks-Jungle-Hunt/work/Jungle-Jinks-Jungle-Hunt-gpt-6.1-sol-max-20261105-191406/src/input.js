export const emptyInput = () => ({
  x: 0,
  y: 0,
  jump: false,
  cut: false,
  interact: false,
  duck: false,
  pause: false,
  jumpPressed: false,
  cutPressed: false,
  interactPressed: false,
});
export class Input {
  constructor(onActivity, onPause, onMenu, onUnlock) {
    this.kind = "keyboard";
    this.keys = new Set();
    this.onActivity = onActivity;
    this.onPause = onPause;
    this.onMenu = onMenu;
    this.onUnlock = onUnlock;
    this.prev = [emptyInput(), emptyInput()];
    this.padButtons = [];
    this.axes = [];
    this.menuLatch = 0;
    this.touch = { x: 0, y: 0, jump: false, cut: false, interact: false };
    this.points = new Map();
    this.enabled = true;
    window.addEventListener("keydown", (e) => {
      if (/INPUT|TEXTAREA/.test(e.target.tagName)) {
        this.activity("keyboard");
        return;
      }
      if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code))
        e.preventDefault();
      if (this.activity("keyboard")) return;
      this.keys.add(e.code);
      if (!e.repeat) {
        if (e.code === "Escape") this.onPause();
        else this.onMenu(e.code);
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.touch.x = this.touch.y = 0;
      this.touch.jump = this.touch.cut = this.touch.interact = false;
      this.points.clear();
    });
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      if (this.activity("keyboard")) return;
      if (e.target.id === "world") {
        if (e.button === 0) this.keys.add("Mouse0");
        if (e.button === 2) this.keys.add("KeyE");
      }
    });
    window.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch") {
        this.keys.delete("Mouse0");
        if (e.button === 2) this.keys.delete("KeyE");
      }
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("wheel", () => this.activity("keyboard", false), { passive: true });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "touch" && Math.abs(e.movementX) + Math.abs(e.movementY) > 2)
        this.activity("keyboard", false);
    });
    window.addEventListener("pointerdown", (e) => this.touchStart(e), {
      passive: false,
    });
    window.addEventListener("pointermove", (e) => this.touchMove(e), {
      passive: false,
    });
    window.addEventListener("pointerup", (e) => this.touchEnd(e));
    window.addEventListener("pointercancel", (e) => this.touchEnd(e));
  }
  activity(kind, loud = true) {
    this.kind = kind;
    document.body.classList.toggle("touch", kind === "touch");
    const consumed = this.onActivity(kind, loud);
    if (loud) this.onUnlock();
    return consumed;
  }
  touchStart(e) {
    if (e.pointerType !== "touch") return;
    if (this.activity("touch")) return;
    if (e.target.closest("button") && e.target.id !== "touchAction") return;
    if (e.target.closest("input,textarea,.panel")) return;
    e.preventDefault();
    const left = e.clientX < innerWidth * 0.48;
    this.points.set(e.pointerId, { x: e.clientX, y: e.clientY, left });
    if (left) {
      const s = document.querySelector("#touchStick");
      s.style.left = e.clientX + "px";
      s.style.top = e.clientY + "px";
      s.classList.remove("hidden");
    } else {
      this.touch.jump = true;
      this.touch.interact = true;
      this.touch.cut = true;
    }
    e.target.setPointerCapture?.(e.pointerId);
  }
  touchMove(e) {
    if (e.pointerType !== "touch") return;
    const p = this.points.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    if (p.left) {
      this.touch.x = Math.max(-1, Math.min(1, (e.clientX - p.x) / 50));
      this.touch.y = Math.max(-1, Math.min(1, -(e.clientY - p.y) / 50));
      const k = document.querySelector("#touchStick i");
      k.style.marginLeft = this.touch.x * 28 + "px";
      k.style.marginTop = -this.touch.y * 28 + "px";
    }
  }
  touchEnd(e) {
    const p = this.points.get(e.pointerId);
    if (!p) return;
    this.points.delete(e.pointerId);
    if (p.left) {
      this.touch.x = this.touch.y = 0;
      document.querySelector("#touchStick").classList.add("hidden");
    } else {
      this.touch.jump = this.touch.interact = this.touch.cut = false;
    }
  }
  pollPads(dt, menuOpen) {
    let pads = [];
    try {
      pads = Array.from(navigator.getGamepads?.() || []);
    } catch {}
    this.pads = pads.filter((p) => p && p.connected !== false);
    this.menuLatch = Math.max(0, this.menuLatch - dt);
    this.pads.forEach((p, i) => {
      const b = p.buttons.map((x) => (typeof x === "number" ? x > 0.5 : x.pressed || x.value > 0.5)),
        old = this.padButtons[i] || [],
        ax = p.axes?.[0] || 0,
        ay = p.axes?.[1] || 0;
      const changed =
        b.some((v, j) => v && !old[j]) ||
        Math.abs(ax - (this.axes[i]?.[0] || 0)) > 0.2 ||
        Math.abs(ay - (this.axes[i]?.[1] || 0)) > 0.2;
      if (changed) this.activity("gamepad");
      if (b[9] && !old[9] && !b[8]) this.onPause();
      if (menuOpen && this.menuLatch === 0) {
        let code = null;
        if (b[12] || ay < -0.55) code = "ArrowUp";
        else if (b[13] || ay > 0.55) code = "ArrowDown";
        else if (b[14] || ax < -0.55) code = "ArrowLeft";
        else if (b[15] || ax > 0.55) code = "ArrowRight";
        else if (b[0] && !old[0]) code = "Enter";
        else if (b[1] && !old[1]) code = "Escape";
        if (code) {
          this.onMenu(code);
          this.menuLatch = 0.19;
        }
      }
      this.padButtons[i] = b;
      this.axes[i] = [ax, ay];
    });
  }
  read(index = 0) {
    const s = emptyInput(),
      k = this.keys;
    if (index === 0) {
      s.x = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
      s.y = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
      s.jump = k.has("Space");
      s.cut = k.has("KeyJ") || k.has("KeyX") || k.has("Mouse0");
      s.interact = k.has("KeyE");
      s.duck = k.has("ShiftLeft") || k.has("ShiftRight") || k.has("KeyS") || k.has("ArrowDown");
      if (this.kind === "touch") {
        s.x = this.touch.x;
        s.y = this.touch.y;
        s.jump = this.touch.jump;
        s.cut = this.touch.cut;
        s.interact = this.touch.interact;
      }
    } else {
      s.x = (k.has("KeyL") ? 1 : 0) - (k.has("KeyG") ? 1 : 0);
      s.y = (k.has("KeyY") ? 1 : 0) - (k.has("KeyH") ? 1 : 0);
      s.jump = k.has("KeyB");
      s.cut = k.has("KeyN");
      s.interact = k.has("KeyM");
      s.duck = k.has("KeyH");
    }
    const p = this.pads?.[index];
    if (p) {
      const b = p.buttons.map((x) => (typeof x === "number" ? x > 0.5 : x.pressed || x.value > 0.5)),
        ax = p.axes?.[0] || 0,
        ay = p.axes?.[1] || 0;
      const px = Math.abs(ax) > 0.18 ? ax : 0,
        py = Math.abs(ay) > 0.18 ? -ay : 0;
      s.x = Math.abs(px) > 0.1 ? px : s.x;
      s.y = Math.abs(py) > 0.1 ? py : s.y;
      if (b[14]) s.x = -1;
      if (b[15]) s.x = 1;
      if (b[12]) s.y = 1;
      if (b[13]) s.y = -1;
      s.jump ||= b[0];
      s.cut ||= b[2];
      s.interact ||= b[3];
      s.duck ||= b[1];
    }
    const prev = this.prev[index];
    s.jumpPressed = s.jump && !prev.jump;
    s.cutPressed = s.cut && !prev.cut;
    s.interactPressed = s.interact && !prev.interact;
    this.prev[index] = { ...s };
    return s;
  }
  clear() {
    this.keys.clear();
    this.prev = [emptyInput(), emptyInput()];
    this.touch.jump = this.touch.cut = this.touch.interact = false;
  }
}
