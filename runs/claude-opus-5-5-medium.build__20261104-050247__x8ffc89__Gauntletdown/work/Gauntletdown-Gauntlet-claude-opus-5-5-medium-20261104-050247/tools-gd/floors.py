# Authoring aid: lays out Gauntletdown's floors with rectangles and points, then writes game/src/15-floors.js
# (literal ASCII rows a designer can edit by hand afterwards). Run: python3 tools-gd/floors.py
import json, os

class F:
    def __init__(s, w, h, fill='#'):
        s.w, s.h = w, h; s.g = [[fill] * w for _ in range(h)]
    def rect(s, x0, y0, x1, y1, c='.'):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.g[y][x] = c
        return s
    def box(s, x0, y0, x1, y1, c='#'):   # a ring of c
        for x in range(x0, x1 + 1): s.g[y0][x] = c; s.g[y1][x] = c
        for y in range(y0, y1 + 1): s.g[y][x0] = c; s.g[y][x1] = c
        return s
    def put(s, x, y, c): s.g[y][x] = c; return s
    def many(s, c, pts):
        for x, y in pts: s.g[y][x] = c
        return s
    def rows(s):
        for y in range(s.h): s.g[y][0] = s.g[y][s.w - 1] = '#' if s.g[y][0] not in '#%' else s.g[y][0]
        for x in range(s.w): s.g[0][x] = '#' if s.g[0][x] not in '#%' else s.g[0][x]; s.g[s.h - 1][x] = '#' if s.g[s.h - 1][x] not in '#%' else s.g[s.h - 1][x]
        return [''.join(r) for r in s.g]

FLOORS = []
def add(id, meta, f): FLOORS.append((id, meta, f.rows()))

# ---------------- Floor 1: the plan's own map ----------------
F1 = ["########################################",
"#@@......#..........#..........#.......#",
"#@@......#...g......#....$.....#...*...#",
"#........#..........#..........#.......#",
"#...b....#..######..#...g......#...h...#",
"#........#..#.k..#..#..........+.......#",
"#............g...#.......f.....+...E...#",
"#........#..#....#..#..........#.......#",
"#........#..######..#....G.....#...$...#",
"#........#..........#..........#.......#",
"####..########..#########..#############",
"#......................#...............#",
"#..g......##....G......#.....g.........#",
"#..........#...........#.........*.....#",
"#....f.....#....g...........######.....#",
"#..........#................#..........#",
"#..$.......####.......$.....#...f......#",
"#...........................#..........#",
"#.........g.................#....b.....#",
"########################################"]
FLOORS.append(('f1', dict(name='THE PANTRY STEPS', realm='larder', no=1, rank=1, genRank=1, par=120, music='larder'), F1))

