/*
  SETTINGS & GAME MODIFIERS
  Saved automatically in the browser so they stick between sessions.
  Advanced feature – accessed from the main menu.
*/

const DEFAULT_SETTINGS = {
  // Physics multipliers (1.0 = default)
  gravityMult:      1.0,
  speedMult:        1.0,
  jumpMult:         1.0,
  enemySpeedMult:   1.0,
  projectileSpeed:  1.0,

  // Player options
  startLives:       5,
  infiniteLives:    false,
  invincibleMode:   false,   // never take damage (god mode)
  alwaysBlaster:    false,   // start with blaster unlocked

  // Display
  showHitboxes:     false,   // debug: draw collision rectangles

  // Volume (0–1)
  sfxVolume:        0.7,

  // Game genre/mode
  gameMode:         'platformer',  // platformer | shooter | brawler | dungeon | racer | puzzle

  // Author / publisher
  authorName:       '',

  // Color tints (CSS color strings, '' = no tint)
  tintPlayer:       '',
  tintWalker:       '',
  tintJumper:       '',
  tintFlyer:        '',
  tintCoin:         '',
};

const KQ_SETTINGS = (() => {
  let data = { ...DEFAULT_SETTINGS };

  function load() {
    try {
      const saved = localStorage.getItem('kq_settings');
      if (saved) data = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      const migratedLives = localStorage.getItem('kq_lives_default_v2');
      if (!migratedLives && data.startLives === 3) {
        data.startLives = DEFAULT_SETTINGS.startLives;
        localStorage.setItem('kq_lives_default_v2', '1');
        save();
      }
    } catch (e) { /* ignore parse errors */ }
  }

  function save() {
    try { localStorage.setItem('kq_settings', JSON.stringify(data)); } catch (e) {}
  }

  function reset() {
    data = { ...DEFAULT_SETTINGS };
    save();
  }

  function get(key) { return data[key]; }
  function set(key, val) { data[key] = val; save(); }
  function getAll() { return { ...data }; }

  load();
  return { get, set, reset, getAll, save };
})();

// Top-level `const` does not attach to window. Expose explicitly so the
// external genre modules (kart/puzzle/dungeon) and sounds.js can read settings.
window.KQ_SETTINGS = KQ_SETTINGS;
