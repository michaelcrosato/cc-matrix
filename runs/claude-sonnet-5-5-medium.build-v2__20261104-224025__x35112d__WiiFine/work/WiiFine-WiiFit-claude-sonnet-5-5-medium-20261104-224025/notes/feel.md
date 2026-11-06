# Feel pass (scripted: no hands, no ears)
A player 65 ms late with noisy lean (`feel_pass` in tests/fit.rs, run with --ignored) was scored on every event at default numbers.
Before: Pose Parade, Morning Lap, Tray Trek, Cannonball Cup and Plank Standoff saturated at 975-1000 even for the late player.
Changed in rules.toml (the same numbers are Dev Mode sliders): pose wobble 1.0->1.8 and drift 0.35->0.42, plank fatigue 1.0->1.6,
tray jolt 1.0->1.8, lap stitch 0.5->1.2 and zone 1.7-2.3, dive period 1.2->1.1.
After: Pose Parade drops to 813 with noisy lean; the others still saturate because the bot's rhythm and steering are exact -
the gaps need a real player to judge. Late player: Breath 848, Squats 699, Step Party 560, Tide 978, Paddle 752-893.
Not done: hand play, listening, a real pad or phone.