# ---------------- Floor 2: the Root Cellar ----------------
f = F(48, 30)
f.rect(1, 1, 8, 7)                      # A: start
f.rect(9, 4, 20, 5)                     # tunnel A->B
f.rect(21, 1, 29, 9)                    # B: root chamber
f.rect(3, 8, 4, 16)                     # tunnel A->C (cider corridor)
f.rect(1, 17, 12, 28)                   # C: lower cellar
f.rect(6, 10, 11, 15); f.many('+', [(5, 12), (5, 13)])     # V: the vault (door run 3)
f.rect(13, 22, 13, 23)                  # C->F
f.rect(14, 12, 30, 28)                  # F: the big cellar
f.rect(24, 10, 25, 11)                  # B->F
f.many('+', [(30, 4), (30, 5)]); f.rect(31, 1, 35, 5)      # door run 1, the flask alcove
f.rect(36, 1, 46, 11)                   # D: the den room
f.many('+', [(40, 12), (41, 12)]); f.rect(33, 13, 46, 28)   # door run 2, E: the stair hall
# roots: low accent walls to bunch the gnashers
f.many('%', [(17, 15), (18, 15), (17, 16), (22, 19), (23, 19), (23, 20), (27, 14), (27, 15), (18, 24), (19, 24), (19, 25), (10, 20), (10, 21), (39, 18), (40, 18), (40, 19)])
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
f.many('n', [(24, 3), (27, 6), (22, 7), (15, 4), (8, 20), (5, 24), (11, 26), (20, 14), (26, 18), (16, 26), (28, 26), (38, 6), (42, 8), (45, 3)])
f.many('g', [(37, 20), (43, 16), (25, 25), (6, 19), (35, 25), (29, 13)])
f.many('N', [(38, 3), (44, 6), (41, 10), (27, 22)])
f.many('G', [(21, 17), (37, 24)])
f.many('m', [(32, 2), (33, 2), (34, 2)])
f.many('j', [(3, 10), (4, 13), (3, 15)])
f.many('f', [(6, 5), (44, 22)]); f.many('b', [(2, 27), (16, 13)])
f.put(27, 2, 'k'); f.put(45, 10, 'k'); f.put(2, 26, 'k')
f.many('h', [(10, 14), (29, 27)]); f.many('$', [(7, 11), (8, 11), (22, 2), (15, 21), (35, 15)]); f.many('*', [(9, 15), (30, 18), (46, 14)])
f.put(11, 11, '4')                      # skip stairs to floor 4, in the vault
f.put(44, 26, 'E')
add('f2', dict(name='THE ROOT CELLAR', realm='larder', no=2, rank=1, genRank=2, par=160, music='larder'), f)

# ---------------- Floor 3: the Smokehouse ----------------
f = F(52, 34)
f.rect(1, 1, 10, 8)                     # A: start
f.rect(11, 3, 14, 5)                    # A->B
f.rect(15, 1, 34, 13)                   # B: the smoking racks
for y in (3, 6, 9, 12):                 # racks: low accent walls lobbers throw over
    f.rect(18, y, 22, y, '%'); f.rect(26, y, 31, y, '%')
f.rect(35, 6, 36, 7)                    # B->C
f.rect(37, 1, 50, 12)                   # C: the hutch hall
f.rect(4, 9, 5, 16)                     # A->D
f.rect(1, 17, 16, 32)                   # D: the brine pits
f.rect(17, 24, 18, 25)                  # D->E
f.rect(19, 15, 36, 32)                  # E: the long kitchen
f.rect(24, 14, 25, 14)                  # B->E
f.many('+', [(42, 13), (43, 13)]); f.rect(37, 14, 50, 32)  # door run 1 into F: the stair room
f.many('X', [(36, 20), (36, 21)])       # a cracked wall: a shortcut from E into F
f.rect(47, 26, 50, 32, '#'); f.rect(48, 28, 49, 31); f.many('X', [(47, 29)])   # a cracked stash in F's corner
f.rect(8, 28, 12, 31, '#'); f.rect(9, 29, 11, 31); f.many('+', [(10, 28)])     # door run 2: the side room with Hardshot
f.rect(13, 18, 15, 20, 'T'); f.rect(14, 19, 14, 19, '.'); f.put(14, 19, 'n')   # held gnashers behind trap walls
f.rect(1, 17, 3, 19, '.'); f.put(2, 18, '^')
f.rect(26, 17, 30, 19, 'T'); f.many('n', [(27, 18), (28, 18), (29, 18)])   # a second pen in E
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
f.many('o', [(20, 4), (28, 7), (21, 10), (29, 11), (40, 4), (46, 9), (31, 26), (42, 20)])
f.many('n', [(17, 2), (33, 5), (39, 10), (8, 22), (13, 26), (22, 22), (33, 30), (40, 30), (45, 17)])
f.many('g', [(24, 2), (16, 11), (6, 25), (22, 29), (45, 24), (12, 18)])
f.many('L', [(48, 2), (32, 2), (34, 28)]); f.many('N', [(14, 30), (44, 16)]); f.many('G', [(30, 22), (40, 26)])
f.many('m', [(9, 1), (49, 31)]); f.put(10, 30, 'u'); f.put(20, 27, 'j'); f.many('f', [(8, 7), (23, 31), (49, 30)])
f.put(49, 11, 'k'); f.put(2, 31, 'k'); f.put(48, 29, 'l')
f.many('$', [(15, 31), (35, 16), (50, 18)]); f.many('*', [(16, 32), (48, 31)]); f.put(1, 32, 'h')
f.put(46, 30, 'E')
add('f3', dict(name='THE SMOKEHOUSE', realm='larder', no=3, rank=2, genRank=2, par=170, music='larder', specials=['hardshot']), f)

