[**Play Sunset Striker Beta Two**]( /home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v18__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Sunset-Striker-Beta-Two-Street-Fighter-Alpha-2-gpt-6-astra-max-20261029-0948.html)

A self-contained **2.99 MiB HTML** with three fighters, arcade progression, training, combo trials, replay, couch versus, online rooms, and a 10-second attract mode. Requires WebGPU; all dependencies are bundled.

**Source information**

- **Date:** 2026-10-29 10:43 PDT. **Inspiration:** Street Fighter Alpha 2.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5; esbuild 0.25.11.
- **Art / animation:** Original cel-shaded 3D, ink outlines, articulated procedural animation and afterimages.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** AI Hub Protocol v1/client 1.3.0 and standalone WebRTC crew battles.
- **Environment:** Codex CLI (headless), Linux; target browser unknown. Tested Chrome 154 under Xvfb.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** Cost and tokens unknown; approximately 54 minutes.

**Testing feedback**

Efficient checks passed: 20 combat, 22 browser-flow, 121 hub assertions, 8 live WebRTC, and 7 compatibility checks, plus four visual captures. Testing found **two product defects, one startup-breaking; both fixed**. The hub harness was most helpful. Initial headless screenshots were least helpful because browser presentation failed; Xvfb resolved that. Physical DualSense and separate-network testing remain unverified.

**Engine feedback**

Best part: procedural scene construction and Rapier contact handling. The largest custom system was the fighting engine; synchronizing combat, animation, and networking was hardest. I encountered implicit renderer fallback and headless presentation issues. I would overhaul automatic fallback and add an explicit WebGPU-required initialization option.

**Prompt feedback**

The arcade reference, controller-first interface, and single-file requirement worked well. “Feature-complete” left roster and campaign size open. Responsive multiplayer fighting was the hardest requirement. The next valuable test would be a full set using physical DualSense controllers across separate networks.

These details are also included in **About/Credits** and the HTML’s opening comment.