# Release checks

Run `npm run verify` from this development folder. It builds the actual release and runs the state/native-step/audio suite, the offline browser/public-input suite, the AI Hub harness and game assertions, and the renderer matrix. The entrypoint prints failures and one total count; detailed results remain in `docs/*verification.json`.

The native suite covers all nine payload/difficulty combinations with no cheats. Successful runs last about 10–11 active minutes and include all four attack bearings, flak, a deliberate strike and assisted recovery. It also covers failures, finite inventory, ownership, prediction/impact agreement, subsystem fallbacks, replay reset and synthesized sample bounds.

The browser driver starts through the public menus and browser keyboard, then submits native keyboard/mouse input for a complete sortie. It checks pause, live tuning/reset, directional views, custom map clicks, transition cancel, a movable free camera, two-pad and keyboard-plus-pad co-op, hot-plug/departure, glyph settings, Web Audio output/cleanup, attract entry/showcase/consumed exit, and touch/multitouch. Screenshots check composition rather than prove state.

The unmodified upstream Hub harness is served only from an OS-assigned 127.0.0.1 port by a server owned by the test process. Scenarios include two players, 150 ms latency/50 ms jitter/5% loss, actual guest departure, host departure, and a playerless server. The test waits for body[data-complete] and asserts window.__hubCheck.pass. Additional assertions cover guest station claim/release, single inventory debit, state convergence, full native-input sortie completion, final reporting and silent cleanup. An accelerated full sortie yields to the bridge so its messages retain the ordinary real-time budget.

Chromium WebGPU and Chromium/WebKit WebGL 2 are checked. The installed Firefox has no usable graphics backend and receives a capability message before the 3D dependencies execute. This is a confirmed environment limitation. Physical controller/touch/TV feel, real iOS Safari and human listening are unknown; standard-mapping stubs, phone/tablet profiles and an analyser are the available stand-ins.
