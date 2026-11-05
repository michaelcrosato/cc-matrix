#!/usr/bin/env python3
"""Browser check of the dashboard: every tab at phone, tablet, laptop and ultrawide sizes in Chromium,
WebKit and Firefox (no sideways scrolling, no console errors), plus the live behaviour: a redraw never
loses focus or typed text, runs that finish elsewhere show up by themselves, the batch log follows.

Needs Playwright for Python with its browsers. It builds its own runs with the fake CLIs in
test/fake-cli (nothing real starts, nothing is spent) and its own dashboard on a free port.

  python3 test/ui_check.py                  # all engines
  python3 test/ui_check.py --engines chromium --shots /tmp/shots
"""
import argparse, json, os, re, shutil, socket, subprocess, sys, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAKE = os.path.join(ROOT, 'test', 'fake-cli')
SIZES = [('phone', 375, 667, True), ('tablet', 768, 1024, True), ('small laptop', 1024, 768, False), ('laptop', 1366, 768, False), ('ultrawide', 2560, 1080, False)]
TABS = ['clis', 'prompt', 'plan', 'build', 'extra', 'run', 'running', 'results', 'insights', 'audit']

ap = argparse.ArgumentParser()
ap.add_argument('--engines', default='chromium,webkit,firefox')
ap.add_argument('--shots', help='save a screenshot of every tab and size here')
args = ap.parse_args()
failures, passes = [], 0
def check(name, ok, detail=''):
    global passes
    if ok: passes += 1
    else: failures.append(f'{name}: {detail}')
    print(('  ok   ' if ok else '  FAIL ') + name + (f'  ({detail})' if detail and not ok else ''), flush=True)

# --- a sandbox with realistic runs: three CLIs, two efforts, three variants, a failure, a run with no game, a /goal
# that's met and one that isn't (Codex has none)
tmp = tempfile.mkdtemp(prefix='matrix-ui-')
cfg = {'templateFile': 'prompt.md', 'agents': [
    {'id': 'opus', 'provider': 'claude', 'model': 'claude-opus-5-5', 'efforts': ['medium', 'high']},
    {'id': 'gpt-6.1-sol', 'provider': 'codex', 'model': 'gpt-6.1-sol', 'efforts': ['max']},
    {'id': 'gemini', 'provider': 'agy', 'model': 'gemini-4-argon', 'efforts': ['high']}],
  'dimensions': {'source': [{'id': 'kart', 'text': 'A kart racer'}],
                 'testing': [{'id': 'light', 'text': 'Keep testing light.'}, {'id': 'thorough', 'text': 'Test thoroughly. FAKE:todo FAKE:goal=unmet'},
                             {'id': 'broken', 'text': 'FAKE:fail=You have hit your usage limit (429)'}],
                 'goal': [{'id': 'on', 'text': 'the game file exists.'}]},
  'bins': {p: os.path.join(FAKE, p) for p in ['claude', 'codex', 'grok', 'agy', 'muse']},
  'startGap': 0}  # runs start together, not 3 s apart: the live checks expect two running at once
json.dump(cfg, open(os.path.join(tmp, 'config.json'), 'w'), indent=2)
open(os.path.join(tmp, 'prompt.md'), 'w').write('Make {{source}}.\n\nTesting: {{testing}}\n')
runs, conf = os.path.join(tmp, 'runs'), os.path.join(tmp, 'config.json')
# The fake codex and grok write their session logs under tmp, and the fake claude its transcripts, where the runner
# then looks for them.
env = {**os.environ, 'FAKE_SLEEP_MS': '10', 'CODEX_HOME': os.path.join(tmp, 'codex-home'), 'GROK_HOME': os.path.join(tmp, 'grok-home'),
       'CLAUDE_CONFIG_DIR': os.path.join(tmp, 'claude-home')}
subprocess.run(['node', os.path.join(ROOT, 'run-matrix.mjs'), '--config', conf, '--out', runs, '-j', '4'], check=True, capture_output=True, env=env)

