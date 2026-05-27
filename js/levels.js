/*
  Kids Game Maker — Level Data
  (Default levels rebuilt from hand-crafted Mario-1-1-style layouts and
   verified winnable with a BFS reachability check tuned to the jump physics.)
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

  {
    id: 1,
    name: "Sunny Start",
    tileSize: 48,
    width: 92,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_meadow",

    map: [
      "............................................................................................",
      "............................................................................................",
      "............................................................................................",
      "............................................................................................",
      "............................................................................................",
      "............................................................................................",
      "............................................................................................",
      "............................................................................................",
      "..............?.B.?.B.?...................?.................................................",
      "............................................................................XXX.............",
      ".........................................................................XXX....F...........",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:816, y:96 }, { x:912, y:96 }, { x:1008, y:96 }, { x:2640, y:288 }, { x:2736, y:288 }, { x:480, y:336 }, { x:576, y:336 }, { x:672, y:336 }, { x:1584, y:336 }, { x:1680, y:336 }, { x:1776, y:336 } ],

    powerups: [
      { type:"blaster", x:2832, y:432 },
      { type:"doubleJump", x:1200, y:480 },
      { type:"dash", x:3024, y:480 }
    ],

    enemies: [
      { type:"walker", x:432, y:480, patrol:120 },
      { type:"walker", x:1728, y:480, patrol:120 },
      { type:"walker", x:2496, y:480, patrol:120 }
    ],

    movingPlatforms: [

    ]
  },

  {
    id: 2,
    name: "Green Hills",
    tileSize: 48,
    width: 96,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_meadow",

    map: [
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "....................?.B.?.........................?.B.?.........................................",
      ".................XX.............................................................................",
      ".............XX......XX............XX........XX.....XX..................XXX.....................",
      ".................................XX..................................XXX....F...................",
      "XXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:672, y:96 }, { x:768, y:96 }, { x:864, y:96 }, { x:1824, y:96 }, { x:1920, y:96 }, { x:2016, y:96 }, { x:2976, y:240 }, { x:3072, y:240 }, { x:3168, y:240 }, { x:336, y:288 }, { x:432, y:288 }, { x:1296, y:288 }, { x:1392, y:288 }, { x:1488, y:288 } ],

    powerups: [
      { type:"shield", x:2256, y:384 }
    ],

    enemies: [
      { type:"walker", x:288, y:480, patrol:120 },
      { type:"walker", x:1200, y:480, patrol:120 },
      { type:"walker", x:1872, y:480, patrol:120 },
      { type:"jumper", x:2448, y:480, patrol:20 },
      { type:"walker", x:3072, y:480, patrol:120 }
    ],

    movingPlatforms: [
      { x:1296, y:360, w:96, h:20, axis:'x', range:120, speed:80 }
    ]
  },

  {
    id: 3,
    name: "Coin Caverns",
    tileSize: 48,
    width: 96,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_cave",

    map: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "................................................................................................",
      "................................................................................................",
      "....?.B.?.B.?.........?.B.?..............?.B.?..................................................",
      "................................................................................................",
      "................................................................................................",
      "......XX..........XX..........XX..........XX..........XX........................................",
      ".....S..S........S..S........S..S........S..S........S..S.......................................",
      "....XX.........XX..........XX..........XX..........XX..........XX...............................",
      "..........................................................................XXX...................",
      "........................................................................XXX....F................",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:288, y:96 }, { x:384, y:96 }, { x:480, y:96 }, { x:1344, y:96 }, { x:1440, y:96 }, { x:1536, y:96 }, { x:2448, y:96 }, { x:2544, y:96 }, { x:2640, y:96 }, { x:2832, y:240 }, { x:2928, y:240 }, { x:3024, y:240 } ],

    powerups: [
      { type:"doubleJump", x:1728, y:144 },
      { type:"dash", x:144, y:480 },
      { type:"shield", x:3216, y:480 }
    ],

    enemies: [
      { type:"walker", x:528, y:480, patrol:120 },
      { type:"jumper", x:1056, y:480, patrol:20 },
      { type:"walker", x:1584, y:480, patrol:120 },
      { type:"flyer", x:2112, y:480, patrol:180 },
      { type:"walker", x:2640, y:480, patrol:120 }
    ],

    movingPlatforms: [
      { x:900, y:300, w:96, h:20, axis:'y', range:90, speed:70 }
    ]
  },

  {
    id: 4,
    name: "Sky Steps",
    tileSize: 48,
    width: 96,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_sky",

    map: [
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "................................................................................................",
      "..........XX.............XX..................XX.........XX......................................",
      ".......XX.............XX...................XX.........XX........................................",
      "....XX.............XX..................XX..........XX...........................................",
      ".................................................................................XXX............",
      ".......XX...........XX.........XX.........XX.........XX................XXX......................",
      "...................................................................XXX....F.....................",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXX"
    ],

    coins: [ { x:2208, y:48 }, { x:2304, y:48 }, { x:2400, y:48 }, { x:864, y:96 }, { x:960, y:96 }, { x:1056, y:96 }, { x:720, y:192 }, { x:816, y:192 }, { x:2448, y:192 }, { x:2544, y:192 } ],

    powerups: [
      { type:"doubleJump", x:1392, y:288 },
      { type:"shield", x:1584, y:336 }
    ],

    enemies: [
      { type:"flyer", x:672, y:288, patrol:180 },
      { type:"flyer", x:2352, y:288, patrol:180 },
      { type:"walker", x:96, y:480, patrol:120 },
      { type:"jumper", x:576, y:480, patrol:20 },
      { type:"walker", x:1152, y:480, patrol:120 },
      { type:"walker", x:1728, y:480, patrol:120 },
      { type:"jumper", x:2304, y:480, patrol:20 },
      { type:"walker", x:2880, y:480, patrol:120 }
    ],

    movingPlatforms: [
      { x:700, y:340, w:96, h:20, axis:'x', range:130, speed:95 },
      { x:1500, y:300, w:96, h:20, axis:'y', range:100, speed:85 }
    ]
  },

  {
    id: 5,
    name: "Spike Gardens",
    tileSize: 48,
    width: 100,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_sky",

    map: [
      "....................................................................................................",
      "....................................................................................................",
      "....................................................................................................",
      ".................?.B.?.....................?.B.?....................................................",
      "....................................................................................................",
      ".......XX...........XX...........XX...........XX...........XX.......................................",
      "......S..S.........S..S.........S..S.........S..S.........S..S......................................",
      "....XX...........XX...........XX...........XX...........XX...........XX.............................",
      "....................................................................................................",
      "....................................................................................XXX.............",
      "................................................................................XXX....F............",
      "XXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:480, y:96 }, { x:576, y:96 }, { x:672, y:96 }, { x:1680, y:96 }, { x:1776, y:96 }, { x:1872, y:96 }, { x:3360, y:96 }, { x:3456, y:96 } ],

    powerups: [
      { type:"doubleJump", x:432, y:384 },
      { type:"shield", x:1152, y:384 },
      { type:"dash", x:2496, y:384 }
    ],

    enemies: [
      { type:"walker", x:144, y:480, patrol:120 },
      { type:"walker", x:720, y:480, patrol:120 },
      { type:"walker", x:1344, y:480, patrol:120 },
      { type:"flyer", x:1920, y:480, patrol:180 },
      { type:"walker", x:2496, y:480, patrol:120 },
      { type:"jumper", x:3072, y:480, patrol:20 },
      { type:"walker", x:3600, y:480, patrol:120 }
    ],

    movingPlatforms: [
      { x:1100, y:320, w:96, h:20, axis:'x', range:140, speed:100 }
    ]
  },

  {
    id: 6,
    name: "Castle Finale",
    tileSize: 48,
    width: 104,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_cave",

    map: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "........................................................................................................",
      "........................................................................................................",
      "...?.B.?.B.?.......?.B.?.................?.B.?.........?.B.?............................................",
      "........................................................................................................",
      "........XX..........XX..........XX..........XX..........XX..............................................",
      "......S..S........S..S........S..S........S..S........S..S..............................................",
      "....XX..........XX..........XX..........XX..........XX..........XX......................................",
      "........................................................................................................",
      ".....XX.........XX..........XX..........XX..........XX..........XX.....................XXX..............",
      "...............................................................................XXX....F.................",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:288, y:96 }, { x:384, y:96 }, { x:1392, y:96 }, { x:1488, y:96 }, { x:2496, y:96 }, { x:2592, y:96 } ],

    powerups: [
      { type:"doubleJump", x:1680, y:144 },
      { type:"giant", x:96, y:480 },
      { type:"shield", x:576, y:480 },
      { type:"dash", x:1104, y:480 },
      { type:"blaster", x:1632, y:480 },
      { type:"shield", x:2112, y:480 },
      { type:"doubleJump", x:2640, y:480 }
    ],

    enemies: [
      { type:"walker", x:336, y:480, patrol:120 },
      { type:"flyer", x:864, y:480, patrol:180 },
      { type:"jumper", x:1392, y:480, patrol:20 },
      { type:"walker", x:1872, y:480, patrol:120 },
      { type:"flyer", x:2400, y:480, patrol:180 },
      { type:"walker", x:2880, y:480, patrol:120 }
    ],

    movingPlatforms: [
      { x:800, y:300, w:96, h:20, axis:'x', range:130, speed:100 },
      { x:1600, y:280, w:96, h:20, axis:'y', range:110, speed:95 }
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
