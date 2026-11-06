// Own URL flags outside a session, for tests: ?op= &stage= &diff= &seed= &bot= &god= &attract= &dev= &scene=
import { App } from '../app.js';
import { OperationStage } from './operation.js';

export function routeFromUrl() {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search);
  if (window.AIHub?.active) return null;
  if (q.get('dev')) App.devUrl = true;
  if (q.get('god')) App.cheats.god = true;
  if (q.get('attractAfter')) App.attractAfter = Number(q.get('attractAfter'));
  if (q.get('attract')) App.startAttractOnBoot = true;
  if (q.get('scene')) App.bootScene = q.get('scene');
  if (q.get('op')) {
    const skill = q.get('bot');
    return new OperationStage({ opId: q.get('op'), mode: 'replay', difficulty: q.get('diff') ?? 'resident', startStage: Number(q.get('stage') ?? 0), seed: Number(q.get('seed') ?? 12345), seats: [{ binding: 'all', bot: skill ? { skill: Number(skill) } : null }], cheats: App.cheats });
  }
  return null;
}
