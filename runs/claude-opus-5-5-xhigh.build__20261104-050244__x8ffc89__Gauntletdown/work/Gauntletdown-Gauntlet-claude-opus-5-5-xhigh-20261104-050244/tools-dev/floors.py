# Authoring helper: draws floors 2-9 and the treasure rooms from rooms, corridors and placed characters, and writes them
# as literal rows into game/src/16-floors.js (the game reads only that file). Edit a floor here, or its rows there.
import json, os

class C:
    def __init__(s, w, h, fill='#'):
        s.W, s.H = w, h; s.g = [[fill] * w for _ in range(h)]
    def room(s, x0, y0, x1, y1, ch='.'):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.g[y][x] = ch
        return s
    def box(s, x0, y0, x1, y1, ch='#'):  # a wall outline
        for x in range(x0, x1 + 1): s.g[y0][x] = ch; s.g[y1][x] = ch
        for y in range(y0, y1 + 1): s.g[y][x0] = ch; s.g[y][x1] = ch
        return s
    def h(s, x0, x1, y, wd=2, ch='.'):
        return s.room(min(x0, x1), y, max(x0, x1), y + wd - 1, ch)
    def v(s, x, y0, y1, wd=2, ch='.'):
        return s.room(x, min(y0, y1), x + wd - 1, max(y0, y1), ch)
    def put(s, x, y, ch):
        assert 0 < x < s.W - 1 and 0 < y < s.H - 1, (x, y, ch)
        s.g[y][x] = ch; return s
    def many(s, ch, pts):
        for x, y in pts: s.put(x, y, ch)
        return s
    def rows(s):
        for x in range(s.W): s.g[0][x] = s.g[0][x] if s.g[0][x] in '#%' else '#'; s.g[s.H - 1][x] = s.g[s.H - 1][x] if s.g[s.H - 1][x] in '#%' else '#'
        for y in range(s.H): s.g[y][0] = s.g[y][0] if s.g[y][0] in '#%' else '#'; s.g[y][s.W - 1] = s.g[y][s.W - 1] if s.g[y][s.W - 1] in '#%' else '#'
        return [''.join(r) for r in s.g]

FLOORS = []
def floor(fid, meta, c):
    FLOORS.append((fid, meta, c.rows()))

# ---------------- FLOOR 2: THE ROOT CELLAR (48 x 32): gnashers and dens, melee, Blast Flasks, cider ----------------
c = C(48, 32)
c.room(1, 1, 8, 6).many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
c.h(9, 20, 3).v(19, 3, 14).v(3, 7, 14).h(3, 26, 13)               # root tunnels: a loop
c.room(8, 7, 15, 10).v(11, 11, 12)                                 # the root chamber inside the loop
c.many('n', [(14, 3), (19, 9), (4, 10), (10, 13)])                 # gnashers in the tunnels
c.put(13, 8, 'N').put(9, 8, 'k').many('n', [(14, 9), (10, 10)]).put(6, 13, 'b')
c.h(21, 33, 3)                                                     # the cider corridor: shoot down it, not the jugs
c.many('j', [(24, 3), (27, 4), (30, 3)]).many('n', [(32, 3), (33, 4)])
c.room(34, 1, 38, 6).many('m', [(35, 2), (37, 2), (36, 5)]).put(38, 4, '$')   # three flasks before the den room
c.h(35, 36, 7, 1, '+')                                             # door run 1
c.room(31, 8, 44, 18)                                              # the den room: three dens
c.many('N', [(34, 11), (41, 11), (37, 16)]).many('n', [(33, 9), (36, 13), (39, 9), (42, 14), (38, 12), (35, 17)])
c.put(43, 17, 'k').put(32, 17, 'f').put(44, 8, '*')
c.h(37, 38, 19, 1, '+')                                            # door run 2
c.room(33, 20, 46, 30).put(42, 27, 'E').many('$', [(35, 22), (44, 22), (36, 29)]).put(45, 29, 'h').put(40, 24, '*')
c.v(23, 15, 15, 2, '+')                                            # door run 3 seals the vault
c.room(21, 16, 28, 21).put(25, 19, '4').put(22, 20, 'h').put(27, 17, '*').put(27, 20, '$')
c.v(3, 15, 16).room(1, 17, 16, 30)                                 # the cellar floor: ghosts, urns, the third key
c.many('G', [(7, 24), (13, 27)]).many('g', [(4, 20), (10, 19), (14, 22), (3, 27), (9, 29), (15, 29)])
c.put(2, 29, 'k').put(12, 18, 'f').put(5, 26, 'b').many('$', [(15, 18), (1, 23)]).put(8, 21, '*')
c.put(16, 25, 'b')
floor('f2', dict(name='THE ROOT CELLAR', realm='larder', no=2, music='larder', par=150, rank=1, genRank=2, intro='floor_2', demo={'at': [25, 3]}), c)

