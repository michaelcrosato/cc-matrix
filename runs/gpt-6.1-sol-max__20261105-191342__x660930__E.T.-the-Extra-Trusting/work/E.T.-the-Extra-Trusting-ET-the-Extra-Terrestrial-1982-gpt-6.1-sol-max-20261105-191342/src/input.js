export class Controls {
  constructor(cb, settings) {
    this.cb = cb;
    this.settings = settings;
    this.keys = new Set();
    this.mode =
      navigator.maxTouchPoints > 0 && matchMedia('(pointer:coarse)').matches
        ? 'touch'
        : 'keyboard';
    this.padPrev = [];
    this.padIndex = -1;
    this.navNext = 0;
    this.touch = null;
    this.touchAxes = { x: 0, z: 0 };
    this.mouseDrag = null;
    this.touchTap = 0;
    this.lastPointer = { x: 0, y: 0 };
    document.body.dataset.input = this.mode;
    addEventListener(
      'keydown',
      (e) => {
        if (e.target.matches('input[type=text]')) {
          if (e.key === 'Escape') this.cb.action('back');
          return;
        }
        if (
          [
            'Space',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Tab',
          ].includes(e.code)
        )
          e.preventDefault();
        this.setMode('keyboard');
        if (this.cb.activity()) return;
        this.keys.add(e.code);
        if (e.repeat) return;
        if (this.cb.inMenu()) {
          if (e.code === 'Escape') this.cb.action('back');
          else if (
            e.code === 'Enter' ||
            e.code === 'Space' ||
            e.code === 'KeyE'
          )
            this.activate();
          else if (['ArrowUp', 'KeyW'].includes(e.code)) this.navigate(-1);
          else if (['ArrowDown', 'KeyS'].includes(e.code)) this.navigate(1);
          else if (['ArrowLeft', 'KeyA'].includes(e.code)) this.adjust(-1);
          else if (['ArrowRight', 'KeyD'].includes(e.code)) this.adjust(1);
        } else {
          if (e.code === 'Escape') this.cb.action('pause');
          if (e.code === 'Tab') this.cb.action('map');
          if (e.code === 'KeyE') this.cb.action('interact');
          if (e.code === 'KeyQ') this.cb.action('glow');
          if (e.code === 'KeyF') this.cb.action('candy');
        }
      },
      true,
    );
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.touchAxes = { x: 0, z: 0 };
    });
    addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'touch') {
          this.setMode('touch');
          if (this.cb.activity()) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.target.closest('button,input,select,a,#panel')) return;
          if (this.cb.inMenu()) return;
          this.cb.wake?.();
          if (e.clientX < innerWidth * 0.56 && !this.touch) {
            this.touch = { id: e.pointerId, x: e.clientX, y: e.clientY };
          } else {
            const now = performance.now();
            if (now - this.touchTap < 350) this.cb.action('glow');
            else this.cb.action('interact');
            this.touchTap = now;
          }
          e.preventDefault();
        } else {
          this.setMode('keyboard');
          if (this.cb.activity()) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          this.cb.wake?.();
          if (e.button === 2 && !this.cb.inMenu())
            this.mouseDrag = { x: e.clientX, y: e.clientY };
        }
      },
      true,
    );
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') {
        if (this.touch?.id === e.pointerId) {
          this.touchAxes.x = Math.max(
            -1,
            Math.min(1, (e.clientX - this.touch.x) / 65),
          );
          this.touchAxes.z = Math.max(
            -1,
            Math.min(1, (e.clientY - this.touch.y) / 65),
          );
        }
        return;
      }
      if (
        Math.abs(e.clientX - this.lastPointer.x) +
          Math.abs(e.clientY - this.lastPointer.y) >
        3
      ) {
        this.cb.activity();
        this.setMode('keyboard');
      }
      this.lastPointer = { x: e.clientX, y: e.clientY };
      if (this.mouseDrag) {
        this.cb.camera(
          (e.clientX - this.mouseDrag.x) * 0.006 * this.settings.sensitivity,
          (e.clientY - this.mouseDrag.y) * 0.004,
        );
        this.mouseDrag = { x: e.clientX, y: e.clientY };
      }
      if (!this.cb.inMenu()) this.cb.hover?.(e.clientX, e.clientY);
    });
    addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' && this.touch?.id === e.pointerId) {
        this.touch = null;
        this.touchAxes = { x: 0, z: 0 };
      }
      if (e.button === 2) this.mouseDrag = null;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('click', (e) => {
      if (
        e.pointerType === 'touch' ||
        this.cb.inMenu() ||
        e.target.closest('button,input,#panel')
      )
        return;
      if (e.button === 0) this.cb.worldClick?.(e.clientX, e.clientY);
    });
    addEventListener(
      'wheel',
      (e) => {
        if (!this.cb.inMenu()) {
          this.cb.zoom?.(e.deltaY * 0.0008);
          this.cb.activity();
        }
      },
      { passive: true },
    );
    document.addEventListener('pointerover', (e) => {
      const b = e.target.closest('button,input,select');
      if (b && !b.disabled) {
        document
          .querySelectorAll('.focused')
          .forEach((e) => e.classList.remove('focused'));
        b.focus({ preventScroll: true });
      }
    });
    addEventListener('gamepadconnected', (e) => {
      this.padIndex = e.gamepad.index;
      this.setMode('pad');
      this.cb.activity();
    });
  }
  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    document.body.dataset.input = mode;
    this.cb.mode?.(mode);
  }
  elements() {
    const active =
      document.querySelector('#overlay:not(.hidden) #panel') ||
      document.querySelector('#ending:not(.hidden)') ||
      document.querySelector('#title-screen:not(.hidden)');
    if (!active) return [];
    return [...active.querySelectorAll('button,input,select')].filter(
      (e) => !e.disabled && e.getClientRects().length && !e.closest('.hidden'),
    );
  }
  navigate(dir) {
    const els = this.elements();
    if (!els.length) return;
    const index = els.indexOf(document.activeElement);
    const el = els[(index + dir + els.length) % els.length];
    this.focus(el);
  }
  focus(el) {
    document
      .querySelectorAll('.focused')
      .forEach((e) => e.classList.remove('focused'));
    el?.classList.add('focused');
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  first() {
    const el = this.elements()[0];
    if (el) this.focus(el);
  }
  activate() {
    const e = document.activeElement;
    if (e?.matches('button')) e.click();
    else if (e?.matches('input[type=checkbox]')) e.click();
    else if (!e?.matches('input')) this.first();
  }
  adjust(dir) {
    const e = document.activeElement;
    if (e?.matches('input[type=range]')) {
      e.value = Number(e.value) + dir * Number(e.step || 1);
      e.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (e?.matches('button[data-toggle]')) e.click();
  }
  poll(dt, yaw) {
    let x = 0,
      z = 0;
    let boost = false,
      hush = false,
      action = false,
      glow = false,
      candy = false;
    const menu = this.cb.inMenu();
    const pads = navigator.getGamepads?.() || [];
    const pad = [...pads].find((p) => p?.connected);
    if (pad) {
      this.padIndex = pad.index;
      const b = pad.buttons.map((v) => v?.pressed || v?.value > 0.4),
        rise = (i) => b[i] && !this.padPrev[i];
      const ax = (pad.axes || []).map((v) => (Math.abs(v || 0) > 0.17 ? v : 0));
      if (ax.some((v) => Math.abs(v) > 0.2) || b.some(Boolean)) {
        this.setMode('pad');
        this.cb.activity();
      }
      if (menu) {
        const now = performance.now();
        const dir = b[12] || ax[1] < -0.5 ? -1 : b[13] || ax[1] > 0.5 ? 1 : 0;
        const side = b[14] || ax[0] < -0.5 ? -1 : b[15] || ax[0] > 0.5 ? 1 : 0;
        if (now > this.navNext && (dir || side)) {
          if (dir) this.navigate(dir);
          else this.adjust(side);
          this.navNext = now + 185;
        }
        if (rise(0)) this.activate();
        if (rise(1)) this.cb.action('back');
        if (rise(9) && !b[8]) this.cb.action('back');
      } else {
        x = ax[0] || 0;
        z = ax[1] || 0;
        this.cb.camera(
          (ax[2] || 0) * dt * 1.8 * this.settings.sensitivity,
          (ax[3] || 0) * dt * 0.65,
        );
        boost = b[7];
        hush = b[6];
        action = b[0];
        glow = b[2];
        candy = b[1];
        if (rise(9) && !b[8]) this.cb.action('pause');
        if (rise(3)) this.cb.action('map');
      }
      this.padPrev = b;
    }
    if (!menu) {
      if (this.mode === 'touch') {
        x = this.touchAxes.x;
        z = this.touchAxes.z;
        boost = Math.hypot(x, z) > 0.9;
      } else if (this.mode === 'keyboard') {
        x =
          (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
          (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
        z =
          (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) -
          (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
        boost = this.keys.has('Space');
        hush = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
        action = this.keys.has('KeyE');
        glow = this.keys.has('KeyQ');
        candy = this.keys.has('KeyF');
      }
    }
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return {
      mx: x * Math.cos(yaw) + z * Math.sin(yaw),
      mz: -x * Math.sin(yaw) + z * Math.cos(yaw),
      boost,
      hush,
      action,
      glow,
      candy,
      assist: this.mode === 'touch',
    };
  }
  rumble(heavy = 0.2) {
    const pad = navigator.getGamepads?.()[this.padIndex];
    pad?.vibrationActuator
      ?.playEffect?.('dual-rumble', {
        duration: 180,
        strongMagnitude: heavy,
        weakMagnitude: 0.2,
      })
      .catch(() => {});
  }
}
