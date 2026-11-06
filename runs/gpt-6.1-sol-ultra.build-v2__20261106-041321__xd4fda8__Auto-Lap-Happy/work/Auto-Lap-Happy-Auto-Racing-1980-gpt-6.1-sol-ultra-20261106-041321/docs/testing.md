# Acceptance evidence

Use `node tools/test.mjs` from this folder (or pass its full path). It prints failures and one final count; supporting browser workers return structured JSON. Subsystem filters are core/audio/network/hub/ui/direct/gameplay/package. `evidence/test-all.json` is the comprehensive result, with individual case evidence and screenshots alongside it.

## Behaviour verified

- 58 deterministic engine/core checks:all25 car/course combinations complete legal laps;four profiles/tan-blue equality;analog pressure;countdown and long brake holds;surface effects;ordered forward gates;reverse/missing/parallel/start oscillation/teleport rejection;incident priority;manual recovery;safe staging;lead threshold;winning threshold;deadline draw;five-lap event;complete6-stage tour;route connections/passport;tuning;snapshots;native headless drawing.
- 26 actual offline audio checks across Chromium and WebKit:nonzero bounded music/engine/tyres/SFX/voice;exact.10defaultmusic;volumes/mute/pause/stop/destroy;retry loop cleanup.
- 17 network adapter unit checks and21 real RTC checks each through fileURL/loopback:full gathered SDP,reliable/unreliable channels,sequenced intents/snapshots,150ms/5%loss,malformed/truncated/wrong-type/incompatible descriptions,duplicate reply,old-round rejection,rematch and closure.
- 5 official Hub harness scenarios:one/two humans,150ms latency/50ms jitter/5%loss,host departure and actorless server. Every case requires both complete=true and __hubCheck.pass=true. No forbidden custom transport is constructed in Hub.
- 57 actual root-file UI checks:all-menu D-pad focus graphs;keyboard/pointing;PS/Xbox prompts;pad reconnect;real controller-confirm file chooser;dev sliders/reset/unranked flag;10 second attract entry and consumed exits via all input devices;save isolation;phone/tablet multitouch steering/brake/cancel/pause;WebKit file boot/input/pause;credits/report navigation. Final touch driving view clears persistent HUD except the menu;teaching and incident cues are transient.
- Actual direct-game file and loopback playthroughs:visible invitation/reply screens,real text-file import,clipboard rejection,physical car contact,legal lead+1/manual-recovery crash+2,target10,results on both peers,rematch,pause,hidden/stopped-renderer authority,one120Hzcursor,common-clock240seconddeadline,closure. Latency/loss wraps the actual channels,not a replacement transport.
- 36 actual root-file gameplay checks:title→all 6 guided stages→ending→firstlessonreplay;real keyboard recovery,grass/gravel and actual water crash;all lesson flags true;scored pursuit;classic5 laps with5 valid splits;versionedbest/ghost and ghostretry;twohuman couchseparation→10pointfinish→rematch→title;no engine/browser errors.
- Packaging:unchanged official client first aftercharset;root/development file equality;no external scripts/assets/audio;all required metadata/credits/reportsections;exact JSON report shape/parseability.

## Visual evidence

`ui-title-tv.png`,`ui-setup-tv.png`,`ui-race-tv.png`,touch portrait/landscape images,About/Credits pages,world landmark screenshots,results screens and `motion-driving-filmstrip.png` were inspected for road clarity,native shaded style,car heading/wheel/lean motion,readability and clutter. State assertions establish rules;images do not substitute for legal driving or scoring evidence.

## Test limits

Tests use the workstation’s installed Chromium 153 and WebKit 26.6 with software rendering,emulated standard controllers and phone/tablet touch. No physical pad,TV,real iOSdevice,human listener or second person was available. Human first-play duration is unknown;scripted driver times are not treated as the new-player pacing target. Public internet/cross-NAT/TURN connectivity is unknown. No FPS target or optimization gate was imposed.

Twelve unique product issues,including two critical completion/replay bugs,were found and fixed. `docs/issues.md` gives each exposure,fix and confirming test. Preventive code-review fixes and fixture corrections are counted separately.

Final comprehensive command result: **282/282 checks passed**. Artifact identity and SHA256 are recorded in `evidence/release.json`.
