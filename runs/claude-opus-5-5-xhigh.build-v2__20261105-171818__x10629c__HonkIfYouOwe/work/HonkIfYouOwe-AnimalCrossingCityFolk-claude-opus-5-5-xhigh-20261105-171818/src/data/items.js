// The item table: everything that can sit in Pockets. Adding an item needs only an entry here.
import { FISH, OLD_BOOT } from './fish.js';
import { BUGS } from './bugs.js';
import { FOSSILS } from './fossils.js';
import { ART } from './art.js';
import { FURNITURE } from './furniture.js';
import { CLOTHES, HAT_ITEMS, GLASSES_ITEMS, UMBRELLAS } from './clothes.js';
import { FLOORS, WALLS } from '../art/textures.js';

export const ITEMS = {};
const add = (it) => { ITEMS[it.id] = it; };
for (const f of [...FISH, OLD_BOOT]) add({ ...f, cat: 'fish', sell: f.beans, iconColors: { o: f.color, x: 'navy' }, tags: ['fish', 'damp'] });
for (const b of BUGS) add({ ...b, cat: 'bug', sell: b.beans, iconColors: { o: b.color, x: 'ink' }, tags: ['bug'] });
for (const f of FOSSILS) { add({ ...f, cat: 'fossil', sell: f.beans, icon: f.set ? 'bone' : 'ammonite', iconColors: { o: 'sand', x: 'orange' }, tags: ['fossil', 'old'] }); }
add({ id: 'unknownFossil', name: 'Unidentified Fossil', cat: 'rawFossil', sell: 400, icon: 'rockIcon', iconColors: { o: 'sand', x: 'orange' }, line: 'A fossil! Or a very confident potato!' });
for (const a of ART) {
  add({ ...a, cat: 'art', sell: Math.round(a.beans / 2), price: a.beans, icon: 'picture', iconColors: { o: 'sky', x: 'orange' }, tags: ['art'] });
  add({ ...a, id: `${a.id}F`, of: a.id, forged: true, cat: 'art', sell: 50, price: a.beans, icon: 'picture', iconColors: { o: 'sky', x: 'orange' }, tags: ['art'] });
}
for (const f of FURNITURE) add({ ...f, sell: Math.round(f.price / 4), iconColors: f.iconColors ?? { o: f.palette?.wood ?? 'sand', x: f.palette?.carpet ?? 'orange' } });
for (const c of [...CLOTHES, ...HAT_ITEMS, ...GLASSES_ITEMS, ...UMBRELLAS]) add({ ...c, sell: Math.round(c.price / 4) });
const SOFT = (id, name, cat, icon, o, x, sell, extra = {}) => add({ id, name, cat, icon, iconColors: { o, x }, sell, ...extra });
// Tools
SOFT('net', 'Net', 'tool', 'net', 'white', 'orange', 200, { price: 800, line: 'For sweeping things out of the air and into your life.' });
SOFT('rod', 'Rod', 'tool', 'rod', 'red', 'orange', 200, { price: 800, line: 'A stick with hopes attached.' });
SOFT('shovel', 'Shovel', 'tool', 'shovel', 'mist', 'orange', 200, { price: 800, line: 'Good for digging. Also for regret, in a pinch.' });
SOFT('axe', 'Axe', 'tool', 'axe', 'mist', 'orange', 200, { price: 1200, line: 'Three hits to a tree. The tree has been told.' });
SOFT('can', 'Watering Can', 'tool', 'can', 'sky', 'navy', 200, { price: 800, line: 'Waters what you point it at. Your shoes, mostly.' });
SOFT('slingshot', 'Slingshot', 'tool', 'sling', 'red', 'orange', 200, { price: 1000, line: 'For balloons. Only for balloons. Bartleby asked.' });
// Town goods
SOFT('weed', 'Weed', 'misc', 'weedIcon', 'green', 'plum', 10, { line: 'A cheerful little weed. Mrs. Gander pays ten beans. She knows.' });
SOFT('pear', 'Pear', 'fruit', 'pear', 'sand', 'plum', 100, { tags: ['fruit', 'sweet'], line: "A pear. It's the village's main fruit and it knows." });
SOFT('fig', 'Fig', 'fruit', 'fruitRound', 'plum', 'green', 500, { tags: ['fruit', 'sweet'], foreign: true, line: "Gran's. It smells like an argument from 1974." });
SOFT('persimmon', 'Persimmon', 'fruit', 'fruitRound', 'orange', 'green', 500, { tags: ['fruit', 'sweet'], foreign: true, line: 'Gran says it builds character. It tastes of disappointment, briefly.' });
SOFT('lime', 'Lime', 'fruit', 'fruitRound', 'lime', 'green', 500, { tags: ['fruit', 'sour'], foreign: true, line: "Gran sent a lime with no note. That's the note." });
SOFT('quince', 'Quince', 'fruit', 'pear', 'sand', 'green', 500, { tags: ['fruit', 'sour'], foreign: true, line: "It's a pear that has been through something." });
SOFT('coconut', 'Coconut', 'fruit', 'fruitRound', 'plum', 'sand', 250, { tags: ['fruit'], line: 'A coconut. It fell. Nobody was hurt, this time.' });
SOFT('mushroom', 'Mushroom', 'fruit', 'mush', 'red', 'white', 200, { tags: ['mushroom'], line: 'Found in the woods. It looks back.' });
SOFT('sapling', 'Sapling', 'plant', 'sapling', 'lime', 'plum', 200, { price: 640, line: 'Three days and it will be somebody else’s problem. A tree.' });
for (const [i, sp] of ['Tulip', 'Daisy', 'Rose', 'Bellflower'].entries()) {
  SOFT(`seed${sp}`, `${sp} Seeds`, 'seed', 'seed', ['red', 'sand', 'plum', 'sky'][i], 'green', 60, { species: i, price: 240, line: `Plant them. Water them. Talk to them if you've nobody else.` });
}
export const FLOWER_SPECIES = ['Tulip', 'Daisy', 'Rose', 'Bellflower'];
export const FLOWER_COLORS = ['red', 'sand', 'white', 'sky', 'plum'];
for (let s = 0; s < 4; s++) for (let c = 0; c < 5; c++) add({ id: `flower${s}${c}`, name: `${['Red', 'Yellow', 'White', 'Blue', 'Purple'][c]} ${FLOWER_SPECIES[s]}`, cat: 'flower', species: s, color: c, icon: 'flowerIcon', iconColors: { o: FLOWER_COLORS[c], x: 'sand' }, sell: 80 + (c > 2 ? 100 : 0), tags: ['flower'], line: "It's a flower. It's doing its best." });
SOFT('shellScallop', 'Scallop Shell', 'shell', 'shell', 'white', 'orange', 60, { line: 'Empty. The owner has moved out.' });
SOFT('shellConch', 'Conch', 'shell', 'shell', 'orange', 'plum', 300, { line: 'You can hear the sea. And a faint complaint.' });
SOFT('shellSand', 'Sand Dollar', 'shell', 'shell', 'sand', 'white', 150, { line: "Not legal tender. Mrs. Gander checked." });
SOFT('shellCowrie', 'Cowrie', 'shell', 'shell', 'plum', 'white', 200, { line: 'Used as money once. It remembers.' });
SOFT('shellCommon', 'Common Shell', 'shell', 'shell', 'mist', 'white', 15, { line: 'Very common. It has stopped trying.' });
SOFT('driftBottle', 'Message in a Bottle', 'oddity', 'driftIcon', 'cyan', 'sand', 500, { line: "It says 'hello', and then a long list of grievances." });
SOFT('driftLog', 'Interesting Driftwood', 'oddity', 'driftIcon', 'mist', 'slate', 120, { line: 'Interesting to whom, you could not say.' });
SOFT('driftSpoon', 'The Big Spoon', 'oddity', 'driftIcon', 'mist', 'sky', 240, { line: "Too big for anyone you know. So far." });
SOFT('bagOfBeans', 'Bag of Beans', 'bag', 'bag', 'sand', 'orange', 0, { beans: 1000, line: 'Beans are currency, dear. You can’t plant them.' });
SOFT('bigBag', 'Big Bag of Beans', 'bag', 'bag', 'orange', 'plum', 0, { beans: 5000, line: 'A big bag. It looks at you like you owe it something.' });
SOFT('cheese', 'Wheel of Cheese', 'cheese', 'cheese', 'sand', 'orange', 0, { tags: ['cheese'], line: "It only goes up. Mostly. Until it goes off." });
SOFT('cheeseOff', 'Gone-Off Cheese', 'cheese', 'cheese', 'green', 'teal', 1, { tags: ['cheese', 'gross'], line: 'It has developed a smell, and then a personality.' });
SOFT('medicine', 'Medicine', 'misc', 'medicine', 'red', 'sand', 100, { price: 400, line: 'Cures stings. Tastes of being told off.' });
SOFT('stationery', 'Fine Stationery', 'misc', 'letter', 'plum', 'mist', 40, { price: 160, line: 'For writing letters people may even read.' });
SOFT('patternKit', 'Pattern Kit', 'misc', 'floorIcon', 'plum', 'sand', 20, { line: 'Your own pattern, ready to lay on the ground or nail to a post.' });
SOFT('parcel', 'Parcel', 'quest', 'gift', 'sand', 'plum', 0, { noSell: true, line: 'Someone else’s business, wrapped.' });
SOFT('lostThing', 'Lost Thing', 'quest', 'question', 'slate', 'sand', 0, { noSell: true, line: "It belongs to someone. It's not telling." });
SOFT('boxedGift', 'Wrapped Present', 'gift', 'gift', 'red', 'sand', 60, { line: 'It might be anything. It rattles.' });
SOFT('coffeeBean', 'Coffee to Go', 'misc', 'coffee', 'plum', 'orange', 40, { line: "Lou's. It's still thinking about being hot." });
SOFT('queasyGift', 'Soup Survivor Medal', 'oddity', 'trophy', 'green', 'plum', 30, { line: 'For enduring the soup. Worn with shame.' });
SOFT('scarfGift', 'Scarf, Yolanda’s', 'misc', 'shirt', 'orange', 'red', 200, { handmade: 'yolanda', line: 'She knitted it. It might be a scarf. Give it time.' });
SOFT('poemGift', "Nib's Poem", 'misc', 'letter', 'navy', 'white', 20, { handmade: 'nib', line: 'It is about your hat. It ends badly.' });
SOFT('soupGift', "Tuesday's Soup", 'misc', 'coffee', 'orange', 'sand', 90, { handmade: 'dorrit', tags: ['soupy'], line: "It's Tuesday's. Tuesday was a good day for soup." });
SOFT('stringGift', 'Red String', 'misc', 'rug', 'red', 'plum', 50, { handmade: 'ozzie', line: "Ozzie says it connects everything. It's about a metre long." });
SOFT('smileGift', "Tavi's Pebble", 'misc', 'rockIcon', 'sand', 'white', 30, { handmade: 'tavi', line: "She smiled at this rock and it's going really well, isn't it?!" });
SOFT('stampGift', 'Bureau Stamp', 'misc', 'letter', 'slate', 'white', 80, { line: 'It stamps DENIED and nothing else.' });
for (const [i, title] of ['Quiet Please', 'Bus Stop Waltz', 'Old Pear Blues', 'Upside Down', 'Soup For One', 'Debt Nocturne'].entries()) add({ id: `record${i}`, name: `Record: ${title}`, cat: 'record', icon: 'record', iconColors: { o: 'night', x: ['red', 'sky', 'lime', 'sand', 'orange', 'plum'][i] }, song: `vesper${i}`, sell: 200, line: 'Vesper made this hanging upside down. That’s how the notes fall out.' });
for (const f of FLOORS) add({ id: f.id, name: f.id.replace('floor-', '').replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) + ' Floor', cat: 'floor', icon: 'floorIcon', iconColors: { o: 'orange', x: 'plum' }, price: 1400, sell: 350, line: 'For walking on. Or lying on, if the day has gone that way.' });
for (const f of WALLS) add({ id: f.id, name: f.id.replace('wall-', '').replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) + ' Wallpaper', cat: 'wall', icon: 'wallpaper', iconColors: { o: 'sand', x: 'orange' }, price: 1400, sell: 350, line: 'Wallpaper. A whole personality, sold by the roll.' });
export const itemName = (id) => ITEMS[id]?.name ?? id;
export const SELLABLE = (id) => { const it = ITEMS[id]; return !!it && !it.noSell && it.cat !== 'bag'; };
