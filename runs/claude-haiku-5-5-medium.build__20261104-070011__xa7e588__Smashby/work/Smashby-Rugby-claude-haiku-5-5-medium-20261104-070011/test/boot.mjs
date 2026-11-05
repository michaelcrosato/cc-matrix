import { loadGame } from './load.mjs';
try {
  const { ctx, SM, E } = loadGame();
  const g = ctx.__smashby || null;
  console.log('loaded; scenes:', Object.keys(SM.scenes).join(','));
} catch (e) { console.log('FAILED', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(1); }