# ---------------- Treasure Room I: the Pantry Hoard ----------------
f = F(32, 24)
f.rect(1, 1, 30, 22)
for (x0, y0, x1, y1) in [(5, 4, 9, 4), (22, 4, 26, 4), (5, 19, 9, 19), (22, 19, 26, 19), (4, 8, 4, 15), (27, 8, 27, 15)]: f.rect(x0, y0, x1, y1, '%')
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
gold = [(x, y) for y in (2, 6, 17, 21) for x in range(6, 26, 3)] + [(x, y) for x in (2, 29) for y in range(8, 16, 2)]
f.many('$', gold[:30]); f.many('*', [(10, 8), (21, 8), (10, 15), (21, 15), (13, 11), (18, 12), (6, 11), (25, 12)])
f.put(15, 8, 'w'); f.many('f', [(29, 2), (2, 21)])
f.put(15, 12, 'E')
add('t1', dict(name='THE PANTRY HOARD', realm='larder', no=0, hoard=1, rank=1, genRank=1, par=30, music='hoard'), f)

# ---------------- Floor 4: the Bone Larder (four chapels, linked by transporters) ----------------
f = F(52, 34)
f.rect(1, 1, 24, 15)                    # chapel NW (start)
f.rect(27, 1, 50, 15)                   # chapel NE
f.rect(1, 18, 24, 32)                   # chapel SW
f.rect(27, 18, 50, 32)                  # chapel SE (stairs)
for (x0, x1, y) in [(5, 9, 6), (14, 18, 6), (5, 9, 10), (14, 18, 10), (31, 35, 6), (40, 44, 6), (31, 35, 10), (40, 44, 10), (5, 9, 23), (14, 18, 23), (5, 9, 27), (14, 18, 27), (31, 35, 23), (40, 44, 23), (31, 35, 27), (40, 44, 27)]:
    f.rect(x0, y, x1, y, '%')           # pews of bone
f.many('O', [(22, 13), (29, 3), (48, 13), (29, 20), (3, 20), (22, 30)])  # NW->NE, NE->SE... (pairs in reading order)
f.many('+', [(24, 8)]); f.rect(25, 8, 26, 8)   # a door between NW and NE (a shortcut for a key)
f.rect(24, 8, 24, 8, '+')
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
f.many('y', [(35, 3), (45, 12), (10, 30), (20, 20), (35, 29), (46, 20), (12, 13), (40, 8)])
f.many('n', [(18, 3), (8, 13), (33, 13), (44, 3), (6, 25), (16, 25), (34, 21), (48, 30), (23, 18), (30, 31)])
f.many('g', [(20, 8), (38, 2), (49, 8), (2, 29), (12, 19), (24, 25), (38, 30), (44, 25), (13, 8), (30, 9)])
f.many('F', [(46, 4), (8, 29)]); f.many('N', [(38, 12), (20, 29)]); f.many('G', [(16, 13), (40, 20), (12, 21)])
f.many('a', [(48, 2), (2, 31)]); f.many('z', [(11, 2), (36, 26)]); f.many('f', [(12, 2), (37, 26), (23, 1)]); f.many('m', [(26, 8), (49, 31)])
f.many('k', [(24, 14), (50, 1), (1, 32)]); f.put(49, 32, 'l'); f.many('$', [(6, 8), (42, 8), (8, 25), (34, 25)]); f.many('*', [(17, 8), (43, 25)])
f.put(46, 30, 'E')
add('f4', dict(name='THE BONE LARDER', realm='ossuary', no=4, rank=2, genRank=2, par=180, music='ossuary', amulets=['veil', 'ricochet']), f)

