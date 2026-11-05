// Data: the people of Thimbleton (and the voices from the sky and the Rift). rig: E.Humanoid / E.Blob options;
// voice: the Animalese profile (pitch Hz, range, wave, formant, speed, vibrato); lines: idle talk, each [condition, text].
(() => {
const DQ = globalThis.DQ;
DQ.VOICES = {
  granny: { pitch: 165, range: .25, wave: 'triangle', formant: .9, speed: .85, vib: [5, .03] },
  wren: { pitch: 330, range: .35, wave: 'pulse', formant: 1.25, speed: 1.2 },
  mortimer: { pitch: 110, range: .15, wave: 'sawtooth', formant: .8, speed: .8, noise: .2 },
  marigold: { pitch: 240, range: .3, wave: 'triangle', formant: 1.1, speed: 1, bounce: true },
  professor: { pitch: 200, range: .2, wave: 'pulse12', formant: 1.15, speed: 1.2 },
  lintwick: { pitch: 520, range: .4, wave: 'sine', formant: 1.4, speed: 1.1, chirp: true },
  gnarlgrim: { pitch: 70, range: .1, wave: 'sawtooth', formant: .7, speed: .8, drive: true },
  buttonsworth: { pitch: 90, range: .12, wave: 'square', formant: .75, speed: .9 },
  frayvern: { pitch: 55, range: .08, wave: 'sawtooth', formant: .6, speed: .7, echo: true },
  sign: { pitch: 180, range: .1, wave: 'triangle', formant: 1, speed: 1.4 }
};
DQ.NPCS = {
  wren: { name: 'Wren', full: 'Wren Tuck', job: 'gatherer', fav: 'bedroom', helper: true, speedK: 1.15,
    rig: { size: .85, build: 'chibi', hair: 'ponytail', outfit: 'shirt', weapon: null, face: { eyes: 'big' }, colors: { hair: '#e07a2a', cloth: '#5aa04a', pants: '#6a4a3a', skin: '#f6c8a0', trim: '#e8c870' } },
    fighter: { dmg: 4, range: 96, every: 1.2, kind: 'sling' },
    intro: ['Whoa! Are you a monster? You don\'t LOOK like a monster.', 'Monsters don\'t usually wave. I\'m Wren! I saw the light from the road!'],
    arrive: 'Wren has moved into Thimbleton!',
    lines: [
      [null, 'Granny says people used to sleep on things called "beds". Do they bite?'],
      [null, 'You MADE that? With your hands? On PURPOSE?!'],
      [null, 'I\'m going to be a Builder too when I grow up. I\'ve been practising "bildering" with sticks.'],
      ['night', 'Is it bedtime? I don\'t want to sleep. I might miss you making something!'],
      ['day', 'I put some straw and sticks in the Town Chest for you. Bildering stuff!'],
      ['lv3', 'Thimbleton is getting so BIG. I can\'t even see the edge of the stitches from here!'],
      ['belly', 'You look peckish, Builder. Want a berry? It\'s a bit squished.'],
      ['unhappy', 'I tried sleeping on the ground. The ground is very... groundy.'],
      ['happy', 'I slept SO well! I dreamed I was a pillow!']
    ] },
  mortimer: { name: 'Mortimer', full: 'Mortimer Bodkin', job: 'guard', fav: 'guardPost', helper: true, speedK: .85,
    rig: { size: 1.05, build: 'bulky', hair: 'bald', hat: { style: 'helmet', color: '#8a8a98' }, outfit: 'coat', armor: true, weapon: 'club', face: { eyes: 'big' }, stance: 'ready', colors: { cloth: '#6a6a78', coat: '#5a5a6a', pants: '#3a3a48', skin: '#e0b090', plate: '#9a9aa8', metal: '#8a8a98', hilt: '#5a3a22', hair: '#e8e8f0' } },
    fighter: { dmg: 8, range: 22, every: .9, kind: 'melee' },
    intro: ['Hmph. Another dreamer. I\'m Mortimer. I guarded this town when it had walls.', 'It doesn\'t now, in case you hadn\'t noticed.'],
    arrive: 'Mortimer has moved into Thimbleton!',
    lines: [
      [null, 'In my day we slept on rocks, and we were GRATEFUL for the rocks.'],
      [null, 'A club is just a stick with ambition.'],
      [null, 'Hmph. Keep your guard up, Builder. Knots don\'t knock.'],
      ['night', 'Lock the doors! Well. Close them, at least. We don\'t have locks. Or keys.'],
      ['lv3', '...Not bad, Builder. Not bad at all. Don\'t let it go to your head.'],
      ['belly', 'Your stomach is louder than a Knotbrute. Eat something.'],
      ['unhappy', 'A guard needs a post to stand at. I\'ve been standing at a tree.'],
      ['happy', 'Stood watch all night. Felt like old times. Better, even.']
    ] },
  marigold: { name: 'Marigold', full: 'Marigold Purl', job: 'cook', fav: 'kitchen', helper: false, speedK: 1,
    rig: { size: 1, build: 'chibi', hair: 'long', hat: { style: 'cap', color: '#ffffff' }, outfit: 'robe', weapon: null, face: { eyes: 'big' }, colors: { hair: '#f0d070', cloth: '#e8a0a0', trim: '#ffffff', pants: '#c87a7a', skin: '#f6c8a0' } },
    fighter: { dmg: 5, range: 80, every: 1.6, kind: 'pie' },
    intro: ['Is that a TABLE? I could weep! I\'m Marigold. I cook. Or I would, if anyone had a pot!', 'I\'ve got Glen Stew in my head and not a single pot to stew it in! It\'s a crock, I tell you. A CROCK!'],
    arrive: 'Marigold has moved into Thimbleton!',
    lines: [
      [null, 'Supper\'s on at six! Wash your paws, Lintwick.'],
      [null, 'A good stew is like a good quilt: lots of bits, all stitched together with love. And salt.'],
      [null, 'I put a bun in the Town Chest for you. Don\'t tell Wren, she\'ll want two.'],
      ['night', 'Mmm. I can smell tomorrow\'s breakfast already. That\'s a lie, but a hopeful one.'],
      ['belly', 'Builder! You\'re as thin as a thread! Eat, eat!'],
      ['unhappy', 'A cook with no kitchen is just a person who talks about food. A LOT.'],
      ['happy', 'My kitchen! My lovely kitchen! I\'ve named every spoon.']
    ] },
  professor: { name: 'Professor', full: 'Professor Hemsley Selvage', job: 'helper', fav: 'workshop', helper: true, speedK: 1,
    rig: { size: 1.05, build: 'heroic', hair: 'short', hat: { style: 'pointed', color: '#2a4a3a' }, outfit: 'robe', weapon: null, face: { eyes: 'big' }, colors: { hair: '#a8a8b0', cloth: '#3a6a5a', trim: '#e8c870', pants: '#2a3a3a', skin: '#e8c0a0' } },
    fighter: null,
    intro: ['Fascinating! A functioning door! Do you realise nobody has hinged anything in forty years?', 'Professor Hemsley Selvage, scholar of the Knack. I brought a Pattern. It is a schematic of considerable grandeur.'],
    arrive: 'Professor Selvage has moved into Thimbleton!',
    lines: [
      [null, 'Fascinating! The way you join two blocks. No glue! No nails! Just... Knack.'],
      [null, 'I have catalogued nineteen kinds of lint. Lintwick objects to being number fourteen.'],
      [null, 'A Pattern is a promise, Builder. Every block is a word of it.'],
      ['night', 'At night I read the old Pattern margins. They are mostly doodles of cats.'],
      ['unhappy', 'A scholar without a workshop is merely a man with opinions.'],
      ['happy', 'My workshop is a marvel. I have already lost three pencils in it.']
    ] },
  lintwick: { name: 'Lintwick', full: 'Lintwick', job: 'farmer', fav: 'bedroomFelt', helper: false, blob: true, speedK: 1,
    rig: { R: 7, colors: { base: '#cfcad6', dk: '#9a94a8', lt: '#f0eef4', eye: '#2a2438' }, feet: true, mouth: true, face: 'front' },
    fighter: { dmg: 3, range: 18, every: 1.4, kind: 'roll' },
    intro: ['Lintwick not bad monster! Lintwick just fuzzy!', 'Builder break cage? Builder best friend now. Lintwick decided.'],
    arrive: 'Lintwick has moved into Thimbleton!',
    lines: [
      [null, 'Lintwick want bed. Soft bed. Lintwick will not shed on it. ...Much.'],
      [null, 'Lintwick put fluff in big chest. Fluff is present. You are welcome.'],
      [null, 'Other Lintlings say Lintwick traitor. Lintwick say: Lintwick has BED.'],
      ['night', 'Lintwick glow a tiny bit at night. Is fine. Is natural.'],
      ['unhappy', 'Lintwick bed need felt. Felt is cosy. Lintwick is particular.'],
      ['happy', 'Lintwick so happy Lintwick could roll. Lintwick IS rolling.']
    ] }
};
DQ.NPC_ORDER = ['wren', 'mortimer', 'marigold', 'professor', 'lintwick'];
DQ.SPEAKERS = { granny: { name: 'Granny Gossamer', gold: true }, gnarlgrim: { name: 'Gnarlgrim' }, buttonsworth: { name: 'Sir Buttonsworth' }, frayvern: { name: 'Frayvern' }, sign: { name: 'Sign' }, builder: { name: '' } };
})();
