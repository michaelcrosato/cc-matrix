(() => {
  const P = globalThis.PD,
    E = globalThis.My3D2dge;
  P.INPUT = {
    ...E.Input.PLATFORMER,
    jump: ['Space', 'KeyZ', 'Pad0'],
    attack: ['KeyJ', 'Mouse0', 'Pad2'],
    redirect: ['KeyQ', 'Mouse2', 'Pad7'],
    duck: ['KeyC', 'Pad1'],
    interact: ['KeyE', 'Pad3'],
  };
  delete P.INPUT.dash;
  delete P.INPUT.skill;
  class Controls {
    constructor(game, getWorld, isBlocked, activity) {
      this.game = game;
      this.getWorld = getWorld;
      this.isBlocked = isBlocked;
      this.activity = activity;
      this.fingers = new Map();
      this.stick = null;
      this.jumpId = null;
      this.jumpEdge = false;
      this.action = null;
      this.queuedAction = null;
      this.actionEdge = false;
      this.mouseAction = null;
      this.queuedMouseAction = null;
      this.mouseActionEdge = false;
      this.touchUsed = false;
      this.lastTouch = -99;
      this.assistRock = null;
      this.assistSince = -99;
      this.abort = new AbortController();
      this.context = document.getElementById('context');
      const opts = { signal: this.abort.signal, passive: false };
      const on = (el, type, fn, more = {}) => el.addEventListener(type, fn, { ...opts, ...more });
      const canvas = game.screen.canvas;
      on(
        canvas,
        'pointerdown',
        (e) => {
          this.activity(e.pointerType || 'mouse', e);
          if (this.isBlocked()) return;
          if (e.pointerType === 'mouse') {
            if (e.button !== 0 || this.mouseAction) return;
            const m = this.getWorld(),
              p = this.player(m);
            if (!p || p.down) return;
            const point = game.input.screenPoint(e.clientX, e.clientY),
              rescue = m.nearRescue(p),
              door = m.nearDoor(p);
            // Capture the deliberately clicked target, so holding a rescue never
            // turns into a chop or a different doorway action as the world changes.
            for (const [type, target] of [
              ['rescue', rescue],
              ['door', door],
            ]) {
              if (!target) continue;
              const at = target.body || target,
                q = game.r.w(at.x, 0, at.z + 15);
              if (Math.hypot(point[0] - q[0], point[1] - q[1]) >= 34 * game.r.ppu) continue;
              this.mouseAction = { type, id: target.id, pointer: e.pointerId };
              this.queuedMouseAction = { ...this.mouseAction };
              this.mouseActionEdge = true;
              canvas.setPointerCapture(e.pointerId);
              e.preventDefault();
              break;
            }
            return;
          }
          e.preventDefault();
          e.stopImmediatePropagation();
          this.touchUsed = true;
          this.lastTouch = game.real;
          game.input.lastDevice = 'touch';
          const rect = canvas.getBoundingClientRect(),
            left = e.clientX < rect.left + rect.width * 0.46;
          const p = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
          this.fingers.set(e.pointerId, p);
          canvas.setPointerCapture(e.pointerId);
          if (left && this.stick === null) this.stick = p;
          else {
            this.jumpId = e.pointerId;
            this.jumpEdge = true;
          }
        },
        { capture: true },
      );
      on(
        canvas,
        'pointermove',
        (e) => {
          const p = this.fingers.get(e.pointerId);
          if (!p) return;
          p.x = e.clientX;
          p.y = e.clientY;
          e.preventDefault();
          e.stopImmediatePropagation();
        },
        { capture: true },
      );
      const release = (e) => {
        if (this.mouseAction?.pointer === e.pointerId) {
          this.mouseAction = null;
          // A quick release retains one press; cancellation abandons it.
          if (e.type === 'pointercancel') {
            this.queuedMouseAction = null;
            this.mouseActionEdge = false;
          }
          e.preventDefault();
        }
        if (!this.fingers.has(e.pointerId)) return;
        this.fingers.delete(e.pointerId);
        if (this.stick?.id === e.pointerId) this.stick = null;
        if (this.jumpId === e.pointerId) this.jumpId = null;
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      on(canvas, 'pointerup', release, { capture: true });
      on(canvas, 'pointercancel', release, { capture: true });
      on(this.context, 'pointerdown', (e) => {
        this.activity(e.pointerType || 'mouse', e);
        e.preventDefault();
        e.stopPropagation();
        if (this.isBlocked() || this.action) return;
        const m = this.getWorld(),
          p = this.player(m);
        const context = p && m.context(p);
        if (!context) return;
        this.action = {
          type: context.type,
          id: context.id,
          pointer: e.pointerId,
          symbol: context.symbol,
          label: context.label,
        };
        this.queuedAction = { ...this.action };
        this.actionEdge = true;
        this.touchUsed ||= e.pointerType !== 'mouse';
        this.lastTouch = game.real;
        this.context.setPointerCapture(e.pointerId);
        game.input.lastDevice = e.pointerType === 'mouse' ? 'mouse' : 'touch';
      });
      const endAction = (e) => {
        if (this.action?.pointer === e.pointerId) {
          this.action = null;
          e.preventDefault();
        }
      };
      on(this.context, 'pointerup', endAction);
      on(this.context, 'pointercancel', endAction);
      on(
        document,
        'keydown',
        (e) => {
          if (!e.repeat) this.activity('keyboard', e);
        },
        { capture: true },
      );
      on(
        document,
        'pointerdown',
        (e) => {
          if (e.target !== canvas && e.target !== this.context) this.activity(e.pointerType || 'mouse', e);
        },
        { capture: true },
      );
      on(window, 'blur', () => this.clear());
    }
    player(m) {
      const id = this.localId ?? 0;
      return m?.players.find((p) => p.id === id);
    }
    clear() {
      this.stick = null;
      this.jumpId = null;
      this.jumpEdge = false;
      this.action = null;
      this.queuedAction = null;
      this.actionEdge = false;
      this.mouseAction = null;
      this.queuedMouseAction = null;
      this.mouseActionEdge = false;
      this.assistRock = null;
      this.fingers.clear();
      this.game.input.clear();
    }
    read(input = this.game.input, index = 0) {
      if (this.isBlocked()) return P.neutral();
      const m = this.getWorld(),
        p = m?.players.find((p) => p.id === (this.localId ?? index));
      if (!p || p.down) return P.neutral();
      const move = input.move();
      const intent = P.canonical({
        x: move[0],
        up: move[1] < -0.45 || input.down('up'),
        down: move[1] > 0.45 || input.down('down') || input.down('duck'),
        jump: input.down('jump'),
        jumpPressed: input.pressed('jump'),
        chop: input.down('attack') || input.pressed('attack'),
        redirect: input.pressed('redirect'),
        interact: input.down('interact'),
        interactPressed: input.pressed('interact'),
        aim: move[1] < -0.35 ? 1 : move[1] > 0.35 ? -1 : 0,
      });
      if (input === this.game.input) {
        const pointer = input.pointer();
        if (pointer && input.lastDevice === 'mouse') {
          const pos = this.game.r.w(p.body.x, 0, p.body.z + 14);
          intent.aim = pointer[1] < pos[1] - 15 ? 1 : pointer[1] > pos[1] + 15 ? -1 : 0;
          if ((intent.chop || intent.redirect) && Math.abs(pointer[0] - pos[0]) > 10)
            intent.face = Math.sign(pointer[0] - pos[0]);
        }
        if (this.touchUsed && input.lastDevice === 'touch') {
          if (this.stick) {
            const dx = this.stick.x - this.stick.x0,
              dy = this.stick.y - this.stick.y0;
            intent.x = Math.abs(dx) < 9 ? 0 : Math.max(-1, Math.min(1, dx / 42));
            intent.up = dy < -16;
            intent.down = dy > 19;
          }
          intent.jump ||= this.jumpId !== null;
          intent.jumpPressed ||= this.jumpEdge;
          this.jumpEdge = false;
          // Assistance still spends real contact durability and uses the same active hit window.
          const near = m.rocks.find(
            (r) => !r.dead && Math.abs(r.x - p.body.x) < 46 && Math.abs(r.z - p.body.z - 14) < 30,
          );
          if (near?.id !== this.assistRock) {
            this.assistRock = near?.id || null;
            this.assistSince = this.game.real;
          }
          if (near && p.tool > 0) {
            const deliberateRedirect = (this.action || this.queuedAction)?.type === 'redirect';
            intent.chop = !deliberateRedirect && this.game.real - this.assistSince >= 0.18;
            if (Math.abs(near.x - p.body.x) > 8 && !intent.x) intent.face = Math.sign(near.x - p.body.x);
          }
        }
        const contextual = this.action || this.queuedAction;
        if (contextual) {
          if (contextual.type === 'redirect') {
            intent.redirect ||= this.actionEdge;
            intent.chop = false;
            intent.aim = intent.up ? 1 : intent.down ? -1 : 0;
          } else {
            intent.interact = !!this.action || this.actionEdge;
            intent.interactPressed ||= this.actionEdge;
          }
          this.actionEdge = false;
          this.queuedAction = null;
        }
        const mouseContextual = this.mouseAction || this.queuedMouseAction;
        if (mouseContextual) {
          intent.chop = false;
          const target = mouseContextual.type === 'rescue' ? m.nearRescue(p) : m.nearDoor(p);
          if (target?.id === mouseContextual.id) {
            intent.interact ||= !!this.mouseAction || this.mouseActionEdge;
            intent.interactPressed ||= this.mouseActionEdge;
          }
          this.mouseActionEdge = false;
          this.queuedMouseAction = null;
        }
      }
      return intent;
    }
    updateBubble(m, blocked) {
      const p = this.player(m),
        ctx = this.action || (p && !p.down ? m.context(p) : null);
      const visible = !blocked && this.touchUsed && this.game.input.lastDevice === 'touch' && !!ctx;
      this.context.hidden = !visible;
      if (visible) {
        this.context.textContent = `${ctx.symbol} ${ctx.label}`;
        this.context.dataset.kind = ctx.type;
        this.context.setAttribute('aria-label', ctx.label);
      }
    }
    dispose() {
      this.abort.abort();
      this.clear();
    }
  }
  P.Controls = Controls;
})();