# ---------------- Floor 5: the Choir of Teeth ----------------
f = F(56, 36)
f.rect(1, 1, 10, 9)                     # start vestry
f.rect(11, 4, 12, 6)
f.rect(13, 1, 54, 9)                    # the north aisle
f.rect(13, 12, 54, 23)                  # the nave
f.rect(13, 10, 54, 11, '.')   # stun runes between aisle and nave
for x in range(14, 54, 4): f.put(x, 10, '!'); f.put(x + 2, 11, '!')
f.rect(13, 26, 54, 34)                  # the south aisle
f.rect(13, 24, 54, 25, '.'); [f.put(x, 25, '!') for x in range(15, 54, 5)]
for x in range(16, 53, 6): f.rect(x, 14, x, 14, '%'); f.rect(x, 21, x, 21, '%')   # pillars
f.rect(1, 12, 10, 34)                   # west: the font and the treasure behind fields
f.rect(1, 24, 10, 24, '-'); f.put(0, 24, '#'); f.put(11, 24, '#')   # horizontal beam across
f.rect(11, 24, 12, 24, '#')
f.rect(1, 10, 10, 11, '#'); f.rect(5, 10, 6, 11, '.')
f.rect(44, 27, 54, 34, '#'); f.rect(45, 28, 53, 33)   # the crypt (stairs, the Tithe)
f.many('+', [(49, 27)])
f.rect(30, 28, 31, 33, '#'); f.rect(30, 30, 31, 31, '|')   # a beam gate in the south aisle
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
f.put(33, 17, 'B')                      # the Dinner Bell, at the heart of the nave
f.put(51, 31, 't')
f.many('y', [(20, 3), (40, 6), (24, 16), (44, 19), (20, 30), (38, 32)])
f.many('o', [(30, 2), (50, 4), (18, 19), (36, 13), (48, 15), (26, 28), (42, 30), (16, 33)])
f.many('g', [(15, 7), (45, 2), (28, 22), (52, 22), (6, 15), (8, 20), (22, 27), (35, 29), (50, 13), (14, 16)])
f.many('F', [(26, 5), (40, 20)]); f.many('L', [(52, 7), (24, 32)]); f.many('G', [(7, 14), (36, 34)])
f.many('u', [(3, 30), (8, 30)]); f.many('m', [(2, 33), (9, 33), (53, 12), (14, 34)]); f.many('f', [(9, 2), (33, 12), (53, 26)]); f.many('j', [(13, 23), (54, 1)])
f.many('k', [(54, 9), (2, 12), (13, 34)]); f.many('$', [(5, 28), (6, 32), (34, 8), (46, 31)]); f.many('*', [(4, 33), (48, 32)])
f.put(50, 29, 'E')
add('f5', dict(name='THE CHOIR OF TEETH', realm='ossuary', no=5, rank=2, genRank=3, par=200, music='ossuary', specials=['witchwater', 'ironbrew']), f)

# ---------------- Floor 6: the Crypt of Pickled Kings ----------------
f = F(56, 38)
f.rect(1, 1, 54, 36)
for cx in range(6, 52, 8):              # burial niche blocks
    for cy in range(5, 34, 7):
        f.rect(cx, cy, cx + 3, cy + 3, '#')
f.rect(1, 1, 8, 4)
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
# secrets: niches hollowed out behind fake walls
for (x, y, door, loot) in [(15, 13, (14, 14), 'w'), (31, 20, (30, 21), 'w'), (47, 27, (46, 28), 'w'), (23, 6, (22, 7), 'u'), (39, 6, (38, 7), '8')]:
    f.rect(x, y, x + 1, y + 1, '.'); f.put(x, y, loot); f.put(door[0], door[1], '?')
