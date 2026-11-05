// 08-data: content as data. Missions, story steps, board, cipher, wire calls, box rounds, affidavit, endings.
const MISSIONS = {
  ep1: { id: 'ep1', mode: 'surv', kicker: 'EP1 · EYES ON', title: 'Eyes on the corner', music: 'field', slots: ['tee', 'runner', 'lookout'], goal: 'Photograph the dealer mid-sale, the runner carrying, and a lookout.',
    briefing: ['Ridley and Penn. Three years of "buy and bust" and the corner never blinks.', 'Szabo wants faces with names. Not dope on a table. Faces.', 'Stay off the lookouts\' sightlines. Hold ' + '{watch}' + ' to look, take the picture when you see the hand-to-hand. Then payphones, then back to the Annex.'] },
  ep2: { id: 'ep2', mode: 'tail', kicker: 'EP3 · UP', title: 'Tail the runner', music: 'field', briefing: ['The runner shuttles the package from a stash house to the corner every cycle.', 'Wait near the stash. When he moves, stay close enough to keep him and far enough that he never turns around.'] },
  ep3: { id: 'ep3', mode: 'chase', kicker: 'EP4 · DRY CLEANING', title: 'Run him down', music: 'field', briefing: ['He is dry cleaning: checking for a tail. If he spots you the package goes in a storm drain.', 'Follow him in. When he bolts, sprint and tackle.'] },
  ep4: { id: 'ep4', mode: 'raid', kicker: 'EP5 · THE COUNT', title: 'The garage', music: 'wire', start: 'annex', leave: 'Call it in and leave', civs: 3, briefing: ['The warrant is signed. The garage has two guards and Slim Dawkins himself.', 'Slip in along the lots. Hold ' + '{interact}' + ' at each of the three hiding spots. Do not get made.'] },
  vs: { id: 'vs', mode: 'vs', kicker: 'THE GAME', title: 'Corner vs Detail', music: 'versus', civs: 14, leave: 'Leave', briefing: ['Build the best case in the time you have.', 'Photograph deals mid-sale for points. Each time you are made the corner goes quiet and you lose time.'] },
  vs2: { id: 'vs2', mode: 'vs2', kicker: 'THE GAME · 2 PLAYERS', title: 'Detective vs Corner', music: 'versus', civs: 14, leave: 'Leave', briefing: ['P1 is the detective (keyboard or the first gamepad): WASD move, Q hold to watch (aim with the way you face), E photograph, F blend.', 'P2 is the corner (Tee, keyboard or the second gamepad): arrows move, . or Enter serve a buyer, / call out the detective, but only if the corner already suspects them.', 'Detective scores photos. The corner scores sales. Two minutes. Higher score wins.'] },
  tee1: { id: 'tee1', mode: 'tee', kicker: 'NIGHT · THE CORNER', title: 'Tee\'s shift', music: 'corner', target: 240, start: 'tee', intro: ['Serve.'], briefing: ['You are Terrence "Tee" Mabry. Slim wants $240 off this corner before the shift ends.', 'Stand near a buyer and serve them. If a plainclothes cop drifts in, call 5-0 before he reaches you. Wrong calls cost money and heat.'] },
  tee2: { id: 'tee2', mode: 'tee', kicker: 'NIGHT · THE CORNER', title: 'Tee\'s second shift', music: 'corner', target: 320, start: 'tee', intro: ['Serve.'], briefing: ['The detail is closer. You can feel it. Slim wants $320. Watch the vans.'] }
};
// episode steps: type card | field | screen | tee
const STORY = [
  { t: 'card', n: 1, name: 'EYES ON', epi: '"All the pieces matter." — Lester Freamon, paraphrased on a legal pad' },
  { t: 'field', m: 'ep1' }, { t: 'screen', s: 'board' },
  { t: 'card', n: 2, name: 'PAPER', epi: '"A man must have a code." — the paper does not care' },
  { t: 'screen', s: 'cipher' }, { t: 'screen', s: 'paper' },
  { t: 'card', n: 3, name: 'UP', epi: '"You come at the king, you best not miss."' },
  { t: 'screen', s: 'wire' }, { t: 'field', m: 'ep2' }, { t: 'field', m: 'tee1' },
  { t: 'card', n: 4, name: 'DRY CLEANING', epi: '"The game is rigged, but you cannot lose if you do not play."' },
  { t: 'field', m: 'ep3' }, { t: 'screen', s: 'box' }, { t: 'field', m: 'tee2' },
  { t: 'card', n: 5, name: 'THE COUNT', epi: '"Where I come from, we ain\'t got the luxury of a clean win."' },
  { t: 'field', m: 'ep4' }, { t: 'end' }
];
const BOARD_PEOPLE = [{ id: 'tee', name: 'Terrence "Tee" Mabry', role: 'Lieutenant', opts: ['Terrence "Tee" Mabry', 'Slim Dawkins', 'Bodie Rowe'] }, { id: 'runner', name: 'Dante Wills', role: 'Runner', opts: ['Dante Wills', 'Terrence "Tee" Mabry', 'Marcus Reed'] }, { id: 'lookout', name: 'Pooh Bell', role: 'Lookout', opts: ['Slim Dawkins', 'Pooh Bell', 'Dante Wills'] }];
// pager cipher: the key on the keypad, and the pages Dana intercepts
const CIPHER = { key: [['11', 'STASH'], ['22', 'RE-UP'], ['33', 'POLICE'], ['44', 'COUNT'], ['55', 'MOVE'], ['66', 'LATER']],
  pages: [{ code: '22 · 55', ans: 'Re-up, move it', opts: ['Re-up, move it', 'Police, later', 'Count the stash'], note: 'Fresh supply is moving.' },
    { code: '33 · 66', ans: 'Police, later', opts: ['Re-up, move it', 'Police, later', 'Stash, count'], note: 'They are saying hold off.' },
    { code: '11 · 44', ans: 'Stash, count', opts: ['Stash, count', 'Police, later', 'Re-up, move it'], note: 'They count what is in the house.' }] };
