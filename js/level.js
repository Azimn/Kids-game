// =============================================================
//  LEVEL DATA & TILE SYSTEM
//
//  Tile codes used in the grid:
//    0  = empty / air
//    1  = solid ground (brown dirt)
//    2  = one-way platform (can jump up through it)
//    3  = brick (breakable, bounces when hit from below)
//    4  = question block (releases coin / power-up when hit)
//    5  = pipe / obstacle
//    6  = hazard / lava (hurts player)
//    7  = solid sky top tile
//    8  = invisible solid (useful for custom backgrounds)
//
//  Entity spawn codes in the 'entities' array use these types:
//    'walker'  – basic left-right patroller
//    'jumper'  – jumps toward player
//    'flyer'   – flies back and forth
//    'coin'    – collectible coin / star
//    'powerup:<id>' – spawns that power-up (from POWERUP_DEFS)
//    'exit'    – level exit flag
// =============================================================

const TILE_SOLID    = 1;
const TILE_PLATFORM = 2;
const TILE_BRICK    = 3;
const TILE_QUESTION = 4;
const TILE_PIPE     = 5;
const TILE_HAZARD   = 6;
const TILE_TOP      = 7;
const TILE_INVIS    = 8;

const TILE_COLORS = {
  1: '#8B6914',   // ground
  2: '#5AAA44',   // platform
  3: '#C84B1A',   // brick
  4: '#FFD700',   // question block
  5: '#1A8C40',   // pipe
  6: '#FF3300',   // lava/hazard
  7: '#5B8DD9',   // sky block
  8: 'transparent',
};

// ── Level definitions ─────────────────────────────────────────
// Each level is a plain object — easy to copy/paste and edit.
// T = tile size (48px).  Grid is cols × rows.