f.rect(52, 12, 54, 24, '#'); f.rect(53, 13, 54, 23); f.put(52, 18, 'Y'); f.put(53, 18, 'a'); f.put(54, 20, 'm')   # the Stench alcove, behind a v-trap wall
f.put(2, 34, 'v')
f.rect(45, 33, 54, 36, '#'); f.rect(46, 34, 53, 36); f.many('+', [(45, 34), (45, 35)])   # the stair crypt, behind a door run
f.many('x', [(20, 10), (36, 24), (12, 30), (44, 16)])
f.many('S', [(29, 17), (13, 25)])
f.many('n', [(10, 3), (28, 3), (44, 3), (18, 18), (34, 11), (50, 31), (6, 24), (26, 32)])
f.many('o', [(20, 25), (36, 4), (50, 10), (11, 18), (42, 30), (28, 11)])
f.many('y', [(14, 3), (38, 18), (26, 25), (4, 31), (52, 4), (20, 33)])
f.many('g', [(20, 12), (30, 30), (44, 22), (11, 13), (43, 12), (19, 34), (50, 26), (34, 33)])
f.many('G', [(42, 25)]); f.many('N', [(18, 11)]); f.many('L', [(34, 26)]); f.many('F', [(26, 18)])
f.many('m', [(5, 2), (42, 33), (21, 17)]); f.many('f', [(1, 12), (30, 18), (52, 31)]); f.many('k', [(54, 1), (1, 36), (28, 36), (54, 26)])
f.many('$', [(12, 12), (36, 16), (27, 28), (50, 19)]); f.many('*', [(4, 20), (44, 9)])
f.put(50, 35, 'E')
add('f6', dict(name='THE CRYPT OF PICKLED KINGS', realm='ossuary', no=6, rank=2, genRank=3, par=200, music='ossuary', specials=['ogreale'], amulets=['stench'], allyStun=True), f)

# ---------------- Treasure Room II: the Reliquary ----------------
f = F(32, 24)
f.rect(1, 1, 30, 22)
for (x0, y0, x1, y1) in [(6, 5, 12, 5), (19, 5, 25, 5), (6, 18, 12, 18), (19, 18, 25, 18), (15, 8, 16, 9), (15, 14, 16, 15)]: f.rect(x0, y0, x1, y1, '%')
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
gold = [(x, y) for y in (3, 7, 16, 20) for x in range(6, 27, 4)] + [(x, y) for x in (3, 28) for y in (9, 12, 15)]
f.many('$', gold[:24]); f.many('*', [(9, 9), (22, 9), (9, 14), (22, 14), (12, 11), (19, 12), (5, 11), (26, 12), (15, 3), (16, 20)])
f.put(27, 2, 'w'); f.put(28, 21, 'l'); f.put(2, 21, 'k')
f.put(15, 11, 'E')
add('t2', dict(name='THE RELIQUARY', realm='ossuary', no=0, hoard=2, rank=1, genRank=1, par=30, music='hoard', lchest='deeppockets'), f)

# ---------------- Floor 7: the Oven Stair ----------------
f = F(56, 36)
f.rect(1, 1, 54, 34)
for (y0, y1, gap) in [(7, 9, (46, 49)), (16, 18, (6, 9)), (25, 27, (46, 49))]:   # lava channels with bridges
    f.rect(1, y0, 54, y1, '~'); f.rect(gap[0], y0, gap[1], y1, '.')
    for x in range(gap[0], gap[1] + 1, 3): f.put(x, y0 + 1, 's')
