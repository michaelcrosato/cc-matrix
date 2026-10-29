/** Lobby of at most 4 peers. 1v1 assigns one per side. 2v2 assigns two per side. */

export function createSession(mode) {
  if (mode !== '1v1' && mode !== '2v2') throw new Error(`unsupported mode ${mode}`);
  return { mode, cap: 4, peers: [] };
}

export function addPeer(session, peer) {
  if (session.peers.length >= session.cap) {
    return { ok: false, reason: 'full', session };
  }
  const next = {
    ...session,
    peers: [
      ...session.peers,
      {
        id: peer.id,
        name: peer.name ?? peer.id,
        kind: peer.kind ?? 'human',
      },
    ],
  };
  return { ok: true, session: next };
}

export function joinHuman(session, peer) {
  const humans = session.peers.filter((p) => p.kind !== 'ai');
  if (humans.length >= session.cap) return { ok: false, reason: 'full', session };
  const teamSize = session.mode === '2v2' ? 2 : 1;
  if (humans.length >= teamSize * 2) return { ok: false, reason: 'roster-full', session };
  return addPeer(session, { ...peer, kind: 'human' });
}

export function assignTeams(session) {
  const teamSize = session.mode === '2v2' ? 2 : 1;
  const playing = session.peers.filter((p) => p.kind !== 'ai').slice(0, teamSize * 2);
  if (session.mode === '1v1') {
    return playing.slice(0, 2).map((peer, i) => ({
      ...peer,
      team: i === 0 ? 'blue' : 'orange',
    }));
  }
  return playing.slice(0, 4).map((peer, i) => ({
    ...peer,
    team: i < 2 ? 'blue' : 'orange',
  }));
}

export function rosterFromSession(session) {
  const assigned = assignTeams(session);
  const teamSize = session.mode === '2v2' ? 2 : 1;
  const counts = { blue: 0, orange: 0 };
  const roster = assigned.map((peer) => {
    counts[peer.team] += 1;
    return { ...peer, human: true, kind: 'human' };
  });
  const aiNames = ['VOLT', 'RIVET', 'NASH', 'PIP'];
  let n = 0;
  for (const team of ['blue', 'orange']) {
    while (counts[team] < teamSize) {
      roster.push({
        id: `ai-${team}-${counts[team]}`,
        name: aiNames[n] ?? `AI ${n + 1}`,
        team,
        kind: 'ai',
        human: false,
      });
      counts[team] += 1;
      n += 1;
    }
  }
  const order = { blue: 0, orange: 1 };
  roster.sort((a, b) => order[a.team] - order[b.team] || a.id.localeCompare(b.id));
  return roster;
}