# ---------------- FLOOR 3: THE SMOKEHOUSE (52 x 36): pot-lobbers, racks, cracked walls, a trap, Hardshot ----------------
c = C(52, 36)
c.room(1, 14, 8, 21).many('@', [(2, 16), (3, 16), (2, 17), (3, 17)])
c.h(9, 12, 17)                                                      # into the smoking hall
c.room(13, 4, 38, 30)                                               # the smoking hall: racks in rows, lobbers behind them
for y in (8, 13, 19, 24):
    c.h(16, 23, y, 1, '='); c.h(28, 35, y, 1, '=')
c.many('o', [(19, 7), (31, 7), (20, 12), (33, 12), (18, 18), (30, 18), (21, 23), (32, 29)])
c.many('L', [(25, 6), (25, 27), (36, 16)]).many('g', [(14, 5), (37, 5), (14, 29), (37, 29), (26, 16), (15, 21), (36, 22), (24, 10)])
c.many('G', [(16, 28), (35, 9)]).many('f', [(26, 21), (14, 12)]).put(36, 11, 'j').put(22, 16, 'm')
c.many('$', [(14, 9), (37, 25), (26, 4)])
# the cracked wall: a shortcut north to a stash
c.room(13, 1, 26, 2).put(19, 3, 'X').put(20, 3, 'X').many('$', [(14, 1), (16, 2), (24, 1)]).put(25, 2, '*').put(21, 1, 'm')
# the trap alcove (east): a plate in the treasure; T walls hold a pen of gnashers
c.room(39, 4, 44, 9).put(41, 6, '^').many('$', [(40, 5), (43, 5), (43, 8)]).put(42, 8, '*').put(39, 10, '.')
c.room(45, 2, 50, 12).v(39, 10, 12, 1).h(39, 44, 12, 1)
c.many('n', [(46, 3), (48, 4), (50, 3), (47, 6), (49, 7), (46, 9), (48, 10), (50, 11), (47, 12), (49, 2), (46, 11), (50, 8)])
c.v(45, 2, 12, 1, 'T')
c.put(46, 7, 'N').put(49, 11, 'N')
# the side room with the Hardshot Draught, and the locked chest; keys and doors on the way to the stairs
c.room(39, 22, 47, 30).put(43, 26, 'u').put(46, 29, 'f').put(40, 29, 'k').put(46, 23, 'l')
c.h(39, 39, 20, 1, '.')
c.room(39, 14, 41, 21)
c.room(1, 26, 10, 33).h(11, 12, 29).put(3, 31, 'k').many('$', [(8, 27), (9, 32)]).put(5, 28, 'b')     # the south-west larder: a key
c.v(5, 22, 25)
c.room(41, 31, 50, 34).put(48, 33, 'E').put(45, 33, '*').put(42, 33, 'f')
c.h(48, 49, 30, 1, '+').room(48, 13, 49, 29)                        # door run 1 (east): down the east side to the stairs
c.put(48, 13, '+').put(49, 13, '+')
c.h(39, 47, 31, 1, '.')
c.put(38, 31, '+').put(38, 32, '+').room(13, 31, 37, 33)            # door run 2 (south): along the bottom to the stairs
floor('f3', dict(name='THE SMOKEHOUSE', realm='larder', no=3, music='larder', par=180, rank=2, genRank=2, intro='floor_3', specials=['hardshot'], demo={'at': [10, 17]}), c)

