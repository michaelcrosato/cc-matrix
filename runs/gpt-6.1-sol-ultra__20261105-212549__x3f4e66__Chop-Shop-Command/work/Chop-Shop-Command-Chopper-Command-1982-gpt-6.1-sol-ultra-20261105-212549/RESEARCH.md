# Research and adaptation

The title was selected with Node's cryptographic randomInt from 50 privately brainstormed candidates. See title-selection.json for the result.

Primary source: [Activision's Chopper Command manual, 1982](https://atariage.com/manual_html_page.php?SoftwareID=921) and the [scanned manual](https://atarionline.org/wp-content/uploads/2021/11/chopper-command-1982-activision-atari-2600-manual.pdf). Its essentials are defending a medicine convoy, unlimited cannon fire, a long-range scanner, enemy helicopters and faster jets, missiles that split and cannot be shot down, 100/200 point aircraft, truck-survival bonuses and chopper reserves. The original has ten increasingly fast waves. This complete slice has three authored waves and an original final command airship.

Contemporary coverage: [Video Swapper, August 1982](https://www.ataricompendium.com/archives/magazines/video_swapper/video_swapper_aug82.pdf) describes rotor and laser-fire sounds. [Electronic Fun, April 1983](https://www.ataricompendium.com/archives/magazines/electronic_fun/electronic_fun_apr83.pdf) calls out rotating wheels, rotors and bright blue lasers. These informed mechanical animation and synthesized sounds; no source assets were copied. Exact original sound synthesis parameters are unknown.

Technology: Three.js r180 package source and official [WebGPU renderer documentation](https://threejs.org/docs/#WebGPURenderer); [Rapier JavaScript guide](https://rapier.rs/docs/user_guides/javascript/getting_started_js/), with implementation pinned to 0.19.3; [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), fetched with gh. The official hub session client is embedded unchanged.

Original additions: four-second convoy shield with twelve-second cooldown, hull repair and shield pickups, three-hit player hull, live dev balance sliders, two-pilot local co-op, synchronized AI Hub score competition, and a procedural ink-and-cel art direction.
