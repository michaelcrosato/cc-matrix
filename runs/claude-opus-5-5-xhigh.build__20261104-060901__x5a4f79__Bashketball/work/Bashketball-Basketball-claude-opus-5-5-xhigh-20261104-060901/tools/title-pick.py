# The game's title, as TASK.md asks: fifty playful riffs on "basketball", brainstormed in the build session on
# 2026-11-04, and one picked with a real random number generator (Python's secrets module, the OS's CSPRNG).
# Run once: python3 tools/title-pick.py  (the pick is recorded in TITLE-PICK.txt beside this folder's src/)
import secrets, datetime, pathlib

TITLES = [
    'Blasketball', 'Basketbonkers', 'Basketblam', 'Bashketball', 'Basketboom',
    'Basketbolt', 'Baskitall', 'Basketbrouhaha', 'Basketbedlam', 'Basketballistic',
    'Blastketball', 'Basketbash', 'Basketbananas', 'Basketblitz', 'Basketbonanza',
    'Baskettwister', 'Basketballyhoo', 'Basketboogie', 'Basketboing', 'Basketbuzzsaw',
    'Baskethammer', 'Bonkerball', 'Hoopsplosion', 'Dunkadelic', 'Slamtastic',
    'Basketbluster', 'Basketbarrage', 'Basketblowout', 'Basketbandit', 'Basketbellow',
    'Basketbluff', 'Basketbonfire', 'Basketbrute', 'Basketburst', 'Basketclash',
    'Basketcrunch', 'Basketfrenzy', 'Basketfury', 'Basketmayhem', 'Basketmeltdown',
    'Basketnova', 'Basketquake', 'Basketrocket', 'Basketsmash', 'Basketstorm',
    'Basketthunder', 'Basketvolcano', 'Basketzap', 'Baskethullabaloo', 'Basketkaboom',
]
assert len(TITLES) == 50 and len(set(TITLES)) == 50

i = secrets.randbelow(len(TITLES))
line = f'{datetime.datetime.now().isoformat(timespec="seconds")}  secrets.randbelow(50) = {i}  ->  {TITLES[i]}'
print(line)
pathlib.Path(__file__).resolve().parent.parent.joinpath('TITLE-PICK.txt').write_text(line + '\n')