# ---------------- TREASURE ROOM I: THE PANTRY HOARD (32 x 24) ----------------
c = C(32, 24)
c.room(1, 1, 30, 22)
for (x0, y0, x1, y1) in [(5, 4, 12, 4), (19, 4, 26, 4), (5, 19, 12, 19), (19, 19, 26, 19), (4, 7, 4, 16), (27, 7, 27, 16)]:
    c.room(x0, y0, x1, y1, '%')
c.many('@', [(2, 11), (2, 12), (3, 11), (3, 12)]).put(16, 12, 'E')
golds = [(x, y) for y in (2, 3, 6, 9, 15, 18, 21) for x in (7, 10, 13, 18, 21, 24)][:30]
c.many('$', golds)
c.many('*', [(15, 10), (17, 10), (15, 14), (17, 14), (8, 12), (24, 12), (29, 2), (29, 21)]).put(16, 9, 'w').many('f', [(2, 2), (29, 11)])
floor('t1', dict(name='THE PANTRY HOARD', realm='larder', treasure=True, music='hoard', par=30, intro='floor_t1'), c)

# ---------------- FLOOR 4: THE BONE LARDER (52 x 36): fryars, shrines, transporters, amulets, spoiled stew ----------------
c = C(52, 36)
c.room(1, 1, 22, 15)                                     # chapel A (start)
c.many('@', [(3, 3), (4, 3), (3, 4), (4, 4)]).put(11, 5, 'O')
c.many('n', [(15, 8), (18, 12), (8, 12)]).many('g', [(20, 3), (19, 6)]).put(17, 3, 'G').put(5, 13, 'f').put(6, 13, 'z')   # a stew beside a roast: CHOOSE
c.room(13, 10, 21, 10, '%').put(21, 14, 'k').put(14, 14, '$')
c.room(28, 1, 50, 15)                                    # chapel B
c.put(40, 6, 'O').put(45, 12, 'O')
c.many('y', [(32, 4), (36, 9), (48, 3)]).put(30, 13, 'F').many('g', [(34, 13), (46, 8)]).put(49, 14, 'G')
c.room(33, 7, 33, 13, '%').room(38, 2, 38, 8, '%')
c.put(30, 2, 'm').put(48, 10, 'f').put(29, 8, 'g').put(36, 3, 'n')
c.room(42, 5, 43, 5, '+').room(41, 1, 44, 4).put(42, 2, 'a').put(44, 1, '*')       # the Ricochet stash behind a door
c.room(1, 21, 22, 34)                                    # chapel C
c.put(8, 24, 'O').put(14, 30, 'O')
c.many('y', [(5, 28), (18, 23), (20, 32)]).many('n', [(10, 27), (16, 26), (4, 32)]).put(19, 29, 'N').many('g', [(3, 22), (12, 33)]).put(2, 25, 'G')
c.room(11, 21, 11, 28, '%').put(5, 23, 'a').put(21, 33, 'k').put(17, 33, 'f').put(3, 33, 'z').put(9, 22, '$')
c.room(28, 21, 50, 34)                                   # chapel D: the stairs behind a door
c.put(40, 31, 'O')
c.many('y', [(31, 24), (36, 28)]).many('n', [(44, 24), (47, 30), (33, 32), (38, 22)]).put(30, 33, 'F').put(48, 22, 'N').many('g', [(41, 27), (46, 33), (35, 33), (29, 26)])
c.room(43, 26, 50, 26, '%').room(43, 27, 43, 34, '%').put(43, 30, '+').put(43, 31, '+')
c.room(44, 27, 50, 34).put(47, 28, 'E').put(49, 33, 'l').put(45, 33, '$').put(49, 29, '*')
c.put(30, 22, 'k').put(29, 34, 'm').put(37, 34, '$')
floor('f4', dict(name='THE BONE LARDER', realm='ossuary', no=4, music='ossuary', par=180, rank=2, genRank=2, intro='floor_4', amulets=['ricochet', 'veil'], demo={'at': [6, 6]}), c)

