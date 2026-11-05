// The Fiasco Cards (the items): each one's side, text, art, the CPU's trigger and its effect as bus modifiers.
// apply(ctx): ctx = { side, match, held (the human-held athlete or the side's star), mod(name, { add | mul | set, test }, plays) }
(() => {
'use strict';
const FF = window.FF;
const C = [
  { id: 'ROCKET_CLEATS', name: 'ROCKET CLEATS', side: 'off', art: 'cleats', text: 'Carrier and receivers +20% speed this play',
    line: 'THOSE SHOES ARE ILLEGAL IN FOUR STATES!',
    cpu: c => (c.down >= 3 && c.toGo >= 10) || (c.trailing && c.timeLeft < 120),
    apply: c => c.mod('speed', { mul: 1.2, test: a => a.side === c.side && (a.carrier || ['WR1', 'WR2', 'RB'].includes(a.slot)) }, 1) },
  { id: 'GLUE_GLOVES', name: 'GLUE GLOVES', side: 'off', art: 'gloves', text: 'No drops. Contested catches +30% this play',
    line: 'NOTHING\'S GETTING LOOSE NOW!',
    cpu: c => c.passCall && c.down >= 3,
    apply: c => { c.mod('catch.p', { add: .3, test: x => x.receiver.side === c.side }, 1); c.mod('noDrop', { set: 1, test: x => x.receiver.side === c.side }, 1); } },
  { id: 'BRICK_WALL', name: 'BRICK WALL', side: 'off', art: 'wall', text: 'Your blockers can\'t be shed for 3.5 seconds',
    line: 'WHERE\'D THEY GET THE BRICKS?!',
    cpu: c => c.passCall && c.down === 3 && c.toGo >= 8,
    apply: c => c.mod('shed.t', { mul: 99, test: x => x.blocker.side === c.side && x.t < 3.5 }, 1) },
  { id: 'HOT_SAUCE', name: 'HOT SAUCE', side: 'any', art: 'sauce', text: 'Your player goes BLAZING for 3 plays',
    line: 'HE DRANK THE WHOLE BOTTLE!',
    cpu: c => c.quarter >= 3 && !c.usedHot,
    apply: c => { const a = c.held || c.star; if (a) c.match.ots.setHot(a, 3, 'sauce'); } },
  { id: 'MEGA_HIT', name: 'MEGA HIT', side: 'def', art: 'fist', text: 'This play\'s first tackle is a MEGA HIT',
    line: 'SOMEBODY\'S GOING TO ORBIT!',
    cpu: c => c.down === 3 || c.redZone,
    apply: c => c.mod('mega', { set: 1, test: x => x.tackler.side === c.side, once: true }, 1) },
  { id: 'BUTTERFINGERS', name: 'BUTTERFINGERS', side: 'def', art: 'butter', text: 'Their receivers -35% catch chance this play',
    line: 'THAT BALL IS SLICK AS A GREASED PIG!',
    cpu: c => c.down === 3 && c.toGo >= 8,
    apply: c => c.mod('catch.p', { add: -.35, test: x => x.receiver.side !== c.side }, 1) },
  { id: 'MASCOT_MAYHEM', name: 'MASCOT MAYHEM', side: 'any', art: 'mascot', text: 'Your mascot runs on as a 12th player',
    line: 'IS THAT {mascot} ON THE FIELD?! IT IS!',
    cpu: c => c.trailingBy >= 7,
    apply: c => { c.match.mascotPlay = c.side; } },
  { id: 'SUPER_FOOT', name: 'SUPER FOOT', side: 'kick', art: 'boot', text: 'Next kick: +15 yards, a wider sweet spot, a slower needle',
    line: 'THAT LEG IS INSURED FOR A MILLION BUCKS!',
    cpu: c => (c.fgYards >= 45) || (c.pat && c.timeLeft < 60),
    apply: c => { c.mod('kick.yards', { add: 15, test: x => x.side === c.side }, 1); c.mod('kick.band', { mul: 2.5, test: x => x.side === c.side }, 1); c.mod('kick.needle', { mul: .7, test: x => x.side === c.side }, 1); } }
];
FF.data.cards = Object.fromEntries(C.map(c => [c.id, c]));
FF.data.cardList = C.map(c => c.id);
/** does card id fit this play: offense ('off'), defense ('def'), a kick ('kick') */
FF.cardFits = (id, role) => { const c = FF.data.cards[id]; return !!c && (c.side === 'any' || c.side === role || (c.side === 'kick' && role === 'kick')); };
})();