const LEVELS = [

  // ============================================================
  //  LEVEL 1 – Grassy Plains
  // ============================================================
  {
    id: 1,
    name: 'Grassy Plains',
    background: 'level1',
    music: null,
    playerStart: { col: 2, row: 9 },

    // Width in tiles (height is always 12 rows)
    cols: 50,
    rows: 12,

    // ── Tile grid ────────────────────────────────────────────
    // Provide a compact string-per-row for readability.
    // Length of each string must equal cols (50).
    // '.' = 0, digits = tile code.
    grid: [
      '77777777777777777777777777777777777777777777777777',
      '7.................................................7',
      '7.................................................7',
      '7...........2222...............................2...7',
      '7.......222.............................222........7',
      '7..43.............3..4..3.....43....................7',
      '7..11..........5..111111..1..1111..1..222..........7',
      '7.....2222.........................................................'.slice(0,50),
      '7.........................................................222......7',
      '1111111111111111111111111111111111111111111111111111',
      '1111111111111111111111111111111111111111111111111111',
      '1111111111111111111111111111111111111111111111111111',
    ],

    entities: [
      { type: 'walker',  col: 8,  row: 8 },
      { type: 'walker',  col: 14, row: 8 },
      { type: 'jumper',  col: 22, row: 8 },
      { type: 'walker',  col: 30, row: 8 },
      { type: 'flyer',   col: 35, row: 4 },
      { type: 'walker',  col: 42, row: 8 },
      { type: 'coin',    col: 5,  row: 7 },
      { type: 'coin',    col: 6,  row: 7 },
      { type: 'coin',    col: 7,  row: 7 },
      { type: 'coin',    col: 10, row: 3 },
      { type: 'coin',    col: 11, row: 3 },
      { type: 'coin',    col: 20, row: 5 },
      { type: 'coin',    col: 25, row: 7 },
      { type: 'coin',    col: 26, row: 7 },
      { type: 'powerup:mushroom',  col: 16, row: 4 },
      { type: 'powerup:weapon',    col: 28, row: 4 },
      { type: 'powerup:speed',     col: 38, row: 7 },
      { type: 'exit',    col: 47, row: 8 },
    ],
  },

  // ============================================================
  //  LEVEL 2 – Sky Platforms
  // ============================================================
  {
    id: 2,
    name: 'Sky Platforms',
    background: 'level2',
    music: null,
    playerStart: { col: 1, row: 10 },

    cols: 60,
    rows: 12,

    grid: [
      '777777777777777777777777777777777777777777777777777777777777',
      '7..........................................................7',
      '7..........2222.......2222.......2222...............2222..7',
      '7......222.....222...........222.....222.................7',
      '7.43............43..43.........43............43.......7',
      '7.11..2....2....111.111...2....111......2....111..............7'.slice(0,60),
      '7.....2222.......................................................7'.slice(0,60),
      '7.........2222..................................................7'.slice(0,60),
      '7..............2222...............2222..........................7'.slice(0,60),
      '7...................2222......2222.....2222.....................7'.slice(0,60),
      '11111.........11111111...1111111111...11111111111..1111111111',
      '111111111111111111111111111111111111111111111111111111111111',
    ],

    entities: [
      { type: 'walker', col: 6,  row: 9 },
      { type: 'flyer',  col: 12, row: 2 },
      { type: 'jumper', col: 18, row: 9 },
      { type: 'flyer',  col: 25, row: 2 },
      { type: 'walker', col: 30, row: 9 },
      { type: 'walker', col: 35, row: 9 },
      { type: 'flyer',  col: 40, row: 3 },
      { type: 'jumper', col: 45, row: 9 },
      { type: 'walker', col: 52, row: 9 },
      { type: 'coin',    col: 4,  row: 8 },
      { type: 'coin',    col: 5,  row: 8 },
      { type: 'coin',    col: 14, row: 8 },
      { type: 'coin',    col: 22, row: 8 },
      { type: 'coin',    col: 23, row: 8 },
      { type: 'coin',    col: 32, row: 8 },
      { type: 'coin',    col: 48, row: 8 },
      { type: 'powerup:doublejump', col: 20, row: 3 },
      { type: 'powerup:shield',     col: 42, row: 3 },
      { type: 'powerup:weapon',     col: 10, row: 3 },
      { type: 'exit',    col: 57, row: 9 },
    ],
  },

  // ============================================================
  //  LEVEL 3 – Cave of Danger
  // ============================================================
  {
    id: 3,
    name: 'Cave of Danger',
    background: 'level3',
    music: null,
    playerStart: { col: 1, row: 9 },

    cols: 55,
    rows: 12,

    grid: [
      '1111111111111111111111111111111111111111111111111111111',
      '1.....................................................1',
      '1..2222.....2222.....2222.....2222.....2222...........1',
      '1.......2222.....2222.....2222.....2222...............1',
      '1......................................................1',
      '1...3..43.....3..43.....3..43....3..43....................1'.slice(0,55),
      '1...1..11.....1..11.....1..11....1..11....................1'.slice(0,55),
      '1..............................................................1'.slice(0,55),
      '1...2222..2222..2222..2222..2222..2222..2222.............1'.slice(0,55),
      '1.666.....................................................1'.slice(0,55),
      '1666666...666666...666666...666666...666666...666666...11'.slice(0,55),
      '1111111111111111111111111111111111111111111111111111111',
    ],

    entities: [
      { type: 'walker', col: 5,  row: 8 },
      { type: 'jumper', col: 10, row: 8 },
      { type: 'flyer',  col: 15, row: 2 },
      { type: 'walker', col: 20, row: 8 },
      { type: 'jumper', col: 25, row: 8 },
      { type: 'flyer',  col: 30, row: 2 },
      { type: 'walker', col: 35, row: 8 },
      { type: 'walker', col: 40, row: 8 },
      { type: 'flyer',  col: 45, row: 2 },
      { type: 'coin',    col: 7,  row: 7 },
      { type: 'coin',    col: 12, row: 7 },
      { type: 'coin',    col: 17, row: 7 },
      { type: 'coin',    col: 22, row: 7 },
      { type: 'coin',    col: 27, row: 7 },
      { type: 'powerup:mushroom',  col: 3,  row: 4 },
      { type: 'powerup:speed',     col: 18, row: 3 },
      { type: 'powerup:shield',    col: 35, row: 3 },
      { type: 'exit',    col: 52, row: 9 },
    ],
  },
];

// ── Level builder ─────────────────────────────────────────────
// Converts the compact string grid into a 2D number array.

function buildLevel(levelDef) {
  const T = GAME_CONFIG.TILE_SIZE;
  const grid = [];

  for (let row = 0; row < levelDef.rows; row++) {
    grid[row] = [];
    const rowStr = (levelDef.grid[row] || '').padEnd(levelDef.cols, '0');
    for (let col = 0; col < levelDef.cols; col++) {
      const ch = rowStr[col];
      grid[row][col] = ch === '.' ? 0 : parseInt(ch) || 0;
    }
  }

  return {
    ...levelDef,
    grid,
    pixelWidth:  levelDef.cols * T,
    pixelHeight: levelDef.rows * T,
  };
}

// ── Tile query helpers ─────────────────────────────────────────

function getTile(level, col, row) {
  if (row < 0 || row >= level.rows || col < 0 || col >= level.cols) return 0;
  return level.grid[row][col];
}

function isSolid(tile) {
  return tile === TILE_SOLID || tile === TILE_BRICK ||
         tile === TILE_QUESTION || tile === TILE_PIPE ||
         tile === TILE_TOP || tile === TILE_INVIS;
}

function isPlatform(tile) { return tile === TILE_PLATFORM; }
function isHazard(tile)   { return tile === TILE_HAZARD; }

// Convert pixel position to tile coordinate
function pixelToTile(px) { return Math.floor(px / GAME_CONFIG.TILE_SIZE); }
