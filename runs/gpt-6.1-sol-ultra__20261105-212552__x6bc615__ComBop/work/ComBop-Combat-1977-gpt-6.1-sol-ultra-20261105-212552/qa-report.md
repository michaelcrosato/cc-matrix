# Final verification

**19/19 feature checks passed, zero failed.** `test-results.json` contains the merged results and the package hash for each run. The final package and all four About tabs were checked against `exit-interview.json` after the final formatting rebuild; the report's latest hash matches the delivered HTML.

Run `./run-tests.py` from this folder. Targeted reruns use `--only 'name fragment'` and preserve the latest result for every other check. The runner prints failures and a one-line count, serves only its own workspace through `127.0.0.1:0`, and closes its own server and browser.

The checks cover file and HTTP loading, WebGPU and Rapier initialization, pause/settings/developer controls, required credits, keyboard/mouse input, controller menus and actions, two independent controller stubs, multitouch, all three arena variants, repairs/rapid fire/sudden death, respawning, banked self-hits, breakable crates, fuel blasts, point-blank cover, attract play and any-input exit, local rematch, standalone WebRTC, and synthesized audio. The scripted circuit earned all nine wrecks through actual Rapier impacts rather than direct score awards. The audio case contains 17 offline waveform/default/lifecycle assertions.

All four official AI Hub scenarios passed with native WebGPU and strict browser-error checking: two players, impaired network (150 ms latency, 50 ms jitter, 5% loss), host departure, and a host with no local player. The standalone two-page test also verified that a guest with the default arena followed a host selecting arena three, that guest keyboard input moved the authoritative tank, and that snapshots synchronized its position.

Three distinct game defects were caught by automated tests and fixed: the pause overlay used the wrong screen ID; fast action taps could disappear between simulation steps; menu accept/back edges could be consumed by the navigation-repeat delay. The first blocked the required pause/developer flow. Other UI and network edge cases were found through static review and corrected separately.

The initial supplied software-WebGPU launch flags caused device loss in both the game and an independent one-box Three.js R180 scene. The working native Chromium flags are recorded in `run-tests.py`: `--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=swiftshader --use-vulkan=swiftshader --disable-vulkan-surface`. No GPU-loss errors were suppressed. `gpu-diagnostic.json` records the comparison.

Native WebGPU composition captures were reviewed at 1600×900 and 1920×1080, plus a 390×844 touch profile. The final images are `visual-title.png`, `visual-play.png`, `visual-tv-title.png`, `visual-phone-title.png`, and `visual-phone-play.png`. They show the actual arena rendering; earlier blank captures used the failing graphics configuration.

All QA-owned browser instances, pages, and HTTP servers were closed after testing. Physical controllers, real phones, a real TV, human listening, and internet traversal through restrictive firewalls remain unverified; the required stand-ins were used.
