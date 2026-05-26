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
  //  LEVEL 1 · Sunny Fields
  //  Easy intro — walkers only, tons of coins, gentle jumps
  // ──────────────────────────────────────────────────────────
  {
    id: 1,
    name: "Sunny Fields",
    tileSize: 48,
    width: 80,
    height: 12,
    hideTiles: false,
    playerStart: { x: 72, y: 432 },
    bgKey: "bg_meadow",

    //        0         1         2         3         4         5         6         7
    //        0123456789012345678901234567890123456789012345678901234567890123456789012345678901
    map: [
      "................................................................................",  // row 0
      "................................................................................",  // row 1
      "................................................................................",  // row 2
      ".......?..?.......................?..?..?....................?.......................",  // row 3
      "......XXXX.....XXX.....XXX.......XXXXXXXX...XXX...........XXXX..............F....",  // row 4
      "........................................?............B.B...................XXXXXXX",  // row 5
      "...?...............................B.B..........XXX......XXX.....XXX..............",  // row 6
      "..XXX.....XXX......XXX......XXX.....................................?...............",  // row 7
      "..............................................................................S...",  // row 8
      "...XXX.....?......?....XXX.....XXX....XXXXX.....XXX....XXXXX...XXXXXXXXX.......XX",  // row 9
      "................................................................................XX",  // row 10
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"   // row 11
    ],

    coins: [
      // Arc over first gap (rows 7-8 area, cols 3-7)
      { x: 168, y: 288 }, { x: 216, y: 264 }, { x: 264, y: 240 }, { x: 312, y: 264 }, { x: 360, y: 288 },
      // Coins above question blocks row 3
      { x: 336, y: 96  }, { x: 384, y: 96  }, { x: 432, y: 96  },
      // Platform arc col 12-18
      { x: 576, y: 240 }, { x: 624, y: 216 }, { x: 672, y: 240 },
      // Low coins row 9
      { x: 816, y: 336 }, { x: 864, y: 336 }, { x: 912, y: 336 },
      // Near breakables
      { x: 1200, y: 240 }, { x: 1248, y: 240 },
      // Approach to finish
      { x: 1680, y: 144 }, { x: 1728, y: 120 }, { x: 1776, y: 144 },
      // Extra coins along floor
      { x: 480, y: 480  }, { x: 528, y: 480  }, { x: 1008, y: 480 }, { x: 1056, y: 480 }
    ],

    powerups: [
      { type: "blaster",    x: 384,  y: 432 },
      { type: "shield",     x: 768,  y: 288 },
      { type: "doubleJump", x: 1152, y: 192 },
      { type: "dash",       x: 1488, y: 432 },
      { type: "giant",      x: 1824, y: 144 }
    ],

    enemies: [
      { type: "walker", x: 480,  y: 480, patrol: 140 },
      { type: "walker", x: 816,  y: 480, patrol: 100 },
      { type: "walker", x: 1104, y: 192, patrol: 120 },
      { type: "walker", x: 1392, y: 480, patrol: 150 },
      { type: "walker", x: 1680, y: 192, patrol: 80  }
    ],

    movingPlatforms: [
      { x: 624, y: 300, w: 96, h: 20, axis: 'x', range: 120, speed: 80 },
      { x: 1296, y: 240, w: 96, h: 20, axis: 'y', range: 80,  speed: 60 }
    ]
  },

  // ──────────────────────────────────────────────────────────
  //  LEVEL 2 · Cloudy Peaks
  //  Medium — jumpers + flyers, moving platforms, vertical play
  // ──────────────────────────────────────────────────────────
  {
    id: 2,
    name: "Cloudy Peaks",
    tileSize: 48,
    width: 80,
    height: 12,
    hideTiles: false,
    playerStart: { x: 72, y: 432 },
    bgKey: "bg_sky",

    map: [
      "................................................................................",  // row 0
      "................................................................................",  // row 1
      "......XXXX.........XXXX...........XXXX...........XXXX...........XXXX...........F",  // row 2
      "..............................................?............................XXXXXXX",  // row 3
      "....XXXXX.........XXXXX.........XXXXX.........XXXXX.........XXXXX...............",  // row 4
      "................................................................................",  // row 5
      "..XXXXX.....?....XXXXX.....B....XXXXX.....?....XXXXX.....B....XXXXX.............",  // row 6
      "...............................................................................?.",  // row 7
      "XXXXX.........XXXXX.........XXXXX.........XXXXX.........XXXXX...........XXXXXXX",  // row 8
      "...S..S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....S...........X",  // row 9
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // row 10 (raised floor)
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"   // row 11
    ],

    coins: [
      // Arc over floor spikes
      { x: 144, y: 384 }, { x: 192, y: 360 }, { x: 240, y: 384 },
      // On the row-6 platforms
      { x: 480, y: 240 }, { x: 528, y: 240 }, { x: 576, y: 240 },
      // Vertical arc row-4 platforms
      { x: 720, y: 144 }, { x: 768, y: 120 }, { x: 816, y: 144 },
      // High coins row-2
      { x: 1008, y:  48 }, { x: 1056, y:  48 }, { x: 1104, y:  48 },
      // Near breakables
      { x: 1296, y: 240 }, { x: 1344, y: 240 },
      // Approach finish
      { x: 1680, y:  48 }, { x: 1728, y:  48 }, { x: 1776, y:  48 },
      // Extra
      { x: 336, y: 384 }, { x: 960, y: 384 }, { x: 1536, y: 96 }
    ],

    powerups: [
      { type: "doubleJump", x: 192,  y: 432 },
      { type: "blaster",    x: 672,  y: 144 },
      { type: "shield",     x: 1104, y: 240 },
      { type: "dash",       x: 1488, y: 144 },
      { type: "giant",      x: 1776, y:  96 }
    ],

    enemies: [
      { type: "jumper", x: 288,  y: 480, patrol: 20  },
      { type: "walker", x: 576,  y: 240, patrol: 130 },
      { type: "flyer",  x: 864,  y: 100, patrol: 200 },
      { type: "jumper", x: 1104, y: 192, patrol: 20  },
      { type: "walker", x: 1296, y: 240, patrol: 120 },
      { type: "flyer",  x: 1536, y:  80, patrol: 200 }
    ],

    movingPlatforms: [
      { x: 432,  y: 320, w: 96, h: 20, axis: 'x', range: 140, speed: 90  },
      { x: 960,  y: 200, w: 96, h: 20, axis: 'y', range: 100, speed: 75  },
      { x: 1392, y: 160, w: 96, h: 20, axis: 'x', range: 120, speed: 100 }
    ]
  },

  // ──────────────────────────────────────────────────────────
  //  LEVEL 3 · Dark Cave
  //  Hard — all enemy types, spikes, boss at the end
  // ──────────────────────────────────────────────────────────
  {
    id: 3,
    name: "Dark Cave",
    tileSize: 48,
    width: 80,
    height: 12,
    hideTiles: false,
    playerStart: { x: 72, y: 144 },
    bgKey: "bg_cave",

    map: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // row 0 ceiling
      "X..............................................................................X",  // row 1
      "X..XXX.....B..B....XXX....?..?....XXX....B..B....XXX....?..?....XXX....B......X",  // row 2
      "X..............................................................................X",  // row 3
      "X....XXX.........XXX.........XXX.........XXX.........XXX.........XXX..........X",  // row 4
      "X..............................................................................X",  // row 5
      "X.XXX.........XXX.........XXX.........XXX.........XXX.........XXX............FX",  // row 6
      "X..............................................................................X",  // row 7
      "X.....S.S.....S.S.....S.S.....S.S.....S.S.....S.S.....S.S.....S.S...........XX",  // row 8
      "XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX................XX",  // row 9
      "X..............................................................................XX",  // row 10
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"   // row 11
    ],

    coins: [
      { x: 192, y:  96 }, { x: 240, y:  96 }, { x: 288, y:  96 },
      { x: 576, y: 144 }, { x: 624, y: 144 },
      { x: 912, y: 192 }, { x: 960, y: 192 }, { x: 1008, y: 192 },
      { x: 1296, y: 144 }, { x: 1344, y: 144 },
      { x: 1632, y:  96 }, { x: 1680, y:  96 },
      { x: 1968, y: 192 }, { x: 2016, y: 192 }, { x: 2064, y: 192 },
      { x: 2352, y: 144 }, { x: 2400, y: 144 },
      { x: 2688, y:  96 }, { x: 2736, y:  96 }, { x: 2784, y:  96 }
    ],

    powerups: [
      { type: "blaster",    x: 432,  y: 144 },
      { type: "doubleJump", x: 1104, y: 240 },
      { type: "shield",     x: 1776, y: 144 },
      { type: "giant",      x: 2448, y: 240 },
      { type: "dash",       x: 3072, y: 144 }
    ],

    enemies: [
      { type: "walker", x: 384,  y: 96,  patrol: 140 },
      { type: "jumper", x: 720,  y: 96,  patrol: 20  },
      { type: "walker", x: 1056, y: 96,  patrol: 140 },
      { type: "flyer",  x: 1392, y: 80,  patrol: 160 },
      { type: "walker", x: 1728, y: 96,  patrol: 140 },
      { type: "jumper", x: 2064, y: 96,  patrol: 20  },
      { type: "walker", x: 2400, y: 96,  patrol: 140 },
      { type: "flyer",  x: 2736, y: 80,  patrol: 160 }
    ],

    movingPlatforms: [
      { x: 576,  y: 300, w: 96, h: 20, axis: 'x', range: 150, speed: 100 },
      { x: 1632, y: 200, w: 96, h: 20, axis: 'y', range: 90,  speed: 85  },
      { x: 2496, y: 260, w: 96, h: 20, axis: 'x', range: 140, speed: 110 }
    ]
  },

  // ──────────────────────────────────────────────────────────
  //  LEVEL 4 · Jungle Ruins
  //  Vertical platforming, breakable blocks, jumpers
  // ──────────────────────────────────────────────────────────
  {
    id: 4,
    name: "Jungle Ruins",
    tileSize: 48,
    width: 80,
    height: 12,
    hideTiles: false,
    playerStart: { x: 72, y: 432 },
    bgKey: "bg_meadow",

    map: [
      "................................................................................",  // row 0
      "...B..B..B.......B..B..B.......B..B..B.......B..B..B.......B..B..B...........F",  // row 1
      "...XXXXXXXXX......XXXXXXX......XXXXXXX......XXXXXXX......XXXXXXX..........XXXXX",  // row 2
      "................................................................................",  // row 3
      "...?...............?...............?...............?...............?.............",  // row 4
      "..XXXXX..........XXXXX..........XXXXX..........XXXXX..........XXXXX.............",  // row 5
      "...B.B.....XXX....B.B.....XXX....B.B.....XXX....B.B.....XXX....B.B.....XXX....",  // row 6
      "...............S.....S.....S.....S.....S.....S.....S.....S.....S.....S.........",  // row 7
      "..XXX.....XXX.....XXX.....XXX.....XXX.....XXX.....XXX.....XXX.....XXX.....XXX.",  // row 8
      "......S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....",  // row 9
      "................................................................................",  // row 10
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  // row 11
    ],

    coins: [
      { x: 144, y: 384 }, { x: 192, y: 360 }, { x: 240, y: 384 },
      { x: 480, y: 192 }, { x: 528, y: 168 }, { x: 576, y: 192 },
      { x: 816, y: 144 }, { x: 864, y: 120 }, { x: 912, y: 144 },
      { x: 1152, y: 192 }, { x: 1200, y: 192 },
      { x: 1488, y: 144 }, { x: 1536, y: 120 }, { x: 1584, y: 144 },
      { x: 1824, y: 192 }, { x: 1872, y: 192 },
      { x: 2160, y: 144 }, { x: 2208, y: 120 }, { x: 2256, y: 144 },
      { x: 2496, y:  48 }, { x: 2544, y:  48 }, { x: 2592, y:  48 }
    ],

    powerups: [
      { type: "blaster",    x: 336,  y: 432 },
      { type: "doubleJump", x: 816,  y: 192 },
      { type: "shield",     x: 1344, y: 192 },
      { type: "dash",       x: 1968, y: 192 },
      { type: "giant",      x: 2640, y:  48 }
    ],

    enemies: [
      { type: "jumper", x: 288,  y: 480, patrol: 20  },
      { type: "walker", x: 576,  y: 240, patrol: 120 },
      { type: "jumper", x: 864,  y: 240, patrol: 20  },
      { type: "walker", x: 1152, y: 240, patrol: 120 },
      { type: "jumper", x: 1440, y: 240, patrol: 20  },
      { type: "flyer",  x: 1728, y:  80, patrol: 180 },
      { type: "walker", x: 2016, y: 240, patrol: 130 },
      { type: "jumper", x: 2304, y: 240, patrol: 20  }
    ],

    movingPlatforms: [
      { x: 480,  y: 310, w: 96, h: 20, axis: 'y', range: 120, speed: 85  },
      { x: 1200, y: 280, w: 96, h: 20, axis: 'x', range: 130, speed: 95  },
      { x: 2064, y: 200, w: 96, h: 20, axis: 'y', range: 110, speed: 100 }
    ]
  },

  // ──────────────────────────────────────────────────────────
  //  LEVEL 5 · Sky Temple
  //  Very vertical, lots of flyers, moving platforms
  // ──────────────────────────────────────────────────────────
  {
    id: 5,
    name: "Sky Temple",
    tileSize: 48,
    width: 80,
    height: 12,
    hideTiles: false,
    playerStart: { x: 72, y: 480 },
    bgKey: "bg_sky",

    map: [
      "................F...............................................................",  // row 0
      "..............XXXXX.............................................................",  // row 1
      "......XXXX..............XXXX.........XXXX..............XXXX..............XXXX.",  // row 2
      "...........?......?..........?...............?......?..........?...............",  // row 3
      "...XXXXXXXX........XXXXXXXX........XXXXXXXX........XXXXXXXX........XXXXXXXX...",  // row 4
      "................................................................................",  // row 5
      "..XXXXXX...........XXXXXX...........XXXXXX...........XXXXXX...........XXXXXX..",  // row 6
      "...B.B..........?...B.B..........?...B.B..........?...B.B..........?...B.B...",  // row 7
      "XXXXX.........XXXXX.XXXXX.........XXXXX.XXXXX.........XXXXX.XXXXX.........XXXX",  // row 8
      "...S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....S.......",  // row 9
      "................................................................................",  // row 10
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  // row 11
    ],

    coins: [
      { x:  96, y: 432 }, { x: 144, y: 408 }, { x: 192, y: 432 },
      { x: 480, y: 192 }, { x: 528, y: 168 }, { x: 576, y: 192 },
      { x: 768, y: 144 }, { x: 816, y: 120 }, { x: 864, y: 144 },
      { x: 1104, y: 192 }, { x: 1152, y: 192 },
      { x: 1392, y: 144 }, { x: 1440, y: 120 }, { x: 1488, y: 144 },
      { x: 1728, y: 192 }, { x: 1776, y: 192 },
      { x: 2016, y: 144 }, { x: 2064, y: 120 }, { x: 2112, y: 144 },
      { x: 384,  y:  48 }, { x: 432,  y:  48 }, { x: 480,  y:  48 }
    ],

    powerups: [
      { type: "doubleJump", x: 192,  y: 480 },
      { type: "blaster",    x: 672,  y: 192 },
      { type: "shield",     x: 1200, y: 144 },
      { type: "dash",       x: 1776, y: 144 },
      { type: "giant",      x: 2304, y: 144 }
    ],

    enemies: [
      { type: "flyer",  x: 288,  y: 100, patrol: 200 },
      { type: "jumper", x: 576,  y: 192, patrol: 20  },
      { type: "flyer",  x: 864,  y:  80, patrol: 200 },
      { type: "walker", x: 1104, y: 288, patrol: 130 },
      { type: "flyer",  x: 1392, y:  80, patrol: 200 },
      { type: "jumper", x: 1680, y: 192, patrol: 20  },
      { type: "flyer",  x: 1968, y:  80, patrol: 200 },
      { type: "walker", x: 2256, y: 288, patrol: 130 }
    ],

    movingPlatforms: [
      { x: 288,  y: 350, w: 96, h: 20, axis: 'y', range: 140, speed:  90 },
      { x: 864,  y: 250, w: 96, h: 20, axis: 'x', range: 140, speed: 100 },
      { x: 1488, y: 200, w: 96, h: 20, axis: 'y', range: 120, speed:  95 },
      { x: 2112, y: 160, w: 96, h: 20, axis: 'x', range: 130, speed: 110 }
    ]
  },

  // ──────────────────────────────────────────────────────────
  //  LEVEL 6 · Final Fortress
  //  Hardest — all hazards, all enemies, boss-level density
  // ──────────────────────────────────────────────────────────
  {
    id: 6,
    name: "Final Fortress",
    tileSize: 48,
    width: 80,
    height: 12,
    hideTiles: false,
    playerStart: { x: 72, y: 144 },
    bgKey: "bg_cave",

    map: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // row 0
      "X..............................................................................X",  // row 1
      "X..B..B.....XXX....?..?....XXX....B..B....XXX....?..?....XXX....B..B.....?.F.X",  // row 2
      "X..............................................................................X",  // row 3
      "X....XXX.........XXX.........XXX.........XXX.........XXX.........XXX..........X",  // row 4
      "X..S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....S.....S.......X",  // row 5
      "XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX...XXXXX.",  // row 6
      "X..............................................................................X",  // row 7
      "X..XXX..........XXX..........XXX..........XXX..........XXX..........XXX.......X",  // row 8
      "X....S.S.....S.S.....S.S.....S.S.....S.S.....S.S.....S.S.....S.S...S.S.....X",  // row 9
      "XXXXX....XXXXX....XXXXX....XXXXX....XXXXX....XXXXX....XXXXX....XXXXX....XXXXXXX",  // row 10
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"   // row 11
    ],

    coins: [
      { x: 192, y:  96 }, { x: 240, y:  96 }, { x: 288, y:  96 },
      { x: 576, y: 144 }, { x: 624, y: 144 }, { x: 672, y: 144 },
      { x: 960, y:  96 }, { x: 1008, y:  96 },
      { x: 1296, y: 144 }, { x: 1344, y: 144 }, { x: 1392, y: 144 },
      { x: 1680, y:  96 }, { x: 1728, y:  96 },
      { x: 2016, y: 144 }, { x: 2064, y: 144 },
      { x: 2352, y:  96 }, { x: 2400, y:  96 }, { x: 2448, y:  96 },
      { x: 2736, y: 144 }, { x: 2784, y: 144 }
    ],

    powerups: [
      { type: "blaster",    x: 432,  y: 144 },
      { type: "shield",     x: 912,  y: 144 },
      { type: "doubleJump", x: 1440, y: 144 },
      { type: "dash",       x: 2016, y: 144 },
      { type: "giant",      x: 2592, y: 144 }
    ],

    enemies: [
      { type: "walker", x: 288,  y: 96,  patrol: 130 },
      { type: "flyer",  x: 528,  y: 80,  patrol: 160 },
      { type: "jumper", x: 768,  y: 96,  patrol: 20  },
      { type: "walker", x: 1008, y: 96,  patrol: 130 },
      { type: "flyer",  x: 1248, y: 80,  patrol: 160 },
      { type: "jumper", x: 1488, y: 96,  patrol: 20  },
      { type: "walker", x: 1728, y: 96,  patrol: 130 },
      { type: "flyer",  x: 1968, y: 80,  patrol: 160 },
      { type: "jumper", x: 2208, y: 96,  patrol: 20  },
      { type: "walker", x: 2448, y: 96,  patrol: 130 },
      { type: "flyer",  x: 2688, y: 80,  patrol: 160 }
    ],

    movingPlatforms: [
      { x: 480,  y: 280, w: 96, h: 20, axis: 'x', range: 130, speed: 100 },
      { x: 1056, y: 200, w: 96, h: 20, axis: 'y', range: 100, speed:  90 },
      { x: 1680, y: 260, w: 96, h: 20, axis: 'x', range: 140, speed: 110 },
      { x: 2256, y: 180, w: 96, h: 20, axis: 'y', range: 110, speed: 105 }
    ]
  }
];