# ---------------- FLOOR 5: THE CHOIR OF TEETH (56 x 40): the Tithe, stun runes, force fields, the Dinner Bell ----------------
c = C(56, 40)
c.room(22, 33, 33, 38).many('@', [(26, 36), (27, 36), (28, 36), (29, 36)])           # the narthex (start, south)
c.h(26, 29, 31, 2)
c.room(20, 6, 35, 30)                                   # the nave, the Bell at its heart
c.put(27, 18, 'B')
for y in range(8, 29, 4): c.put(21, y, '%').put(34, y, '%')                         # pillars
c.many('g', [(23, 9), (32, 9), (24, 25), (31, 25), (22, 17), (33, 20)]).many('y', [(25, 12), (30, 12), (27, 24)]).many('o', [(23, 21), (32, 15)])
c.put(27, 8, 'F').put(25, 20, 'y').put(28, 28, 'm').put(23, 28, 'f').put(32, 28, 'f')
c.room(10, 6, 17, 30).room(18, 12, 19, 13).room(18, 22, 19, 23)                       # the west aisle: stun runes
for y in range(7, 30, 3): c.put(13, y, '!').put(14, y + 1 if y + 1 < 30 else y, '!')
c.many('o', [(11, 9), (16, 20), (12, 27)]).put(11, 15, 'L').many('g', [(16, 7), (15, 29)]).put(16, 14, 'G')
c.put(10, 18, 'k').put(17, 25, 'j').put(11, 29, 'm')
c.room(38, 6, 45, 30).room(36, 12, 37, 13).room(36, 22, 37, 23)                       # the east aisle: stun runes
for y in range(7, 30, 3): c.put(41, y, '!').put(42, y + 1 if y + 1 < 30 else y, '!')
c.many('o', [(39, 9), (44, 20), (40, 27)]).put(44, 15, 'L').many('y', [(39, 13), (44, 25)]).put(39, 7, 'G').put(45, 29, 'F')
c.put(45, 18, 'j').put(38, 29, 'm').put(45, 11, 'f')
# treasure behind cycling force fields (west and east chapels)
c.room(2, 14, 8, 22).v(9, 17, 18, 1, '|').many('$', [(3, 15), (6, 16), (4, 20), (7, 21)]).put(3, 18, 'u').put(5, 18, '*')
c.room(47, 14, 53, 22).v(46, 17, 18, 1, '|').many('$', [(48, 15), (51, 16), (49, 20), (52, 21)]).put(52, 18, 'u').put(50, 18, '*')
# the crypt at the far end (north): the Tithe waits; a door; the stairs
c.room(24, 1, 31, 4).put(27, 5, '+').put(28, 5, '+')
c.put(26, 2, 't').put(30, 2, 'k').put(24, 1, 'm')
c.room(36, 1, 50, 3).room(32, 2, 35, 2).put(49, 2, 'E').many('$', [(40, 1), (44, 3)]).put(46, 1, '*')
c.room(4, 32, 12, 37).h(13, 21, 35).put(6, 34, 'k').put(10, 36, 'f').put(8, 33, '$')   # the south-west vestry: a key
floor('f5', dict(name='THE CHOIR OF TEETH', realm='ossuary', no=5, music='ossuary', par=200, rank=2, genRank=3, intro='floor_5', specials=['witchwater', 'ironbrew'], demo={'at': [27, 22]}), c)

