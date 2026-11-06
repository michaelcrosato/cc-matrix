// Chapter 2: The Quiet Ones.
(() => {
const G = (window.GAME ||= {}), { defCase, defScript } = G;
defScript('nestsStep', S => { const n = S.objs.filter(o => o.type === 'nest' && !o.dead); if (n.length && n.every(o => o.mark > 0)) S.ph.d.done = true; });
defScript('swarmEnter', S => { S.flags.swarm = true; S.lacOpt = true; for (const o of S.objs) if (o.type === 'nest') { for (let i = 0; i < 2; i++) G.spawn(S, { t: 'bead', x: o.x, y: o.y }); } });
defScript('repairEnter', S => { S.lacOpt = false; S.flags.swarm = false; let n = 0; for (const o of S.objs) if (o.type === 'laceration') { o.req = true; n++; } const pts = [[120, 96], [150, 150], [205, 78], [262, 156], [316, 112], [300, 74]]; for (let i = n; i < 6; i++) G.spawn(S, { t: 'laceration', x: pts[i][0], y: pts[i][1], r: 8 }); });
defCase({ id: 'c4', number: 4, title: 'The Whistling Man', chapter: 2, doc: 'vale', site: 'flank', seed: 41, clock: 200, vitals: 75, drain: .25,
  patient: 'Captain Ned Harrow, 63', complaint: 'Walked into the ER whistling, with a gaff through his side.', opinion: 'Triage: "Superficial. He is in no pain at all."', story: { before: 'c4_before', after: 'c4_after' }, teach: 'Sonar, barbed extraction, the first strain',
  lightbox: { film: 'spine', at: [158, 92], decoys: [[250, 150], [300, 90]], text: 'Beads of light beside the spine. The film is humming.', moving: true, markAt: [150, 150] },
  phases: [
    { obj: 'Free the gaff', bark: 'Barbed. Relief cuts first, Doctor, or it brings friends.', tut: { verb: 'scalpel', text: 'Cut both short lines to free the barbs, then pull the gaff out with Forceps.' }, spawn: [{ t: 'hook', x: 205, y: 112, a: .35, depth: 38 }] },
    { obj: 'Something moved', bark: 'Sonar, Doctor. Why is there singing in my theatre?', step: 'nestsStep', when: 'done', tut: { verb: 'sonar', text: 'Hold Sonar and sweep. Listen: the song swells and pans toward what is hiding.' }, spawn: [{ t: 'nest', x: 118, y: 110 }, { t: 'nest', x: 300, y: 128 }, { t: 'nest', x: 226, y: 74 }] },
    { obj: 'Kill the swarm', bark: 'Burn the beads. Slash the nests. Forceps after.', enter: 'swarmEnter' },
    { obj: 'Repair the bites', bark: 'Tidy up. He will not thank you. He cannot feel it.', enter: 'repairEnter', spawn: [{ t: 'wound', x: 205, y: 118, a: .35, len: 66, n: 4, w: 11, bleeds: false }] },
  ] });
const SLUR_ROUTE = [[92, 148], [150, 136], [205, 150], [262, 126], [326, 110], [290, 80], [214, 92], [140, 86]];
defCase({ id: 'c5', number: 5, title: 'Slur', chapter: 2, doc: 'vale', site: 'forearm', siteOpt: { nerve: true }, seed: 57, clock: 220, vitals: 70, drain: .2,
  patient: 'Ilse Brandt, 19', complaint: 'Conservatory violinist. Numb left hand. Has never been happier.', opinion: 'She did not want this operation. Her mother signed.', story: { before: 'c5_before', after: 'c5_after' }, teach: 'Legato, fine mode, no-touch anatomy, the clamp',
  phases: [
    { obj: 'Find it', bark: 'Something long under there. Sonar. Mind the gold line.', when: 'flag:legato_found', spawn: [{ t: 'nerve', pts: [[70, 118], [130, 112], [200, 120], [270, 112], [356, 118]] }, { t: 'legato', route: SLUR_ROUTE, hidden: true, total: 240, splitAt: 120, spd: 28 }] },
    { obj: 'Cut as it passes', bark: 'When the ridge reaches the mark, Doctor. Not before.', when: 'flag:legato_out' },
    { obj: 'The long pull', bark: 'Slowly. Barb: let go in the box. I clamp, you burn.', when: 'flag:legato_half', tip: { k: 'fine', text: 'Steady hand: move slowly' } },
    { obj: 'It split!', bark: 'A smaller one. Faster. Naturally.', when: 'flag:legato_dead' },
    { obj: 'Repair the track', bark: 'Fine stitches. She plays with this hand.', spawn: [{ t: 'patch', x: 150, y: 138, r: 15 }, { t: 'patch', x: 276, y: 92, r: 15 }, { t: 'patch', x: 110, y: 104, r: 13 }, { t: 'patch', x: 216, y: 88, r: 13 }, { t: 'patch', x: 322, y: 136, r: 13 }, { t: 'wound', x: 213, y: 148, a: 0, len: 72, n: 5, w: 9, bleeds: false }, { t: 'wound', x: 150, y: 80, a: .1, len: 60, n: 4, w: 9, bleeds: false }] },
  ] });
defCase({ id: 'c6', number: 6, title: 'Bedside Manner', chapter: 2, doc: 'vale', site: 'heart', seed: 71, clock: 240, vitals: 60, drain: .35,
  patient: 'Dr. Marguerite Oyelaran, 61', complaint: 'Chief of Surgery. Collapsed at the Foundation gala, mid-toast.', opinion: 'She left a note on her own chart: "Do not be sentimental."', story: { before: 'c6_before', after: 'c6_after' }, teach: 'The beating heart, timing, tremor, first boss', music: 'boss',
  phases: [
    { obj: 'Open the chest', bark: "It's the Chief, Doctor. So, no pressure. Sternal line.", spawn: [{ t: 'guide', pts: [[213, 42], [214, 80], [212, 120], [213, 160], [214, 190]] }, { t: 'pool', x: 150, y: 120, vol: 90, req: true }, { t: 'pool', x: 280, y: 112, vol: 90, req: true }, { t: 'bleeder', x: 140, y: 88 }, { t: 'bleeder', x: 296, y: 140 }, { t: 'pool', x: 180, y: 158, vol: 70, req: true }] },
    { obj: 'Sedate on the beat', bark: 'Tremolo. Inject each reed just after the beat. Listen.', when: 'flag:tremolo_dead', spawn: [{ t: 'tremolo', x: 213, y: 112 }], tip: { k: 'gift', text: 'Long Breath stills the tremor' } },
    { obj: 'Graft the vessel', bark: 'Stitch between beats. She always did hate a rushed graft.', spawn: [{ t: 'wound', x: 213, y: 112, a: -.5, len: 90, n: 6, w: 10, between: true, bleeds: false }, { t: 'patch', x: 142, y: 136, r: 13 }, { t: 'patch', x: 286, y: 92, r: 13 }, { t: 'wound', x: 270, y: 148, a: .3, len: 66, n: 5, w: 10, between: true, bleeds: false }] },
  ] });
})();
