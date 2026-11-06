/** AI Hub Session Protocol v1 adapter. The vendored session client stays unmodified. */
export async function connectHub(callbacks = {}) {
  const client = globalThis.AIHub;
  let info = null;
  let active = Boolean(client?.active);
  let started = false;
  let ended = false;
  let reported = false;
  let ready = false;
  let pendingFrame = 0;
  let latestScore = 0;
  let latestStats = {};
  const schedule = globalThis.requestAnimationFrame?.bind(globalThis) ?? (fn => setTimeout(fn, 16));
  const unschedule = globalThis.cancelAnimationFrame?.bind(globalThis) ?? clearTimeout;

  const clock = () => active ? client.time() : 0;
  function checkStart() {
    if (!active || ended || started || clock() < 0) return;
    started = true;
    callbacks.start?.();
  }
  function awaitStart() {
    pendingFrame = 0;
    checkStart();
    if (active && !started && !ended) pendingFrame = schedule(awaitStart);
  }
  function report(score = latestScore, stats = latestStats) {
    if (!active || ended || reported || clock() < 0) return false;
    reported = true;
    latestScore = Number.isFinite(Number(score)) ? Number(score) : latestScore;
    latestStats = stats && typeof stats === 'object' ? stats : {};
    client.result({ score: latestScore, stats: latestStats });
    return true;
  }

  if (active) {
    info = await client.connect({ mode: 'parallel', seats: [1, 4] });
    active = Boolean(info && client.active);
    if (active) {
      client.on('start', () => {
        if (!ended && !pendingFrame) awaitStart();
      });
      client.on('time-up', detail => {
        if (ended || reported) return;
        try {
          callbacks.timeup?.(detail);
        } finally {
          // A valid result is guaranteed inside the hub's grace period even
          // if the game has already moved to its debrief screen.
          report();
        }
      });
      client.on('leave', detail => {
        if (!ended) callbacks.leave?.(detail);
      });
      client.on('end', detail => {
        if (ended) return;
        ended = true;
        if (pendingFrame) unschedule(pendingFrame);
        pendingFrame = 0;
        callbacks.end?.(detail);
      });
    }
  }

  return {
    get active() { return active; },
    get info() { return info; },
    get ended() { return ended; },
    get reported() { return reported; },
    get started() { return started; },
    time: clock,
    ready() {
      if (!active || ended || ready) return;
      ready = true;
      client.ready();
    },
    isRunning() {
      checkStart();
      return !ended && (!active || (started && clock() >= 0));
    },
    progress(score, label = '') {
      if (!active || ended || reported || clock() < 0) return;
      latestScore = Number.isFinite(Number(score)) ? Number(score) : latestScore;
      client.progress({ score: latestScore, label: String(label).slice(0, 24) });
    },
    result: report,
    fail(message) {
      if (active && !ended) client.fail(String(message));
    },
  };
}