// wire calls: pertinent = about the business. Lines are heard in order; key = the line that makes the call worth logging.
const WIRE = [
  { who: 'tee', from: 'Tee', to: 'Slim', voice: 'tee', pert: true, lines: ['Yo, it\'s me. You still got them wings from Tuesday?', 'Naw, I mean the wings. Four of them, fresh, tonight.', 'Send the kid down by the garage at ten. Count is count.'], key: 2, id: 'chicken wings = the re-up' },
  { who: 'rae', from: 'Rae', to: 'Tee', voice: 'rae', pert: false, lines: ['Terrence, your son has a fever.', 'I took him to the clinic on Fulton. They want forty dollars.', 'Call me back when you stop acting like you\'re busy.'], key: -1, id: 'Personal: the clinic' },
  { who: 'slim', from: 'Slim', to: 'Tee', voice: 'slim', pert: true, lines: ['Heard the block was hot.', 'We switch phones Friday. Do not say my name on this one.', 'The garage on Penn stays closed till I say.'], key: 1, id: 'Phones change Friday, the garage' },
  { who: 'kid', from: 'Bodie', to: 'Girl', voice: 'kid', pert: false, lines: ['You coming to the thing Saturday?', 'My cousin is DJing. Bring your sister.', 'I got you.'], key: -1, id: 'Personal: the party' }
];
// box (interrogation): the suspect is Dante Wills. Four rounds; each option moves rapport/pressure/info.
const BOX = { suspect: 'Dante Wills', rounds: [
  { q: 'He keeps his cuffs on the table and says nothing. You open with...', opts: [{ k: 'boxTop', t: 'The kid angle: "Your mother know where you are?"', r: 1, p: 0, i: 0 }, { k: 'boxLeft', t: 'The pressure: "Ten years in federal. Starting now."', r: -1, p: 2, i: 1 }, { k: 'boxRight', t: 'Coffee and silence.', r: 2, p: 0, i: 0 }, { k: 'boxBottom', t: 'Read his rights again, slowly.', r: 0, p: 0, i: 0 }] },
  { q: 'He asks what you have on him.', opts: [{ k: 'boxTop', t: 'Show the photos from the corner.', r: 0, p: 2, i: 1 }, { k: 'boxLeft', t: 'Bluff: "We have you on tape."', r: -2, p: 3, i: 0 }, { k: 'boxRight', t: '"Enough that I\'m trying to help you."', r: 2, p: 0, i: 1 }, { k: 'boxBottom', t: 'Say nothing. Let him fill it.', r: 1, p: 1, i: 1 }] },
  { q: 'He says: "Tee doesn\'t run nothing. Tee is just a name."', opts: [{ k: 'boxTop', t: '"Slim gives Tee the count every week, right?"', r: 0, p: 2, i: 2 }, { k: 'boxLeft', t: '"Tee is going to leave you holding it."', r: -1, p: 2, i: 1 }, { k: 'boxRight', t: '"Then who does run the corner?"', r: 1, p: 1, i: 2 }, { k: 'boxBottom', t: 'Stand and walk out for a minute.', r: 0, p: 1, i: 0 }] },
  { q: 'He is quiet. He looks at the door.', opts: [{ k: 'boxTop', t: 'Offer the deal: testimony for a lighter charge.', r: 0, p: 0, i: 3 }, { k: 'boxLeft', t: 'Threaten to take away his phone calls.', r: -2, p: 3, i: 0 }, { k: 'boxRight', t: 'Ask about his sister.', r: 2, p: 0, i: 1 }, { k: 'boxBottom', t: 'End it: "Think about it."', r: 0, p: 0, i: 0 }] }] };