# ---------------- FLOOR 6: THE CRYPT OF PICKLED KINGS (56 x 44): fake walls, snatchers, the v plate, Stench ----------------
c = C(56, 44)
c.room(24, 38, 31, 42).many('@', [(26, 40), (27, 40), (28, 40), (29, 40)])
c.v(27, 33, 37)
c.room(4, 4, 51, 32)                                     # the crypt: burial niches in rows
for y in (8, 14, 20, 26):
    for x in range(6, 50, 6): c.room(x, y, x + 3, y + 1, '%')
c.many('S', [(10, 11), (45, 23)]).many('x', [(9, 5), (46, 5), (8, 30), (47, 30)])
c.many('n', [(15, 11), (33, 11), (21, 17), (39, 17), (15, 23), (27, 23), (33, 29), (45, 11)]).many('o', [(12, 17), (42, 17), (24, 5), (30, 5), (18, 29), (36, 29)])
c.many('y', [(21, 11), (39, 23), (9, 23), (27, 17), (45, 17), (15, 29)]).many('g', [(5, 6), (50, 6), (5, 31), (50, 31), (24, 11), (30, 23), (12, 29), (42, 5)])
c.put(18, 5, 'G').put(36, 23, 'N').put(30, 29, 'L').put(24, 17, 'F')
c.many('f', [(5, 17), (50, 20), (27, 31)]).many('m', [(21, 23), (36, 11)]).put(5, 13, 'k').put(50, 13, 'k')
# fake walls (?) hide three crowns, Ogre Ale and the skip stairs; a v plate drops the Y walls
c.room(1, 4, 2, 10).put(3, 7, '?').put(1, 5, 'w').put(2, 9, 'u')                     # west secret: a crown and Ogre Ale
c.room(53, 4, 54, 10).put(52, 7, '?').put(54, 5, 'w').put(53, 9, '*')                # east secret: a crown
c.room(20, 1, 35, 2).put(27, 3, '?').put(28, 3, '?').put(21, 1, 'w').put(34, 1, '8').put(25, 2, '$').put(31, 2, '$')   # north secret: a crown, skip stairs 8
c.room(4, 34, 16, 41).put(27, 32, '.').put(10, 36, 'v').many('$', [(5, 40), (15, 35)]).put(12, 40, 'a').put(6, 35, 'm')   # the south-west vault: the plate, the Stench amulet
c.h(17, 23, 39).put(17, 39, 'Y').put(17, 40, 'Y')
c.v(10, 33, 33, 2, '.')
c.room(40, 34, 51, 41).many('Y', [(39, 39), (39, 40)]).put(48, 39, 'E').put(44, 40, 'k').put(50, 35, 'f').put(42, 35, '*')   # the stair vault behind the Y walls
c.h(32, 38, 39).put(32, 39, '+').put(32, 40, '+')
c.put(5, 25, 'k')
floor('f6', dict(name='THE CRYPT OF PICKLED KINGS', realm='ossuary', no=6, music='ossuary', par=220, rank=2, genRank=3, intro='floor_6', specials=['ogreale'], amulets=['stench'],
                 points={'escape': [[4, 4], [51, 4], [4, 32], [51, 32]]}, demo={'at': [27, 30]}), c)

# ---------------- TREASURE ROOM II: THE RELIQUARY (32 x 24) ----------------
c = C(32, 24)
c.room(1, 1, 30, 22)
for x in (6, 12, 19, 25):
    c.room(x, 4, x, 9, '%').room(x, 14, x, 19, '%')
c.many('@', [(2, 11), (2, 12), (3, 11), (3, 12)]).put(28, 12, 'E').put(16, 11, 'l')
c.many('$', [(x, y) for y in (2, 7, 16, 21) for x in (4, 9, 15, 22, 28, 10)][:24]).put(2, 20, 'k')
c.many('*', [(8, 11), (10, 13), (14, 9), (18, 15), (21, 11), (23, 13), (27, 3), (27, 20), (16, 2), (16, 21)]).put(16, 13, 'w')
floor('t2', dict(name='THE RELIQUARY', realm='ossuary', treasure=True, music='hoard', par=30, intro='floor_t2', chest={'16,11': 'special:deeppockets'}), c)