s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
srv = subprocess.Popen(['node', os.path.join(ROOT, 'dashboard.mjs'), '--port', str(port), '--config', conf, '--out', runs], env=env,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
base = f'http://127.0.0.1:{port}'
for _ in range(100):
    try: urllib.request.urlopen(base + '/'); break
    except Exception: time.sleep(0.1)
has_audit = urllib.request.urlopen(base + '/api/audit').read().strip() != b'null'

OVERFLOW = """() => { const vw = document.documentElement.clientWidth, out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || (r.right <= vw + 1 && r.left >= -1)) continue;
    let p = el.parentElement, clipped = false;
    while (p && p !== document.body) { if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)) { clipped = true; break; } p = p.parentElement; }
    if (!clipped) out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : ''));
  }
  return { page: document.documentElement.scrollWidth - vw, items: out.slice(0, 5) }; }"""

try:
    with sync_playwright() as p:
        for engine in args.engines.split(','):
            print(f'{engine}:', flush=True)
            br = getattr(p, engine).launch()
            for label, w, hgt, mobile in SIZES:
                ctx = br.new_context(viewport={'width': w, 'height': hgt}, has_touch=mobile, is_mobile=mobile and engine != 'firefox')
                page = ctx.new_page(); errs = []
                page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
                page.on('pageerror', lambda e: errs.append(str(e)))
                for t in TABS:
                    if t == 'audit' and not has_audit: continue
                    page.goto(f'{base}/#{t}'); page.wait_for_selector(f'#tab-{t}.on > *', timeout=15000); page.wait_for_timeout(300)
                    o = page.evaluate(OVERFLOW)
                    check(f'{label} {w}px {t}: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o))
                    if args.shots:
                        os.makedirs(args.shots, exist_ok=True)
                        page.screenshot(path=os.path.join(args.shots, f'{engine}-{label}-{t}.png'), full_page=True)
                check(f'{label}: no console errors', not errs, '; '.join(errs[:3]))
                ctx.close()
            br.close()

        print('live behaviour (chromium):', flush=True)
        br = p.chromium.launch(); page = br.new_page(viewport={'width': 1280, 'height': 900})
        page.on('dialog', lambda d: d.accept())
        page.goto(base + '/#results'); page.wait_for_selector('table.runs')
        box = page.get_by_label('Search runs and notes')
        box.click(); box.type('opus', delay=30); page.wait_for_timeout(600); page.keyboard.type('-high', delay=30); page.wait_for_timeout(600)
        check('search keeps focus and every keystroke across redraws', page.evaluate('document.activeElement.value') == 'opus-high')
        page.get_by_role('button', name='Clear').first.click(); page.wait_for_timeout(300)
        rid = 'opus-medium__kart__light__on'  # every run has the goal's variant
        notes = page.get_by_label(f'Notes for {rid}'); notes.click(); notes.type('half a thought', delay=20)
        n0 = page.locator('table.runs tbody tr').count()
        # meanwhile, in a terminal: a new variant added to the config by hand, and run
        c = json.load(open(conf)); c['dimensions']['testing'].append({'id': 'extra', 'text': 'One more.'}); json.dump(c, open(conf, 'w'), indent=2)
        subprocess.run(['node', os.path.join(ROOT, 'run-matrix.mjs'), '--config', conf, '--out', runs, '--only', 'testing=extra'], check=True, capture_output=True, env=env)
        page.wait_for_timeout(3000)
        n1 = page.locator('table.runs tbody tr').count()
        check('runs from a terminal show up without a reload', n1 == n0 + 4, f'{n0} -> {n1}')
        st = page.evaluate("({ l: document.activeElement.getAttribute('aria-label'), v: document.activeElement.value })")
        check('a note being typed survives the live redraw', st == {'l': f'Notes for {rid}', 'v': 'half a thought'}, str(st))
        page.keyboard.press('Tab'); page.wait_for_timeout(600)
        saved = json.load(open(os.path.join(runs, 'scores.json'))).get(rid, {})
        check('the note saved, with the run attempt it belongs to', saved.get('notes') == 'half a thought' and bool(saved.get('startedAt')), str(saved))
        # Results → Columns: hide one, show one hidden by default, drag a header onto another to move its column, and the
        # first columns (frozen) stay put while the table scrolls sideways
        page.get_by_role('button', name='Columns').click(); page.wait_for_selector('#modal[open] .colist')
        row = lambda name: page.locator('#modal .colrow', has=page.locator('span', has_text=re.compile(f'^{re.escape(name)}$')))
        row('KB').locator('input').uncheck(); row('requests').locator('input').check(); page.wait_for_timeout(300)
        page.keyboard.press('Escape'); page.wait_for_timeout(300)
        heads = lambda: [re.sub(r'[ ▲▼]+$', '', x.strip()).lower() for x in page.locator('table.runs thead th').all_inner_texts()]
        h0 = heads()
        page.locator('table.runs thead th', has_text='list $').drag_to(page.locator('table.runs thead th', has_text=re.compile('^time', re.I))); page.wait_for_timeout(400)
        h1 = heads()
        box = page.locator('#tab-results .xbar + .scroll'); box.evaluate('e => e.scrollLeft = 400'); page.wait_for_timeout(300)
        x = page.evaluate("[...document.querySelectorAll('#tab-results table.runs tbody tr:first-child td')].slice(0, 4).map((td) => Math.round(td.getBoundingClientRect().left))")
        box.evaluate('e => e.scrollLeft = 0'); page.wait_for_timeout(200)
        x0 = page.evaluate("[...document.querySelectorAll('#tab-results table.runs tbody tr:first-child td')].slice(0, 4).map((td) => Math.round(td.getBoundingClientRect().left))")
        check('Columns hides and shows columns, a dragged header moves its column, and the first three stay put as the table scrolls sideways',
              'kb' not in h0 and 'requests' in h0 and h1.index('list $') == h1.index('time') - 1 and x[:3] == x0[:3] and x[3] < x0[3], f'{h0} {h1} {x0} {x}')
        page.get_by_role('button', name='Columns').click(); page.wait_for_selector('#modal[open] .colist')
        page.get_by_role('button', name='Reset all').click(); page.wait_for_timeout(300); page.keyboard.press('Escape'); page.wait_for_timeout(300)
        check('Reset all puts the columns back', 'kb' in heads() and 'requests' not in heads(), str(heads()))
        # a Codex run's details: its list price, requests, tools, subagent tokens and plan limits from Codex's session logs
        page.locator('table.runs tbody tr', has_text='gpt-6.1-sol').filter(has_text='light').get_by_role('button', name='details').click()
        page.wait_for_selector('#modal[open] >> text=API list price')
        txt = page.locator('#modal').inner_text()
        check('run details show list price, requests, tools, subagents and plan usage',
              all(x in txt for x in ['Model requests', 'command_execution 3', 'not in the CLI\'s own total', 'Plan usage', '5h 12%', 'week 41%', 'pro']), txt[:400])
        page.keyboard.press('Escape'); page.wait_for_timeout(200)
        # whether each run's /goal was met, read from its session: a column, a flag on the ones that weren't, and in details
        goals = sorted(set(g.strip() for g in page.locator('table.runs td.goalcell').all_inner_texts()))
        check('the goal met column shows met, not met and skipped (Codex has no /goal)', {'met', 'not met', 'skipped'} <= set(goals), str(goals))
        page.locator('table.runs tbody tr', has_text='opus').filter(has_text='thorough').filter(has_text='ok').first.get_by_role('button', name='details').click()
        page.wait_for_selector('#modal[open] >> text=Goal met')
        txt = page.locator('#modal').inner_text()
        check('a run whose goal was never met says so in details, with what its last check said',
              'Never met (9 checks; Claude Code ended the turn itself' in txt and 'does not show every feature working' in txt, txt[:600])
        page.keyboard.press('Escape'); page.wait_for_timeout(200)
        # CLIs → This computer: the sandbox's computer has no environment file yet, and the card says so (a page of its
        # own, so the CLIs tab's save bar isn't left beside Stage 1's for the steps below)
        cp = br.new_page(viewport={'width': 1280, 'height': 900}); cp.goto(base + '/#clis'); cp.wait_for_selector('#machinecard >> text=This computer')
        card = cp.locator('#machinecard').inner_text(); cp.close()
        check('CLIs → This computer says the computer has no environment file yet, and offers to write one',
              'has no environment file yet' in card and 'Check this computer' in card, card[:300])
        # the header holds one row on a laptop, whatever the pill and the badges say (a long pill with warnings wrapped it once)
        page.goto(base + '/#run'); page.wait_for_selector('#tab-run.on > *')
        page.evaluate("""() => { document.querySelector('#pill .full').textContent = 'Running · 123 active · 1,111 of 2,261 done · ⚠ 117'; document.querySelector('#pill .short').textContent = '● 1,111/2,261 done ⚠117';
          for (const t of ['running', 'insights', 'audit']) { const b = document.querySelector(`nav button[data-tab="${t}"]`); b.hidden = false; b.querySelector('.badge')?.remove(); b.insertAdjacentHTML('beforeend', '<span class="badge">553</span>'); } }""")
        rows = {}
        for w in (1241, 1280, 1366, 1440, 1500, 1501, 1536, 1920):
            page.set_viewport_size({'width': w, 'height': 800})
            rows[w] = page.evaluate("""() => { const r = (q) => document.querySelector(q).getBoundingClientRect(), th = r('#theme'), nav = document.querySelector('header nav'), last = [...nav.querySelectorAll('button:not([hidden])')].at(-1).getBoundingClientRect();
              return { oneRow: Math.abs(th.top + th.height / 2 - (r('header h1').top + r('header h1').height / 2)) < 8, inView: th.right <= innerWidth, navFits: last.right <= r('#pill').left, h: Math.round(r('header').height) }; }""")
        check('the header holds one row from 1241px up, tabs whole, with the longest pill and badges', all(x['oneRow'] and x['inView'] and x['navFits'] and x['h'] <= 60 for x in rows.values()), json.dumps(rows))
        page.set_viewport_size({'width': 1280, 'height': 900})
        # the tabs in order, and links from when two of them had other names
        names = [re.sub(r'\s+', ' ', x).strip() for x in page.locator('header nav button:visible').all_inner_texts()]
        names = [re.sub(r'\s*\d+$', '', x) for x in names]
        check('the tabs read in order, the stages as a progression',
              names[:9] == ['CLIs', 'Stage 1 Prompt', 'Stage 2 Plan', 'Stage 3 Build', 'Stage X Extra', 'Run', 'Running', 'Results', 'Insights'], str(names))
        old = {}
        for was, now in (('setup', 'prompt'), ('advanced', 'plan'), ('monitor', 'running')):
            page.goto(f'{base}/#{was}'); page.reload(); page.wait_for_selector(f'#tab-{now}.on > *'); old[was] = page.evaluate('location.hash')
        check('links from when the tabs had other names still land on them', old == {'setup': '#prompt', 'advanced': '#plan', 'monitor': '#running'}, str(old))
        # Stage 1: bulk add a pasted list of games to {{source}} (numbered, a chosen short name, a duplicate, a comment)
        page.goto(base + '/#prompt'); page.wait_for_selector('text=Bulk add…')
        page.locator('.card', has=page.locator('.tag', has_text='{{source}}')).get_by_role('button', name='Bulk add…').click()
        page.wait_for_selector('#bulk-text')
        games = '\n'.join(['# my list', '1. Super Mario Kart', '2) F-Zero X', '- mk8 | Mario Kart 8 Deluxe', 'A kart racer', ''] + [f'Game {i}' for i in range(100)])
        page.locator('#bulk-text').type(games[:60], delay=5); page.locator('#bulk-text').fill(games); page.wait_for_timeout(300)
        focused = page.evaluate("document.activeElement.id")
        page.get_by_role('button', name='Add 103 variants').click(); page.wait_for_timeout(200)
        page.keyboard.press('Control+s'); page.wait_for_timeout(800)
        src = [v['id'] for v in json.load(open(conf))['dimensions']['source']]
        check('bulk add: 103 games pasted at once, names made from the text, duplicates skipped, typing keeps focus',
              focused == 'bulk-text' and len(src) == 104 and src[1:4] == ['SuperMarioKart', 'FZeroX', 'mk8'] and src[-1] == 'Game99', f'{focused} {len(src)} {src[:5]}')
        c = json.load(open(conf)); c['dimensions']['source'] = c['dimensions']['source'][:1]; json.dump(c, open(conf, 'w'), indent=2); page.wait_for_timeout(2500)
        # Stage 1: runs are matched by short name, so editing the text of a variant that ran renames it ({{source}}'s from
        # the text) and the old text brings the old name back; a new source is named from its text; a name that ran is taken
        page.goto(base + '/#prompt'); page.wait_for_selector('text=Bulk add…')
        card = page.locator('.card', has=page.locator('.tag', has_text='{{source}}'))
        name = card.get_by_label('source variant short name')
        card.get_by_label('source variant text').first.click(); page.keyboard.press('End'); page.keyboard.type(' 2')
        renamed = name.first.input_value()
        for _ in range(2): page.keyboard.press('Backspace')
        check('editing a variant that ran renames it, from its text for {{source}}; the old text brings the old name back',
              renamed == 'a-kart-racer-2' and name.first.input_value() == 'kart', f'{renamed} {name.first.input_value()}')
        card.get_by_role('button', name='+ Add variant').click(); page.wait_for_timeout(200)
        card.get_by_label('source variant text').last.fill('A golf game'); page.wait_for_timeout(200)
        new = name.last.input_value()
        card.get_by_label('Remove variant').first.click(); page.wait_for_timeout(200) # kart goes; its name is still the runs'
        name.first.fill('kart'); page.wait_for_timeout(200)
        taken = 'invalid' in (name.first.get_attribute('class') or '') and 'used "kart" for other text' in page.locator('.savebar').inner_text()
        check('a new {{source}} is named from its text; a short name finished runs used for other text is taken', new == 'a-golf-game' and taken, f'{new} {taken}')
        tcard = page.locator('.card', has=page.locator('.tag', has_text='{{testing}}'))
        tcard.locator('select[aria-label^="Add a pinned"]').select_option(label='test-full · Test thoroughly: automated tests for ev…'); page.wait_for_timeout(200)
        added = tcard.get_by_label('testing variant short name').last.input_value()
        check('"+ Add…" adds a pinned variant with its name and text', added == 'test-full' and 'automated tests' in tcard.get_by_label('testing variant text').last.input_value(), added)
        tcard.get_by_label('Pin testing variant light').click(); page.wait_for_timeout(200)
        tcard.get_by_label('Unpin testing variant test-full').click(); page.wait_for_timeout(200)
        pins = page.evaluate("pinsOf('testing').map((p) => p.id)")
        check('pin and unpin on a variant\'s row change the field\'s pins', 'light' in pins and 'test-full' not in pins, str(pins))
        page.get_by_role('button', name='Discard').click(); page.wait_for_timeout(300)
        # The stage tabs: with no stages yet, Stage 2 and Stage 3 offer theirs and Stage X waits for them; each lands in its place
        rail = lambda: re.sub(r'\s+', ' ', page.locator('section.tab.on .railcells').inner_text())
        c = json.load(open(conf)); c.pop('stages', None); json.dump(c, open(conf, 'w'), indent=2); page.wait_for_timeout(2500)
        page.goto(base + '/#extra'); page.wait_for_selector('#tab-extra.on .rail'); page.wait_for_timeout(300)
        check('Stage X waits for the plan and the build', 'set up Stage 2 · Plan first' in re.sub(r'\s+', ' ', page.locator('#tab-extra').inner_text()) and page.get_by_role('button', name='+ Add stage').count() == 0)
        page.locator('#tab-extra').get_by_role('button', name='Stage 2 · Plan').click(); page.wait_for_selector('#tab-plan.on >> text=No plan stage yet')
        page.get_by_role('button', name='Add the plan stage').click(); page.wait_for_selector('#tab-plan >> text=Instructions')
        page.locator('#tab-plan .railcell', has_text='Build').click(); page.wait_for_selector('#tab-build.on >> text=No build stage yet')
        page.get_by_role('button', name='Add the build stage').click(); page.wait_for_selector('#tab-build >> text=Instructions')
        page.locator('button[data-tab="extra"]').click(); page.wait_for_selector('#tab-extra.on >> text=Add a content pass')
        page.get_by_role('button', name='Add a content pass').click(); page.wait_for_selector('#tab-extra .stagebox')
        page.get_by_role('button', name='+ Add stage').click(); page.wait_for_timeout(200)
        ids = page.evaluate('cfg.stages.map((x) => x.id)'); labels = page.locator('#tab-extra .stagebox .dim-head .tag').all_inner_texts()
        check('each stage lands on its tab: plan and build, then Stage X\'s, numbered 4 and 5', ids == ['plan', 'build', 'content', 'stage5'] and labels == ['Stage 4', 'Stage 5'], f'{ids} {labels}')
        page.get_by_label('Move stage stage5 up').click(); page.wait_for_timeout(200)
        ids = page.evaluate('cfg.stages.map((x) => x.id)')
        check('Stage X\'s stages move among themselves, never into Build', ids == ['plan', 'build', 'stage5', 'content'] and page.get_by_label('Move stage stage5 up').is_disabled(), str(ids))
        page.get_by_label('Remove stage stage5').click(); page.wait_for_timeout(200)
        page.locator('button[data-tab="plan"]').click(); page.wait_for_selector('#tab-plan.on .rail'); page.wait_for_timeout(200)
        heads = page.locator('#tab-plan .dim-head button').count()
        page.locator('button[data-tab="build"]').click(); page.wait_for_selector('#tab-build.on .rail'); page.wait_for_timeout(200)
        heads += page.locator('#tab-build .dim-head button').count()
        page.locator('button[data-tab="extra"]').click(); page.wait_for_selector('#tab-extra.on .rail'); page.wait_for_timeout(200)
        check('Stage 2 and Stage 3 keep their places: no ↑ ↓ there, and no ✕ while a stage comes after them', heads == 0, str(heads))
        page.locator('#tab-extra').get_by_label('Add a model to content').select_option('opus:medium'); page.wait_for_timeout(200)
        page.locator('button[data-tab="plan"]').click(); page.wait_for_selector('#tab-plan.on .rail'); page.get_by_label('Add a model to plan').select_option('opus:high'); page.wait_for_timeout(200)
        page.locator('button[data-tab="build"]').click(); page.wait_for_selector('#tab-build.on .rail'); page.get_by_label('Add a model to build').select_option('opus:medium'); page.get_by_label('Add a model to build').select_option('gpt-6.1-sol:max'); page.wait_for_timeout(200)
        r = rail()
        check('the rail shows the whole chain: briefs, each stage\'s models and sessions per brief', all(x in r for x in ['Stage 1 Prompt', '4 briefs', 'Stage 2 Plan plan 1 model · 1 per brief', 'Stage 3 Build build 2 models · 2 per brief', 'Stage X Extra content 2 per brief']), r)
        page.locator('#tab-build').get_by_text('How stages work').click(); page.wait_for_timeout(200)
        how = page.locator('#tab-build').inner_text()
        check('How stages work folds out, with what a stage\'s text can use', 'Every session finds TASK.md' in how and '{{parentModel}}' in how, how[:300])
        # Run: in stages by default once there are stages, each stage's row leading back to its tab, and Checks saying there are unsaved edits
        page.locator('button[data-tab="run"]').click(); page.wait_for_selector('#tab-run.on .runbar'); page.wait_for_timeout(300)
        run = page.locator('#tab-run').inner_text()
        check('Run is in stages by default, says what each stage will do, and Checks says the edits are saved when you start',
              page.get_by_role('button', name='In stages', exact=True).get_attribute('aria-pressed') == 'true' and 'Stage 3 · build' in run and 'Unsaved changes; they\'re saved when you start.' in run, run[:500])
        page.locator('#tab-run').get_by_role('button', name='Stage 4 · content').click(); page.wait_for_selector('#tab-extra.on .stagebox')
        check('a stage\'s row on Run leads to its tab', page.evaluate('location.hash') == '#extra')
        page.get_by_role('button', name='Discard').click(); page.wait_for_timeout(400)
        # A stage's name follows its text the same way as a variant's: edited after a run used it, plan → plan-v2 with
        # a note saying why, and typing on keeps focus; the old text brings the old name back
        c = json.load(open(conf)); c['stages'] = [{'id': 'plan', 'text': 'Plan TASK.md. FAKE:plan', 'game': False}]; json.dump(c, open(conf, 'w'), indent=2)
        subprocess.run(['node', os.path.join(ROOT, 'run-matrix.mjs'), '--config', conf, '--out', runs, '--stage', 'plan=opus:medium', '--only', 'testing=light'],
                       check=True, capture_output=True, env=env)
        page.goto(base + '/#plan'); page.wait_for_selector('#tab-plan.on >> text=Instructions'); page.wait_for_timeout(1500)
        stage_name = page.get_by_label('Stage 2 name')
        page.get_by_label('plan text').click(); page.keyboard.press('End'); page.keyboard.type(' Twice.', delay=10); page.wait_for_timeout(300)
        renamed, note = stage_name.input_value(), page.locator('#tab-plan').inner_text()
        for _ in range(7): page.keyboard.press('Backspace')
        page.wait_for_timeout(300)
        check('editing a stage that ran renames it (plan → plan-v2) and says why; the old text brings the old name back',
              renamed == 'plan-v2' and 'New name: 1 finished run of "plan" used other text' in note and stage_name.input_value() == 'plan',
              f'{renamed} → {stage_name.input_value()}')
        c = json.load(open(conf)); c.pop('stages', None); json.dump(c, open(conf, 'w'), indent=2); page.wait_for_timeout(2500)
        page.goto(base + '/#run'); page.wait_for_selector('#tab-run.on > *')
        # a batch from the Run tab: the log follows its end, the pill shows progress
        many = [{'id': f'm{i}', 'text': f'FAKE:sleep=150 m{i}'} for i in range(30)]
        c = json.load(open(conf)); c['dimensions']['testing'] += many; json.dump(c, open(conf, 'w'), indent=2)
        page.goto(base + '/#run'); page.wait_for_timeout(1500)
        run = page.locator('#tab-run').inner_text()
        check('Run says what a batch would take, and Checks covers the setup, the prompt, the models and the limits',
              all(x in run for x in ['ROUGH ESTIMATE', 'Checks', 'Everything is saved.', 'which has run before', 'Plan limits']) and page.get_by_role('button', name='In stages', exact=True).count() == 0, run[:600])
        check('Run names the dimensions with one variant instead of a card each', '2 more dimensions with one variant' in run and 'source, goal' in run, run[-300:])
        page.get_by_role('button', name='▶ Start').click()
        page.wait_for_function("document.querySelector('#pill').textContent.includes('Running')", timeout=10000)
        page.wait_for_function("!document.querySelector('#pill').textContent.includes('Running')", timeout=60000)
        page.wait_for_timeout(2500)
        pos = page.evaluate("(() => { const p = document.querySelector('#logpre'); return [p.scrollTop, p.scrollHeight - p.clientHeight]; })()")
        check('the batch log follows its end', pos[1] > 0 and pos[0] >= pos[1] - 8, str(pos))
        # a running batch takes changes: Options act on it, Pause holds the queue, a run can be restarted
        # long enough to still be running at the ↻ below, many steps later
        c = json.load(open(conf)); c['dimensions']['testing'] += [{'id': f's{i}', 'text': f'FAKE:sleep=12000 s{i}'} for i in range(4)]; json.dump(c, open(conf, 'w'), indent=2)
        api_state = lambda: json.load(urllib.request.urlopen(base + '/api/status'))
        page.goto(base + '/#run'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='▶ Start').click()
        page.wait_for_function("status.running && status.state && status.active.length === 2", timeout=20000)
        page.wait_for_selector('#tab-running .card h2:text-is("Running now · 2")', timeout=10000)
        mon = page.locator('#tab-running').inner_text()
        check('Start goes to Running: the batch, its models, the runs going now (a row each), each CLI and the log, and no Options',
              all(t in mon for t in ['This batch', 'By model', 'Running now · 2', 'By CLI', 'Log']) and page.locator('#tab-running .card', has_text='Running now').locator('table.monitor tbody tr').count() == 2
              and 'Parallel runs' not in mon and page.evaluate('location.hash') == '#running', mon[:300])
        check('the Running tab counts the runs going', page.locator('button[data-tab="running"] .badge').inner_text() == '2')
        page.get_by_role('button', name='Options on Run →').click(); page.wait_for_selector('#tab-run.on >> text=Options · this batch')
        check('Run has the batch\'s options, its controls and + Queue while it runs, and a way back to Running',
              all(page.locator('#tab-run').get_by_role('button', name=n).count() == 1 for n in ['⏸ Pause', '■ Stop', '+ Queue', 'See it in Running →']))
        page.fill('#opt-concurrency', '1'); page.press('#opt-concurrency', 'Enter')
        page.get_by_role('button', name='Let them finish').click(); page.wait_for_timeout(800)
        st = api_state()
        check('lowering Parallel runs mid-batch asks, then applies without ending anything', st['state']['concurrency'] == 1 and len(st['active']) == 2, json.dumps(st['state']))
        check('Options say what a change reaches while a batch runs', page.locator('#tab-run .tag', has_text='not started yet').count() >= 4 and page.locator('#tab-run .tag', has_text='fixed').count() == 1)
        page.fill('#opt-perCli', '5'); page.press('#opt-perCli', 'Enter')
        page.wait_for_selector('#modal[open] >> text=Applies to the')
        page.get_by_role('button', name='Cancel').click(); page.wait_for_timeout(300)
        check('cancelling a change leaves the batch and the field as they were', api_state()['state']['perCli'] is None and page.input_value('#opt-perCli') == '')
        page.fill('#opt-perCli', '5'); page.press('#opt-perCli', 'Enter')
        page.get_by_role('button', name='Apply to the runs not started yet').click(); page.wait_for_timeout(800)
        check('every change asks first, then applies', api_state()['state']['perCli'] == 5)
        page.get_by_role('button', name='⏸ Pause').click()
        page.get_by_role('button', name='Let the running ones finish').click()
        page.wait_for_selector('button:has-text("▶ Resume")', timeout=5000)
        check('Pause holds the batch and offers Resume', api_state()['state']['paused'] is True)
        page.get_by_role('button', name='See it in Running →').click(); page.wait_for_selector('#tab-running.on #live')
        check('Running has Pause too', page.locator('#tab-running').get_by_role('button', name='▶ Resume').count() == 1)
        rid = page.evaluate('status.active[0]')
        page.get_by_label(f'Restart {rid} later').click()
        page.wait_for_function(f"logText.includes('↺ {rid} requeued')", timeout=10000)
        check('↻ ends a run and puts it back in the queue', rid not in api_state()['active'])
        page.set_viewport_size({'width': 375, 'height': 667}); page.wait_for_timeout(600)
        o = page.evaluate(OVERFLOW)
        check('phone 375px Running with the live controls: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o))
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-phone-running-live.png'), full_page=True)
        page.locator('button[data-tab="run"]').click(); page.wait_for_selector('#tab-run.on >> text=Options · this batch'); page.wait_for_timeout(300)
        o = page.evaluate(OVERFLOW)
        check('phone 375px Run with a batch going: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o))
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-phone-run-live.png'), full_page=True)
        page.set_viewport_size({'width': 1280, 'height': 900})
        page.get_by_role('button', name='▶ Resume').click(); page.wait_for_timeout(800)
        check('Resume lets runs start again', api_state()['state']['paused'] is False)
        # + Queue (on Run): another batch beside the running one, listed in Running; the runs the first has are left out of it
        page.get_by_role('button', name='+ Queue').click()
        page.wait_for_function("status.batches && status.batches.length === 2", timeout=10000)
        page.wait_for_selector('#tab-running.on #live >> text=Batch 2', timeout=5000)
        st = api_state()
        check('+ Queue adds a batch beside the running one, and it leaves out the runs that one has',
              any(l.startswith('+ Batch 2 queued') for l in st['log']) and st['running'], json.dumps(st['batches']))
        page.set_viewport_size({'width': 375, 'height': 667}); page.wait_for_timeout(400)
        o = page.evaluate(OVERFLOW)
        check('phone 375px Running with two batches in the queue: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o))
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-phone-running-queue.png'), full_page=True)
        page.set_viewport_size({'width': 1280, 'height': 900}); page.wait_for_timeout(300)
        if args.shots: page.screenshot(path=os.path.join(args.shots, 'chromium-laptop-running-queue.png'), full_page=True)
        boot = api_state()['boot']
        page.get_by_role('button', name='⟳ Restart dashboard').click()
        page.wait_for_selector('#modal[open] >> text=The batch picks up where it left off')
        page.get_by_role('button', name='Cancel').click(); page.wait_for_timeout(500)
        st = api_state()
        check('Restart says what happens to the batch and the runs going, and Cancel leaves them be', st['boot'] == boot and st['running'] and not st['restarting'])
        page.get_by_role('button', name='■ Stop').click()
        page.wait_for_selector('#modal[open] .choices button.danger')
        check('Stop offers Pause first; ending runs is the red choice', page.locator('#modal .choices button.primary').inner_text().startswith('Pause instead'))
        page.locator('#modal .choices button.danger').click()
        page.wait_for_function("!status.running", timeout=30000)
        # Running now says what each run is: its source, which stage of how many and, once named, its game's title
        c = json.load(open(conf)); c['stages'] = [{'id': 'plan', 'text': 'Plan TASK.md. FAKE:plan', 'game': False}, {'id': 'build', 'text': 'Build it. FAKE:sleep=25000'}]; json.dump(c, open(conf, 'w'), indent=2)
        page.goto(base + '/#running'); page.wait_for_selector('#tab-running.on > *'); page.wait_for_timeout(800)
        page.evaluate("""api('/api/run', 'POST', { stages: { plan: ['opus:medium'], build: ['opus:medium'] }, only: { source: ['kart'], testing: ['light'], goal: ['on'] }, concurrency: 2 })""")
        page.wait_for_function("status.active.some((id) => id.includes('.build'))", timeout=20000)
        running = page.locator('#tab-running .card', has=page.locator('h2', has_text='Running now'))
        running.locator('tbody tr').first.wait_for(timeout=5000); page.wait_for_timeout(2500)
        heads = [x.strip() for x in running.locator('thead th').all_inner_texts()]; row = running.locator('tbody tr').first.inner_text()
        check('Running now shows the source by its name and which stage of how many', 'SOURCE' in heads and 'STAGE' in heads and 'A kart racer' in row and 'Stage 3 of 3' in row and 'build' in row, f'{heads} {row}')
        rid = page.evaluate("status.active.find((id) => id.includes('.build'))")
        os.makedirs(os.path.join(runs, rid, 'work', 'Wobble Grove-A kart racer-claude-opus-5-5-medium-20261105-120000'), exist_ok=True)
        page.wait_for_selector('#tab-running table.monitor >> text=Wobble Grove', timeout=15000)
        check('and its game\'s title once its agent has named the game', 'GAME TITLE' in [x.strip() for x in running.locator('thead th').all_inner_texts()])
        # A server not restarted since the page changed sends no activeInfo: the page reads each run's unfinished.json instead.
        p2 = br.new_page(viewport={'width': 1280, 'height': 900})
        def no_info(route):
            r = route.fetch(); j = r.json(); j.pop('activeInfo', None); route.fulfill(response=r, json=j)
        p2.route('**/api/status*', no_info)
        p2.goto(base + '/#running'); p2.wait_for_selector('#tab-running.on table.monitor tbody tr', timeout=15000); p2.wait_for_timeout(1500)
        row2 = p2.locator('#tab-running .card', has=p2.locator('h2', has_text='Running now')).locator('tbody tr').first.inner_text()
        check('with a server from before this, Running now still shows the source and the stage, without asking it', 'A kart racer' in row2 and 'Stage 3 of 3' in row2, row2)
        p2.set_viewport_size({'width': 375, 'height': 667}); p2.wait_for_timeout(500); o = p2.evaluate(OVERFLOW)
        check('phone 375px Running with stages and a source: no sideways scroll', o['page'] <= 0 and not o['items'], json.dumps(o)); p2.close()
        page.get_by_role('button', name='■ Stop').click()
        page.wait_for_selector('#modal[open] .choices button.danger'); page.locator('#modal .choices button.danger').click()
        page.wait_for_function("!status.running", timeout=30000)
        br.close()
finally:
    srv.terminate(); srv.wait()
    shutil.rmtree(tmp, ignore_errors=True)

print(f'\n{passes} passed, {len(failures)} failed')
for f in failures: print('  ' + f)
sys.exit(1 if failures else 0)
