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
    walker: "assets/art/enemy-walker.png"
  },

  // ── Projectile ───────────────────────────────────────────────
  projectile: "assets/art/projectile.png"
};