# ---------------- FLOOR 7: THE OVEN STAIR (56 x 40): imps, ember grates, lava, spikes ----------------
c = C(56, 40)
c.room(1, 1, 8, 8).many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
c.room(9, 1, 54, 8)                                     # terrace 1
c.room(9, 9, 54, 12, '~')                              # lava channel 1
c.room(46, 9, 48, 12).many('s', [(46, 10), (48, 11)])  # bridge 1 (east), lined with spikes
c.room(1, 13, 54, 20)                                   # terrace 2
c.room(1, 21, 46, 24, '~')                             # lava channel 2
c.room(6, 21, 8, 24).many('s', [(6, 22), (8, 23)])     # bridge 2 (west)
c.room(1, 25, 54, 31)                                   # terrace 3
c.room(9, 32, 54, 34, '~')                             # lava channel 3
c.room(40, 32, 42, 34).many('s', [(40, 33), (42, 33)]) # bridge 3, lined with spikes
c.room(1, 35, 47, 38)                                   # the oven floor
c.room(49, 35, 54, 38).put(48, 36, '+').put(48, 37, '+')   # the stair room behind door run 1
c.v(3, 32, 34).put(3, 33, '+').put(4, 33, '+')         # a shortcut down the west side, behind door run 2
c.many('i', [(20, 3), (30, 6), (40, 3), (25, 15), (35, 18), (15, 16), (45, 15), (20, 27), (30, 29), (40, 27), (12, 36), (35, 37)])
c.many('n', [(14, 5), (36, 4), (50, 6), (10, 18), (30, 14), (50, 18), (15, 28), (36, 30), (44, 36), (20, 37)])
c.many('o', [(25, 6), (44, 7), (20, 19), (40, 19), (26, 26), (48, 29)])
c.many('I', [(30, 2), (20, 17), (38, 27), (25, 36)]).many('N', [(52, 14), (2, 28)]).many('L', [(16, 2), (44, 28)])
c.put(52, 2, 'u').put(4, 18, 'a').many('m', [(22, 7), (52, 19), (12, 30), (50, 37)]).many('f', [(53, 16), (3, 30), (30, 37)]).many('j', [(31, 19), (24, 30)])
c.many('k', [(54, 1), (1, 20), (54, 31)])
c.put(52, 37, 'E').put(53, 35, '*').put(50, 38, '$')
c.many('$', [(12, 2), (28, 4), (38, 14), (8, 26), (28, 36)]).many('*', [(53, 7), (2, 13), (18, 31)])
floor('f7', dict(name='THE OVEN STAIR', realm='furnace', no=7, music='furnace', par=220, rank=2, genRank=3, intro='floor_7', specials=['featherfoot'], amulets=['ironskin'], demo={'at': [12, 4]}), c)

# ---------------- FLOOR 8: THE GRISTLE GATE (64 x 44): the gauntlet run, everything at rank 3 ----------------
c = C(64, 44)
c.room(1, 1, 8, 6).many('@', [(2, 2), (3, 2), (2, 3), (3, 3)])
for i, y in enumerate((2, 10, 18, 26, 34)):            # five long corridors, 4 wide, joined at alternate ends
    c.room(9 if i else 9, y, 62, y + 3)
    if i < 4:
        if i % 2 == 0: c.room(58, y + 4, 61, y + 7)
        else: c.room(9, y + 4, 12, y + 7)
c.room(1, 7, 8, 9, '#')
mons = {'n': [(20, 3), (34, 4), (46, 3), (25, 11), (40, 12), (55, 11), (16, 19), (30, 20), (50, 19), (22, 27), (44, 28)],
        'g': [(28, 2), (52, 5), (18, 12), (33, 10), (60, 20), (28, 28), (16, 36), (48, 34)],
        'o': [(40, 5), (48, 13), (24, 21), (58, 29), (26, 35)], 'i': [(15, 5), (45, 11), (36, 19), (52, 27), (42, 37)],
        'y': [(32, 3), (20, 13), (42, 21), (34, 29)], 'x': [(56, 3), (14, 20), (50, 35)], 't': [(60, 36)]}
