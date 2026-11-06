# Dependency provenance

- my-3d2dge 0.89.1: https://github.com/michaelcrosato/my-3d2dge , main at 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Full handoff copied verbatim to vendor/engine/. Engine changes: none. Uses PlatformMap, Platformer, Attack, Humanoid custom hats/weapons/poses, material/shape registry, renderer, lighting, particles, native input/settings and ChipAudio.
- AI Hub Session Protocol 1, client 1.4.0: https://github.com/michaelcrosato/ai-hub , main at 35a1047f2067b2af3de3943f0fe452f39105d869. Released session.js remains pristine and is the first script after charset. Harness/support files copied to vendor/hub/.
- Runtime browser Canvas 2D + Web Audio; no CDN, runtime imports, recorded images or audio assets required. Node 24.21.0 build/verification; Python Playwright 1.63.0 installed environment for browser evidence.

Clones retained under vendor/*-repo for provenance and official checker sources. Read API card/index/guide, platformer kit and full native asset authoring card before implementing the game-specific systems. Art, rules and audio live in src/; the vendored engine is unpatched.
