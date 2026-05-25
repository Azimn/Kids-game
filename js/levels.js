/*
  Kid Quest — Level Data
  ──────────────────────
  Tile legend (use these characters in the map array):
    .  = empty air
    X  = solid ground block
    ?  = question block (hit from below for coins)
    B  = breakable block (smash with Giant power-up or blaster)
    S  = spike (instant hurt)
    F  = finish flag (reach to complete level)

  Tips for making your own level:
    • Each string in `map` is one row, left to right.
    • All strings must be the same length (= `width` value).
    • Coins, enemies and powerups use pixel X/Y positions.
    • Tile size is 48 px, so col 3 = x 144, row 2 = y 96, etc.
    • Set hideTiles: true to use a full background image instead.
*/

window.KQ_LEVELS = [

  // ──────────────────────────────────────────────────────────
  //  LEVEL 1 · Cookie Meadow
  // ──────────────────────────────────────────────────────────
  {
    id: 1,
    name: "Cookie Meadow",
    tileSize: 48,
    width: 96,
    height: 12,
    hideTiles: false,
    playerStart: { x: 120, y: 260 },
    bgKey: "bg_meadow",

    map: [
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "....................?......................B......B.....................?......................F.",
      "...............XXX..............XXX.......................XXX.....................XXX............X",
      ".................................................................?..............................X",
      "......?.................B.B......................XXX....................B.B......................X",
      "..............XXX.......................XXX.................................XXX..................X",
      "......................................................S...............S..........................X",
      ".......XXX..............XXX......?..............XXXXX.XXX.......XXXXX.XXX.......................X",
      ".................................................................S..............................X",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [
      { x: 380, y: 220 }, { x: 430, y: 220 }, { x: 480, y: 220 },
      { x: 930, y: 260 }, { x: 982, y: 260 }, { x: 1034, y: 260 },
      { x: 1510, y: 190 }, { x: 1565, y: 190 },
      { x: 2050, y: 245 }, { x: 2110, y: 245 }, { x: 2170, y: 245 },
      { x: 2780, y: 180 }, { x: 2840, y: 180 },
      { x: 3450, y: 235 }, { x: 3510, y: 235 }, { x: 3570, y: 235 }
    ],

    powerups: [
      { type: "blaster",    x: 675,  y: 260 },
      { type: "shield",     x: 1295, y: 170 },
      { type: "doubleJump", x: 1845, y: 260 },
      { type: "dash",       x: 2485, y: 260 },
      { type: "giant",      x: 3175, y: 210 }
    ],

    enemies: [
      { type: "walker", x: 760,  y: 480, patrol: 190 },
      { type: "walker", x: 1450, y: 480, patrol: 260 },
      { type: "jumper", x: 2260, y: 480, patrol: 20  },
      { type: "walker", x: 3040, y: 480, patrol: 260 },
      { type: "flyer",  x: 3920, y: 300, patrol: 160 }
    ],

    movingPlatforms: [
      { x: 600,  y: 300, w: 96, h: 20, axis: 'x', range: 120, speed: 80 },
      { x: 900,  y: 220, w: 96, h: 20, axis: 'y', range: 80,  speed: 60 },
    ]
  },

  // ──────────────────────────────────────────────────────────
  //  LEVEL 2 · Sky Castle
  // ──────────────────────────────────────────────────────────
  {
    id: 2,
    name: "Sky Castle",
    tileSize: 48,
    width: 100,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 400 },
    bgKey: "bg_sky",

    map: [
      "....................................................................................................",
      "....................................................................................................",
      "..........XXXXX......XXXXX......XXXXX......XXXXX......XXXXX......XXXXX......XXXXX...............F...",
      "....................................................................................................",
      "....XXXXX.........XXXXX.........XXXXX.........XXXXX.........XXXXX.........XXXXX...............XXXXX",
      "....................................................................................................",
      "...XXXXX.....?...XXXXX......B..XXXXX.....?...XXXXX......B..XXXXX.....?...XXXXX...................",
      "....................................................................................................",
      "..XXXXX...........XXXXX..........XXXXX...........XXXXX..........XXXXX...........XXXXX.............",
      "....................................................................................................",
      "XXXXXX..........XXXXXX..........XXXXXX..........XXXXXX..........XXXXXX..........XXXXXX..........XX",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [
      { x: 500, y: 340 }, { x: 550, y: 340 }, { x: 600, y: 340 },
      { x: 1020, y: 240 }, { x: 1070, y: 240 },
      { x: 1550, y: 290 }, { x: 1600, y: 290 }, { x: 1650, y: 290 },
      { x: 2100, y: 195 }, { x: 2150, y: 195 },
      { x: 2650, y: 290 }, { x: 2700, y: 290 },
      { x: 3200, y: 340 }, { x: 3250, y: 340 }, { x: 3300, y: 340 },
      { x: 3800, y: 240 }, { x: 3850, y: 240 }
    ],

    powerups: [
      { type: "doubleJump", x: 290,  y: 380 },
      { type: "blaster",    x: 1250, y: 285 },
      { type: "shield",     x: 2400, y: 285 },
      { type: "dash",       x: 3550, y: 285 },
      { type: "giant",      x: 4300, y: 380 }
    ],

    enemies: [
      { type: "walker", x: 700,  y: 420, patrol: 150 },
      { type: "jumper", x: 1400, y: 420, patrol: 20  },
      { type: "flyer",  x: 2100, y: 200, patrol: 200 },
      { type: "walker", x: 2800, y: 420, patrol: 200 },
      { type: "jumper", x: 3500, y: 420, patrol: 20  },
      { type: "flyer",  x: 4200, y: 180, patrol: 250 }
    ],

    movingPlatforms: [
      { x: 480,  y: 340, w: 96, h: 20, axis: 'x', range: 140, speed: 90 },
      { x: 1700, y: 260, w: 96, h: 20, axis: 'y', range: 100, speed: 70 },
    ]
  },

  // ──────────────────────────────────────────────────────────
  //  LEVEL 3 · Lava Caves
  // ──────────────────────────────────────────────────────────
  {
    id: 3,
    name: "Lava Caves",
    tileSize: 48,
    width: 110,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 200 },
    bgKey: "bg_cave",

    map: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "X.........................................................................................................X",
      "X..XXX....B..B....XXX....?..?....XXX....B..B....XXX....?..?....XXX....B..B....XXX....?..?....XXX.......X",
      "X.........................................................................................................X",
      "X.....XXX.........XXX.........XXX.........XXX.........XXX.........XXX.........XXX.........XXX..........X",
      "X.........................................................................................................X",
      "X.XXX.........XXX.........XXX.........XXX.........XXX.........XXX.........XXX.........XXX...........F..X",
      "X.........................................................................................................X",
      "X.....S.......S.......S.......S.......S.......S.......S.......S.......S.......S.......S.......S.......XXX",
      "XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX..........X",
      "X.........................................................................................................X",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [
      { x: 250, y: 140 }, { x: 300, y: 140 }, { x: 350, y: 140 },
      { x: 700, y: 190 }, { x: 750, y: 190 },
      { x: 1150, y: 240 }, { x: 1200, y: 240 }, { x: 1250, y: 240 },
      { x: 1700, y: 190 }, { x: 1750, y: 190 },
      { x: 2200, y: 140 }, { x: 2250, y: 140 },
      { x: 2700, y: 240 }, { x: 2750, y: 240 }, { x: 2800, y: 240 },
      { x: 3300, y: 190 }, { x: 3350, y: 190 },
      { x: 3850, y: 140 }, { x: 3900, y: 140 }, { x: 3950, y: 140 }
    ],

    powerups: [
      { type: "blaster",    x: 500,  y: 190 },
      { type: "doubleJump", x: 1500, y: 285 },
      { type: "shield",     x: 2500, y: 190 },
      { type: "giant",      x: 3500, y: 285 },
      { type: "dash",       x: 4500, y: 190 }
    ],

    enemies: [
      { type: "walker", x: 450,  y: 80, patrol: 160 },
      { type: "jumper", x: 900,  y: 80, patrol: 20  },
      { type: "walker", x: 1400, y: 80, patrol: 160 },
      { type: "flyer",  x: 1900, y: 80, patrol: 160 },
      { type: "walker", x: 2400, y: 80, patrol: 160 },
      { type: "jumper", x: 2900, y: 80, patrol: 20  },
      { type: "walker", x: 3400, y: 80, patrol: 160 },
      { type: "flyer",  x: 3900, y: 80, patrol: 160 }
    ],

    movingPlatforms: [
      { x: 700,  y: 350, w: 96, h: 20, axis: 'x', range: 160, speed: 100 },
      { x: 2000, y: 200, w: 96, h: 20, axis: 'y', range: 90,  speed: 80  },
    ]
  }
];

// ── Custom level slot (saved by the level editor) ─────────────
(function loadCustomLevels() {
  try {
    const raw = localStorage.getItem('kq_custom_levels');
    if (raw) {
      const custom = JSON.parse(raw);
      if (Array.isArray(custom)) {
        custom.forEach(lvl => { lvl._custom = true; window.KQ_LEVELS.push(lvl); });
      }
    }
  } catch (e) {}
})();

function saveCustomLevel(levelData) {
  try {
    let existing = [];
    const raw = localStorage.getItem('kq_custom_levels');
    if (raw) existing = JSON.parse(raw) || [];

    // Replace if same id exists, otherwise append
    const idx = existing.findIndex(l => l.id === levelData.id);
    if (idx >= 0) existing[idx] = levelData;
    else existing.push(levelData);

    localStorage.setItem('kq_custom_levels', JSON.stringify(existing));

    // Refresh in the live array too
    const liveIdx = window.KQ_LEVELS.findIndex(l => l.id === levelData.id);
    if (liveIdx >= 0) window.KQ_LEVELS[liveIdx] = levelData;
    else window.KQ_LEVELS.push(levelData);
  } catch (e) { console.warn('Could not save custom level', e); }
}
