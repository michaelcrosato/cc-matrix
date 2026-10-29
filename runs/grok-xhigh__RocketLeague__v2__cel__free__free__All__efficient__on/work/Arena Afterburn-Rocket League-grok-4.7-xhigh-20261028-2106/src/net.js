/** Host-authoritative WebRTC. Signaling is copy-paste SDP, with a public STUN server. */

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function waitForIce(pc, timeoutMs = 3500) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const done = () => {
      if (pc.iceGatheringState !== 'complete') return;
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', done);
      resolve();
    };
    pc.addEventListener('icegatheringstatechange', done);
  });
}

export async function createHostLink() {
  const pc = new RTCPeerConnection(ICE);
  const dc = pc.createDataChannel('match');
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);
  return { pc, dc, sdp: JSON.stringify(pc.localDescription) };
}

export async function acceptAnswer(pc, text) {
  const desc = JSON.parse(text.trim());
  await pc.setRemoteDescription(desc);
}

export async function createGuestLink(text) {
  const pc = new RTCPeerConnection(ICE);
  const remote = JSON.parse(text.trim());
  await pc.setRemoteDescription(remote);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIce(pc);
  const channelPromise = new Promise((resolve) => {
    pc.addEventListener('datachannel', (event) => resolve(event.channel));
  });
  return { pc, sdp: JSON.stringify(pc.localDescription), channelPromise };
}

export function send(dc, message) {
  if (!dc || dc.readyState !== 'open') return false;
  dc.send(JSON.stringify(message));
  return true;
}

export function bindChannel(dc, onMessage) {
  dc.addEventListener('message', (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {
      onMessage({ t: 'bad' });
    }
  });
}

export function snapshotOf(world) {
  return {
    t: 'snap',
    cars: world.cars.map((car) => ({
      id: car.id,
      pos: { ...car.pos },
      vel: { ...car.vel },
      yaw: car.yaw,
      pitch: car.pitch,
      roll: car.roll,
      boost: car.boost,
      demolished: car.demolished,
      respawnTimer: car.respawnTimer,
      supersonic: car.supersonic,
      driveState: car.driveState,
      canDodge: car.canDodge,
    })),
    ball: { pos: { ...world.ball.pos }, vel: { ...world.ball.vel } },
    match: {
      phase: world.match.phase,
      countdown: world.match.countdown,
      clock: world.match.clock,
      overtime: world.match.overtime,
      score: { ...world.match.score },
      winner: world.match.winner,
      banner: world.match.banner,
      lastScorer: world.match.lastScorer,
    },
    pads: world.pads.map((pad) => pad.ready),
  };
}

export function applySnapshot(world, snap) {
  for (const state of snap.cars) {
    const car = world.cars.find((item) => item.id === state.id);
    if (!car) continue;
    car.pos.x = state.pos.x;
    car.pos.y = state.pos.y;
    car.pos.z = state.pos.z;
    car.vel.x = state.vel.x;
    car.vel.y = state.vel.y;
    car.vel.z = state.vel.z;
    car.yaw = state.yaw;
    car.pitch = state.pitch;
    car.roll = state.roll;
    car.boost = state.boost;
    car.demolished = state.demolished;
    car.respawnTimer = state.respawnTimer;
    car.supersonic = state.supersonic;
    car.driveState = state.driveState;
    car.canDodge = state.canDodge;
  }
  world.ball.pos.x = snap.ball.pos.x;
  world.ball.pos.y = snap.ball.pos.y;
  world.ball.pos.z = snap.ball.pos.z;
  world.ball.vel.x = snap.ball.vel.x;
  world.ball.vel.y = snap.ball.vel.y;
  world.ball.vel.z = snap.ball.vel.z;
  Object.assign(world.match, snap.match);
  world.match.score = { ...snap.match.score };
  snap.pads.forEach((ready, i) => {
    if (world.pads[i]) world.pads[i].ready = ready;
  });
}
