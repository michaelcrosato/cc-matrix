// Every spoken line. 'id': [speaker, 'TEXT']. Under 60 characters; long thoughts are split across lines.
// A subtitle stays under 60 characters: a longer sentence goes across lines in sequence, at the sentence or clause nearest its middle.
const split = (t) => {
  if (t.length < 60) return [t];
  const mid = t.length / 2; let best = -1, score = 1e9;
  for (let i = 1; i < t.length - 1; i++) { if (t[i] !== ' ') continue; const before = t[i - 1], rank = '.?!'.includes(before) ? 0 : ',;:'.includes(before) ? 8 : 16, s = Math.abs(i - mid) + rank; if (s < score) { score = s; best = i; } }
  return [...split(t.slice(0, best)), ...split(t.slice(best + 1))];
};
const L = (who, ...texts) => texts.flatMap(split).map((t) => [who, t]);
export const SPEAKERS = {
  bakr: { name: 'OLD BAKR', color: 'mist', voice: 'bakr' }, odile: { name: 'SISTER ODILE', color: 'white', voice: 'odile' }, tibor: { name: 'TIBOR', color: 'orange', voice: 'tibor' },
  vance: { name: 'COL. VANCE', color: 'mist', voice: 'vance' }, ansa: { name: 'MOTHER ANSA', color: 'red', voice: 'ansa' }, harrow: { name: 'HARROW', color: 'sand', voice: 'harrow' },
  ines: { name: 'INES', color: 'sand', voice: 'ines' }, dov: { name: 'DOV', color: 'mist', voice: 'dov' }, mags: { name: 'MAGS', color: 'lime', voice: 'mags' },
  pell: { name: 'PELL', color: 'orange', voice: 'soldier' }, soldier: { name: 'SOLDIER', color: 'mist', voice: 'soldier' }, you: { name: '', color: 'sand', voice: 'none' }, radio: { name: 'RADIO', color: 'cyan', voice: 'soldier' },
};
export const LINES = {
  'm0.ride': L('bakr', 'Forty miles of track and not one station that remembers its name.', 'They paint the signs over. Whoever won last.', 'You have the look of a man who read about this place.', 'Reading is a good way to visit.', 'That is the Kettle. Grass to the rim, and all of it for sale.', 'You have a map. Everyone has a map. Have a look at yours.'),
  'm0.after': L('bakr', 'Up there they will ask you which side. Say yes.', 'Mile Forty. Mind the gap. It used to be a platform.', 'You are a bad colour, friend. Sit down before you fall down.'),
  'm1.wake': L('odile', 'You came in on the goods and fell off it. Good morning.', 'Blackwater. You had it before you got here. Take this. Now.', 'Three tablets. The fourth you pay for. I do not mean in stones.'),
  'm1.brief': L('odile', 'Sixty-one beds. Forty blankets. You are the math.', 'Three Wells has eleven children with the flux and no salts.', 'There is a truck. It runs on Tuesdays and on prayer.', 'There is a rifle. It came with the last man. He stays here now.', 'I do not need you to be good. I need you to be on time.'),
  'm1.arrive': L('odile', 'Radio says you made it. Eleven became twelve while you drove.', 'Come back by the west road. It was open this morning.'),
  'm1.jam': L('you', 'It has jammed. Slap it and rack it. Keep pressing.'),
  'm1.stall': L('you', 'The truck is dying. Open the bonnet and hold.'),
  'm1.done': L('odile', 'You are late. Less late than I expected.', 'Three tablets, as agreed. Five stones from the box, not from me.', 'The Pump Shed on the west track is empty. The last tenant is here.', 'Sleep there. Tibor wants a word. He wants a word with everyone.'),
  'm2.brief': L('tibor', 'Everything on this rack has been returned at least once.', 'It fires. If you want it to fire twice, that is a different price.', 'Ines Carvalho owes me for a truck. The Concord have her in a cage.', 'A dead debtor pays nothing. Ranger Post, up the north road.', 'Eight men and a tower. They sleep badly but they sleep.', 'Go at night if you are clever. Grass will hide you if you crouch.'),
  'm2.cage': L('ines', 'You are not the one I was hoping for. Open it anyway.', 'I flew for both of them. Neither paid. Get in.', 'No truck? Then we run. You owe me a truck.'),
  'm2.after': L('ines', 'You fall down out here, I will come and get you. Once a day.', 'It is not friendship. I keep books.'),
  'm2.done': L('tibor', 'She is back? Then the debt is alive and well. Eight stones.', 'That post is yours now, until somebody wants it more.', 'Colonel Vance has an invoice for you. So has the schoolteacher.'),
  'm3.brief': L('vance', 'Sit. Forgive the smell of oil. One keeps things clean.', 'The Harvest stores fuel at East Siding. Three tanks.', 'It would be regrettable if the matter of those tanks concluded.', 'Take this flare pistol. Mind the wind. The grass keeps no sides.', 'Light it upwind. Your invoice will be honoured, regrettably.'),
  'm3.alt': L('ines', 'Better idea. A tanker sits at Post 3. Bring it in yourself.', 'They hold fire for their own truck. Right up until they do not.', 'Five more stones in it. And you owe me less. Say yes.'),
  'm3.done': L('vance', 'I have seen the smoke from my window. It is most exact.', 'We do not burn villages. We conclude them.', 'Fifteen stones. Do sign. Regrettably there is no copy.'),
  'm4.brief': L('ansa', 'Stand up straight. Did you say less people or fewer people?', 'You said less people. Fewer. Fewer people.', 'It will matter by the end of the month.', 'The Concord pays its soldiers across the salt, on a loop, in a truck.', 'Stop the truck. Bring me the case. It may fly. Things do.', 'Take this tracker. It finds cases. It finds nothing else of use.'),
  'm4.alt': L('dov', 'Two fingers I left in this country. I came back to see what they are doing.', 'I have two charges and a bridge on the back road, near the salt.', 'A man asked me to mine his own road, so he would know where it was safe.', 'He was right for a week. Plant them. Blow it as they cross.'),
  'm4.done': L('ansa', 'Twenty stones. That is one word, not two.', 'A hungry man reads quickly. You have fed nobody. Sit down.'),
  'm4.dov': L('dov', 'You are the one who pays. I sit at Tibor\'s, if you want a road opened.'),
  'm5.brief': L('vance', 'The water question has been a great sorrow to this office.', 'Three Wells drinks from the pump on the Mercy, you see.', 'And Three Wells, in the view of this office, feeds the Harvest.', 'Conclude the pump. Twenty stones. There are no further questions.'),
  'm5.alt': L('mags', 'Hold still. Listen. There is a bypass valve at the pump.', 'Open it, hold the house for a minute, the cistern fills. Then break it.', 'They drink for a year. You get paid less. No, that is normal.'),
  'm5.done': L('vance', 'I am told the pump is quiet. Do accept the sorrow of this office.', 'Twenty stones. Regrettably the villagers will not be sending a card.'),
  'm5.done.alt': L('vance', 'The pump is quiet, and yet the cistern is full. How regrettable.', 'I shall conclude that you are ten stones short of the agreement.'),
  'm5.empty': L('odile', 'A hundred and four people walked in this morning. I counted.', 'No tablets until you have run a crate for me. For nothing.'),
  'mags.meet': L('mags', 'You run crates for Odile? Then you bleed on her floor. Hold still.', 'Mags Oyelaran. They took my licence. They kept the debt.', 'Not today. Today you owe me money.'),
  'dov.meet': L('dov', 'A sapper is a man who reads the ground and is wrong once.', 'I will bring you two charges a job. Call it a hobby.'),
  'm6.brief': L('ansa', 'Burn the field. A hungry man learns to read the wind.', 'The Long Field feeds the fort. There is a bunker at its north end.', 'Go at night. Take your friend. Whom. Whom you trust.', 'Wind from the south, they say. They say many things.'),
  'm6.partner': L('ines', 'So we burn a farm. I have burned worse for less.'),
  'm6.turn': L('radio', 'WIND IS TURNING. WIND IS TURNING. GET OUT OF THE CROP.'),
  'm6.burning': L('ines', 'Don\'t let it be the fire. Please. Not the fire.'),
  'm6.done': L('ansa', 'I saw the whole sky from the schoolroom. Twenty-five stones.', 'Your friend? The word you want is sorry. Spell it later.'),
  'm7.note': L('harrow', 'You have drawn well. Come and see.'),
  'm7.arrive': L('radio', 'ALL UNITS TO THE MINE. THE TRUCE IS A MATTER FOR HISTORIANS.', 'HARVEST ON THE NORTH TERRACE. CONCORD ON THE HEADFRAME.', 'WHOEVER HAS THE SLUICE HOUSE HAS THE STONES. NOBODY HAS IT.'),
  'm7.alt': L('ines', 'I can hold the east road. Go in from the pit side. No charge.'),
  'm7.ledger': L('harrow', 'One contractor, paid in advance, to walk the Kettle.', 'Signed. E.H. In a hand you have been reading for a week.'),
  'm7.done': L('tibor', 'The truce is finished. I have moved the stock to your lockers.', 'Consider it returned.'),
  'm8.brief': L('odile', 'Mile Forty is under the guns. Both sets. I have three hundred people.', 'The train takes them. Hold the platform for two minutes.', 'Sixty-one beds. Forty blankets. Now none. On time, please.'),
  'm8.hold': L('odile', 'Two hundred and twelve aboard. Keep them off the rails.', 'Ninety left. They are carrying the ones who cannot walk.', 'Forty. Do not count them for me. I am counting.'),
  'm8.bakr': L('bakr', 'This was Queen\'s Halt. Then Freedom. Then nothing. Get on the gun.'),
  'm8.done': L('bakr', 'He says the grass will not burn twice. Your cartographer.', 'They are walking it now. Look at them. All that black ground.'),
  'm9.top': L('harrow', 'You are late. I said you would be. Sit down.', 'It won\'t take long. Neither of us has long.'),
  'm9.scene': L('harrow', 'I drew the lines that started this. I would like to draw one more.', 'You have been drawing for me. Look at it.', 'Burned grass cannot burn twice.', 'It is the only safe road in the country, and you built it for wages.', 'Here are my tablets. Here is the only honest sheet of that minefield.', 'I paid for your contract. You may as well finish it. Or not.'),
  'm9.shot': L('harrow', 'Yes. That is what the paper says.'),
  'm9.spared': L('harrow', 'You will want to write that down. Nobody will read it.'),
  'end.walk': L('harrow', 'A map is a promise made by someone who has already left.'),
  'end.column': L('odile', 'Three hundred and six. I counted. Hold them off until the last one.'),
  'end.last.walk': L('bakr', 'They paint the signs over. Whoever won last. Somebody will paint this one.'),
  'end.last.column': L('bakr', 'Forty miles of track and not one station that remembers. They will remember this.'),
  'end.stand': L('radio', 'CONTACT AT THE PASS. CONCORD AND HARVEST BOTH.', 'THEY AGREE ON SOMETHING AT LAST. IT IS YOU.', 'THE RAIN HAS STOPPED. THE GRASS BEYOND THE SCAR IS DRY.'),
  'end.ines': L('ines', 'You owe me several trucks. I will take it in stones.'),
  'end.dov': L('dov', 'A man once kept a promise here. It ends badly. Hand it over.'),
  'end.mags': L('mags', 'Hold still. No, you can\'t feel that. Give me the case.'),
  'end.split': L('ines', 'We could split it. I keep books. I would rather not draw.'),
  'fever.collapse': L('odile', 'I told you. On time. You are paying me in hours now.'),
  'buddy.carry': L('mags', 'You weigh more than you are worth. Up. Up.'),
  'rescue.ines': L('ines', 'I flew for worse than you. Not much worse. On your feet.', 'You owe me a truck. You owe me several trucks.'),
  'rescue.dov': L('dov', 'A man lay down in this grass once. It ended badly. Get up.'),
  'rescue.mags': L('mags', 'Hold still. No, you can\'t feel that. No, that\'s normal. Hold still.', 'Not today. Today you owe me money.'),
  'tibor.idle': L('tibor', 'Everything on this rack has been returned at least once.'),
  'odile.idle': L('odile', 'Sixty-one beds. Forty blankets. Bring a crate or leave.'),
  'bakr.idle': L('bakr', 'This was Queen\'s Halt. Then Freedom. Then they stopped painting.'),
  'mercy.offer': L('odile', 'A crate. A place. Five minutes. Four tablets. Do not stop to think.'),
  'mercy.done': L('odile', 'Four. Count them. I did.'),
  'mercy.fail': L('odile', '...'),
  'bakr.halt.west': L('bakr', 'West Cutting. It was Port Albert, with no port. Nobody laughed.'),
  'bakr.halt.mile': L('bakr', 'Mile Forty. Forty from what, they never said. It is still forty.'),
  'bakr.halt.east': L('bakr', 'East Siding. It was Prosperity. They burned the sign for warmth.'),
  'bakr.halt.cut': L('bakr', 'Cut Spur. The company called it Hope Junction, for the shareholders.'),
  'wall.none': L('you', 'Nobody on the wall yet. There is room.'),
};
export const BARKS = {
  concord: {
    spotted: ['There! In the grass!', 'Contact. Do the paperwork later.', 'Movement, east of the post.', 'He has no authorisation!'],
    lost: ['Lost him. Note it down.', 'Where did he go?', 'Nothing. Keep looking.'],
    grenade: ['Bottle! Move!', 'Down! Down!'],
    jammed: ['It\'s stuck! It\'s stuck again!', 'This rifle was issued broken!'],
    fire: ['Who lit that?', 'The grass! The grass is going!', 'Get upwind, you idiot!'],
    down: ['Leave him, he\'s already gone.', 'Man down. Fill out the form.'],
  },
  harvest: {
    spotted: ['There! In the grass!', 'Feed him lead, brothers!', 'Stranger on our land!', 'Enemy of the people!'],
    lost: ['Gone to ground. Burn him out.', 'He ran. They all run.', 'Nothing here but crickets.'],
    grenade: ['Fire bottle! Scatter!', 'Throw it back! No, run!'],
    jammed: ['It\'s stuck! It\'s stuck again!', 'Mother of God, my gun!'],
    fire: ['Who lit that?', 'Our field! Our field!', 'Run crosswind! Crosswind!'],
    down: ['Leave him, he\'s already gone.', 'Brother down! Avenge him later!'],
  },
  deserter: {
    spotted: ['Who sent you? Who cares.', 'There! On the rocks!'], lost: ['Good. Let him go.', 'Nobody pays us to look.'], grenade: ['Move!'], jammed: ['It\'s stuck! Of course it is!'], fire: ['Who lit that?'], down: ['Leave him, he\'s already gone.'],
  },
};
export const LOSS_LINES = { died: 'YOU DIED IN THE SORREL. THE PAPERWORK WILL TAKE LONGER.' };
export const ENDINGS = {
  walk: 'You reached the border with a case of stones and a map nobody else will ever use. The guard asks your trade. You tell him: surveyor.',
  column: 'They crossed at first light, walking on ash. Nobody has asked who lit it. The fever is not finished with you, and you are out of tablets. It is a good view.',
};
export const FEVER_LINES = ['THE FEVER.', 'IT IS BACK. RIGHT ON TIME.', 'YOUR HANDS ARE SOMEONE ELSE\'S.', 'THE GRASS IS LEANING IN.', 'YOU ARE LATE ALREADY.'];
export const ledgerLines = (l) => [
  ['HECTARES BURNED', l.hectares.toFixed(1)],
  ['PEOPLE MOVED OFF THEIR LAND', String(l.moved)],
  ['MEN YOU WERE PAID TO KILL', String(l.killed)],
  ['FRIENDS LOST', String(l.friends)],
  ['STONES EARNED', String(l.stones)],
];
export { EPIGRAPHS, NOTE_REWARD, NOTES } from './notes.js';