f.rect(24, 16, 27, 18, '.'); f.many('X', [(25, 16)]); f.put(25, 17, 's')   # a second bridge, half fallen
f.rect(20, 3, 22, 5, '%'); f.rect(36, 12, 38, 14, '%'); f.rect(14, 21, 16, 23, '%'); f.rect(40, 30, 42, 32, '%')
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
f.many('i', [(15, 4), (30, 2), (44, 5), (20, 12), (35, 11), (12, 13), (30, 21), (44, 22), (18, 30), (34, 31), (50, 13), (8, 22)])
f.many('n', [(40, 3), (52, 5), (30, 13), (48, 12), (22, 21), (38, 23), (10, 30), (26, 32), (46, 32), (5, 12)])
f.many('o', [(25, 5), (16, 11), (40, 20), (12, 24), (30, 30), (50, 21)])
f.many('I', [(33, 4), (28, 12), (20, 22), (36, 29)]); f.many('N', [(10, 5), (44, 13)]); f.many('L', [(52, 22), (14, 31)])
f.put(54, 1, 'u'); f.put(1, 23, 'a'); f.many('m', [(1, 6), (54, 15), (1, 33), (27, 23)]); f.many('f', [(48, 2), (8, 11), (48, 24)]); f.many('j', [(4, 14), (52, 28)])
f.many('k', [(54, 6), (2, 15), (54, 24)]); f.many('$', [(12, 2), (38, 15), (24, 23), (6, 33)]); f.many('*', [(54, 10), (2, 24)])
f.rect(48, 29, 54, 34, '#'); f.rect(49, 30, 54, 34); f.many('+', [(48, 31), (48, 32)])
f.put(52, 32, 'E')
add('f7', dict(name='THE OVEN STAIR', realm='furnace', no=7, rank=2, genRank=3, par=200, music='furnace', specials=['featherfoot'], amulets=['ironskin']), f)

# ---------------- Floor 8: the Gristle Gate ----------------
f = F(60, 40)
f.rect(1, 1, 8, 38)                     # the west hall (start)
for i, y in enumerate((2, 10, 18, 26, 34)):   # five long corridors, 3 wide
    f.rect(9, y, 50, y + 3)
f.rect(51, 1, 58, 38)                   # the east hall
f.rect(9, 6, 50, 9, '#'); f.rect(9, 14, 50, 17, '#'); f.rect(9, 22, 50, 25, '#'); f.rect(9, 30, 50, 33, '#')
f.rect(28, 6, 29, 9, '.'); f.rect(20, 14, 21, 17, '.'); f.rect(38, 22, 39, 25, '.'); f.rect(28, 30, 29, 33, '.')   # cross passages
f.many('X', [(20, 15), (21, 15)])
f.rect(30, 30, 30, 33, '.'); f.put(29, 31, '-'); f.put(28, 31, '-'); f.put(30, 31, '-')
f.rect(52, 16, 58, 23, '#'); f.rect(53, 17, 58, 22); f.many('+', [(52, 19), (52, 20)])   # the gate antechamber
f.rect(55, 17, 55, 22, '#'); f.rect(56, 18, 58, 21); f.many('+', [(55, 19), (55, 20)])   # the gate itself
f.put(57, 19, 'E')
f.many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
f.many('O', [(7, 37), (57, 37)])
f.rect(1, 20, 8, 20, '!'); f.put(4, 20, '.')
f.many('s', [(30, 2), (31, 3), (36, 26), (37, 27), (16, 34), (17, 35)])
mons = [(12, 3, 'n'), (16, 4, 'n'), (22, 2, 'g'), (26, 4, 'o'), (34, 3, 'n'), (40, 5, 'y'), (46, 2, 'i'),
        (12, 11, 'g'), (18, 12, 'n'), (24, 10, 'i'), (32, 13, 'n'), (38, 11, 'o'), (44, 12, 'g'), (48, 10, 'n'),
        (14, 19, 'y'), (24, 20, 'n'), (30, 18, 'i'), (36, 21, 'g'), (42, 19, 'n'), (47, 20, 'o'), (11, 27, 'n'),
        (18, 28, 'g'), (26, 26, 'y'), (34, 29, 'n'), (44, 27, 'i'), (48, 28, 'x'), (12, 35, 'o'), (22, 36, 'n'),
        (34, 35, 'g'), (40, 37, 'n'), (46, 35, 'y'), (54, 4, 'n'), (56, 10, 'i'), (54, 28, 'g'), (56, 33, 'n'),
        (5, 14, 'g'), (5, 30, 'n'), (54, 12, 'o'), (20, 26, 'x'), (52, 36, 'i')]
