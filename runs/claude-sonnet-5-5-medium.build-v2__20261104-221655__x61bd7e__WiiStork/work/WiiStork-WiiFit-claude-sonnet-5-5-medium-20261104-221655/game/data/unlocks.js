// Minutes banked in Gerald unlock things. Add a row: { min, id, name, text }.
window.G.UNLOCKS = [
  { min: 5, id: 'towel', name: 'Towel', text: 'A towel. It is on your shoulder now. It is very supportive.' },
  { min: 10, id: 'headband', name: 'Headband', text: 'A headband. It does nothing. It does it with confidence.' },
  { min: 15, id: 'sunhat', name: 'Sunhat', text: 'A sunhat. For the sun, or for Gertrude, whichever arrives first.' },
  { min: 20, id: 'bowtie', name: "Tare's Bow Tie", text: 'Tare is wearing a tiny bow tie. Nobody asked. Everybody noticed.' },
  { min: 25, id: 'spare', name: "Gertrude's Spare Hat", text: "Gertrude's Spare Hat. She has two. This is the other one." },
  { min: 30, id: 'friend', name: 'A Friend for Gerald', text: 'Gerald has a friend. A smaller hippo. There is no explanation.' }
];
G.unlockCheck = () => { const S = G.S; S.unlocked = S.unlocked || []; const got = []; for (const u of G.UNLOCKS) if (S.minutes >= u.min && !S.unlocked.includes(u.id)) { S.unlocked.push(u.id); got.push(u); } if (got.length) { G.pendingUnlocks = (G.pendingUnlocks || []).concat(got); G.jingle('unlock'); } return got; };
G.hasUnlock = id => !!(G.S.unlocked && G.S.unlocked.includes(id));
