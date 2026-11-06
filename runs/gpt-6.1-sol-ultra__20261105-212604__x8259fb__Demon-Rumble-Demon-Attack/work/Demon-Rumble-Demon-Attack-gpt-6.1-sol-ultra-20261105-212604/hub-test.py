"""AI Hub harness checks for the bundled Demon Rumble HTML.
Run with the installed Playwright Python. Owns and terminates only its own server.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlencode
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
GAME = ROOT / f'{DEV.name}.html'
SCENARIOS = [
    ('two-player', {'players': 2}),
    ('four-player-degraded', {'players': 4, 'latency': 150, 'jitter': 50, 'loss': 5}),
    ('host-leave', {'players': 4, 'latency': 150, 'jitter': 50, 'loss': 5, 'scenario': 'host-leave'}),
    ('dedicated-server', {'players': 2, 'scenario': 'server'}),
]


def run(selected=None, fallback=False):
    reports = []
    failures = []
    count = 0
    server = subprocess.Popen(
        [sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', str(ROOT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    try:
        line = server.stdout.readline()
        port_match = re.search(r'port (\d+)', line)
        if not port_match:
            raise RuntimeError(f'Loopback server failed to announce its port: {line.strip()}')
        origin = f'http://127.0.0.1:{port_match.group(1)}'
        with urlopen(f'{origin}/{GAME.name}', timeout=10) as response:
            html = response.read().decode()
        if '<title>Demon Rumble' not in html or 'hub:session-mode' not in html:
            raise RuntimeError('The served HTML is not the bundled Demon Rumble game.')
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=[
                '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader',
                '--autoplay-policy=no-user-gesture-required',
            ])
            try:
                for name, parameters in SCENARIOS:
                    if selected and name not in selected:
                        continue
                    context = browser.new_context(viewport={'width': 1440, 'height': 900})
                    if fallback:
                        context.add_init_script("Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});")
                    page = context.new_page()
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    query = urlencode({'game': f'/{GAME.name}', 'auto': 1, 'limit': 12, 'play': 6000, **parameters})
                    url = f'{origin}/{DEV.name}/hub-reference/harness.html?{query}'
                    try:
                        page.goto(url, wait_until='domcontentloaded', timeout=30000)
                        page.wait_for_function("document.body.dataset.complete === 'true'", timeout=90000)
                        report = page.evaluate('window.__hubCheck')
                        report['scenarioName'] = name
                        report['pageErrors'] = errors
                        report['gameStates'] = []
                        for frame in page.frames:
                            if f'/{GAME.name}?' not in frame.url:
                                continue
                            state = frame.evaluate('window.__game?.state() ?? null')
                            if state:
                                report['gameStates'].append({key: state.get(key) for key in ['ready', 'backend', 'mode', 'wave', 'network']})
                        for check in report.get('checks', []):
                            count += 1
                            if not check['pass']:
                                failures.append(f"{name}: {check['name']}: {check.get('detail', '')}")
                        count += 1
                        if errors:
                            failures.append(f"{name}: page errors: {'; '.join(errors[:3])}")
                        count += 1
                        if not report.get('gameStates'):
                            failures.append(f'{name}: no live game state found')
                        if report.get('pass') is not True and not any(name + ':' in failure for failure in failures):
                            failures.append(f'{name}: harness did not pass')
                        reports.append(report)
                    except Exception as error:
                        count += 1
                        failures.append(f'{name}: {error}')
                        reports.append({'scenarioName': name, 'pass': False, 'error': str(error), 'pageErrors': errors})
                    finally:
                        context.close()
            finally:
                browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)
        if server.stdout:
            server.stdout.close()
    (DEV / 'hub-test-results.json').write_text(json.dumps({'count': count, 'failures': failures, 'scenarios': reports}, indent=2))
    return count, failures


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--scenario', action='append', choices=[name for name, _ in SCENARIOS])
    parser.add_argument('--fallback', action='store_true')
    args = parser.parse_args()
    try:
        count, failures = run(args.scenario, args.fallback)
    except Exception as error:
        print(f'FAIL: Hub checks could not run: {error}')
        raise SystemExit(1)
    for failure in failures:
        print(f'FAIL: {failure}')
    print(f'{count} hub checks, {len(failures)} failures')
    raise SystemExit(bool(failures))
