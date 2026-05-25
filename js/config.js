// =============================================================
//  GAME CONFIGURATION
//  Edit values here to change how the game feels!
//  Kids: this is where you tune the game to your liking.
// =============================================================

const GAME_CONFIG = {
  // Canvas / display
  WIDTH:  960,
  HEIGHT: 540,
  TILE_SIZE: 48,

  // Physics
  GRAVITY:        0.55,
  MAX_FALL_SPEED: 18,

  // Player movement
  PLAYER_WALK_SPEED:   4.5,
  PLAYER_RUN_SPEED:    7.5,
  PLAYER_JUMP_FORCE:  -14,
  PLAYER_JUMP_HOLD:    0.65,   // how much extra air from holding jump (0–1)
  PLAYER_ACCELERATION: 0.4,
  PLAYER_FRICTION:     0.75,

  // Player stats
  PLAYER_MAX_HP:   3,
  PLAYER_INVINCIBLE_MS: 2000,   // ms of flicker after being hit

  // Projectile
  PROJECTILE_SPEED:  10,
  PROJECTILE_LIFE_MS: 1200,

  // Camera
  CAMERA_LERP: 0.1,

  // Scoring
  COIN_SCORE:        100,
  ENEMY_STOMP_SCORE: 200,
  ENEMY_SHOOT_SCORE: 150,

  // Lives
  START_LIVES: 3,
};

// =============================================================
//  POWER-UP DEFINITIONS
//  Add as many entries as you want — not capped at 5!
//  Each entry becomes a collectible in the game.
// =============================================================

const POWERUP_DEFS = [
  {
    id: 'mushroom',
    name: 'Super Mushroom',
    description: 'Grow bigger and get an extra hit point!',
    // Placeholder colour shown when no art is loaded
    placeholderColor: '#E8402A',
    placeholderEmoji: '🍄',
    // Path to art file (PNG with transparency recommended)
    icon: 'assets/powerups/mushroom.png',
    duration: 0,       // 0 = permanent
    onCollect(player) {
      if (player.hp < GAME_CONFIG.PLAYER_MAX_HP + 1) {
        player.hp = Math.min(player.hp + 1, GAME_CONFIG.PLAYER_MAX_HP + 1);
      }
      player.powered = true;
    },
    onExpire(player) {},
  },

  {
    id: 'speed',
    name: 'Speed Boots',
    description: 'Zoom! Run super-fast for a short time.',
    placeholderColor: '#FFD700',
    placeholderEmoji: '👟',
    icon: 'assets/powerups/speed.png',
    duration: 8000,
    onCollect(player) {
      player.speedMultiplier = 1.7;
    },
    onExpire(player) {
      player.speedMultiplier = 1;
    },
  },

  {
    id: 'doublejump',
    name: 'Feather',
    description: 'Jump again while in the air!',
    placeholderColor: '#A0E8FF',
    placeholderEmoji: '🪶',
    icon: 'assets/powerups/doublejump.png',
    duration: 12000,
    onCollect(player) {
      player.hasDoubleJump = true;
    },
    onExpire(player) {
      player.hasDoubleJump = false;
      player.usedDoubleJump = false;
    },
  },

  {
    id: 'weapon',
    name: 'Buster Cannon',
    description: 'Shoot energy blasts at enemies! (Press Z)',
    placeholderColor: '#00CFFF',
    placeholderEmoji: '🔫',
    icon: 'assets/powerups/weapon.png',
    duration: 15000,
    onCollect(player) {
      player.hasWeapon = true;
    },
    onExpire(player) {
      player.hasWeapon = false;
    },
  },

  {
    id: 'shield',
    name: 'Star Shield',
    description: 'Invincible for a short time!',
    placeholderColor: '#FFE566',
    placeholderEmoji: '⭐',
    icon: 'assets/powerups/shield.png',
    duration: 6000,
    onCollect(player) {
      player.shielded = true;
    },
    onExpire(player) {
      player.shielded = false;
    },
  },

  // ── Add more power-ups below this line ─────────────────────
];

// =============================================================
//  ASSET MANIFEST
//  Maps logical names to file paths.
//  Swap out any path to use your own artwork.
//  The game works with placeholder shapes if files are missing.
// =============================================================

const ASSET_MANIFEST = {
  // ── Player frames ──────────────────────────────────────────
  // Each animation is a list of frames played in order.
  // Add more frames by adding more file entries.
  player: {
    idle:  ['assets/player/idle_1.png', 'assets/player/idle_2.png'],
    walk:  ['assets/player/walk_1.png', 'assets/player/walk_2.png',
            'assets/player/walk_3.png', 'assets/player/walk_4.png'],
    jump:  ['assets/player/jump.png'],
    fall:  ['assets/player/fall.png'],
    shoot: ['assets/player/shoot.png'],
    hurt:  ['assets/player/hurt.png'],
  },

  // ── Enemy frames ───────────────────────────────────────────
  enemies: {
    walker: {
      walk: ['assets/enemies/walker/walk_1.png', 'assets/enemies/walker/walk_2.png'],
      hurt: ['assets/enemies/walker/hurt.png'],
    },
    jumper: {
      idle: ['assets/enemies/jumper/idle.png'],
      jump: ['assets/enemies/jumper/jump.png'],
    },
    flyer: {
      fly: ['assets/enemies/flyer/fly_1.png', 'assets/enemies/flyer/fly_2.png'],
    },
  },

  // ── Tiles ──────────────────────────────────────────────────
  tiles: {
    ground:    'assets/tiles/ground.png',
    platform:  'assets/tiles/platform.png',
    brick:     'assets/tiles/brick.png',
    question:  'assets/tiles/question.png',
    solid:     'assets/tiles/solid.png',
    lava:      'assets/tiles/lava.png',
  },

  // ── Power-ups (auto-mapped from POWERUP_DEFS above) ────────
  powerups: Object.fromEntries(POWERUP_DEFS.map(p => [p.id, p.icon])),

  // ── Projectile ─────────────────────────────────────────────
  projectile: 'assets/projectiles/bullet.png',

  // ── UI / HUD ───────────────────────────────────────────────
  ui: {
    title:     'assets/ui/title.png',     // swap this to change the game title!
    heart:     'assets/ui/heart.png',
    coin:      'assets/ui/coin.png',
    gameover:  'assets/ui/gameover.png',
    youwin:    'assets/ui/youwin.png',
  },

  // ── Backgrounds ────────────────────────────────────────────
  backgrounds: {
    level1: 'assets/backgrounds/level1.png',
    level2: 'assets/backgrounds/level2.png',
    level3: 'assets/backgrounds/level3.png',
  },
};
