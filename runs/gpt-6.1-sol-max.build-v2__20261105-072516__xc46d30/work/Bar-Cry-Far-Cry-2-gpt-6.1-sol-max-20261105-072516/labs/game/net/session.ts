/** @file AI Hub v1 connection, made before the renderer starts. Standalone transports never run in a hub session. */
export interface Player {
  id: number;
  name: string;
  color: string;
}
export interface Net {
  me: number;
  host: number;
  isHost: boolean;
  players: Player[];
  time(): number;
  send(data: unknown, options?: { to?: number; reliable?: boolean }): boolean;
  on(event: string, fn: (data: unknown, from?: number) => void): unknown;
}
export interface Hub extends Net {
  active: boolean;
  server: boolean;
  seed: number;
  connect(options: object): Promise<Info | null>;
  ready(): void;
  answer(key: string): void;
  finish(data: object): void;
  fail(message: string): void;
}
export interface Info {
  me: number;
  host: number;
  isHost: boolean;
  server: boolean;
  seed: number;
  players: Player[];
  limitMs: number;
}
export const hub = (globalThis as unknown as { AIHub?: Hub }).AIHub;
export const info = hub?.active ? await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
export const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

export function ownCard(): HTMLElement | null {
  if (!hub || !info) return null;
  const root = document.createElement('div');
  root.className = 'session-card';
  root.dataset.screen = 'card';
  root.innerHTML =
    '<p class="eyebrow">COOPERATIVE CONTRACT / 01</p><h1>Bar Cry</h1><h2>Burn the depot.<br>Get out alive together.</h2><div class="crew"></div><p>WASD / left stick moves · Click / R2 fires<br>E / □ uses · F / D-pad right draws a flare</p><button class="primary">Enter / ✕ · Ready</button><button>△ · More time</button><p class="card-count">Waiting for the crew</p>';
  for (const p of info.players) {
    const line = document.createElement('p');
    line.textContent = p.name;
    line.style.color = p.color;
    root.querySelector('.crew')!.append(line);
  }
  const answer = () => hub.answer('ready');
  root.querySelectorAll('button')[0].onclick = answer;
  root.querySelectorAll('button')[1].onclick = () => hub.answer('more');
  const key = (e: KeyboardEvent) => {
    if (e.code === 'Enter') answer();
    if (e.code === 'KeyY') hub.answer('more');
  };
  addEventListener('keydown', key);
  let previous = false;
  const pad = setInterval(() => {
    const p = [...navigator.getGamepads()].find(Boolean),
      down = !!p?.buttons[0]?.pressed;
    if (down && !previous) answer();
    if (p?.buttons[3]?.pressed) hub.answer('more');
    previous = down;
  }, 100);
  hub.on('card', (raw) => {
    const d = raw as { left: number; ready: number[] };
    root.querySelector('.card-count')!.textContent = `${Math.max(0, Math.ceil(d.left / 1000))} · Crew assembling`;
  });
  hub.on('start', () => {
    root.remove();
    clearInterval(pad);
    removeEventListener('keydown', key);
  });
  hub.on('end', () => {
    root.remove();
    clearInterval(pad);
    removeEventListener('keydown', key);
  });
  document.body.append(root);
  return root;
}
