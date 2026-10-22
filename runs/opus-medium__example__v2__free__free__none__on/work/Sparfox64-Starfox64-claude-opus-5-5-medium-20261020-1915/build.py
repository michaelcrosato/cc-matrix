#!/usr/bin/env python3
"""Bundle src/*.js + shell.html into the single deliverable HTML file in the parent folder."""
import json, os, glob, html

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'Sparfox64-Starfox64-claude-opus-5-5-medium-20261020-1915.html')

SECTIONS = [
    ('Source Information', [
        'Date: 2026-10-20 19:15',
        'Source: Starfox 64 for N64 (Nintendo, 1997) — this is an original spiritual successor, "Sparfox 64", with original characters, world, music and code.',
        'Tech: Three.js r180 (0.180.0) WebGPURenderer, WebGPU only with no fallback; TSL node materials; built-in toonOutlinePass + BloomNode post-processing; Rapier 3D 0.19.3 (@dimforge/rapier3d-compat) for collision queries, sensors and rigid-body debris; Web Audio API (procedural synth SFX, voice chatter and a step sequencer for music); Gamepad API (standard mapping, DualSense glyphs, dual-rumble); vanilla ES modules bundled into one HTML file; Google Fonts (Russo One, Rajdhani) via CDN.',
        'Art Direction: Stylised cel-shading — MeshToonMaterial with a 3-step gradient map, flat-shaded low-poly procedural models, screen-space inverted-hull ink outlines, banded gradient sky, banded animated toon water, HDR emissives with bloom, saturated per-zone palettes (sea, city, canyon, dusk arena).',
        'Animation: Fully procedural, code-driven animation — spring/damped transforms for banking, barrel rolls, somersaults and U-turns (quaternion composition), sine-based formation flight patterns, pooled particle explosions, Rapier-simulated debris, canvas-drawn talking comms portraits, scripted camera cutscenes.',
        'Testing: The prompt directed "Write no tests, do no tests, testing will be done separately." No tests or browser runs were performed; the build was not executed in a browser.',
        'Environment: Claude Code CLI (headless); Linux; browser unknown',
        'Model: Anthropic, claude-opus-5-5, reasoning effort medium',
        'Usage: cost and token totals unknown (no meter available inside the session); session time approx. 35 minutes (19:15 to about 19:50 local)',
    ]),
    ('Engine Feedback', [
        'What did you like most about the engine? Three.js r180\'s WebGPU stack ships toonOutlinePass and bloom as TSL nodes, so the whole cel-shaded look (toon ramp + ink lines + glow) is a few lines; Rapier\'s query API (castRay, intersectionsWithShape, collision groups) made a clean hit-scan/sensor layer.',
        'Did you get stuck or guess wrong? I guessed ToonOutlinePassNode was an addon (its examples path 404s; it lives in the core three.webgpu build). I had to check Rapier\'s d.ts for timeOfImpact vs toi. Without being allowed to run it, several API behaviours (sensors in ray casts, compileAsync with post-processing) remain educated guesses.',
        'What was the most important thing you had to build yourself? The rail-space system: a parametric flight path with per-route branches, rail-relative enemy coordinates, and a distance-keyed event timeline — plus all models, music and sound procedurally.',
        'What was the hardest part about using the engine? Keeping WebGPU shader permutations stable (fixed light pool instead of spawning lights) and reasoning about outline cracks on flat-shaded geometry without visual feedback.',
        'If you had to remove or overhaul one thing from engine, what would that be? The split between the three.webgpu.js build, three.tsl.js and examples/jsm addons that all need a hand-written import map; one ESM entry would remove a whole class of loading errors.',
        'If you could change one thing about the engine, what would it be? Per-material outline thickness/colour for toonOutlinePass (currently one global value), and in Rapier an explicit "refresh query pipeline" call for body-less colliders moved between steps.',
    ]),
    ('Prompt Feedback', [
        'What did you like most about this prompt? The concrete bar for "feature-complete demo" (MGS2 Tanker, Doom E1, THPS Warehouse) and the specific, testable UX requirements: controller-first 10-foot UI, an attract mode, and the axis-inversion quick fix.',
        'What was confusing? "Write no tests, do no tests" conflicts with the machine-wide instructions to verify UI in many viewports; "single html file" vs "dependencies can be downloaded"; and the literal [PROMPT] placeholder under Prompt Feedback.',
        'What was the hardest thing to do? Building a whole vertical slice — rail + all-range flight, two routes, mid-boss, boss, wingmen, menus, attract mode, music — without running it a single time.',
        'If there was one test you could of run, what would that test be? Load the HTML in a WebGPU browser with a DualSense, let attract mode loop once, then play title → checkpoint → hidden canyon → boss → results while watching the console for shader/TSL compile errors.',
    ]),
]

def credits_html():
    parts = ['<p><b>SPARFOX 64 — Verdant Reach Demo.</b> An original spiritual successor to Starfox 64. Code, models, music and sound are generated procedurally at runtime.</p>']
    for title, lines in SECTIONS:
        parts.append(f'<h3>{html.escape(title)}</h3><ul>' + ''.join(f'<li>{html.escape(l)}</li>' for l in lines) + '</ul>')
    parts.append('<h3>Cast</h3><ul><li>Vale (fox) — you, team leader</li><li>Tusk (boar) — veteran wingman</li><li>Wren (bird) — hotshot wingman</li><li>Moss (toad) — engineer, reads boss shields</li><li>Admiral Hollis (hound) — command</li><li>Overseer Kraag (lizard) — Varn Dominion</li></ul>')
    parts.append('<h3>Libraries</h3><ul><li>three.js r180 — MIT License</li><li>Rapier 0.19.3 by Dimforge — Apache-2.0</li><li>Russo One &amp; Rajdhani fonts — SIL Open Font License</li></ul>')
    return ''.join(parts)

def credits_comment():
    out = ['', 'SPARFOX 64 — Verdant Reach Demo (single-file build)', '']
    for title, lines in SECTIONS:
        out.append(title)
        out += ['- ' + l for l in lines]
        out.append('')
    return '\n'.join(out).replace('--', '—')

def main():
    shell = open(os.path.join(HERE, 'src', 'shell.html'), encoding='utf-8').read()
    js = []
    for f in sorted(glob.glob(os.path.join(HERE, 'src', '*.js'))):
        js.append(open(f, encoding='utf-8').read())
    code = '\n'.join(js)
    code = code.replace('/*@@CREDITS@@*/null', json.dumps({'html': credits_html()}))
    out = shell.replace('<!--@@HEADER_COMMENT@@-->', '<!--' + credits_comment() + '-->')
    out = out.replace('/*@@SCRIPT@@*/', code.replace('</script', '<\\/script'))
    # the HTML comment must come before <html>; DOCTYPE stays first for standards mode
    open(OUT, 'w', encoding='utf-8').write(out)
    print('wrote', OUT, len(out), 'bytes')

if __name__ == '__main__':
    main()
