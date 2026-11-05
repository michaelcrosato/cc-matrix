import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5); const S = game.debug.tools.newVacation('rin', 5), I = game.input;
  G.go('location', { loc: 'pool' }, { fade: 0 }); game.advance(.5);
  G.photo.open(); game.advance(.05); t('photo mode freezes play', G.overlay.has('photo') && game.timeScale === 0);
  G.photo.st.pose = G.PHOTO_POSES.indexOf('peace'); G.photo.st.filter = 2; I.tap('confirm'); game.advance(.05); I.tap('cancel'); game.advance(.1);
  const spec = S.album[S.album.length - 1];
  t('a postcard is saved as a spec', spec && spec.loc === 'pool' && spec.people.length >= 1 && spec.people[0].id === 'rin' && typeof spec.people[0].x === 'number' && spec.people[0].pose === 'peace' && spec.filter === 'Sepia' && spec.cam && spec.cam.view, JSON.stringify(spec && Object.assign({}, spec, { img: null })));
  t('closing restores play', !G.overlay.has('photo') && game.timeScale === 1);
  G.go('album', { from: 'location', back: { loc: 'villa' } }, { fade: 0 }); game.advance(.3); I.tap('confirm'); game.advance(.3);
  const A = G.SCENES.album; t('the album opens one', A.open === S.album.length - 1, A.open);
  const live = G.specScene.rigsFor(spec); t('it is rebuilt from the spec: everyone at their spot in their outfit', live.length === spec.people.length && live[0].x === spec.people[0].x && live[0].rig.suit === S.wearing.suit && live[0].rig.vb && live[0].rig.vb.kind === 'peace');
  t('the camera goes where it was', game.view.id === spec.cam.view, game.view.id + ' vs ' + spec.cam.view);
  const before = live[0].rig.t; game.advance(.5); t('and it stays live (the rigs keep moving)', live[0].rig.t > before);
  I.tap('cancel'); game.advance(.2); t('closing returns to the grid', A.open === -1);
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
};
