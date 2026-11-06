/** @file The balanced island ends with a small invitation to stay. */
import type { ScreenApp } from '../context';
export function credits(a: ScreenApp): void {
  a.ui.menu(
    'credits',
    'A LITTLE MORE LEVEL',
    'You held everything.',
    'Plumb opened their eyes. Once. Tare has requested that you do not mention the rock.',
    [
      {
        id: 'practice',
        label: 'Stay a little longer',
        detail: 'Free practice. The ferry does not return.',
        action: () => a.show('board'),
      },
      { id: 'credits', label: 'Credits & Source Information', action: () => a.show('about', 5) },
      {
        id: 'title',
        label: 'Return to title',
        action: () => {
          a.run('game.front');
          a.show('title');
        },
      },
    ],
    { hero: true },
  );
  a.ui.back = () => {
    a.run('game.front');
    a.show('title');
  };
  a.audio.music('song:dawn');
}
