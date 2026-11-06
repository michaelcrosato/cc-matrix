/** @file Developer button dispatch, copying authored paths and recorded inputs without a server. */
import type { UIContext } from './context';
import type { DevView } from './dev';
import { CASES, SESSION } from '../data/cases';
import { KINDS } from '../data/tools';
import { BALANCE } from '../data/balance';
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText =
      'position:absolute;left:10%;top:25%;width:80%;height:35%;z-index:999;font-size:20px;background:#102e35;color:#dcebdc';
    document.body.append(area);
    area.focus();
    area.select();
    area.addEventListener('blur', () => area.remove(), { once: true });
  }
}
export function developerAction(c: UIContext, d: DevView, id: string): boolean {
  const cs = [...CASES, SESSION][d.caseIndex];
  if (id.startsWith('dev-tab:')) {
    d.tab = Number(id.split(':')[1]);
    d.page = 0;
  } else if (id === 'dev-prev') d.page = (d.page + (d.tab === 1 ? 6 : 3)) % (d.tab === 1 ? 7 : 4);
  else if (id === 'dev-next') d.page = (d.page + 1) % (d.tab === 1 ? 7 : 4);
  else if (id === 'dev-case-prev' || id === 'dev-case-next') {
    d.caseIndex = (d.caseIndex + (id.endsWith('prev') ? 8 : 1)) % 9;
    d.phase = 0;
  } else if (id === 'dev-phase-prev' || id === 'dev-phase-next')
    d.phase = (d.phase + (id.endsWith('prev') ? cs.phases.length - 1 : 1)) % cs.phases.length;
  else if (id === 'dev-jump') {
    c.d.caseIndex = d.caseIndex;
    c.set('game.autoplay', false);
    c.d.start(d.phase);
  } else if (id.startsWith('dev-act:')) c.act('surgeryControl', { command: id.split(':')[1] });
  else if (id.startsWith('dev-toggle:')) {
    const k = 'game.' + id.split(':')[1];
    c.set(k, !c.get(k));
  } else if (id.startsWith('dev-view:')) {
    const k = id.split(':')[1] as 'hideHud' | 'shapes' | 'assist' | 'freeCamera';
    d[k] = !d[k];
    if (k === 'hideHud') document.getElementById('hud')!.style.visibility = d.hideHud ? 'hidden' : 'visible';
    if (k === 'freeCamera')
      (c.engine()?.inspector?.camera as { set: (code: string) => void })?.set(
        d.freeCamera ? 'cam3=fly' : 'cam3=fixed,0,15,-5,0,-72,42',
      );
  } else if (id === 'dev-look') {
    d.look = 1 - d.look;
    c.set('post.look', d.look ? 'look:harbor' : 'look:field');
  } else if (id === 'dev-step') c.engine()?.inspector?.step(1);
  else if (id === 'dev-spawn-prev' || id === 'dev-spawn-next')
    d.spawn = (d.spawn + (id.endsWith('prev') ? KINDS.length - 1 : 1)) % KINDS.length;
  else if (id === 'dev-spawn') {
    const p = c.hands.seats[0];
    c.act('surgerySpawn', { kind: KINDS[d.spawn], x: p[0], z: p[1], site: p[6] });
  } else if (id === 'dev-seed') {
    d.seed++;
    c.engine()?.inspector?.seed(d.seed);
  } else if (id === 'dev-unlock') {
    c.d.progress.unlocked = 8;
    c.d.progress.ended = true;
    c.save();
  } else if (id === 'dev-author') {
    d.author = true;
    d.path = [];
    c.d.go('op');
  } else if (id === 'dev-copy-path') void copyText(JSON.stringify(d.path));
  else if (id === 'dev-copy-replay') {
    const input = c.engine()?.inspector?.input as { record: () => unknown };
    void copyText(JSON.stringify(input?.record(), null, 2));
  } else if (id.startsWith('balance-reset:')) {
    const k = id.split(':')[1];
    c.set(`game.${k}`, BALANCE[k][0]);
  } else if (id === 'balance-reset-all') for (const [k, [value]] of Object.entries(BALANCE)) c.set(`game.${k}`, value);
  else return false;
  return true;
}
