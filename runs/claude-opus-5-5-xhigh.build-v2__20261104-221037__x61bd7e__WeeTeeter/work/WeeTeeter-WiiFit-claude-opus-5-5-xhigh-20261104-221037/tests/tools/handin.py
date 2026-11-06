# Checks the hand-in against TASK.md and PLAN.md section 18, on the files themselves. python3 <this file>
import json, os, re, sys
from playwright.sync_api import sync_playwright
DEV = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); WORK = os.path.dirname(DEV)
STEM = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037'; HTML = os.path.join(WORK, STEM + '.html')
bad = 0
def ok(name, cond, ev=''):
    global bad
    if not cond: bad += 1
    print(('ok   ' if cond else 'FAIL ') + name + (' :: ' + str(ev)[:170] if ev != '' else ''))
s = open(HTML, encoding='utf8').read()
ok('single HTML file in root, by the brief\'s name', os.path.isfile(HTML), STEM + '.html ' + str(os.path.getsize(HTML)) + ' bytes')
ok('dev files in the brief\'s subfolder', all(os.path.exists(os.path.join(DEV, p)) for p in ['build.mjs', 'game/core.js', 'engine/my-3d2dge.js', 'tests/run.mjs', 'game/data/README.md']), STEM + '/')
ok('PROGRESS.md kept', os.path.isfile(os.path.join(WORK, 'PROGRESS.md')))
ok('session client is the first script, right after charset', re.search(r'<head>\s*<meta charset="utf-8">\s*<script>/\*! aihub-session', s) is not None)
for t in ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="ghost"', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes']: ok('head tag ' + t, t in s)
ok('no audio or image files referenced', not re.search(r'\.(mp3|ogg|wav|m4a|flac)["\')]', s))
ok('no external scripts or links', not re.search(r'<script[^>]+src=|<link[^>]+href=', s))
# the exit interview, in the brief's exact shape
d = json.load(open(os.path.join(WORK, 'exit-interview.json'), encoding='utf8'))
ok('exit interview parses, top-level keys exact', list(d.keys()) == ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'])
SI = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']
ok('sourceInformation fields exact and filled', list(d['sourceInformation'].keys()) == SI and all(d['sourceInformation'][k] for k in SI))
ok('usage, plan, model as the brief says', d['sourceInformation']['usage'] == 'added on import' and d['sourceInformation']['plan'] == 'PLAN.md' and d['sourceInformation']['model'] == 'Anthropic, claude-opus-5-5, reasoning effort xhigh')
ok('date as the brief says', d['sourceInformation']['date'] == '2026-11-04 22:10:37')
ok('feedback answers 4 / 6 / 4', [len(d['testingFeedback']), len(d['engineFeedback']), len(d['promptFeedback'])] == [4, 6, 4])
ok('no pending answers', 'pending' not in json.dumps(d))
AH = ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags']
a = d['aiHub']; ok('aiHub shape and values', list(a.keys()) == AH and a['type'] == 'Game' and a['genre'] == 'Sports' and a['source'] == 'Wii Fit' and a['series'] == '' and a['players'] == '1–4' and 3 <= len(a['tags']) <= 6 and all(t == t.lower() for t in a['tags']), a['tags'])
# no TODOs or stubs in the game's own files
hits = []
for root, _, fs in os.walk(os.path.join(DEV, 'game')):
    for f in fs:
        if f.endswith(('.js', '.md', '.json')):
            t = open(os.path.join(root, f), encoding='utf8').read()
            if re.search(r'\b(TODO|FIXME|XXX|placeholder|lorem ipsum)\b', t, re.I): hits.append(f)
ok('no TODOs, placeholders or stubs in game/', not hits, hits)
ok('designer data files exist', all(os.path.isfile(os.path.join(DEV, 'game/data', f)) for f in ['lines.js', 'poses.js', 'activities.js', 'charts.js', 'courses.js', 'trays.js', 'days.js', 'unlocks.js', 'island.js', 'README.md']))
# the running game, from file://, on the handed-in page
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; reqs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('request', lambda q: reqs.append(q.url) if not q.url.startswith(('file:', 'data:', 'blob:')) else None)
    pg.goto('file://' + HTML)
    for _ in range(100):
        pg.wait_for_timeout(200)
        if pg.evaluate("window.G && G.game && G.game.sceneName") == 'title': break
    e = pg.evaluate
    ok('opens at the title with the picked title', e('G.game.sceneName') == 'title' and e('G.TITLE') == 'Wee Teeter', e('G.TITLE'))
    ok('built on the handoff engine', e('My3D2dge.version') == '0.89.0', e('My3D2dge.version'))
    ok('music 10% by default', e('G.game.settings.music') == .1 and abs(e('G.A.musicVolume') - .1) < .001)
    ok('PlayStation glyphs by default, Xbox available', e('G.game.settings.glyphs') == 'playstation')
    ok('twelve activities, each with two tiers', e('G.order.length') == 12 and e('G.order.every(id => G.activities[id].tiers.length === 2)'), e('G.order.join()'))
    ok('14 songs, 5 jingles', e('Object.keys(G.SONGS).length') == 14 and e('Object.keys(G.JINGLES).length') == 5)
    ok('every scene in the plan exists', e("['title','attract','member','arrival','island','bodycheck','evening','tareday','games','ending','freeplay','about','class','round'].every(n => !!G.scenes[n])"))
    ok('27 live dev sliders with defaults', e('G.DEV_SPEC.length') == 27 and e('G.DEV_SPEC.every(s => G.DEV[s.key] === s.def)'), e('G.DEV_SPEC.length'))
    ok('settings: voice, Gentle Mode, breath, tips', e("['voice','gentle','breathMode','tips'].every(k => G.game.settings[k] !== undefined)"))
    pg.evaluate("G.game.fadeTime = 0; G.go('about', null, { fade: 0 })"); pg.wait_for_timeout(400)
    ok('About shows the exit interview itself', e('JSON.stringify(window.WEE_ABOUT)') == json.dumps(d, ensure_ascii=False, separators=(',', ':')), 'usage: ' + e('window.WEE_ABOUT.sourceInformation.usage'))
    pages = e('G.aboutPages()'); text = ' '.join(l for p_ in pages for r in p_['rows'] for l in r['lines'])
    vals = list(d['sourceInformation'].values()) + d['testingFeedback'] + d['engineFeedback'] + d['promptFeedback']
    ok('every field and answer is on the About pages, in full', all(str(v) in text or ' '.join(str(v).split()) in ' '.join(text.split()) for v in vals), [p_['title'] for p_ in pages])
    ok('About carries all four sections and credits', all(k in e('JSON.stringify(window.WEE_ABOUT)') for k in ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback']))
    pg.evaluate("G.go('title', null, { fade: 0 })"); pg.wait_for_timeout(11500)
    ok('attract starts after 10 s idle', e('G.game.sceneName') == 'attract', e('G.game.sceneName'))
    pg.keyboard.press('KeyA'); pg.wait_for_timeout(500); ok('any input returns to the title', e('G.game.sceneName') == 'title', e('G.game.sceneName'))
    ok('no errors and no network on the page', not errs and not reqs, (errs + reqs)[:2])
    b.close()
print('hand-in: ' + ('all checks hold' if not bad else str(bad) + ' failed'))
sys.exit(1 if bad else 0)
