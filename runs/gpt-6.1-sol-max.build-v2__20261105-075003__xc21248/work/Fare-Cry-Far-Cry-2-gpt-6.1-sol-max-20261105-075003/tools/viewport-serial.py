"""Run the installed viewport toolkit with one native engine and one page at a time."""
import asyncio
import runpy
import shutil
import sys

engine, url, output = sys.argv[1:]
namespace = runpy.run_path(shutil.which('viewport-matrix'), run_name='viewport_matrix_library')
main = namespace['main']
main.__globals__['MATRIX'] = [row for row in namespace['MATRIX'] if engine in row[3]]
semaphore = asyncio.Semaphore
asyncio.Semaphore = lambda value=1: semaphore(1)
sys.argv = ['viewport-matrix', url, '-o', output, '--engines', engine, '--dpr1', '--wait', '1800', '--timeout', '120']
asyncio.run(main())