const EVIDENCE = [{ id: 'photos', name: 'Surveillance photographs', pts: 25 }, { id: 'cipher', name: 'Decoded pager traffic', pts: 20 }, { id: 'phones', name: 'Payphone numbers', pts: 15 }, { id: 'wire', name: 'Logged wire calls', pts: 25 }, { id: 'tip', name: 'An informant\'s word', pts: 5 }];
const JUDGE = [
  { q: 'Counsel, why should I believe a tap is the only way to reach Mr. Dawkins?', opts: [{ t: 'Because buy-and-busts reached the street, never the top in three years.', ok: 1 }, { t: 'Because the Major said so.', ok: 0 }, { t: 'It\'s faster than paperwork.', ok: -1 }] },
  { q: 'What stops you from listening to a grandmother\'s phone call?', opts: [{ t: 'Minimization: we hang up when it\'s not about the business.', ok: 1 }, { t: 'Trust us.', ok: -1 }, { t: 'Nothing, but we don\'t.', ok: 0 }] }
];
const ENDINGS = [
  { id: 'clean', test: s => s.caseScore >= 140 && s.legal >= 70, title: 'The Case Holds', text: 'Dawkins takes twelve years. Tee takes a plea. The corner is on the same corner by spring, with a new name on the bricks. You were right. It is not enough.' },
  { id: 'messy', test: s => s.caseScore >= 80, title: 'Half a Case', text: 'You get Tee and the runner. Slim walks. The Major gets his numbers; you get a transfer. Somebody always walks.' },
  { id: 'bleak', test: () => true, title: 'Paper and Rain', text: 'The case falls apart in front of a judge who never liked the look of it. The corner counts the week\'s take. Somebody is still listening.' }
];
const TIPS = { watch: ['Watch', 'Hold the watch button to look through the long lens. Move the reticle onto people to read what they are.'], blend: ['Blend', 'Hold the blend button standing still to look natural. Lookouts notice less.'] };