for x, y, c in mons: f.put(x, y, c)
f.put(55, 26, 't')
for (x, y, c) in [(20, 4, 'G'), (36, 2, 'N'), (14, 12, 'L'), (42, 10, 'I'), (28, 19, 'F'), (16, 26, 'G'), (44, 28, 'N'), (24, 34, 'I'), (40, 34, 'S'), (54, 7, 'G')]: f.put(x, y, c)
f.put(1, 38, 'u'); f.put(58, 38, 'a')
f.many('m', [(8, 1), (8, 38), (50, 2), (50, 37), (58, 1), (30, 12)]); f.many('f', [(1, 10), (1, 28), (50, 20), (58, 14), (58, 26)]); f.many('j', [(9, 21), (50, 29), (58, 30)])
f.many('k', [(1, 1), (50, 13), (58, 36), (9, 37), (1, 19)]); f.many('$', [(30, 4), (25, 12), (45, 36)]); f.many('*', [(10, 29), (34, 21)])
add('f8', dict(name='THE GRISTLE GATE', realm='furnace', no=8, rank=3, genRank=3, par=220, music='furnace', specials=['quickshot'], amulets=['rending']), f)

# ---------------- Floor 9: the Banquet of King Famish ----------------
f = F(44, 32)
f.rect(1, 1, 42, 30)
f.rect(18, 1, 25, 3, '.'); f.put(21, 3, 'K')
f.rect(21, 9, 22, 24, '=')              # the long table
f.many('P', [(21, 11), (22, 16), (21, 21)]); f.many('U', [(22, 11), (21, 16)])
for (x, y) in [(10, 8), (33, 8), (10, 16), (33, 16), (10, 24), (33, 24)]: f.rect(x, y, x + 1, y + 1, '%')   # pillars
for (x0, y0, x1, y1) in [(0, 14, 0, 17), (43, 14, 43, 17), (20, 31, 23, 31)]: f.rect(x0, y0, x1, y1, '#')
f.many('@', [(20, 28), (23, 28), (20, 29), (23, 29)])
f.many('f', [(2, 2), (41, 2), (2, 29), (41, 29)]); f.many('m', [(1, 15), (42, 15)])
add('f9', dict(name='THE BANQUET OF KING FAMISH', realm='banquet', no=9, rank=2, genRank=2, par=300, music='boss', boss=True,
               points=dict(wave=[[1, 15], [42, 16], [21, 30], [5, 1], [38, 1]])), f)

# ---------------- write the module ----------------
out = ['/* 15-floors: every floor as ASCII rows in the shared legend (20-level.js). Edit the rows by hand; the floors test',
       ' * (node tests/run.mjs floors) checks each one is bordered, uses the legend and can be finished. */']
order = []
for id, meta, rows in FLOORS:
    w = len(rows[0])
    assert all(len(r) == w for r in rows), id
    out.append("def('floors', '%s', Object.assign(%s, { rows: [" % (id, json.dumps(meta)))
    for r in rows: out.append('  ' + json.dumps(r) + ',')
    out.append(']}));')
    order.append(id)
out.append("const FLOOR_ORDER = %s;" % json.dumps(['f1', 'f2', 'f3', 't1', 'f4', 'f5', 'f6', 't2', 'f7', 'f8', 'f9']))
dst = os.path.join(os.path.dirname(__file__), '..', 'game', 'src', '15-floors.js')
open(dst, 'w').write('\n'.join(out) + '\n')
for id, meta, rows in FLOORS:
    print(id, len(rows[0]), 'x', len(rows))
    if os.environ.get('SHOW') == id: print('\n'.join(rows))
