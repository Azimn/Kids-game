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
    name: "World 1-1",
    tileSize: 48,
    width: 106,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_meadow",

    map: [
      "..........................................................................................................",
      "..........................................................................................................",
      "..........................................................................................................",
      ".......................................................................................................XF.",
      "......................................................................................................XXX.",
      ".....................................................................................................XXXX.",
      "....................................................................................................XXXXX.",
      "...........................................................BBB?B?BB................................XXXXXX.",
      "..................................................................................................XXXXXXX.",
      "................?BBB?B?BBBB..XX........XX.....B?B..B?B...XX.........XX.....B?BB?B................XXXXXXXX.",
      ".............................XX........XX................XX.........XX..........................XXXXXXXXX.",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:2928, y:288 }, { x:2976, y:288 }, { x:3024, y:288 }, { x:3072, y:288 }, { x:960, y:384 }, { x:1056, y:384 }, { x:2496, y:384 }, { x:3696, y:384 }, { x:3792, y:384 } ],

    powerups: [
      { type:"blaster", x:768, y:432 },
      { type:"giant", x:2496, y:432 }
    ],

    enemies: [
      { type:"walker", x:144, y:480, patrol:120 },
      { type:"walker", x:384, y:480, patrol:120 },
      { type:"walker", x:1296, y:480, patrol:120 },
      { type:"walker", x:1536, y:480, patrol:120 },
      { type:"jumper", x:2016, y:480, patrol:20 },
      { type:"walker", x:2640, y:480, patrol:120 },
      { type:"walker", x:3216, y:480, patrol:120 },
      { type:"walker", x:3408, y:480, patrol:120 },
      { type:"walker", x:3456, y:480, patrol:120 },
      { type:"jumper", x:3936, y:480, patrol:20 },
      { type:"walker", x:4032, y:480, patrol:120 },
      { type:"walker", x:4368, y:480, patrol:120 },
      { type:"walker", x:4464, y:480, patrol:120 }
    ],

    movingPlatforms: [

    ]
  },

  {
    id: 2,
    name: "Underground Caverns",
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
      "...............................................................................XF...............",
      "..............................................................................XXX...............",
      ".............................................................................XXXX...............",
      "............................................................................XXXXX...............",
      "...........................................................................XXXXXX...............",
      "..........................................................................XXXXXXX...............",
      "....BBBB?BBBB....BB?B?B.............BBB?BBBBB?...........BBB?.?BBB.......XXXXXXXX...............",
      "........................................................................XXXXXXXXX...............",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:384, y:384 }, { x:912, y:384 }, { x:1008, y:384 }, { x:1872, y:384 }, { x:2160, y:384 }, { x:2880, y:384 }, { x:2976, y:384 }, { x:2496, y:432 }, { x:2544, y:432 }, { x:1200, y:480 }, { x:1296, y:480 }, { x:1392, y:480 } ],

    powerups: [
      { type:"shield", x:1872, y:432 },
      { type:"doubleJump", x:2880, y:432 }
    ],

    enemies: [
      { type:"walker", x:288, y:480, patrol:120 },
      { type:"walker", x:528, y:480, patrol:120 },
      { type:"jumper", x:1248, y:480, patrol:20 },
      { type:"walker", x:1536, y:480, patrol:120 },
      { type:"walker", x:1968, y:480, patrol:120 },
      { type:"flyer", x:2304, y:480, patrol:180 },
      { type:"walker", x:2448, y:480, patrol:120 },
      { type:"flyer", x:2832, y:480, patrol:180 },
      { type:"jumper", x:3216, y:480, patrol:20 }
    ],

    movingPlatforms: [

    ]
  },

  {
    id: 3,
    name: "Sky Platforms",
    tileSize: 48,
    width: 104,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_sky",

    map: [
      "........................................................................................................",
      "........................................................................................................",
      "........................................................................................................",
      "...............................................................................................XF.......",
      "..............................................................................................XXX.......",
      ".............................................................................................XXXX.......",
      "............................................................................................XXXXX.......",
      "...........................................................................................XXXXXX.......",
      "...........?.?............B?B................?.?.?........................................XXXXXXX.......",
      "..........XXXXXX.........XXXXXX.............XXXXXXXX............................?.?......XXXXXXXX.......",
      ".........XXXXXXX........XXXXXXX............XXXXXXXXX....................................XXXXXXXXX.......",
      "XXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:528, y:336 }, { x:624, y:336 }, { x:1296, y:336 }, { x:2160, y:336 }, { x:2256, y:336 }, { x:2352, y:336 }, { x:3840, y:384 }, { x:3936, y:384 }, { x:768, y:432 }, { x:816, y:432 }, { x:1728, y:432 }, { x:1776, y:432 }, { x:2880, y:432 }, { x:2928, y:432 } ],

    powerups: [
      { type:"doubleJump", x:528, y:384 },
      { type:"dash", x:1296, y:384 },
      { type:"shield", x:2160, y:384 }
    ],

    enemies: [
      { type:"flyer", x:576, y:384, patrol:180 },
      { type:"jumper", x:1392, y:384, patrol:20 },
      { type:"flyer", x:2208, y:384, patrol:180 },
      { type:"walker", x:2400, y:384, patrol:120 },
      { type:"walker", x:192, y:480, patrol:120 },
      { type:"jumper", x:384, y:480, patrol:20 },
      { type:"walker", x:912, y:480, patrol:120 },
      { type:"walker", x:1104, y:480, patrol:120 },
      { type:"walker", x:1488, y:480, patrol:120 },
      { type:"flyer", x:1632, y:480, patrol:180 },
      { type:"walker", x:1872, y:480, patrol:120 },
      { type:"jumper", x:2016, y:480, patrol:20 },
      { type:"walker", x:2496, y:480, patrol:120 },
      { type:"jumper", x:2688, y:480, patrol:20 },
      { type:"walker", x:2784, y:480, patrol:120 },
      { type:"walker", x:3024, y:480, patrol:120 },
      { type:"flyer", x:3168, y:480, patrol:180 },
      { type:"walker", x:3360, y:480, patrol:120 },
      { type:"jumper", x:3552, y:480, patrol:20 },
      { type:"flyer", x:3744, y:480, patrol:180 },
      { type:"walker", x:4032, y:480, patrol:120 }
    ],

    movingPlatforms: [
      { x:2112, y:384, w:96, h:20, axis:'x', range:80, speed:60 }
    ]
  },

  {
    id: 4,
    name: "Twilight Woods",
    tileSize: 48,
    width: 106,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_cave",

    map: [
      "..........................................................................................................",
      "..........................................................................................................",
      "..........................................................................................................",
      ".................................................................................................XF.......",
      "................................................................................................XXX.......",
      "...............................................................................................XXXX.......",
      "..............................................................................................XXXXX.......",
      "...................................SSSSSSSSSSSSSSSSSS........................................XXXXXX.......",
      "...................................XXXXX.XXX.XXX.XXXX.......................................XXXXXXX.......",
      "..................BBB?BBB?B.............?...?...?.............BB?BB...BB?BB................XXXXXXXX.......",
      "..........................................................................................XXXXXXXXX.......",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:1008, y:384 }, { x:1200, y:384 }, { x:1920, y:384 }, { x:2112, y:384 }, { x:2304, y:384 }, { x:3072, y:384 }, { x:3456, y:384 }, { x:1440, y:432 }, { x:1488, y:432 }, { x:2688, y:432 }, { x:2736, y:432 }, { x:2784, y:432 }, { x:3840, y:432 }, { x:3888, y:432 } ],

    powerups: [
      { type:"dash", x:1200, y:432 },
      { type:"blaster", x:2112, y:432 },
      { type:"shield", x:3456, y:432 }
    ],

    enemies: [
      { type:"walker", x:192, y:480, patrol:120 },
      { type:"jumper", x:432, y:480, patrol:20 },
      { type:"walker", x:672, y:480, patrol:120 },
      { type:"jumper", x:1344, y:480, patrol:20 },
      { type:"walker", x:1392, y:480, patrol:120 },
      { type:"walker", x:1584, y:480, patrol:120 },
      { type:"jumper", x:1776, y:480, patrol:20 },
      { type:"walker", x:2016, y:480, patrol:120 },
      { type:"flyer", x:2208, y:480, patrol:180 },
      { type:"jumper", x:2400, y:480, patrol:20 },
      { type:"walker", x:2880, y:480, patrol:120 },
      { type:"jumper", x:3072, y:480, patrol:20 },
      { type:"flyer", x:3264, y:480, patrol:180 },
      { type:"walker", x:3648, y:480, patrol:120 },
      { type:"jumper", x:3744, y:480, patrol:20 },
      { type:"walker", x:3984, y:480, patrol:120 },
      { type:"flyer", x:4176, y:480, patrol:180 }
    ],

    movingPlatforms: [

    ]
  },

  {
    id: 5,
    name: "Cloudy Highlands",
    tileSize: 48,
    width: 108,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_sky",

    map: [
      "............................................................................................................",
      "............................................................................................................",
      "............................................................................................................",
      "........................................................................................................XF..",
      ".......................................................................................................XXX..",
      "......................................................................................................XXXX..",
      ".....................................................................................................XXXXX..",
      "....................................................................................................XXXXXX..",
      "...............?.?..............B?B....?.?.............SSSSSSSSSSSSS...............................XXXXXXX..",
      "..............XXXXXX...........XXXXXX.XXXXXX...........XXXXXXXXXXXXX...............BB?B?..........XXXXXXXX..",
      ".............X...................................................................................XXXXXXXXX..",
      "XXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:720, y:336 }, { x:816, y:336 }, { x:1584, y:336 }, { x:1872, y:336 }, { x:1968, y:336 }, { x:4080, y:384 }, { x:4176, y:384 }, { x:960, y:432 }, { x:1008, y:432 }, { x:2112, y:432 }, { x:2160, y:432 }, { x:2208, y:432 }, { x:3264, y:432 }, { x:3312, y:432 }, { x:3360, y:432 }, { x:4224, y:432 }, { x:4272, y:432 } ],

    powerups: [
      { type:"giant", x:1584, y:384 },
      { type:"shield", x:4080, y:432 },
      { type:"dash", x:4176, y:432 }
    ],

    enemies: [
      { type:"walker", x:768, y:384, patrol:120 },
      { type:"flyer", x:1680, y:384, patrol:180 },
      { type:"walker", x:1920, y:384, patrol:120 },
      { type:"walker", x:192, y:480, patrol:120 },
      { type:"jumper", x:384, y:480, patrol:20 },
      { type:"jumper", x:1104, y:480, patrol:20 },
      { type:"walker", x:1296, y:480, patrol:120 },
      { type:"jumper", x:2304, y:480, patrol:20 },
      { type:"flyer", x:2496, y:480, patrol:180 },
      { type:"walker", x:2736, y:480, patrol:120 },
      { type:"jumper", x:2976, y:480, patrol:20 },
      { type:"flyer", x:3120, y:480, patrol:180 },
      { type:"walker", x:3456, y:480, patrol:120 },
      { type:"walker", x:3648, y:480, patrol:120 },
      { type:"jumper", x:3840, y:480, patrol:20 },
      { type:"walker", x:4368, y:480, patrol:120 },
      { type:"jumper", x:4512, y:480, patrol:20 }
    ],

    movingPlatforms: [
      { x:1488, y:384, w:96, h:20, axis:'x', range:100, speed:80 }
    ]
  },

  {
    id: 6,
    name: "Fortress Finale",
    tileSize: 48,
    width: 116,
    height: 12,
    hideTiles: false,
    playerStart: { x: 96, y: 432 },
    bgKey: "bg_cave",

    map: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "....................................................................................................................",
      "....................................................................................................................",
      "...........................................................................................................XF.......",
      "..........................................................................................................XXX.......",
      ".........................................................................................................XXXX.......",
      "........................................................................................................XXXXX.......",
      ".......................................................................................................XXXXXX.......",
      "............................XXXXXXXXXXXXXXXXXX........................................................XXXXXXX.......",
      "....BBBBB?BBBBB?BBBBB............?....?................BB?BBB.BB?B?B......BB?BB?BB?BBB...............XXXXXXXX.......",
      "....................................................................................................XXXXXXXXX.......",
      "XXXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXX..XXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ],

    coins: [ { x:1488, y:336 }, { x:1680, y:336 }, { x:1872, y:336 }, { x:2064, y:336 }, { x:432, y:384 }, { x:720, y:384 }, { x:2736, y:384 }, { x:3072, y:384 }, { x:3168, y:384 }, { x:3648, y:384 }, { x:3792, y:384 }, { x:3936, y:384 }, { x:1056, y:432 }, { x:1104, y:432 }, { x:1152, y:432 }, { x:2208, y:432 }, { x:2256, y:432 }, { x:2304, y:432 }, { x:3264, y:432 }, { x:3312, y:432 }, { x:4128, y:432 }, { x:4176, y:432 }, { x:4224, y:432 } ],

    powerups: [
      { type:"blaster", x:432, y:432 },
      { type:"shield", x:720, y:432 },
      { type:"doubleJump", x:2736, y:432 },
      { type:"dash", x:3072, y:432 },
      { type:"giant", x:3792, y:432 }
    ],

    enemies: [
      { type:"walker", x:240, y:480, patrol:120 },
      { type:"jumper", x:432, y:480, patrol:20 },
      { type:"walker", x:672, y:480, patrol:120 },
      { type:"flyer", x:864, y:480, patrol:180 },
      { type:"walker", x:1248, y:480, patrol:120 },
      { type:"jumper", x:1440, y:480, patrol:20 },
      { type:"flyer", x:1632, y:480, patrol:180 },
      { type:"walker", x:2400, y:480, patrol:120 },
      { type:"jumper", x:2592, y:480, patrol:20 },
      { type:"walker", x:2784, y:480, patrol:120 },
      { type:"jumper", x:2928, y:480, patrol:20 },
      { type:"flyer", x:3120, y:480, patrol:180 },
      { type:"walker", x:3408, y:480, patrol:120 },
      { type:"jumper", x:3600, y:480, patrol:20 },
      { type:"flyer", x:3744, y:480, patrol:180 },
      { type:"walker", x:3936, y:480, patrol:120 },
      { type:"walker", x:4320, y:480, patrol:120 },
      { type:"jumper", x:4464, y:480, patrol:20 },
      { type:"flyer", x:4608, y:480, patrol:180 }
    ],

    movingPlatforms: [
      { x:1344, y:336, w:96, h:20, axis:'x', range:80, speed:90 }
    ]
  }
];

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
