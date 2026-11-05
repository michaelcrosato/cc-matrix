// boot: the title after boot; attract after 10.5 s idle (not before 10); input returns to the title; no errors
export default async function (t) {
  const { game, B, check, step, snap } = t;
  step(.5);
  check('the title after boot', snap().scene === 'title', JSON.stringify(snap()));
  step(9);
  check('no attract before 10 s', snap().scene === 'title', snap().scene);
  step(1.4);
  check('attract after 10 s idle', snap().scene === 'attract', snap().scene);
  step(3);
  check('attract plays a vignette', snap().attract && snap().attract.vignette === 'rooftops', JSON.stringify(snap().attract));
  t.I.tap('jump'); step(.6);
  check('a press returns to the title', snap().scene === 'title', snap().scene);
}