// ── Custom level slot (saved by the level editor) ─────────────
function normalizeLevelMap(levelData) {
  if (!levelData || !Array.isArray(levelData.map)) return levelData;
  const rowWidth = Math.max(
    levelData.width || 0,
    ...levelData.map.map(row => String(row).length)
  );
  if (!rowWidth) return levelData;
  levelData.width = rowWidth;
  levelData.map = levelData.map.map(row =>
    String(row).padEnd(rowWidth, '.').slice(0, rowWidth)
  );
  return levelData;
}

window.KQ_LEVELS.forEach(normalizeLevelMap);

(function loadCustomLevels() {
  try {
    const raw = localStorage.getItem('kq_custom_levels');
    if (raw) {
      const custom = JSON.parse(raw);
      if (Array.isArray(custom)) {
        custom.forEach(lvl => {
          lvl._custom = true;
          window.KQ_LEVELS.push(normalizeLevelMap(lvl));
        });
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
    const normalizedLevel = normalizeLevelMap(levelData);
    if (idx >= 0) existing[idx] = normalizedLevel;
    else existing.push(normalizedLevel);

    localStorage.setItem('kq_custom_levels', JSON.stringify(existing));

    // Refresh in the live array too
    const liveIdx = window.KQ_LEVELS.findIndex(l => l.id === normalizedLevel.id);
    if (liveIdx >= 0) window.KQ_LEVELS[liveIdx] = normalizedLevel;
    else window.KQ_LEVELS.push(normalizedLevel);
  } catch (e) { console.warn('Could not save custom level', e); }
}
