// Mail: letters arrive at 09:00; write letters at the Post; replies react to what you wrote.
import { item } from '../data/items.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { TextEntry, ListScreen } from '../ui/screens.js';
import { seeded } from '../core/rng.js';
export const mail = {
  queue(g, m) { const w = g.world; w.pending ??= []; w.pending.push({ id: 'm' + g.uid(), day: w.day, ...m }); },
  deliver(g) { const w = g.world; w.pending ??= []; const due = w.pending.filter(m => (m.arriveDay ?? w.day) <= w.day); if (!due.length) return; w.pending = w.pending.filter(m => !due.includes(m)); for (const m of due) w.mailbox.push({ ...m, read: false }); g.sfx('mail'); if (g.mode === 'play') g.ui.toast('Mail has arrived'); },
  unread(g) { return g.world.mailbox.filter(m => !m.read).length; },
  daily(g) {
    const w = g.world, r = seeded('mail', w.seed, w.year, w.day); w.pending ??= [];
    if (w.daysPlayed > 0 && w.daysPlayed % 4 === 0) this.queue(g, { from: 'Gran', subject: 'A parcel of concern', body: `Dear ${w.name}, I hope you are eating. I am fine. Do not worry about me. Worry at a respectful distance. I enclose a foreign fruit. I do not know what it is. Neither does the fruit. Love, Gran.`, gift: 'fruit_cherry' });
    const friends = NEIGHBOURS.filter(n => (w.friend[n.id] ?? 0) >= 15 && !w.movedOut[n.id] && !(n.id === 'fitch' && w.day < 9)); if (friends.length && r() < 0.5) { const n = friends[Math.floor(r() * friends.length)]; this.queue(g, { from: n.name, subject: 'A note', body: `${w.name}, I was thinking of you. ${n.tic} That is all. That is the whole letter.${(w.friend[n.id] ?? 0) > 40 ? ' I enclose a small thing.' : ''}`, gift: (w.friend[n.id] ?? 0) > 40 ? ['pear', 'seedpack', 'shell'][Math.floor(r() * 3)] : null }); }
    if (r() < 0.12) this.queue(g, { from: 'Ozzie (anonymous)', subject: 'You didn\'t hear it from me', body: 'The third bench from the left has a secret. The secret is that it is a bench. Burn this letter. Actually keep it, the paper is nice.' });
    for (const m of (w.replies ?? []).filter(x => x.day <= w.day)) { this.queue(g, m); } w.replies = (w.replies ?? []).filter(x => x.day > w.day);
  },
  async read(g, m) {
    const sp = { name: m.from, type: 'hearth', pitch: 1 }; m.read = true;
    await g.say(null, `From ${m.from}: ${m.subject}`); await g.say(null, m.body); if (m.gift && !m.taken) { m.taken = true; if (g.give(m.gift)) g.ui.toast('Received: ' + item(m.gift).name); else { g.dropItem(m.gift, g.player.pos.x + 1, g.player.pos.z + 1); } }
  },
  async mailbox(g) {
    const w = g.world; const list = w.mailbox; if (!list.length) { await g.say(null, 'The mailbox is empty. A spider has moved in, and it is not paying rent either.'); return; }
    await new Promise(res => { const sc = new ListScreen({ title: 'Mailbox', items: () => w.mailbox.slice().reverse().map(m => ({ label: (m.read ? '' : '* ') + m.from, sub: m.subject, m })), pickLabel: 'Read', onPick: (it) => { this.read(g, it.m); } }); g.ui.push(sc); sc.promise.then(res); });
  },
  async write(g) {
    const w = g.world; const clem = g.sys.venues.host('clementine'); if (g.count('paper') < 1 && !w.flags.freePaper) { await g.say(clem, 'You need stationery, dear. The store has some. The bee has some. The bee is not selling.'); return; }
    const who = await new Promise(res => { const sc = new ListScreen({ title: 'Write to whom?', items: [{ label: 'Gran', sub: 'She worries. It is her cardio.', v: 'gran' }, ...NEIGHBOURS.filter(n => !(n.id === 'fitch' && w.day < 9) && !w.movedOut[n.id]).map(n => ({ label: n.name, sub: n.tic, v: n.id }))], onPick: () => 'close', pickLabel: 'Write' }); g.ui.push(sc); sc.promise.then(res); });
    if (!who) return; const text = await new Promise(res => { const te = new TextEntry({ title: `Dear ${who.label},`, paper: true, max: 160, suggest: () => ['The weather is weather.', 'I owe a goose money.', 'Please send soup.'][Math.floor(g.rng() * 3)] }); g.ui.push(te); te.promise.then(res); });
    if (text == null) return; if (!w.flags.freePaper) g.take('paper'); g.sfx('mail');
    w.replies ??= []; const nm = who.label; const named = text.toLowerCase().includes(w.name.toLowerCase()); const len = text.length; const gibber = len > 3 && !/[aeiou]/i.test(text);
    let body; if (who.v === 'gran') body = len < 5 ? 'You wrote me one word. I will read it nine times. Eat something.' : `Dear ${w.name}, I read your letter at the window so the neighbours could see. They did not look. Eat something. Love, Gran.`;
    else body = gibber ? `You wrote '${text.slice(0, 8)}'. I framed it. It is the best thing in the house. ${NEIGHBOURS.find(n => n.id === who.v)?.tic ?? ''}` : len > 80 ? `You wrote so MUCH. I read it twice. I have not been read to like that since never. ${named ? '' : 'You did not use my name, but I felt it.'}` : `${named ? 'I saw my name' : 'I saw your handwriting'}. Thank you for writing. It was short, but it was *yours*. ${NEIGHBOURS.find(n => n.id === who.v)?.tic ?? ''}`;
    w.replies.push({ day: w.day + 1, from: nm, subject: 'Re: your letter', body, gift: who.v !== 'gran' && len > 40 ? 'seedpack' : null }); g.sys.friend.gain(g, who.v, 3); g.errandProgress?.('letter'); await g.say(clem ?? null, 'Stamped. The bee has approved the stamp. It will arrive tomorrow, or be eaten by the bee. Probably tomorrow.');
  },
};
