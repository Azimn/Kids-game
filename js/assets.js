/*
  Kid Quest — Asset Manifest
  ──────────────────────────
  To swap out any graphic, replace the PNG file in assets/art/
  using the SAME filename.  The game works with coloured shapes
  if a file is missing, so nothing will break.

  Want to rename a file?  Change the path string here to match.
  Want to add new art?    Add a new key and point it at your file.
*/
window.KQ_ASSETS = {
  titleLogo:  "assets/art/title-logo.png",

  // ── Backgrounds ─────────────────────────────────────────────
  // One image fills the whole screen behind the level.
  // Drop any PNG here — it will stretch to fit.
  backgrounds: {
    bg_meadow: "assets/art/background.png",
    bg_sky:    "assets/art/background.png",   // swap with your own sky art
    bg_cave:   "assets/art/background.png",   // swap with your own cave art
  },

  // ── Player frames ────────────────────────────────────────────
  // idle  = standing still
  // run1/run2 = two walking frames (flips between them)
  // jump  = in the air
  // hurt  = just got hit
  player: {
    idle: "assets/art/player-idle.png",
    run1: "assets/art/player-run-1.png",
    run2: "assets/art/player-run-2.png",
    jump: "assets/art/player-jump.png",
    hurt: "assets/art/player-hurt.png"
  },

  // ── Tiles ────────────────────────────────────────────────────
  tiles: {
    ground:    "assets/art/tile-ground.png",
    brick:     "assets/art/tile-brick.png",
    question:  "assets/art/tile-question.png",
    breakable: "assets/art/tile-breakable.png",
    spike:     "assets/art/tile-spike.png",
    goal:      "assets/art/goal-flag.png"
  },

  // ── Collectibles & Power-ups ─────────────────────────────────
  items: {
    coin:       "assets/art/coin.png",
    blaster:    "assets/art/power-blaster.png",
    shield:     "assets/art/power-shield.png",
    doubleJump: "assets/art/power-double-jump.png",
    dash:       "assets/art/power-dash.png",
    giant:      "assets/art/power-giant.png"
  },

  // ── Enemies ──────────────────────────────────────────────────
  enemies: {
    walker: "assets/art/enemy-walker.png",
    jumper: "assets/art/enemy-jumper.png",
    flyer: "assets/art/enemy-flyer.png",
    boss: "assets/art/enemy-boss.png"
  },

  // ── Projectile ───────────────────────────────────────────────
  projectile: "assets/art/projectile.png",

  puzzle: {
    hero: "assets/art/puzzle-hero.png",
    slime: "assets/art/puzzle-slime.png",
    boss: "assets/art/puzzle-boss.png",
    chest: "assets/art/puzzle-chest.png",
    key: "assets/art/puzzle-key.png",
    door: "assets/art/puzzle-door.png",
    block: "assets/art/puzzle-block.png"
  },

  dungeon: {
    warrior: "assets/art/dungeon-warrior.png",
    wizard: "assets/art/dungeon-wizard.png",
    rogue: "assets/art/dungeon-rogue.png",
    goblin: "assets/art/dungeon-goblin.png",
    orc: "assets/art/dungeon-orc.png",
    boss: "assets/art/dungeon-boss.png",
    stairs: "assets/art/dungeon-stairs.png"
  },

  kart: {
    player: "assets/art/kart-player.png",
    rival: "assets/art/kart-rival.png",
    itemBox: "assets/art/kart-item-box.png",
    boost: "assets/art/kart-boost.png",
    shield: "assets/art/kart-shield.png"
  }
};