for ch, pts in mons.items(): c.many(ch, pts)
c.many('N', [(26, 5), (50, 12), (38, 27)]).many('G', [(44, 4), (28, 13), (20, 28)]).many('L', [(56, 21)]).many('I', [(32, 20)]).many('F', [(46, 28)]).many('S', [(30, 36)])
c.many('f', [(37, 2), (12, 11), (58, 18), (12, 29), (40, 36)]).many('j', [(22, 5), (34, 13), (46, 20)]).many('m', [(18, 4), (48, 2), (24, 13), (52, 21), (30, 28), (20, 37)])
c.many('k', [(61, 5), (10, 13), (61, 21), (10, 29), (62, 37)]).many('$', [(30, 4), (38, 11), (22, 19), (54, 29)]).put(60, 13, 'u').put(10, 21, 'a')
c.many('!', [(36, 10), (36, 13)]).v(44, 18, 21, 1, '|').many('s', [(28, 26), (29, 29), (40, 34), (41, 37)]).put(18, 26, 'O').put(60, 9, 'O')
# the final approach: two door runs in series to the stairs
c.room(9, 38, 12, 38, '+')                              # door run 1 under the last corridor
c.room(9, 39, 30, 42).many('n', [(20, 40), (26, 41)]).put(14, 41, 'f')
c.room(31, 39, 31, 42, '+')                             # door run 2
c.room(32, 39, 62, 42).put(58, 40, 'E').many('*', [(40, 40), (50, 41)]).put(56, 42, 'w').put(60, 41, 'f').many('n', [(36, 40), (45, 41), (52, 39)])
floor('f8', dict(name='THE GRISTLE GATE', realm='furnace', no=8, music='furnace', par=260, rank=3, genRank=3, intro='floor_8', specials=['quickshot'], amulets=['rending'], demo={'at': [12, 4]}), c)

# ---------------- FLOOR 9: THE BANQUET OF KING FAMISH (44 x 32) ----------------
c = C(44, 32)
c.room(1, 1, 42, 30)
c.room(16, 1, 27, 3).put(21, 2, 'K')                    # the dais and the throne
for x in (6, 37):
    for y in (6, 12, 18, 24): c.put(x, y, '%')           # pillars
c.h(14, 29, 14, 3, '=')                                  # the long table
c.many('P', [(16, 16), (21, 14), (27, 16)]).many('U', [(18, 14), (25, 16)])
c.many('@', [(20, 28), (21, 28), (22, 28), (23, 28)])
c.many('f', [(2, 2), (41, 2), (2, 29), (41, 29)])
c.room(0, 9, 0, 10, '#').room(1, 9, 2, 10).put(1, 9, 'm').room(41, 20, 42, 21).put(42, 20, 'm')
for (x, y) in [(1, 15), (42, 15), (11, 30), (32, 30)]: c.put(x, y, '.')
floor('f9', dict(name='THE BANQUET OF KING FAMISH', realm='banquet', no=9, music='king', par=300, rank=2, genRank=2, intro='floor_9', boss=True,
                 points={'wave': [[2, 15], [41, 15], [11, 29], [32, 29]]}, demo={'at': [21, 24]}), c)

# ---------------- write ----------------
out = ['/* ---- FLOORS 2-9 AND THE TREASURE ROOMS (drawn with tools-dev/floors.py; the rows are the data) ---- */']
for fid, meta, rows in FLOORS:
    m = json.dumps(meta)[1:-1]
    out.append("def('floors', '" + fid + "', { " + m + ",\n  rows: [\n" + ',\n'.join("    '" + r + "'" for r in rows) + "\n  ] });")
open(os.path.join(os.path.dirname(__file__), '..', 'game', 'src', '16-floors.js'), 'w').write('\n'.join(out) + '\n')
print('wrote', len(FLOORS), 'floors')
