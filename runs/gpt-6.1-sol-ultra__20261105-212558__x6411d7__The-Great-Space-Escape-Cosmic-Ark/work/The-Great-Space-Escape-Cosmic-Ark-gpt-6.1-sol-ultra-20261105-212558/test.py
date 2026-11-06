"""One command: python3 test.py. Prints only failures and one total count."""
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PLAYWRIGHT_PYTHON = Path('/home/micha/.local/share/pipx/venvs/playwright/bin/python')
COMMANDS = [
    ['node', 'integrity-tests.mjs'],
    ['node', 'simulation-tests.mjs'],
    ['node', 'network.test.mjs'],
    [str(PLAYWRIGHT_PYTHON), 'browser-tests.py'],
    [str(PLAYWRIGHT_PYTHON), 'hub-tests.py'],
]
total = 0
failed_suites = 0
for command in COMMANDS:
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    output = result.stdout + result.stderr
    ratios = re.findall(r'(\d+)/(\d+) .*checks passed', output)
    simulation = re.findall(r'(\d+) (?:simulation|browser) checks:', output)
    if ratios:
        total += int(ratios[-1][1])
    elif simulation:
        total += int(simulation[-1])
    if result.returncode:
        failed_suites += 1
        lines = [line for line in output.splitlines() if line.startswith('FAIL')]
        print('\n'.join(lines) if lines else 'FAIL ' + command[-1] + ': ' + output.strip())
print(f'{total} checks; {failed_suites} failing suites.')
sys.exit(bool(failed_suites))
