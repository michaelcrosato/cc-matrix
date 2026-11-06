# Release verification

The saved `latest-results.json` records 46 passing checks: 25 simulation checks and 21 browser/integration checks. The campaign script visits every phase and enemy and reaches victory. It uses the attract-mode AI with invulnerability and deliberate repositioning; separate tests exercise actual underside jumps, climbing, dropping, enemy timing, damage, recovery, BOP, ice and bonus rules.

The browser checks use software WebGPU, WebGL 2, WebKit, virtual standard gamepads and touch input. Standalone WebRTC connects isolated browser contexts, relays the guest's movement through the host, and handles disconnection. AI Hub passes the upstream automatic harness for two players, four players with latency/jitter/loss, host departure, and a host with no player. The unchanged upstream session client is embedded as the first head script.

Six product issues were corrected during implementation and verification: BOP foothold grounding; dialog paint order; focus retention during settings changes; primary-button focus on pause; short event buffering until a simulation or network update consumes it; and gravity/respawn when an earned life revives an eliminated co-op player. Dialog layering was the one issue that blocked substantial menu access.

Initial automation defects were corrected separately: a malformed virtual-pad initialization script, numeric serialized object keys, hidden-element selector collisions, range-input handling, touch coordinates landing on the contextual BOP button, and pad pulses shorter than a software-rendered input frame. Pad menu tests now provide one sampled press and release through the Gamepad API stub.

Visual review used WebGL compatibility captures of the same Three.js scene. The final title and manual were reviewed at 1920×1080. Blank software WebGPU captures were not used as visual evidence; WebGPU initialization and live gameplay state were checked directly. The renderer also has an application-level device-loss recovery path.

Procedural music was measured with OfflineAudioContext, and runtime audio counters and state were inspected. Physical controllers, real touch hardware, subjective listening quality, remote-device NAT traversal and real iOS Safari behavior remain unknown.
