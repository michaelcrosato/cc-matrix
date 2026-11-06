// Multiplayer has its own monotonic clock: drawing, local menus and a hidden
// canvas are never prerequisites for advancing the shared authoritative world.
export function createNetworkClock({
	tick,
	active = () => true,
	now = () => performance.now() / 1000,
	step = 1 / 120,
	intervalMs = 8,
	schedule = (fn, ms) => setInterval(fn, ms),
	cancel = (handle) => clearInterval(handle),
} = {}) {
	if (
		typeof tick !== "function" ||
		!Number.isFinite(step) ||
		step <= 0 ||
		!Number.isFinite(intervalMs) ||
		intervalMs <= 0
	)
		throw new TypeError(
			"Network clock needs a tick callback and positive timing values.",
		);
	let last = null,
		accumulator = 0,
		handle = null,
		disposed = false;
	const debug = { ticks: 0, pulses: 0, maxCatchupTicks: 0, inactivePulses: 0 };
	function drain(force = false) {
		let ticks = 0;
		while (accumulator >= step - 1e-10) {
			if ((!force && !active()) || disposed) {
				accumulator = 0;
				break;
			}
			accumulator = Math.max(0, accumulator - step);
			tick(step);
			ticks++;
			debug.ticks++;
		}
		debug.maxCatchupTicks = Math.max(debug.maxCatchupTicks, ticks);
		return ticks;
	}
	const clock = {
		debug,
		get running() {
			return handle !== null;
		},
		get remainder() {
			return accumulator;
		},
		reset() {
			last = now();
			accumulator = 0;
			return clock;
		},
		pulse() {
			if (disposed) return 0;
			debug.pulses++;
			const time = now();
			if (!Number.isFinite(time)) return 0;
			if (last === null) {
				last = time;
				return 0;
			}
			const elapsed = Math.max(0, time - last);
			last = Math.max(last, time);
			if (!active()) {
				accumulator = 0;
				debug.inactivePulses++;
				return 0;
			}
			accumulator += elapsed;
			return drain();
		},
		// Explicit test-mode driving bypasses the timer's activity gate. The tick
		// callback still owns terminal/session guards. Stop automatic ticking first.
		advance(seconds, { force = true } = {}) {
			if (!Number.isFinite(seconds) || seconds < 0)
				throw new TypeError("Advance needs finite nonnegative seconds.");
			if (disposed) return 0;
			last = now();
			if (!force && !active()) {
				accumulator = 0;
				return 0;
			}
			accumulator += seconds;
			return drain(force);
		},
		start() {
			if (!disposed && handle === null) {
				clock.reset();
				handle = schedule(clock.pulse, intervalMs);
			}
			return clock;
		},
		stop() {
			if (handle !== null) cancel(handle);
			handle = null;
			last = null;
			accumulator = 0;
			return clock;
		},
		dispose() {
			clock.stop();
			disposed = true;
		},
	};
	return clock;
}
