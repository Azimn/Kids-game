(() => {
  "use strict";

  // ── Canvas & context ───────────────────────────────────────
  const canvas  = document.getElementById("game");
  const ctx     = canvas.getContext("2d");
  const VIEW_W  = canvas.width;
  const VIEW_H  = canvas.height;

  // ── Physics constants (modified by KQ_SETTINGS multipliers) ─
  const BASE_GRAVITY    = 2200;
  const BASE_MOVE_SPEED = 270;
  const BASE_JUMP_SPEED = 760;
  const COYOTE_TIME     = 0.11;
  const JUMP_BUFFER     = 0.13;
  const TILE            = 48;

  function G_GRAV()   { return BASE_GRAVITY    * KQ_SETTINGS.get('gravityMult'); }
  function G_SPEED()  { return BASE_MOVE_SPEED * KQ_SETTINGS.get('speedMult'); }
  function G_JUMP()   { return BASE_JUMP_SPEED * KQ_SETTINGS.get('jumpMult'); }
  function G_ENEMY()  { return 75              * KQ_SETTINGS.get('enemySpeedMult'); }

  // ── Input ──────────────────────────────────────────────────
  const keys  = Object.create(null);
  const touch = Object.create(null);

  // ── Image cache ────────────────────────────────────────────
  const images     = new Map();
  let imagesLoaded = false;

  // ── Game state ─────────────────────────────────────────────
  let audioCtx    = null;
  let cameraX     = 0;
  let screenShake = 0;
  let lastTime    = performance.now();
  let mode        = "menu";  // title | menu | playing | paused | editor | settings | gameover | win | levelselect
  let levelIndex  = 0;
  let playtestReturnMode = null;

  // Settings panel state
  let settingsSliders = {};

  // Level select state
  let highestUnlocked = 0;
  try { highestUnlocked = parseInt(localStorage.getItem('kq_highest_unlocked') || '0', 10) || 0; } catch(e) {}

  // Pause menu hover state
  let pauseHover = -1; // -1 = none, 0 = resume, 1 = restart, 2 = menu

  // Block bounce animations: Map of "tx,ty" -> { timer, maxTimer }
  const blockAnims = new Map();

  const game = {
    time: 0, score: 0, coins: 0, lives: 3,
    particles: [], popups: [], projectiles: [],
    worldWidth: 0, worldHeight: 0
  };

  const player = makePlayer();

  let coins = [], powerups = [], enemies = [], map = [];
  let movingPlatforms = [];
  let currentLevel = null;

  // ── Boss state ─────────────────────────────────────────────
  let boss = null; // { x, y, w, h, hp, maxHp, vx, shootTimer, alive, anim }
  let bossSpawned = false;
  let bossDefeated = false;

  // ── Shooter genre state ────────────────────────────────────
  const shooter = {
    enemies: [],       // { x, y, w, h, vx, vy, alive, hp, shootTimer, divingTo, bobOffset }
    wave: 0,
    waveTimer: 0,
    formDir: 1,        // formation march direction
    playerX: 0,        // shooter player x (center of ship)
    shootCooldown: 0,
    autoShootTimer: 0,
    stars: [],         // parallax star field
    lives: 3,
    score: 0,
    bossActive: false,
    bossHp: 0,
    bossX: 0, bossY: 0, bossVx: 100,
    bossShootTimer: 0,
  };

  // ── Hint popup system ──────────────────────────────────────
  let hintPopup = null; // { lines[], timer, maxTimer, dismissed }
  const HINT_STORAGE_KEY = 'kq_hint_dismissed_';

  function showHint(key, lines) {
    try { if (localStorage.getItem(HINT_STORAGE_KEY + key)) return; } catch(e) {}
    hintPopup = { key, lines, dismissed: false };
  }
  function dismissHint() {
    if (!hintPopup) return;
    try { localStorage.setItem(HINT_STORAGE_KEY + hintPopup.key, '1'); } catch(e) {}
    hintPopup = null;
  }

  // ── Helpers ────────────────────────────────────────────────
  function makePlayer() {
    return {
      x: 120, y: 260, w: 36, h: 44,
      vx: 0, vy: 0, dir: 1,
      onGround: false, coyote: 0, jumpBuffer: 0,
      canDoubleJump: false, usedDoubleJump: false,
      dashReady: true, dashTimer: 0,
      invincible: 0, hurtTimer: 0,
      power: { blaster: false, shield: 0, doubleJump: false, dash: false, giant: false },
      shootCooldown: 0, anim: 0,
      _jumpHeld: false, _dashHeld: false, _shootHeld: false,
      _ridingPlatform: null
    };
  }

  // ── Asset loading ──────────────────────────────────────────
  function flattenAssets(obj, out = []) {
    for (const v of Object.values(obj)) {
      if (typeof v === "string") out.push(v);
      else if (v && typeof v === "object") flattenAssets(v, out);
    }
    return out;
  }

  function loadImages() {
    const paths = [...new Set(flattenAssets(window.KQ_ASSETS || {}))];
    let loaded = 0;
    if (paths.length === 0) { imagesLoaded = true; return; }
    for (const path of paths) {
      const img = new Image();
      img.onload = img.onerror = () => { loaded++; if (loaded >= paths.length) imagesLoaded = true; };
      img.src = path;
      images.set(path, img);
    }
  }

  function drawImg(path, x, y, w, h, opts = {}) {
    // Art manager overrides take priority over file-based images
    const img = (window.KQ_ART && KQ_ART.getOverride(path)) || images.get(path);
    if (!img || !img.complete || !img.naturalWidth) return false;
    ctx.save();
    if (opts.flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); }
    else ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    return true;
  }

  // Apply a color tint while drawing: draws with multiply composite, then restores
  function withTint(tintColor, drawFn) {
    if (!tintColor) { drawFn(); return; }
    ctx.save();
    drawFn();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = tintColor;
    // We'll fill the bounding rect passed via opts; for convenience callers pass it
    // Instead, callers should wrap the region themselves
    ctx.restore();
  }

  // Simpler: draw entity with tint overlay
  function drawWithTint(tintColor, x, y, w, h, drawFn) {
    drawFn();
    if (!tintColor) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = tintColor;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // ── Audio ──────────────────────────────────────────────────
  function ensureAudio() {
    if (!audioCtx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C) audioCtx = new C();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function beep(type = "coin") {
    if (!audioCtx) return;
    const vol = KQ_SETTINGS.get('sfxVolume');
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const presets = {
      coin:  [880, 1320, 0.09, "triangle"],
      jump:  [420,  620, 0.10, "square"],
      hurt:  [180,   90, 0.18, "sawtooth"],
      shoot: [720,  420, 0.08, "square"],
      power: [520,  980, 0.22, "triangle"],
      stomp: [280,  120, 0.12, "square"],
      win:   [660, 1180, 0.42, "triangle"],
      dash:  [220,  680, 0.11, "sawtooth"],
      break: [140,   70, 0.13, "square"],
      menu:  [440,  880, 0.12, "triangle"],
    };
    const [f1, f2, dur, wave] = presets[type] || presets.coin;
    osc.type = wave;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.085 * vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  // ── Input ──────────────────────────────────────────────────
  function pressed(name) { return !!keys[name] || !!touch[name]; }

  window.addEventListener("keydown", (e) => {
    const code = e.key.toLowerCase();
    if ([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(code)) e.preventDefault();

    if (mode === "editor") { KQ_EDITOR.handleKey(e); return; }

    if (hintPopup) { dismissHint(); return; }
    if (code === "enter" || code === " ") ensureAudio(), handleStart();
    if (code === "p" || code === "escape") handlePause();
    if (code === "r") { ensureAudio(); resetLevel(true); mode = "playing"; }

    if (code === "arrowleft"  || code === "a") keys.left  = true;
    if (code === "arrowright" || code === "d") keys.right = true;
    if (code === "arrowup"    || code === "w" || code === " ") keys.jump = true;
    if (code === "x"          || code === "k") keys.shoot = true;
    if (code === "shift"      || code === "j") keys.dash  = true;
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    const code = e.key.toLowerCase();
    if (code === "arrowleft"  || code === "a") keys.left  = false;
    if (code === "arrowright" || code === "d") keys.right = false;
    if (code === "arrowup"    || code === "w" || code === " ") keys.jump = false;
    if (code === "x"          || code === "k") keys.shoot = false;
    if (code === "shift"      || code === "j") keys.dash  = false;
  });

  // Touch overlay buttons
  document.querySelectorAll("[data-touch]").forEach(button => {
    const name = button.dataset.touch;
    const down = (e) => {
      e.preventDefault(); ensureAudio(); touch[name] = true;
      button.classList.add("isDown");
      if (mode !== "playing" && (name === "jump" || name === "shoot")) handleStart();
    };
    const up = (e) => { e.preventDefault(); touch[name] = false; button.classList.remove("isDown"); };
    button.addEventListener("pointerdown", down, { passive: false });
    button.addEventListener("pointerup",   up,   { passive: false });
    button.addEventListener("pointercancel", up, { passive: false });
    button.addEventListener("pointerleave",  up, { passive: false });
  });

  canvas.addEventListener("pointerdown", (e) => {
    ensureAudio();
    if (hintPopup) { dismissHint(); return; }
    if (mode === "paused") {
      _handlePauseClick(e);
      return;
    }
    if (mode === "levelselect") {
      _handleLevelSelectClick(e);
      return;
    }
    if (mode !== "playing" && mode !== "editor") handleStart();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (mode === "paused") _handlePauseHover(e);
  });

  // Gamepad init
  KQ_GAMEPAD.init(keys, handleStart, handlePause);

  // Editor events
  document.addEventListener('kq:playtestLevel', (e) => {
    playtestReturnMode = 'editor';
    _startPlaytest(e.detail);
  });
  document.addEventListener('kq:editorBack', () => {
    mode = 'menu';
    _showMenuPanel();
  });

  function handleStart() {
    if (mode === "title") {
      ensureAudio();
      beep('menu');
      const gmode = KQ_SETTINGS.get('gameMode') || 'platformer';
      if (gmode === 'shooter') {
        _shooterInit();
        mode = 'playing';
      } else if (gmode === 'brawler') {
        _brawlerInit();
        mode = 'playing';
      } else if (gmode === 'metroid') {
        _metroidInit();
        mode = 'playing';
      } else {
        mode = "levelselect";
      }
      return;
    }
    if (mode === "menu") {
      _hideAllPanels();
      const gmode = KQ_SETTINGS.get('gameMode') || 'platformer';
      if (gmode === 'shooter') { _shooterInit(); mode = 'playing'; }
      else if (gmode === 'brawler') { _brawlerInit(); mode = 'playing'; }
      else if (gmode === 'metroid') { _metroidInit(); mode = 'playing'; }
      else { mode = "levelselect"; }
      return;
    }
    if (mode === "gameover" || mode === "win") {
      const gmode = KQ_SETTINGS.get('gameMode') || 'platformer';
      if (gmode === 'shooter') { _shooterInit(); mode = 'playing'; }
      else if (gmode === 'brawler') { _brawlerInit(); mode = 'playing'; }
      else if (gmode === 'metroid') { _metroidInit(); mode = 'playing'; }
      else { resetLevel(true); mode = "playing"; }
    }
  }
  function handlePause() {
    if (mode === "playing") { mode = "paused"; pauseHover = -1; }
    else if (mode === "paused") mode = "playing";
  }

  // ── Level reset ────────────────────────────────────────────
  function resetLevel(full = true) {
    const LEVELS = window.KQ_LEVELS || [];
    currentLevel = LEVELS[levelIndex] || LEVELS[0];
    if (!currentLevel) return;

    map     = currentLevel.map.map(row => row.split(""));
    coins   = currentLevel.coins.map(c => ({ ...c, w: 26, h: 26, taken: false, bob: Math.random() * 6 }));
    powerups= currentLevel.powerups.map(p => ({ ...p, w: 32, h: 32, taken: false, bob: Math.random() * 6 }));

    enemies = currentLevel.enemies.map(e => {
      if (e.type === 'jumper') {
        return { ...e, w: 38, h: 38, vx: 0, vy: 0, alive: true,
          startX: e.x, y: e.y - 38, hurt: 0, jumpTimer: 1.5 + Math.random() };
      } else if (e.type === 'flyer') {
        return { ...e, w: 36, h: 32, vx: -G_ENEMY(), vy: 0, alive: true,
          startX: e.x, startY: e.y, y: e.y, hurt: 0 };
      } else {
        return { ...e, w: 40, h: 34, vx: -G_ENEMY(), alive: true,
          startX: e.x, y: e.y - 34, hurt: 0 };
      }
    });

    // Moving platforms — deep copy with runtime state
    movingPlatforms = (currentLevel.movingPlatforms || []).map(p => ({
      ...p,
      ox: p.x, oy: p.y,   // origin
      t: 0                  // phase timer
    }));

    // Boss reset
    boss = null;
    bossSpawned = false;
    bossDefeated = false;

    game.particles.length = 0;
    game.popups.length    = 0;
    game.projectiles.length = 0;
    game.worldWidth  = currentLevel.width  * currentLevel.tileSize;
    game.worldHeight = currentLevel.height * currentLevel.tileSize;
    cameraX = 0; screenShake = 0;
    blockAnims.clear();

    Object.assign(player, makePlayer());
    player.x = currentLevel.playerStart.x;
    player.y = currentLevel.playerStart.y;

    if (full) {
      game.score = 0; game.coins = 0;
      game.lives = KQ_SETTINGS.get('infiniteLives') ? 99 : KQ_SETTINGS.get('startLives');
      player.power = {
        blaster:    KQ_SETTINGS.get('alwaysBlaster'),
        shield:     0,
        doubleJump: false,
        dash:       false,
        giant:      false
      };
    }
  }

  function _startPlaytest(levelData) {
    const LEVELS = window.KQ_LEVELS || [];
    let idx = LEVELS.findIndex(l => l.id === levelData.id);
    if (idx < 0) { LEVELS.push(levelData); idx = LEVELS.length - 1; }
    levelIndex = idx;
    resetLevel(true);
    mode = 'playing';
    _hideAllPanels();
  }

  // ── Tile helpers ───────────────────────────────────────────
  function tileAt(tx, ty) {
    if (ty < 0 || ty >= map.length || tx < 0 || tx >= (map[0]||[]).length) return ".";
    return map[ty][tx];
  }
  function setTile(tx, ty, v) {
    if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length) return;
    map[ty][tx] = v;
  }
  function isSolid(ch) { return ch === "X" || ch === "?" || ch === "B"; }
  function isSpike(ch) { return ch === "S"; }
  function isGoal(ch)  { return ch === "F"; }
  function worldToTile(x, y) { return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) }; }

  function queryTiles(rect, cb) {
    const s = TILE;
    for (let ty = Math.floor(rect.y / s) - 1; ty <= Math.floor((rect.y + rect.h) / s) + 1; ty++) {
      for (let tx = Math.floor(rect.x / s) - 1; tx <= Math.floor((rect.x + rect.w) / s) + 1; tx++) {
        const ch = tileAt(tx, ty);
        if (ch !== ".") cb(ch, tx, ty, { x: tx*s, y: ty*s, w: s, h: s });
      }
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }

  // ── Physics ────────────────────────────────────────────────
  function collideEntity(entity, dt) {
    entity.onGround = false;
    entity.x += entity.vx * dt;
    queryTiles(entity, (ch, tx, ty, r) => {
      if (!isSolid(ch) || !rectsOverlap(entity, r)) return;
      if (entity.vx > 0) entity.x = r.x - entity.w;
      if (entity.vx < 0) entity.x = r.x + r.w;
      entity.vx = 0;
    });
    entity.y += entity.vy * dt;
    queryTiles(entity, (ch, tx, ty, r) => {
      if (isSpike(ch) && rectsOverlap(entity, r)) { hurtPlayer(); return; }
      if (isGoal(ch)  && rectsOverlap(entity, r)) { winLevel();   return; }
      if (!isSolid(ch) || !rectsOverlap(entity, r)) return;
      if (entity.vy > 0) {
        entity.y = r.y - entity.h; entity.vy = 0;
        entity.onGround = true; entity.coyote = COYOTE_TIME;
        entity.usedDoubleJump = false; entity.dashReady = true;
      } else if (entity.vy < 0) {
        entity.y = r.y + r.h; entity.vy = 0;
        hitBlock(tx, ty, ch);
      }
    });
    if (entity.y > game.worldHeight + 400) hurtPlayer(true);
  }

  function hitBlock(tx, ty, ch) {
    if (ch === "?") {
      setTile(tx, ty, "X");
      game.score += 100;
      spawnPopup(tx * TILE + 10, ty * TILE - 10, "+100");
      spawnParticles(tx * TILE + TILE/2, ty * TILE + TILE/2, "#fbbf24", 10);
      beep("coin");
      // Bounce animation
      const key = tx + ',' + ty;
      blockAnims.set(key, { timer: 0.3, maxTimer: 0.3 });
    }
    if (ch === "B" && player.power.giant) {
      setTile(tx, ty, ".");
      game.score += 25;
      spawnPopup(tx * TILE + 4, ty * TILE - 10, "SMASH!");
      spawnParticles(tx * TILE + TILE/2, ty * TILE + TILE/2, "#a855f7", 18);
      screenShake = 10; beep("break");
    }
  }

  // ── Damage / win ───────────────────────────────────────────
  function hurtPlayer(fall = false) {
    if (mode !== "playing") return;
    if (KQ_SETTINGS.get('invincibleMode')) return;
    if (player.invincible > 0 && !fall) return;

    if (!fall && player.power.shield > 0) {
      player.power.shield--;
      player.invincible = 1.0; screenShake = 7;
      spawnPopup(player.x, player.y - 18, "Shield!");
      spawnParticles(player.x + player.w/2, player.y + player.h/2, "#22d3ee", 22);
      beep("hurt"); return;
    }

    if (!KQ_SETTINGS.get('infiniteLives')) game.lives--;
    screenShake = 16; player.hurtTimer = 0.4;
    player.invincible = KQ_SETTINGS.get('invincibleMode') ? 999 : 1.2;
    spawnParticles(player.x + player.w/2, player.y + player.h/2, "#ef4444", 24);
    beep("hurt");

    if (game.lives <= 0) { mode = "gameover"; return; }
    Object.assign(player, { x: Math.max(64, cameraX + 110), y: 120, vx: 0, vy: 0 });
  }

  function winLevel() {
    if (mode !== "playing") return;
    const LEVELS = window.KQ_LEVELS || [];
    game.score += 1000;
    beep("win");
    spawnPopup(player.x, player.y - 30, "Level Clear!");
    spawnParticles(player.x + player.w/2, player.y + player.h/2, "#facc15", 60);

    // Update highest unlocked
    if (levelIndex >= highestUnlocked) {
      highestUnlocked = levelIndex + 1;
      try { localStorage.setItem('kq_highest_unlocked', String(highestUnlocked)); } catch(e) {}
    }

    // Check for next level
    const next = levelIndex + 1;
    if (playtestReturnMode === 'editor') {
      setTimeout(() => {
        mode = 'editor';
        _showEditorPanel();
        playtestReturnMode = null;
      }, 1800);
      mode = 'win';
    } else if (next < LEVELS.length) {
      setTimeout(() => {
        levelIndex = next;
        resetLevel(false);
        mode = "playing";
      }, 1800);
      mode = "win";
    } else {
      mode = "win";
    }
  }

  // ── Power-ups ──────────────────────────────────────────────
  function collectPowerup(p) {
    if (p.taken) return;
    p.taken = true;
    if (p.type === "blaster")    player.power.blaster    = true;
    if (p.type === "shield")     player.power.shield     = Math.max(player.power.shield, 1);
    if (p.type === "doubleJump") player.power.doubleJump = true;
    if (p.type === "dash")       player.power.dash       = true;
    if (p.type === "giant")      { player.power.giant = true; player.w = 44; player.h = 54; }
    game.score += 250;
    spawnPopup(p.x - 8, p.y - 20, puName(p.type));
    spawnParticles(p.x + p.w/2, p.y + p.h/2, "#a78bfa", 30);
    screenShake = 7; beep("power");
  }

  function puName(t) {
    return { blaster:"Blaster!", shield:"Shield!", doubleJump:"Double Jump!", dash:"Dash!", giant:"Giant!" }[t] || "Power!";
  }

  // ── Projectiles ────────────────────────────────────────────
  function shoot() {
    if (!player.power.blaster) return;
    if (player.shootCooldown > 0) return;
    player.shootCooldown = 0.22;
    const p = {
      x: player.x + (player.dir > 0 ? player.w - 4 : -18),
      y: player.y + player.h * 0.42,
      w: 22, h: 14,
      vx: player.dir * 620 * KQ_SETTINGS.get('projectileSpeed'),
      life: 1.2, dir: player.dir
    };
    game.projectiles.push(p);
    beep("shoot");
    spawnParticles(p.x, p.y, "#38bdf8", 5);
  }

  // ── Particles / popups ─────────────────────────────────────
  function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, spd = 80 + Math.random() * 260;
      game.particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 80,
        r: 2 + Math.random()*4, color, life: 0.35 + Math.random()*0.5, maxLife: 0.85 });
    }
  }
  function spawnPopup(x, y, text) { game.popups.push({ x, y, text, life: 0.9 }); }

  // ── Update ─────────────────────────────────────────────────
  function updatePlayer(dt) {
    player.anim += dt;
    player.invincible     = Math.max(0, player.invincible - dt);
    player.hurtTimer      = Math.max(0, player.hurtTimer  - dt);
    player.shootCooldown  = Math.max(0, player.shootCooldown - dt);

    if (player.onGround) player.coyote = COYOTE_TIME;
    else player.coyote = Math.max(0, player.coyote - dt);

    const left     = pressed("left");
    const right    = pressed("right");
    const jumpDown = pressed("jump");
    const shootDown= pressed("shoot");
    const dashDown = pressed("dash");

    if (jumpDown && !player._jumpHeld) player.jumpBuffer = JUMP_BUFFER;
    player._jumpHeld = jumpDown;
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    let move = 0;
    if (left) move -= 1;
    if (right) move += 1;
    if (move !== 0) player.dir = move;

    const targetSpd = move * G_SPEED() * (player.power.giant ? 0.9 : 1);
    player.vx += (targetSpd - player.vx) * Math.min(1, 2100 * dt / G_SPEED());

    if (player.jumpBuffer > 0) {
      if (player.coyote > 0) {
        player.vy = -G_JUMP(); player.onGround = false;
        player.coyote = 0; player.jumpBuffer = 0;
        spawnParticles(player.x + player.w/2, player.y + player.h, "#ffffff", 8);
        beep("jump");
      } else if (player.power.doubleJump && !player.usedDoubleJump) {
        player.vy = -G_JUMP() * 0.88;
        player.usedDoubleJump = true; player.jumpBuffer = 0;
        spawnParticles(player.x + player.w/2, player.y + player.h/2, "#c4b5fd", 16);
        beep("jump");
      }
    }

    if (!jumpDown && player.vy < -180) player.vy += 1850 * dt;

    if (dashDown && !player._dashHeld && player.power.dash && player.dashReady) {
      player.dashTimer = 0.16; player.dashReady = false;
      player.vx = player.dir * 650; player.vy *= 0.35;
      screenShake = 5;
      spawnParticles(player.x + player.w/2, player.y + player.h/2, "#60a5fa", 22);
      beep("dash");
    }
    player._dashHeld = dashDown;

    if (shootDown && !player._shootHeld) shoot();
    player._shootHeld = shootDown;

    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      player.vy += G_GRAV() * dt * 0.25;
    } else {
      player.vy += G_GRAV() * dt;
    }

    player.vx *= Math.pow(0.0008, dt);
    collideEntity(player, dt);
    player.x = Math.max(0, Math.min(game.worldWidth - player.w, player.x));

    // Moving platform riding
    player._ridingPlatform = null;
    for (const mp of movingPlatforms) {
      const snapThresh = 8;
      const playerBottom = player.y + player.h;
      const onTop = playerBottom >= mp.y - snapThresh && playerBottom <= mp.y + snapThresh + 4 &&
                    player.x + player.w > mp.x && player.x < mp.x + mp.w &&
                    player.vy >= 0;
      if (onTop) {
        player.y = mp.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.coyote = COYOTE_TIME;
        player.usedDoubleJump = false;
        player.dashReady = true;
        player._ridingPlatform = mp;
      }
    }
    // If riding, carry horizontal/vertical movement
    if (player._ridingPlatform) {
      const mp = player._ridingPlatform;
      if (mp.axis === 'x') player.x += mp._vx * dt;
      else                  player.y += mp._vy * dt;
    }

    for (const c of coins) {
      if (!c.taken && rectsOverlap(player, c)) {
        c.taken = true; game.coins++; game.score += 50;
        spawnPopup(c.x, c.y - 18, "+50");
        spawnParticles(c.x + c.w/2, c.y + c.h/2, "#facc15", 12);
        beep("coin");
      }
    }
    for (const p of powerups) {
      if (!p.taken && rectsOverlap(player, p)) collectPowerup(p);
    }
    for (const e of enemies) {
      if (!e.alive || e.hurt > 0 || !rectsOverlap(player, e)) continue;
      const stomp = player.vy > 160 && player.y + player.h < e.y + e.h * 0.6;
      if (stomp) {
        e.alive = false; player.vy = -G_JUMP() * 0.55;
        game.score += 120;
        spawnPopup(e.x, e.y - 16, "+120");
        spawnParticles(e.x + e.w/2, e.y + e.h/2, "#fb923c", 18);
        beep("stomp");
      } else { hurtPlayer(); }
    }

    // Boss collision
    if (boss && boss.alive && rectsOverlap(player, boss)) {
      const stomp = player.vy > 160 && player.y + player.h < boss.y + boss.h * 0.45;
      if (stomp) {
        boss.hp--;
        player.vy = -G_JUMP() * 0.6;
        screenShake = 10;
        spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, "#dc2626", 16);
        beep("stomp");
        if (boss.hp <= 0) _defeatBoss();
      } else {
        hurtPlayer();
      }
    }
    // Boss projectile collision
    for (const p of game.projectiles) {
      if (p._bossShot && rectsOverlap(player, p)) {
        p.life = 0; hurtPlayer();
      }
    }
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      if (!e.alive) continue;

      if (e.type === 'jumper') {
        // Apply gravity
        e.vy = (e.vy || 0) + G_GRAV() * dt;
        e.y += e.vy * dt;
        // Ground collision via tiles
        const ty = Math.floor((e.y + e.h) / TILE);
        const tx = Math.floor((e.x + e.w / 2) / TILE);
        if (isSolid(tileAt(tx, ty))) {
          e.y = ty * TILE - e.h;
          e.vy = 0;
          e.onGround = true;
        } else {
          e.onGround = false;
        }
        // Also check moving platforms
        for (const mp of movingPlatforms) {
          const bottom = e.y + e.h;
          if (bottom >= mp.y - 4 && bottom <= mp.y + 8 &&
              e.x + e.w > mp.x && e.x < mp.x + mp.w && e.vy >= 0) {
            e.y = mp.y - e.h; e.vy = 0; e.onGround = true;
          }
        }
        // Small patrol sway
        e.x += (e.vx || 0) * dt;
        if (Math.abs(e.x - e.startX) > (e.patrol || 20)) e.vx = -(e.vx || 0) || G_ENEMY() * 0.3;
        if (!e.vx) e.vx = -G_ENEMY() * 0.3;
        // Jump toward player every ~2s
        e.jumpTimer = (e.jumpTimer || 2) - dt;
        if (e.jumpTimer <= 0 && e.onGround) {
          e.vy = -G_JUMP() * 0.8;
          e.jumpTimer = 1.8 + Math.random() * 0.8;
        }
      } else if (e.type === 'flyer') {
        // No gravity — patrol horizontally at spawn height
        e.x += e.vx * dt;
        e.y = e.startY;   // maintain spawn height
        if (Math.abs(e.x - e.startX) > e.patrol) e.vx *= -1;
        // Gentle bob
        e.y = e.startY + Math.sin(game.time * 2.5 + e.startX * 0.01) * 8;
      } else {
        // walker
        e.x += e.vx * dt;
        if (Math.abs(e.x - e.startX) > e.patrol) e.vx *= -1;
        const fX = e.vx > 0 ? e.x + e.w + 4 : e.x - 4;
        const head = worldToTile(fX, e.y + 8);
        const foot = worldToTile(fX, e.y + e.h + 8);
        if (isSolid(tileAt(head.tx, head.ty)) || !isSolid(tileAt(foot.tx, foot.ty))) e.vx *= -1;
      }
    }
  }

  function updateMovingPlatforms(dt) {
    for (const mp of movingPlatforms) {
      mp.t += dt;
      const prev = mp.axis === 'x' ? mp.x : mp.y;
      if (mp.axis === 'x') {
        mp.x = mp.ox + Math.sin(mp.t * mp.speed / mp.range) * mp.range;
        mp._vx = (mp.x - prev) / dt;
        mp._vy = 0;
      } else {
        mp.y = mp.oy + Math.sin(mp.t * mp.speed / mp.range) * mp.range;
        mp._vy = (mp.y - prev) / dt;
        mp._vx = 0;
      }
    }
  }

  function updateProjectiles(dt) {
    for (const p of game.projectiles) {
      p.x += p.vx * dt;
      if (p.vy !== undefined) p.y += p.vy * dt;
      p.life -= dt;
      let hitTile = false;
      if (p._bossShot) { /* boss shots pass through tiles */ }
      else queryTiles(p, (ch, tx, ty, r) => {
        if (!isSolid(ch) || !rectsOverlap(p, r)) return;
        hitTile = true;
        if (ch === "B") {
          setTile(tx, ty, "."); game.score += 20;
          spawnParticles(tx*TILE+TILE/2, ty*TILE+TILE/2, "#a855f7", 12);
          beep("break");
        }
      });
      if (hitTile) p.life = 0;
      for (const e of enemies) {
        if (e.alive && rectsOverlap(p, e)) {
          e.alive = false; p.life = 0; game.score += 100;
          spawnPopup(e.x, e.y - 18, "+100");
          spawnParticles(e.x + e.w/2, e.y + e.h/2, "#38bdf8", 16);
          beep("stomp");
        }
      }
      // Player projectile hits boss
      if (!p._bossShot && boss && boss.alive && rectsOverlap(p, boss)) {
        p.life = 0;
        boss.hp--;
        screenShake = 8;
        spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, "#dc2626", 14);
        beep("stomp");
        if (boss.hp <= 0) _defeatBoss();
      }
    }
    game.projectiles = game.projectiles.filter(p => p.life > 0);
  }

  // ── Boss ───────────────────────────────────────────────────
  function _spawnBoss() {
    if (bossSpawned) return;
    bossSpawned = true;
    boss = {
      x: game.worldWidth - 14 * 48,
      y: game.worldHeight - 12 * 48 + 48, // near floor
      w: 80, h: 80,
      hp: 5, maxHp: 5,
      vx: -200,
      shootTimer: 3,
      alive: true,
      anim: 0
    };
    spawnPopup(boss.x, boss.y - 40, "BOSS!");
    screenShake = 20;
    beep("power");
  }

  function _defeatBoss() {
    boss.alive = false;
    bossDefeated = true;
    game.score += 2000;
    spawnPopup(boss.x + boss.w/2 - 30, boss.y - 30, "+2000");
    spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, "#dc2626", 40);
    spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, "#fbbf24", 40);
    screenShake = 24;
    beep("win");
    // The flag tile is dynamically placed for level 3
    setTimeout(() => {
      if (currentLevel && currentLevel.id === 3) {
        // Find the F tile position from the map and ensure it triggers win
        // Place flag at near-boss location dynamically
        const flagCol = Math.floor((game.worldWidth - 3 * 48) / 48);
        const flagRow = 6; // same row as existing F in the level
        setTile(flagCol, flagRow, 'F');
        spawnPopup(flagCol * 48, flagRow * 48 - 30, "EXIT OPEN!");
      }
    }, 800);
  }

  function updateBoss(dt) {
    if (!boss || !boss.alive) return;
    boss.anim += dt;

    // Spawn trigger: player crosses threshold
    if (!bossSpawned) return; // won't reach here, but guard

    // Charge left/right
    boss.x += boss.vx * dt;
    // Bounce off walls
    if (boss.x <= game.worldWidth - 20 * 48) { boss.x = game.worldWidth - 20 * 48; boss.vx = 200; }
    if (boss.x + boss.w >= game.worldWidth - 1 * 48) { boss.x = game.worldWidth - 1 * 48 - boss.w; boss.vx = -200; }

    // Gravity — keep boss on floor
    boss.y += 800 * dt;
    const floorY = game.worldHeight - 5 * 48 - boss.h;
    // Find ground below boss using tile check
    const bCol = Math.floor((boss.x + boss.w/2) / 48);
    let groundY = game.worldHeight - boss.h;
    for (let tr = Math.floor(boss.y / 48); tr < map.length; tr++) {
      if (isSolid(tileAt(bCol, tr))) { groundY = tr * 48 - boss.h; break; }
    }
    if (boss.y >= groundY) boss.y = groundY;

    // Shoot toward player every 3 seconds
    boss.shootTimer -= dt;
    if (boss.shootTimer <= 0) {
      boss.shootTimer = 3;
      const dx = (player.x + player.w/2) - (boss.x + boss.w/2);
      const dy = (player.y + player.h/2) - (boss.y + boss.h/2);
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const spd = 180;
      for (let i = -1; i <= 1; i += 2) {
        game.projectiles.push({
          x: boss.x + boss.w/2 - 8,
          y: boss.y + boss.h/2 - 6,
          w: 18, h: 14,
          vx: (dx/len) * spd + i * 40,
          vy: (dy/len) * spd,
          life: 4,
          _bossShot: true
        });
      }
      beep("shoot");
    }
  }

  function drawBoss() {
    if (!boss || !boss.alive) return;
    const bx = boss.x - cameraX;
    // Body
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(bx, boss.y, boss.w, boss.h);
    // Eyes
    const eyeOff = Math.sin(boss.anim * 4) * 3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx + 14, boss.y + 18 + eyeOff, 14, 14);
    ctx.fillRect(bx + 52, boss.y + 18 + eyeOff, 14, 14);
    ctx.fillStyle = '#111';
    ctx.fillRect(bx + 18, boss.y + 22 + eyeOff, 8, 8);
    ctx.fillRect(bx + 56, boss.y + 22 + eyeOff, 8, 8);
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', bx + boss.w/2, boss.y + boss.h - 8);
    ctx.textAlign = 'left';

    // Boss health bar (at top-center of screen)
    ctx.save(); ctx.setTransform(1,0,0,1,0,0);
    const barW = 300, barH = 22;
    const barX = VIEW_W/2 - barW/2;
    const barY = 64;
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    _roundRect(barX - 8, barY - 6, barW + 16, barH + 20, 8); ctx.fill();
    ctx.fillStyle = '#374151';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(barX, barY, barW * (boss.hp / boss.maxHp), barH);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('👾 BOSS  ' + '❤️'.repeat(boss.hp) + '🖤'.repeat(boss.maxHp - boss.hp), VIEW_W/2, barY + 16);
    ctx.restore();
  }

  function updateEffects(dt) {
    screenShake = Math.max(0, screenShake - 50 * dt);
    for (const p of game.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 620 * dt; p.life -= dt;
    }
    game.particles = game.particles.filter(p => p.life > 0);
    for (const pop of game.popups) { pop.y -= 42 * dt; pop.life -= dt; }
    game.popups = game.popups.filter(p => p.life > 0);

    // Block bounce anims
    for (const [key, anim] of blockAnims) {
      anim.timer -= dt;
      if (anim.timer <= 0) blockAnims.delete(key);
    }
  }

  function updateCamera(dt) {
    const target = Math.max(0, Math.min(game.worldWidth - VIEW_W, player.x - VIEW_W * 0.42));
    cameraX += (target - cameraX) * Math.min(1, dt * 7.5);
  }

  // ── Space Shooter genre ────────────────────────────────────
  const SHOOTER_COLS = 10;
  const SHOOTER_ROWS = 4;
  const SHOOTER_SHIP_W = 48, SHOOTER_SHIP_H = 40;
  const SHOOTER_ENEMY_W = 40, SHOOTER_ENEMY_H = 34;

  function _shooterInit() {
    shooter.playerX  = VIEW_W / 2;
    shooter.shootCooldown = 0;
    shooter.autoShootTimer = 0;
    shooter.wave     = 0;
    shooter.waveTimer = 0;
    shooter.formDir  = 1;
    shooter.bossActive = false;
    shooter.enemies  = [];
    shooter.lives    = KQ_SETTINGS.get('infiniteLives') ? 99 : KQ_SETTINGS.get('startLives');
    shooter.score    = 0;
    game.projectiles = [];
    game.particles   = [];
    game.popups      = [];

    // Init star field once
    if (shooter.stars.length === 0) {
      for (let i = 0; i < 120; i++) {
        shooter.stars.push({
          x: Math.random() * VIEW_W,
          y: Math.random() * VIEW_H,
          r: Math.random() * 1.8 + 0.3,
          speed: Math.random() * 60 + 20,
          bright: Math.random()
        });
      }
    }
    _shooterSpawnWave();
    showHint('shooter', [
      '🚀 You are the SPACESHIP at the bottom!',
      'Move: Arrow Keys or A/D     Shoot: X or Space',
      '',
      '🎨 Art tip: Your HERO picture becomes the ship.',
      'Try drawing it pointing UP for best results!',
      '👾 BAD GUYS use your enemy pictures — draw them',
      'from ABOVE like you\'re looking down from space.',
      '',
      '       Tap or press any key to close this tip',
    ]);
  }

  function _shooterSpawnWave() {
    const TOTAL_WAVES = 5;
    if (shooter.wave >= TOTAL_WAVES) {
      // Boss wave
      shooter.bossActive = true;
      shooter.bossHp = 20;
      shooter.bossX = VIEW_W / 2 - 50;
      shooter.bossY = 60;
      shooter.bossVx = 120;
      shooter.bossShootTimer = 1.5;
      return;
    }
    shooter.enemies = [];
    const startX = 80, startY = 60;
    const gapX = 56, gapY = 48;
    for (let row = 0; row < SHOOTER_ROWS; row++) {
      for (let col = 0; col < SHOOTER_COLS; col++) {
        shooter.enemies.push({
          x: startX + col * gapX,
          y: startY + row * gapY,
          w: SHOOTER_ENEMY_W, h: SHOOTER_ENEMY_H,
          alive: true, hp: 1,
          shootTimer: 3 + Math.random() * 4,
          divingTo: null,
          bobOffset: Math.random() * Math.PI * 2,
          type: row === 0 ? 'flyer' : row < 2 ? 'jumper' : 'walker',
        });
      }
    }
    shooter.formDir = 1;
    shooter.waveTimer = 0;
  }

  function updateShooter(dt) {
    shooter.waveTimer += dt;

    // Stars scroll
    for (const s of shooter.stars) {
      s.y += s.speed * dt;
      if (s.y > VIEW_H) { s.y = 0; s.x = Math.random() * VIEW_W; }
    }

    // Player movement
    const shipSpeed = 320 * KQ_SETTINGS.get('speedMult');
    if (pressed('left'))  shooter.playerX -= shipSpeed * dt;
    if (pressed('right')) shooter.playerX += shipSpeed * dt;
    shooter.playerX = Math.max(SHOOTER_SHIP_W/2, Math.min(VIEW_W - SHOOTER_SHIP_W/2, shooter.playerX));

    // Player shooting — auto every 0.35s if fire held, or tap
    shooter.autoShootTimer -= dt;
    shooter.shootCooldown  -= dt;
    const firePressing = pressed('jump') || pressed('shoot');
    if (firePressing && shooter.shootCooldown <= 0) {
      _shooterFirePlayer();
      shooter.shootCooldown = 0.22;
    }
    // Auto-fire if nothing pressed every 1.2s (casual mode for young kids)
    if (!firePressing && shooter.autoShootTimer <= 0) {
      _shooterFirePlayer();
      shooter.autoShootTimer = 1.4;
    }

    // Move formation
    const aliveEnemies = shooter.enemies.filter(e => e.alive);

    if (!shooter.bossActive) {
      // Find formation bounds
      const xs = aliveEnemies.map(e => e.x);
      const minX = xs.length ? Math.min(...xs) : 0;
      const maxX = xs.length ? Math.max(...xs) + SHOOTER_ENEMY_W : VIEW_W;
      const formSpeed = (40 + shooter.wave * 10) * KQ_SETTINGS.get('enemySpeedMult');

      // March sideways
      for (const e of shooter.enemies) {
        if (!e.alive) continue;
        e.x += shooter.formDir * formSpeed * dt;
        // Bob vertically
        e.y += Math.sin(shooter.waveTimer * 2 + e.bobOffset) * 18 * dt;
      }
      // Bounce formation
      if ((shooter.formDir > 0 && maxX > VIEW_W - 10) ||
          (shooter.formDir < 0 && minX < 10)) {
        shooter.formDir *= -1;
        for (const e of shooter.enemies) { if (e.alive) e.y += 12; }
      }

      // Enemy shooting
      for (const e of aliveEnemies) {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2 + Math.random() * 3;
          game.projectiles.push({
            x: e.x + e.w/2 - 4, y: e.y + e.h,
            w: 8, h: 16, dir: 1,
            vy: 280 * KQ_SETTINGS.get('projectileSpeed'),
            _enemyShot: true,
          });
        }
      }

      // Wave clear
      if (aliveEnemies.length === 0) {
        shooter.wave++;
        shooter.waveTimer = 0;
        _shooterSpawnWave();
        beep('win');
      }
    } else {
      // Boss movement
      shooter.bossX += shooter.bossVx * dt;
      if (shooter.bossX < 20 || shooter.bossX > VIEW_W - 120) shooter.bossVx *= -1;
      shooter.bossY += Math.sin(shooter.waveTimer * 1.5) * 30 * dt;

      // Boss shooting
      shooter.bossShootTimer -= dt;
      if (shooter.bossShootTimer <= 0) {
        shooter.bossShootTimer = 0.9;
        const bx = shooter.bossX + 50;
        const by = shooter.bossY + 80;
        // Spread shot
        for (const angle of [-0.3, 0, 0.3]) {
          game.projectiles.push({
            x: bx - 4, y: by,
            w: 10, h: 18, dir: 1,
            vx: Math.sin(angle) * 200,
            vy: Math.cos(angle) * 260 * KQ_SETTINGS.get('projectileSpeed'),
            _enemyShot: true,
          });
        }
      }
    }

    // Update projectiles
    for (const p of game.projectiles) {
      p.x += (p.vx || 0) * dt;
      p.y += p.vy * (p.dir || 1) * dt;
    }

    // Player projectile hits enemies
    const playerShots = game.projectiles.filter(p => !p._enemyShot);
    for (const shot of playerShots) {
      if (shot._dead) continue;
      if (shooter.bossActive && shooter.bossHp > 0) {
        if (shot.x > shooter.bossX && shot.x < shooter.bossX + 100 &&
            shot.y > shooter.bossY && shot.y < shooter.bossY + 80) {
          shot._dead = true;
          shooter.bossHp--;
          screenShake = 6;
          beep('hurt');
          spawnParticles(shooter.bossX + 50, shooter.bossY + 40, '#f97316', 6);
          if (shooter.bossHp <= 0) {
            spawnParticles(shooter.bossX + 50, shooter.bossY + 40, '#fbbf24', 20);
            shooter.bossActive = false;
            mode = 'win';
            beep('win');
          }
        }
        continue;
      }
      for (const e of shooter.enemies) {
        if (!e.alive || shot._dead) continue;
        if (shot.x > e.x && shot.x < e.x + e.w && shot.y > e.y && shot.y < e.y + e.h) {
          shot._dead = true;
          e.alive = false;
          shooter.score += 100;
          game.score = shooter.score;
          beep('stomp');
          spawnParticles(e.x + e.w/2, e.y + e.h/2, '#f97316', 5);
          game.popups.push({ text: '+100', x: e.x + e.w/2, y: e.y, life: 0.8 });
        }
      }
    }

    // Enemy projectile hits player
    if (!KQ_SETTINGS.get('invincibleMode')) {
      const playerShipRect = {
        x: shooter.playerX - SHOOTER_SHIP_W/2,
        y: VIEW_H - SHOOTER_SHIP_H - 16,
        w: SHOOTER_SHIP_W, h: SHOOTER_SHIP_H
      };
      for (const p of game.projectiles) {
        if (!p._enemyShot || p._dead) continue;
        if (p.x > playerShipRect.x && p.x < playerShipRect.x + playerShipRect.w &&
            p.y > playerShipRect.y && p.y < playerShipRect.y + playerShipRect.h) {
          p._dead = true;
          shooter.lives--;
          screenShake = 10;
          beep('hurt');
          spawnParticles(shooter.playerX, VIEW_H - SHOOTER_SHIP_H - 16, '#ef4444', 8);
          if (shooter.lives <= 0) { mode = 'gameover'; }
        }
      }
    }

    // Cull dead/offscreen projectiles
    game.projectiles = game.projectiles.filter(p => !p._dead && p.y > -40 && p.y < VIEW_H + 40);
    updateEffects(dt);
  }

  function renderShooter() {
    // Star field bg
    const ASSETS = window.KQ_ASSETS || {};
    if (!drawImg((ASSETS.backgrounds||{}).bg_cave, 0, 0, VIEW_W, VIEW_H)) {
      ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      for (const s of shooter.stars) {
        ctx.globalAlpha = 0.4 + s.bright * 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Enemy formation
    for (const e of shooter.enemies) {
      if (!e.alive) continue;
      const tint = e.type === 'flyer' ? KQ_SETTINGS.get('tintFlyer') :
                   e.type === 'jumper' ? KQ_SETTINGS.get('tintJumper') :
                   KQ_SETTINGS.get('tintWalker');
      const assetKey = (ASSETS.enemies||{})[e.type];
      drawWithTint(tint, e.x, e.y, e.w, e.h, () => {
        if (!drawImg(assetKey, e.x, e.y, e.w, e.h)) {
          const colors = { walker: '#fb923c', jumper: '#f97316', flyer: '#c084fc' };
          ctx.fillStyle = colors[e.type] || '#fb923c';
          ctx.fillRect(e.x, e.y, e.w, e.h);
          // Simple alien eyes
          ctx.fillStyle = '#111';
          ctx.fillRect(e.x + 8, e.y + 10, 6, 6);
          ctx.fillRect(e.x + e.w - 14, e.y + 10, 6, 6);
        }
      });
    }

    // Boss
    if (shooter.bossActive && shooter.bossHp > 0) {
      const bx = shooter.bossX, by = shooter.bossY;
      if (!drawImg((ASSETS.enemies||{}).walker, bx, by, 100, 80)) {
        ctx.fillStyle = '#dc2626'; ctx.fillRect(bx, by, 100, 80);
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx + 15, by + 20, 14, 14);
        ctx.fillRect(bx + 71, by + 20, 14, 14);
        ctx.fillStyle = '#111'; ctx.fillRect(bx + 19, by + 24, 6, 6);
        ctx.fillRect(bx + 75, by + 24, 6, 6);
      }
      // Boss health bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(VIEW_W/2 - 120, 14, 240, 18);
      const pct = shooter.bossHp / 20;
      ctx.fillStyle = `hsl(${pct * 120},80%,45%)`;
      ctx.fillRect(VIEW_W/2 - 118, 16, 236 * pct, 14);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('👾 BOSS', VIEW_W/2, 27);
    }

    // Projectiles
    for (const p of game.projectiles) {
      if (p._enemyShot) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI*2); ctx.fill();
      } else if (!drawImg(ASSETS.projectile, p.x, p.y, p.w, p.h)) {
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }

    // Player ship
    const px = shooter.playerX - SHOOTER_SHIP_W/2;
    const py = VIEW_H - SHOOTER_SHIP_H - 16;
    const playerTint = KQ_SETTINGS.get('tintPlayer');
    drawWithTint(playerTint, px, py, SHOOTER_SHIP_W, SHOOTER_SHIP_H, () => {
      if (!drawImg((ASSETS.player||{}).idle, px, py, SHOOTER_SHIP_W, SHOOTER_SHIP_H)) {
        // Draw a simple ship shape
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.moveTo(px + SHOOTER_SHIP_W/2, py);
        ctx.lineTo(px + SHOOTER_SHIP_W, py + SHOOTER_SHIP_H);
        ctx.lineTo(px, py + SHOOTER_SHIP_H);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(px + SHOOTER_SHIP_W/2 - 5, py + 10, 10, 16);
        // Exhaust flame
        ctx.fillStyle = `hsl(${30 + Math.random()*30},100%,60%)`;
        ctx.fillRect(px + SHOOTER_SHIP_W/2 - 6, py + SHOOTER_SHIP_H, 12, 8 + Math.random()*6);
      }
    });

    // Effects
    drawEffects();

    // HUD
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`⭐ ${shooter.score}`, 16, 28);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`❤️ ${shooter.lives}`, 16, 52);
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px system-ui';
    ctx.fillText(`Wave ${shooter.wave + 1}`, VIEW_W - 80, 28);

    // Gameover / win overlay
    if (mode === 'gameover') drawOverlay('Game Over!', `Score: ${shooter.score}`, 'Press Enter or Tap to Try Again');
    if (mode === 'win') drawOverlay('You Win! 🎉', `Score: ${shooter.score}`, 'Press Enter or Tap to Play Again');
  }

  function _shooterFirePlayer() {
    const px = shooter.playerX;
    const py = VIEW_H - SHOOTER_SHIP_H - 16;
    const spd = 580 * KQ_SETTINGS.get('projectileSpeed');
    game.projectiles.push({ x: px - 4, y: py, w: 8, h: 18, dir: -1, vy: spd, vx: 0 });
    beep('shoot');
  }

  // ── Beat-em-up genre state ─────────────────────────────────
  const brawler = {
    playerX: 160,
    playerY: 320,       // Y = depth lane (180 top = far, 420 bottom = near)
    playerVx: 0, playerVy: 0,
    playerDir: 1,       // 1=right, -1=left
    playerAnim: 0,
    punchTimer: 0,       // active punch hitbox timer
    punchCooldown: 0,
    jumpVy: 0, jumpZ: 0, onGround: true, // Z = height above ground for jump
    lives: 3,
    score: 0,
    wave: 0,
    waveTimer: 3,        // countdown before first wave
    waveClearing: false,
    enemies: [],
    scrollX: 0,          // world scroll (background pans right as you progress)
    scrollTarget: 0,
    hurtTimer: 0,
    invTimer: 0,
    bossActive: false,
    bossHp: 0, bossMaxHp: 30,
    bossX: 700, bossY: 300,
    bossDir: -1, bossAnim: 0,
    bossPunchTimer: 0, bossMoveTimer: 0,
  };

  const BRAWLER_LANE_TOP    = 185;
  const BRAWLER_LANE_BOTTOM = 410;
  const BRAWLER_GROUND_Y    = 400; // reference ground for shadow
  const BRAWLER_TOTAL_WAVES = 5;
  const BRAWLER_PUNCH_REACH = 72;
  const BRAWLER_PUNCH_W     = 60;
  const BRAWLER_PUNCH_H     = 44;

  function _brawlerInit() {
    Object.assign(brawler, {
      playerX: 160, playerY: 320,
      playerVx: 0, playerVy: 0, playerDir: 1, playerAnim: 0,
      punchTimer: 0, punchCooldown: 0,
      jumpVy: 0, jumpZ: 0, onGround: true,
      lives: KQ_SETTINGS.get('infiniteLives') ? 99 : KQ_SETTINGS.get('startLives'),
      score: 0, wave: 0, waveTimer: 2.5, waveClearing: false,
      enemies: [], scrollX: 0, scrollTarget: 0,
      hurtTimer: 0, invTimer: 0,
      bossActive: false, bossHp: 30,
      bossX: 900, bossY: 300, bossDir: -1, bossAnim: 0,
      bossPunchTimer: 0, bossMoveTimer: 1,
    });
    game.particles = []; game.popups = []; game.projectiles = [];
    game.score = 0;
    showHint('brawler', [
      '👊 Beat-em-up mode! Punch enemies to defeat them!',
      '',
      'Move:  Arrow Keys / WASD      Punch: X or B button',
      'Jump:  Space / Up             Jump-kick: Jump then Punch!',
      '',
      '🎨 Art tip: Your HERO is seen from the SIDE.',
      'Draw them facing RIGHT for best results!',
      '👾 Enemies walk toward you — stomp or punch them!',
      '',
      '      Tap or press any key to close this tip',
    ]);
  }

  function _brawlerSpawnWave() {
    const count = 2 + brawler.wave;
    const types = ['walker', 'jumper', 'flyer'];
    brawler.enemies = [];
    for (let i = 0; i < count; i++) {
      const side = Math.random() < 0.5 ? 1 : -1;
      const type = types[Math.min(brawler.wave, 2)];
      brawler.enemies.push({
        x: side > 0 ? VIEW_W + 40 + i * 60 : -80 - i * 60,
        y: BRAWLER_LANE_TOP + Math.random() * (BRAWLER_LANE_BOTTOM - BRAWLER_LANE_TOP - 50),
        w: 44, h: 50,
        hp: type === 'flyer' ? 2 : 1,
        alive: true, dir: -side,
        vx: 0, jumpZ: 0, jumpVy: 0, onGround: true,
        hurtTimer: 0, attackTimer: 1.5 + Math.random() * 2,
        type,
      });
    }
  }

  function updateBrawler(dt) {
    brawler.playerAnim += dt;
    brawler.punchTimer    = Math.max(0, brawler.punchTimer    - dt);
    brawler.punchCooldown = Math.max(0, brawler.punchCooldown - dt);
    brawler.hurtTimer     = Math.max(0, brawler.hurtTimer     - dt);
    brawler.invTimer      = Math.max(0, brawler.invTimer      - dt);

    // Wave spawn countdown
    if (brawler.waveTimer > 0) {
      brawler.waveTimer -= dt;
      if (brawler.waveTimer <= 0 && !brawler.bossActive) _brawlerSpawnWave();
    }

    // Player movement
    const spd = 220 * KQ_SETTINGS.get('speedMult');
    let mvx = 0, mvy = 0;
    if (pressed('left'))  { mvx = -spd; brawler.playerDir = -1; }
    if (pressed('right')) { mvx =  spd; brawler.playerDir =  1; }
    if (pressed('jump') && !brawler._jumpHeld) {
      if (brawler.onGround) { brawler.jumpVy = -520 * KQ_SETTINGS.get('jumpMult'); brawler.onGround = false; beep('jump'); }
      brawler._jumpHeld = true;
    }
    if (!pressed('jump')) brawler._jumpHeld = false;

    // Lane (depth) movement — up/down moves into/out of the screen
    if (pressed('up') && !pressed('jump'))   mvy = -spd * 0.55;
    if (pressed('down')) mvy =  spd * 0.55;

    brawler.playerX += mvx * dt;
    brawler.playerY += mvy * dt;

    // Jump physics (Z axis)
    if (!brawler.onGround) {
      brawler.jumpVy += 1400 * dt;
      brawler.jumpZ  += brawler.jumpVy * dt;
      if (brawler.jumpZ >= 0) { brawler.jumpZ = 0; brawler.jumpVy = 0; brawler.onGround = true; }
    }

    // Clamp to arena
    brawler.playerX = Math.max(40, Math.min(VIEW_W - 80, brawler.playerX));
    brawler.playerY = Math.max(BRAWLER_LANE_TOP + 20, Math.min(BRAWLER_LANE_BOTTOM - 10, brawler.playerY));

    // Punch
    if ((pressed('shoot') || pressed('dash')) && brawler.punchCooldown <= 0) {
      brawler.punchTimer    = 0.18;
      brawler.punchCooldown = 0.38;
      beep('shoot');
    }

    // Punch hitbox check
    if (brawler.punchTimer > 0) {
      const phx = brawler.playerX + (brawler.playerDir > 0 ? 36 : -BRAWLER_PUNCH_W - 10);
      const phy = brawler.playerY + brawler.jumpZ - BRAWLER_PUNCH_H / 2;
      for (const e of brawler.enemies) {
        if (!e.alive) continue;
        if (_brawlerOverlap(phx, phy, BRAWLER_PUNCH_W, BRAWLER_PUNCH_H, e.x, e.y + e.jumpZ, e.w, e.h)) {
          e.hp--;
          e.hurtTimer = 0.25;
          spawnParticles(e.x + e.w/2, e.y + e.jumpZ, '#ef4444', 4);
          beep('stomp');
          if (e.hp <= 0) {
            e.alive = false;
            brawler.score += 200;
            game.score = brawler.score;
            game.popups.push({ text: '+200', x: e.x + e.w/2, y: e.y, life: 0.8 });
          }
        }
      }
      // Boss punch
      if (brawler.bossActive && brawler.bossHp > 0) {
        if (_brawlerOverlap(phx, phy, BRAWLER_PUNCH_W, BRAWLER_PUNCH_H,
            brawler.bossX, brawler.bossY, 64, 72)) {
          brawler.bossHp--;
          screenShake = 5;
          spawnParticles(brawler.bossX + 32, brawler.bossY + 36, '#f97316', 6);
          beep('hurt');
          if (brawler.bossHp <= 0) {
            brawler.bossActive = false;
            mode = 'win'; beep('win');
            spawnParticles(brawler.bossX + 32, brawler.bossY + 36, '#fbbf24', 20);
          }
        }
      }
    }

    // Update enemies
    for (const e of brawler.enemies) {
      if (!e.alive) continue;
      e.hurtTimer = Math.max(0, e.hurtTimer - dt);
      e.attackTimer -= dt;

      // Move toward player
      const tx = brawler.playerX - e.w/2 - (e.w/2);
      const ty = brawler.playerY - e.h/2;
      const dx = tx - e.x, dy = ty - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const espd = G_ENEMY() * 1.2;
      if (dist > 8) {
        e.x += (dx/dist) * espd * dt;
        e.y += (dy/dist) * espd * 0.6 * dt;
        e.dir = dx > 0 ? 1 : -1;
      }

      // Jumper type: occasional jump
      if (e.type === 'jumper' && e.onGround && Math.random() < dt * 1.2) {
        e.jumpVy = -400; e.onGround = false;
      }
      if (e.jumpVy !== 0 || !e.onGround) {
        e.jumpVy = (e.jumpVy || 0) + 1200 * dt;
        e.jumpZ  = (e.jumpZ  || 0) + e.jumpVy * dt;
        if (e.jumpZ >= 0) { e.jumpZ = 0; e.jumpVy = 0; e.onGround = true; }
      }

      // Clamp to arena
      e.y = Math.max(BRAWLER_LANE_TOP, Math.min(BRAWLER_LANE_BOTTOM - e.h, e.y));

      // Enemy attacks player
      if (e.attackTimer <= 0 && brawler.invTimer <= 0 && !KQ_SETTINGS.get('invincibleMode')) {
        if (dist < 55) {
          e.attackTimer = 1.2 + Math.random();
          brawler.hurtTimer = 0.3;
          brawler.invTimer  = 1.2;
          brawler.lives--;
          screenShake = 8;
          beep('hurt');
          if (brawler.lives <= 0) mode = 'gameover';
        } else {
          e.attackTimer = 0.3;
        }
      }
    }

    // Boss AI
    if (brawler.bossActive && brawler.bossHp > 0) {
      brawler.bossMoveTimer -= dt;
      brawler.bossPunchTimer -= dt;
      const bspd = 110 * KQ_SETTINGS.get('enemySpeedMult');
      const bdx = brawler.playerX - brawler.bossX;
      const bdy = brawler.playerY - brawler.bossY;
      const bdist = Math.sqrt(bdx*bdx + bdy*bdy) || 1;
      brawler.bossDir = bdx > 0 ? 1 : -1;
      brawler.bossAnim += dt;

      if (brawler.bossMoveTimer <= 0 && bdist > 70) {
        brawler.bossX += (bdx/bdist) * bspd * dt;
        brawler.bossY += (bdy/bdist) * bspd * 0.6 * dt;
        brawler.bossY = Math.max(BRAWLER_LANE_TOP, Math.min(BRAWLER_LANE_BOTTOM - 72, brawler.bossY));
      }
      if (brawler.bossMoveTimer <= -1.5) brawler.bossMoveTimer = 0.8 + Math.random();

      if (brawler.bossPunchTimer <= 0 && bdist < 80 && brawler.invTimer <= 0 && !KQ_SETTINGS.get('invincibleMode')) {
        brawler.bossPunchTimer = 1.4;
        brawler.invTimer = 1.0;
        brawler.hurtTimer = 0.3;
        brawler.lives--;
        screenShake = 10;
        beep('hurt');
        if (brawler.lives <= 0) mode = 'gameover';
      }
    }

    // Scroll world right as you clear the screen
    brawler.scrollX += (brawler.scrollTarget - brawler.scrollX) * Math.min(1, dt * 3);

    // Wave clear check
    const alive = brawler.enemies.filter(e => e.alive);
    if (!brawler.waveClearing && brawler.waveTimer <= 0 && alive.length === 0 && !brawler.bossActive) {
      brawler.waveClearing = true;
      brawler.wave++;
      brawler.scrollTarget += 200;
      if (brawler.wave >= BRAWLER_TOTAL_WAVES) {
        // Spawn boss
        brawler.bossActive = true;
        brawler.bossHp = brawler.bossMaxHp;
        brawler.bossX = VIEW_W + 40;
        brawler.bossY = 300;
        brawler.waveClearing = false;
      } else {
        setTimeout(() => {
          brawler.waveTimer = 2.5;
          brawler.waveClearing = false;
        }, 1200);
      }
    }

    updateEffects(dt);
  }

  function _brawlerOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
  }

  function renderBrawler() {
    const ASSETS = window.KQ_ASSETS || {};

    // Scrolling background
    const bgDrawn = drawImg((ASSETS.backgrounds||{}).bg_meadow, -brawler.scrollX % VIEW_W, 0, VIEW_W, VIEW_H);
    if (!bgDrawn) {
      // Painted city/street fallback
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, '#1e1b4b'); sky.addColorStop(0.55, '#312e81'); sky.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // Ground
      ctx.fillStyle = '#374151'; ctx.fillRect(0, BRAWLER_LANE_BOTTOM - 20, VIEW_W, VIEW_H);
      ctx.fillStyle = '#4b5563'; ctx.fillRect(0, BRAWLER_LANE_BOTTOM - 22, VIEW_W, 4);
      // Background "buildings"
      const bldOffset = brawler.scrollX * 0.3;
      for (let i = 0; i < 8; i++) {
        const bx = ((i * 140 - bldOffset) % (VIEW_W + 140) + VIEW_W + 140) % (VIEW_W + 140) - 140;
        const bh = 80 + (i % 3) * 40;
        ctx.fillStyle = `hsl(${220 + i*8},30%,${14 + i%3*4}%)`;
        ctx.fillRect(bx, BRAWLER_LANE_TOP - bh, 120, bh);
        // windows
        ctx.fillStyle = `rgba(251,191,36,0.${Math.floor(game.time * 2 + i) % 4 > 1 ? 5 : 2})`;
        for (let wy = 0; wy < 3; wy++)
          for (let wx = 0; wx < 3; wx++)
            ctx.fillRect(bx + 14 + wx*32, BRAWLER_LANE_TOP - bh + 16 + wy*22, 16, 12);
      }
    }

    // Lane lines (depth guide)
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, BRAWLER_LANE_TOP); ctx.lineTo(VIEW_W, BRAWLER_LANE_TOP); ctx.stroke();

    // Sort by Y for depth order (back-to-front)
    const drawables = [];
    if (brawler.bossActive && brawler.bossHp > 0)
      drawables.push({ type: 'boss', sortY: brawler.bossY + 72 });
    for (const e of brawler.enemies) {
      if (e.alive) drawables.push({ type: 'enemy', e, sortY: e.y + e.h + (e.jumpZ||0) });
    }
    drawables.push({ type: 'player', sortY: brawler.playerY + 50 + brawler.jumpZ });
    drawables.sort((a, b) => a.sortY - b.sortY);

    for (const d of drawables) {
      if (d.type === 'player') {
        const px = brawler.playerX;
        const py = brawler.playerY + brawler.jumpZ;
        const flip = brawler.playerDir < 0;
        const pw = 40, ph = 52;

        // Shadow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(px, brawler.playerY + 2, 20, 7, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = brawler.invTimer > 0 && Math.floor(game.time * 12) % 2 ? 0.4 : 1;

        const pTint = KQ_SETTINGS.get('tintPlayer');
        let frame = (ASSETS.player||{}).idle;
        if (brawler.punchTimer > 0) frame = (ASSETS.player||{}).hurt;
        else if (!brawler.onGround) frame = (ASSETS.player||{}).jump;
        else if (brawler.playerVx !== 0 || pressed('left') || pressed('right'))
          frame = Math.floor(brawler.playerAnim * 8) % 2 === 0 ? (ASSETS.player||{}).run1 : (ASSETS.player||{}).run2;

        drawWithTint(pTint, px - pw/2, py - ph, pw, ph, () => {
          if (!drawImg(frame, px - pw/2, py - ph, pw, ph, { flip })) {
            ctx.fillStyle = '#2563eb'; ctx.fillRect(px - pw/2, py - ph, pw, ph);
            ctx.fillStyle = '#fff'; ctx.fillRect(px + (flip ? -4 : 14), py - ph + 12, 8, 8);
          }
        });

        // Punch flash
        if (brawler.punchTimer > 0) {
          const fx = px + (flip ? -BRAWLER_PUNCH_REACH - 10 : 16);
          ctx.globalAlpha = 0.7; ctx.fillStyle = '#fbbf24';
          ctx.beginPath(); ctx.arc(fx, py - ph/2, 18, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('POW!', fx, py - ph/2 + 5);
        }
        ctx.globalAlpha = 1;

      } else if (d.type === 'enemy') {
        const e = d.e;
        const ex = e.x, ey = e.y + (e.jumpZ||0);
        const tint = e.type === 'flyer' ? KQ_SETTINGS.get('tintFlyer')
                   : e.type === 'jumper' ? KQ_SETTINGS.get('tintJumper')
                   : KQ_SETTINGS.get('tintWalker');
        const colors = { walker: '#fb923c', jumper: '#f97316', flyer: '#c084fc' };

        // Shadow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(ex + e.w/2, e.y + e.h + 2, e.w/2, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = e.hurtTimer > 0 ? 0.5 : 1;

        const assetKey = (ASSETS.enemies||{})[e.type];
        drawWithTint(tint, ex, ey - e.h/2, e.w, e.h, () => {
          if (!drawImg(assetKey, ex, ey - e.h/2, e.w, e.h, { flip: e.dir < 0 })) {
            ctx.fillStyle = colors[e.type] || '#fb923c';
            ctx.fillRect(ex, ey - e.h/2, e.w, e.h);
            ctx.fillStyle = '#111'; ctx.fillRect(ex + (e.dir > 0 ? 24 : 8), ey - e.h/2 + 12, 7, 7);
          }
        });
        ctx.globalAlpha = 1;

      } else if (d.type === 'boss') {
        const bw = 64, bh = 72;
        const bx = brawler.bossX, by = brawler.bossY;
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(bx + bw/2, by + bh + 2, bw/2, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        if (!drawImg((ASSETS.enemies||{}).walker, bx, by, bw, bh, { flip: brawler.bossDir < 0 })) {
          ctx.fillStyle = '#dc2626'; ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = '#111';
          ctx.fillRect(bx + (brawler.bossDir > 0 ? 38 : 12), by + 16, 10, 10);
          // Crown
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(bx + 10, by - 10, 44, 12);
          ctx.fillRect(bx + 14, by - 20, 10, 12);
          ctx.fillRect(bx + 30, by - 20, 10, 12);
          ctx.fillRect(bx + 46, by - 18, 8, 10);
        }
        // Boss HP bar
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(VIEW_W/2-120, 14, 240, 18);
        const pct = brawler.bossHp / brawler.bossMaxHp;
        ctx.fillStyle = `hsl(${pct*120},80%,45%)`; ctx.fillRect(VIEW_W/2-118, 16, 236*pct, 14);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('👊 BOSS', VIEW_W/2, 27);
      }
    }

    drawEffects();

    // Wave announcement
    if (brawler.waveTimer > 0 && brawler.wave < BRAWLER_TOTAL_WAVES) {
      ctx.save(); ctx.globalAlpha = Math.min(1, brawler.waveTimer);
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 36px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`Wave ${brawler.wave + 1}!`, VIEW_W/2, VIEW_H/2 - 20);
      ctx.font = '18px system-ui'; ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Get ready…', VIEW_W/2, VIEW_H/2 + 16);
      ctx.restore();
    }

    // HUD
    ctx.textAlign = 'left'; ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = '#fbbf24'; ctx.fillText(`⭐ ${brawler.score}`, 16, 28);
    ctx.fillStyle = '#ef4444'; ctx.fillText(`❤️ ${brawler.lives}`, 16, 52);
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(`Wave ${Math.min(brawler.wave+1, BRAWLER_TOTAL_WAVES+1)} / ${BRAWLER_TOTAL_WAVES+1}`, VIEW_W - 16, 28);

    if (mode === 'gameover') drawOverlay('Game Over!', `Score: ${brawler.score}`, 'Press Enter or Tap to Try Again');
    if (mode === 'win')      drawOverlay('You Win! 🎉', `Score: ${brawler.score}`, 'Press Enter or Tap to Play Again');
  }

  // ── Metroidvania genre state ───────────────────────────────
  // Side-view explore-and-unlock: grab the double-jump to reach the
  // key, the key opens the gate, the gate leads to the exit.
  const metroid = {
    grid: [], cols: 0, rows: 0, worldW: 0, worldH: 0,
    px: 0, py: 0, vx: 0, vy: 0, dir: 1, anim: 0,
    onGround: false, jumpsLeft: 1, jumpHeld: false,
    hasDoubleJump: false, hasKey: false, doorOpen: false,
    items: [], enemies: [], goal: null,
    camX: 0, camY: 0,
    lives: 3, score: 0, hurtTimer: 0, invTimer: 0,
  };
  const M_PW = 40, M_PH = 56;   // player hitbox
  const M_SOLID = 1, M_DOOR = 2, M_SPIKE = 3;

  function _metroidBuildMap() {
    const COLS = 48, ROWS = 16;
    const g = [];
    for (let y = 0; y < ROWS; y++) g.push(new Array(COLS).fill(0));
    const fill = (x0, y0, x1, y1, v) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = v;
    };
    fill(0, 14, COLS - 1, 15, M_SOLID);   // floor
    fill(0, 0, 0, 15, M_SOLID);           // left wall
    fill(COLS - 1, 0, COLS - 1, 15, M_SOLID); // right wall
    fill(0, 0, COLS - 1, 0, M_SOLID);     // ceiling
    // climbing platforms (left explore area)
    fill(4, 12, 7, 12, M_SOLID);
    fill(10, 10, 13, 10, M_SOLID);
    fill(16, 6, 20, 6, M_SOLID);          // high key ledge — needs double jump
    // locked gate at col 28
    fill(28, 1, 28, 7, M_SOLID);          // permanent wall (can't jump over)
    fill(28, 8, 28, 13, M_DOOR);          // openable door
    // spike pit beyond the gate
    g[13][32] = M_SPIKE; g[13][33] = M_SPIKE;
    return { g, COLS, ROWS };
  }

  function _mEnemy(tx, minTx, maxTx) {
    const w = 40, h = 44;
    return {
      x: tx * TILE + 4, y: 14 * TILE - h, w, h,
      dir: 1, spd: G_ENEMY() * 1.4, alive: true,
      minX: minTx * TILE, maxX: maxTx * TILE,
    };
  }

  function _metroidInit() {
    const { g, COLS, ROWS } = _metroidBuildMap();
    Object.assign(metroid, {
      grid: g, cols: COLS, rows: ROWS,
      worldW: COLS * TILE, worldH: ROWS * TILE,
      px: 2 * TILE, py: 14 * TILE - M_PH,
      vx: 0, vy: 0, dir: 1, anim: 0,
      onGround: true, jumpsLeft: 1, jumpHeld: false,
      hasDoubleJump: false, hasKey: false, doorOpen: false,
      lives: KQ_SETTINGS.get('infiniteLives') ? 99 : KQ_SETTINGS.get('startLives'),
      score: 0, hurtTimer: 0, invTimer: 0, camX: 0, camY: 0,
      items: [
        { type: 'djump', x: 11 * TILE + 4, y: 9 * TILE + 4, w: 40, h: 40, taken: false },
        { type: 'key',   x: 18 * TILE + 8, y: 5 * TILE + 8, w: 32, h: 32, taken: false },
      ],
      enemies: [_mEnemy(14, 9, 19), _mEnemy(37, 35, 40), _mEnemy(43, 41, 44)],
      goal: { x: 45 * TILE, y: 12 * TILE, w: TILE, h: TILE * 2 },
    });
    game.particles = []; game.popups = []; game.projectiles = []; game.score = 0;
    showHint('metroid', [
      '🗺️ Explore mode! Find hidden powers to open new paths.',
      '',
      'Move: Arrow Keys / WASD     Jump: Space / Up / A',
      '',
      '⏫ Grab the DOUBLE JUMP to reach high places (jump twice!).',
      '🔑 Find the KEY — it opens the big locked gate.',
      '🏁 Then reach the flag at the far side to escape!',
      '',
      '🎨 Art tip: Your hero is seen from the SIDE here too.',
      '',
      '      Tap or press any key to close this tip',
    ]);
  }

  function _mSolid(tx, ty) {
    if (tx < 0 || tx >= metroid.cols || ty >= metroid.rows) return true;
    if (ty < 0) return false;
    const v = metroid.grid[ty][tx];
    return v === M_SOLID || (v === M_DOOR && !metroid.doorOpen);
  }

  function _mCollideX() {
    const top = Math.floor(metroid.py / TILE), bottom = Math.floor((metroid.py + M_PH - 1) / TILE);
    if (metroid.vx > 0) {
      const right = Math.floor((metroid.px + M_PW - 1) / TILE);
      for (let ty = top; ty <= bottom; ty++) if (_mSolid(right, ty)) { metroid.px = right * TILE - M_PW; metroid.vx = 0; break; }
    } else if (metroid.vx < 0) {
      const left = Math.floor(metroid.px / TILE);
      for (let ty = top; ty <= bottom; ty++) if (_mSolid(left, ty)) { metroid.px = (left + 1) * TILE; metroid.vx = 0; break; }
    }
  }

  function _mCollideY() {
    metroid.onGround = false;
    const left = Math.floor(metroid.px / TILE), right = Math.floor((metroid.px + M_PW - 1) / TILE);
    if (metroid.vy > 0) {
      const bottom = Math.floor((metroid.py + M_PH - 1) / TILE);
      for (let tx = left; tx <= right; tx++) if (_mSolid(tx, bottom)) { metroid.py = bottom * TILE - M_PH; metroid.vy = 0; metroid.onGround = true; break; }
    } else if (metroid.vy < 0) {
      const top = Math.floor(metroid.py / TILE);
      for (let tx = left; tx <= right; tx++) if (_mSolid(tx, top)) { metroid.py = (top + 1) * TILE; metroid.vy = 0; break; }
    }
  }

  function _mTouchHazard() {
    const left = Math.floor(metroid.px / TILE), right = Math.floor((metroid.px + M_PW - 1) / TILE);
    const top = Math.floor(metroid.py / TILE), bottom = Math.floor((metroid.py + M_PH - 1) / TILE);
    for (let ty = top; ty <= bottom; ty++) for (let tx = left; tx <= right; tx++) {
      if (ty >= 0 && ty < metroid.rows && tx >= 0 && tx < metroid.cols && metroid.grid[ty][tx] === M_SPIKE) return true;
    }
    return false;
  }

  function _mHurt() {
    metroid.lives--; metroid.hurtTimer = 0.4; metroid.invTimer = 1.2;
    metroid.vy = -G_JUMP() * 0.4; screenShake = 8; beep('hurt');
    if (metroid.lives <= 0) mode = 'gameover';
  }

  function updateMetroid(dt) {
    metroid.anim += dt;
    metroid.hurtTimer = Math.max(0, metroid.hurtTimer - dt);
    metroid.invTimer  = Math.max(0, metroid.invTimer  - dt);

    const spd = G_SPEED();
    metroid.vx = 0;
    if (pressed('left'))  { metroid.vx = -spd; metroid.dir = -1; }
    if (pressed('right')) { metroid.vx =  spd; metroid.dir =  1; }

    const wantJump = pressed('jump') || pressed('up');
    if (wantJump) {
      if (!metroid.jumpHeld && metroid.jumpsLeft > 0) {
        metroid.vy = -G_JUMP(); metroid.jumpsLeft--; metroid.onGround = false; beep('jump');
        spawnParticles(metroid.px + M_PW / 2, metroid.py + M_PH, '#bae6fd', 4);
      }
      metroid.jumpHeld = true;
    } else metroid.jumpHeld = false;

    metroid.vy += G_GRAV() * dt;
    if (metroid.vy > 1300) metroid.vy = 1300;

    metroid.px += metroid.vx * dt; _mCollideX();
    metroid.py += metroid.vy * dt; _mCollideY();
    if (metroid.onGround) metroid.jumpsLeft = metroid.hasDoubleJump ? 2 : 1;
    metroid.px = Math.max(0, Math.min(metroid.worldW - M_PW, metroid.px));

    // Item pickups
    for (const it of metroid.items) {
      if (it.taken) continue;
      if (_brawlerOverlap(metroid.px, metroid.py, M_PW, M_PH, it.x, it.y, it.w, it.h)) {
        it.taken = true;
        if (it.type === 'djump') {
          metroid.hasDoubleJump = true; metroid.jumpsLeft = 2; beep('power');
          game.popups.push({ text: 'Double Jump!', x: it.x, y: it.y, life: 1.4 });
        } else if (it.type === 'key') {
          metroid.hasKey = true; metroid.doorOpen = true; beep('coin');
          game.popups.push({ text: '🔑 Gate open!', x: it.x, y: it.y, life: 1.6 });
          spawnParticles(28 * TILE + TILE / 2, 11 * TILE, '#fbbf24', 16);
        }
      }
    }

    // Hazards
    if (metroid.invTimer <= 0 && !KQ_SETTINGS.get('invincibleMode') && _mTouchHazard()) _mHurt();

    // Enemies
    for (const e of metroid.enemies) {
      if (!e.alive) continue;
      e.x += e.dir * e.spd * dt;
      if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
      if (e.x >= e.maxX) { e.x = e.maxX; e.dir = -1; }
      if (_brawlerOverlap(metroid.px, metroid.py, M_PW, M_PH, e.x, e.y, e.w, e.h)) {
        if (metroid.vy > 0 && metroid.py + M_PH < e.y + e.h * 0.6) {
          e.alive = false; metroid.vy = -G_JUMP() * 0.6;
          metroid.score += 100; game.score = metroid.score; beep('stomp');
          spawnParticles(e.x + e.w / 2, e.y, '#f97316', 8);
          game.popups.push({ text: '+100', x: e.x, y: e.y, life: 0.8 });
        } else if (metroid.invTimer <= 0 && !KQ_SETTINGS.get('invincibleMode')) {
          _mHurt();
        }
      }
    }

    // Goal
    if (metroid.goal && _brawlerOverlap(metroid.px, metroid.py, M_PW, M_PH, metroid.goal.x, metroid.goal.y, metroid.goal.w, metroid.goal.h)) {
      mode = 'win'; beep('win');
      spawnParticles(metroid.goal.x + metroid.goal.w / 2, metroid.goal.y, '#fbbf24', 24);
    }

    // Camera follows the player both axes
    metroid.camX = Math.max(0, Math.min(metroid.worldW - VIEW_W, metroid.px + M_PW / 2 - VIEW_W / 2));
    metroid.camY = Math.max(0, Math.min(metroid.worldH - VIEW_H, metroid.py + M_PH / 2 - VIEW_H / 2));

    updateEffects(dt);
  }

  function renderMetroid() {
    const ASSETS = window.KQ_ASSETS || {};
    if (!drawImg((ASSETS.backgrounds || {}).bg_cave, 0, 0, VIEW_W, VIEW_H)) {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, '#1e1b4b'); g.addColorStop(1, '#312e81');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    ctx.save();
    ctx.translate(Math.round(-metroid.camX), Math.round(-metroid.camY));

    const t = ASSETS.tiles || {};
    const x0 = Math.max(0, Math.floor(metroid.camX / TILE));
    const x1 = Math.min(metroid.cols - 1, Math.ceil((metroid.camX + VIEW_W) / TILE));
    const y0 = Math.max(0, Math.floor(metroid.camY / TILE));
    const y1 = Math.min(metroid.rows - 1, Math.ceil((metroid.camY + VIEW_H) / TILE));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const v = metroid.grid[ty][tx]; if (!v) continue;
      const x = tx * TILE, y = ty * TILE;
      if (v === M_SOLID) {
        if (!drawImg(t.ground, x, y, TILE, TILE)) {
          ctx.fillStyle = '#4338ca'; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#6366f1'; ctx.fillRect(x, y, TILE, 6);
        }
      } else if (v === M_DOOR) {
        if (metroid.doorOpen) continue;
        if (!drawImg(t.brick, x, y, TILE, TILE)) { ctx.fillStyle = '#b45309'; ctx.fillRect(x, y, TILE, TILE); }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + TILE * 0.3, y + 4, TILE * 0.4, TILE - 8);
      } else if (v === M_SPIKE) {
        if (!drawImg(t.spike, x, y, TILE, TILE)) {
          ctx.fillStyle = '#cbd5e1'; ctx.beginPath();
          ctx.moveTo(x, y + TILE); ctx.lineTo(x + TILE / 2, y + TILE * 0.15); ctx.lineTo(x + TILE, y + TILE); ctx.fill();
        }
      }
    }

    // Items
    for (const it of metroid.items) {
      if (it.taken) continue;
      const bob = Math.sin(metroid.anim * 4) * 4;
      if (it.type === 'djump') {
        if (!drawImg((ASSETS.items || {}).doubleJump, it.x, it.y + bob, it.w, it.h)) {
          ctx.fillStyle = '#22d3ee'; ctx.beginPath();
          ctx.arc(it.x + it.w / 2, it.y + it.h / 2 + bob, it.w / 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0e7490'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('⏫', it.x + it.w / 2, it.y + it.h / 2 + 8 + bob);
        }
      } else if (it.type === 'key') {
        if (!drawImg((ASSETS.items || {}).coin, it.x, it.y + bob, it.w, it.h)) {
          ctx.font = '30px serif'; ctx.textAlign = 'center';
          ctx.fillText('🔑', it.x + it.w / 2, it.y + it.h + bob);
        }
      }
    }

    // Goal flag
    if (metroid.goal) {
      const gg = metroid.goal;
      if (!drawImg(t.goal, gg.x, gg.y, gg.w, gg.h)) {
        ctx.fillStyle = '#64748b'; ctx.fillRect(gg.x + gg.w / 2 - 3, gg.y, 6, gg.h);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(gg.x + gg.w / 2 + 3, gg.y + 6, 30, 20);
      }
    }

    // Enemies
    for (const e of metroid.enemies) {
      if (!e.alive) continue;
      if (!drawImg((ASSETS.enemies || {}).walker, e.x, e.y, e.w, e.h, { flip: e.dir < 0 })) {
        ctx.fillStyle = '#f97316'; ctx.fillRect(e.x, e.y, e.w, e.h);
      }
    }

    // Player
    let frame = (ASSETS.player || {}).idle;
    if (metroid.hurtTimer > 0) frame = (ASSETS.player || {}).hurt;
    else if (!metroid.onGround) frame = (ASSETS.player || {}).jump;
    else if (Math.abs(metroid.vx) > 10) frame = Math.floor(metroid.anim * 8) % 2 === 0 ? (ASSETS.player || {}).run1 : (ASSETS.player || {}).run2;
    const blink = metroid.invTimer > 0 && Math.floor(metroid.invTimer * 12) % 2 === 0;
    if (!blink) {
      const tint = KQ_SETTINGS.get('tintPlayer');
      drawWithTint(tint, metroid.px - 8, metroid.py - 8, M_PW + 16, M_PH + 8, () => {
        if (!drawImg(frame, metroid.px - 8, metroid.py - 8, M_PW + 16, M_PH + 8, { flip: metroid.dir < 0 })) {
          ctx.fillStyle = '#3b82f6'; ctx.fillRect(metroid.px, metroid.py, M_PW, M_PH);
        }
      });
    }

    drawEffects();
    ctx.restore();

    // HUD
    ctx.textAlign = 'left'; ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = '#fbbf24'; ctx.fillText(`⭐ ${metroid.score}`, 16, 28);
    ctx.fillStyle = '#ef4444'; ctx.fillText(`❤️ ${metroid.lives}`, 16, 52);
    ctx.font = '20px system-ui';
    ctx.fillStyle = metroid.hasDoubleJump ? '#22d3ee' : 'rgba(255,255,255,0.18)'; ctx.fillText('⏫', 16, 80);
    ctx.fillStyle = metroid.hasKey ? '#fbbf24' : 'rgba(255,255,255,0.18)'; ctx.fillText('🔑', 50, 80);

    if (mode === 'gameover') drawOverlay('Game Over!', `Score: ${metroid.score}`, 'Press Enter or Tap to Try Again');
    if (mode === 'win')      drawOverlay('You Escaped! 🎉', `Score: ${metroid.score}`, 'Press Enter or Tap to Play Again');
  }

  function drawBackground() {
    const ASSETS = window.KQ_ASSETS || {};
    const bgKey  = currentLevel && currentLevel.bgKey;
    const bgPath = bgKey && ASSETS.backgrounds && ASSETS.backgrounds[bgKey];
    if (bgPath && drawImg(bgPath, 0, 0, VIEW_W, VIEW_H)) return;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, "#7dd3fc"); sky.addColorStop(0.56, "#bae6fd"); sky.addColorStop(1, "#d9f99d");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawParallax() {
    ctx.save(); ctx.translate(-cameraX * 0.18, 0);
    for (let i = -2; i < 18; i++) {
      const x = i * 330;
      ctx.fillStyle = "rgba(255,255,255,.65)";
      _cloud(x + 20, 78 + Math.sin(i) * 20, 1.0);
      _cloud(x + 190, 140 + Math.cos(i) * 18, 0.72);
    }
    ctx.fillStyle = "rgba(34,197,94,.34)";
    for (let i = -1; i < 28; i++) {
      const x = i * 260;
      ctx.beginPath(); ctx.moveTo(x, 470); ctx.quadraticCurveTo(x + 120, 280 + (i % 3) * 35, x + 260, 470); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function _cloud(x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 28*s, 0, Math.PI*2); ctx.arc(x+28*s, y-10*s, 34*s, 0, Math.PI*2);
    ctx.arc(x+63*s, y, 25*s, 0, Math.PI*2); ctx.rect(x-2*s, y, 70*s, 22*s); ctx.fill();
  }

  function drawTile(ch, x, y, tx, ty) {
    if (currentLevel && currentLevel.hideTiles && ch !== "S" && ch !== "F") return;

    // Block bounce animation offset
    let bounceOff = 0;
    if (tx !== undefined && ty !== undefined) {
      const key = tx + ',' + ty;
      const anim = blockAnims.get(key);
      if (anim) {
        const t = 1 - anim.timer / anim.maxTimer; // 0..1
        bounceOff = -Math.sin(t * Math.PI) * 8;
      }
    }
    y += bounceOff;

    const a = (window.KQ_ASSETS || {}).tiles || {};
    let path = null;
    if (ch === "X") path = a.ground;
    if (ch === "?") path = a.question;
    if (ch === "B") path = a.breakable;
    if (ch === "S") path = a.spike;
    if (ch === "F") path = a.goal;
    if (path && drawImg(path, x, y, TILE, TILE)) return;

    if (ch === "X") {
      ctx.fillStyle = "#7c4a2d"; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#43a047"; ctx.fillRect(x, y, TILE, 12);
    } else if (ch === "?") {
      ctx.fillStyle = "#f59e0b"; ctx.fillRect(x+3, y+3, TILE-6, TILE-6);
      ctx.fillStyle = "#fff7ed"; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("?", x+17, y+32);
    } else if (ch === "B") {
      ctx.fillStyle = "#9333ea"; ctx.fillRect(x+3, y+3, TILE-6, TILE-6);
    } else if (ch === "S") {
      ctx.fillStyle = "#e11d48";
      ctx.beginPath(); ctx.moveTo(x+5, y+TILE); ctx.lineTo(x+TILE/2, y+8); ctx.lineTo(x+TILE-5, y+TILE); ctx.closePath(); ctx.fill();
    } else if (ch === "F") {
      ctx.fillStyle = "#334155"; ctx.fillRect(x+8, y-60, 8, TILE+60);
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath(); ctx.moveTo(x+16, y-54); ctx.lineTo(x+48, y-40); ctx.lineTo(x+16, y-25); ctx.closePath(); ctx.fill();
    }
  }

  function drawWorld() {
    if (!currentLevel) return;
    const startCol = Math.max(0, Math.floor(cameraX / TILE) - 1);
    const endCol   = Math.min((map[0]||[]).length - 1, Math.ceil((cameraX + VIEW_W) / TILE) + 1);
    for (let ty = 0; ty < map.length; ty++)
      for (let tx = startCol; tx <= endCol; tx++) {
        const ch = tileAt(tx, ty);
        if (ch !== ".") drawTile(ch, tx * TILE, ty * TILE, tx, ty);
      }

    // Moving platforms
    for (const mp of movingPlatforms) {
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(mp.x, mp.y, mp.w, mp.h);
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(mp.x, mp.y, mp.w, 5);
    }

    // Debug hitboxes
    if (KQ_SETTINGS.get('showHitboxes')) {
      ctx.strokeStyle = 'rgba(0,255,0,0.4)';
      ctx.lineWidth = 1;
      for (let ty = 0; ty < map.length; ty++)
        for (let tx = startCol; tx <= endCol; tx++) {
          const ch = tileAt(tx, ty);
          if (isSolid(ch) || isSpike(ch)) ctx.strokeRect(tx*TILE, ty*TILE, TILE, TILE);
        }
    }
  }

  function drawCollectibles() {
    const ASSETS = window.KQ_ASSETS || {};
    for (const c of coins) {
      if (c.taken) continue;
      const bob = Math.sin(game.time * 4 + c.bob) * 5;
      // Spinning coin: x-radius oscillates to fake spin
      const spinRx = Math.abs(Math.cos(game.time * 6 + c.bob)) * (c.w / 2);
      if (!drawImg((ASSETS.items||{}).coin, c.x, c.y + bob, c.w, c.h)) {
        ctx.fillStyle = "#facc15"; ctx.beginPath();
        ctx.ellipse(c.x + c.w/2, c.y + bob + c.h/2, Math.max(1, spinRx), c.h/2, 0, 0, Math.PI*2);
        ctx.fill();
        // Shine on coin
        if (spinRx > c.w * 0.2) {
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.beginPath();
          ctx.ellipse(c.x + c.w/2 - spinRx*0.3, c.y + bob + c.h/2 - 3, Math.max(1, spinRx*0.3), c.h*0.2, 0, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }
    for (const p of powerups) {
      if (p.taken) continue;
      const bob = Math.sin(game.time * 3 + p.bob) * 6;
      const path = (ASSETS.items||{})[p.type];
      if (!drawImg(path, p.x, p.y + bob, p.w, p.h)) {
        ctx.fillStyle = "#a78bfa"; ctx.fillRect(p.x, p.y + bob, p.w, p.h);
      }
    }
  }

  function drawEnemies() {
    const ASSETS = window.KQ_ASSETS || {};
    for (const e of enemies) {
      if (!e.alive) continue;
      const flip = e.vx > 0;
      if (e.type === 'jumper') {
        const tint = KQ_SETTINGS.get('tintJumper');
        drawWithTint(tint, e.x, e.y, e.w, e.h, () => {
          if (!drawImg((ASSETS.enemies||{}).jumper, e.x, e.y, e.w, e.h, { flip })) {
            ctx.fillStyle = '#f97316'; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = '#111827';
            ctx.fillRect(e.x + (flip ? 22 : 8), e.y + 10, 6, 6);
          }
        });
      } else if (e.type === 'flyer') {
        const tint = KQ_SETTINGS.get('tintFlyer');
        drawWithTint(tint, e.x, e.y, e.w, e.h, () => {
          if (!drawImg((ASSETS.enemies||{}).flyer, e.x, e.y, e.w, e.h, { flip })) {
            ctx.fillStyle = '#c084fc'; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = '#111827';
            ctx.fillRect(e.x + (flip ? 20 : 8), e.y + 8, 6, 6);
            ctx.fillStyle = 'rgba(192,132,252,0.5)';
            const wingFlap = Math.sin(game.time * 10) * 6;
            ctx.fillRect(e.x - 10, e.y + wingFlap, 10, 16);
            ctx.fillRect(e.x + e.w, e.y + wingFlap, 10, 16);
          }
        });
      } else {
        const tint = KQ_SETTINGS.get('tintWalker');
        drawWithTint(tint, e.x, e.y, e.w, e.h, () => {
          if (!drawImg((ASSETS.enemies||{}).walker, e.x, e.y, e.w, e.h, { flip })) {
            ctx.fillStyle = "#fb923c"; ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = "#111827";
            ctx.fillRect(e.x + (flip ? 25 : 9), e.y + 10, 6, 6);
          }
        });
      }
    }
  }

  function drawPlayer() {
    const ASSETS = window.KQ_ASSETS || {};
    let frame = (ASSETS.player||{}).idle;
    if (player.hurtTimer > 0) frame = (ASSETS.player||{}).hurt;
    else if (!player.onGround) frame = (ASSETS.player||{}).jump;
    else if (Math.abs(player.vx) > 35)
      frame = Math.floor(player.anim * 10) % 2 === 0 ? (ASSETS.player||{}).run1 : (ASSETS.player||{}).run2;

    if (player.invincible > 0 && Math.floor(game.time * 18) % 2 === 0) ctx.globalAlpha = 0.45;
    const flip = player.dir < 0;
    const playerTint = KQ_SETTINGS.get('tintPlayer');
    drawWithTint(playerTint, player.x, player.y, player.w, player.h, () => {
      if (!drawImg(frame, player.x, player.y, player.w, player.h, { flip })) {
        ctx.fillStyle = player.power.giant ? "#a855f7" : "#2563eb";
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(player.x + (flip ? 8 : player.w - 14), player.y + 11, 6, 6);
      }
    });
    ctx.globalAlpha = 1;

    if (player.power.shield > 0) {
      ctx.strokeStyle = "rgba(34,211,238,.85)"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(player.x+player.w/2, player.y+player.h/2, player.w*0.72, player.h*0.62, 0, 0, Math.PI*2);
      ctx.stroke();
    }

    if (KQ_SETTINGS.get('showHitboxes')) {
      ctx.strokeStyle = 'rgba(0,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.strokeRect(player.x, player.y, player.w, player.h);
    }
  }

  function drawProjectiles() {
    const ASSETS = window.KQ_ASSETS || {};
    for (const p of game.projectiles) {
      if (p._bossShot) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI*2);
        ctx.fill();
      } else if (!drawImg(ASSETS.projectile, p.x, p.y, p.w, p.h, { flip: p.dir < 0 })) {
        ctx.fillStyle = "#38bdf8"; ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }
  }

  function drawEffects() {
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color; ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = "bold 18px system-ui, sans-serif"; ctx.textAlign = "center";
    for (const pop of game.popups) {
      ctx.globalAlpha = Math.max(0, pop.life);
      ctx.fillStyle = "#111827"; ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
      ctx.fillStyle = "#fff7ed"; ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = "left";
  }

  function _drawHeart(x, y, size, filled) {
    ctx.save();
    ctx.beginPath();
    const s = size / 2;
    ctx.moveTo(x + s, y + size * 0.3);
    ctx.bezierCurveTo(x + s, y, x + size * 1.1, y, x + size * 1.1, y + size * 0.4);
    ctx.bezierCurveTo(x + size * 1.1, y + size * 0.75, x + s, y + size, x + s, y + size);
    ctx.bezierCurveTo(x + s, y + size, x - size * 0.1, y + size * 0.75, x - size * 0.1, y + size * 0.4);
    ctx.bezierCurveTo(x - size * 0.1, y, x + s, y, x + s, y + size * 0.3);
    ctx.closePath();
    ctx.fillStyle = filled ? "#ef4444" : "#374151";
    ctx.fill();
    if (!filled) {
      ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  function drawHud() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(15,23,42,.72)";
    _roundRect(16, 14, 520, 48, 16); ctx.fill();
    ctx.fillStyle = "#f8fafc"; ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(`Score ${game.score}`, 32, 44);
    ctx.fillText(`Coins ${game.coins}`, 162, 44);

    // Hearts HUD instead of "Lives N"
    const livesVal = KQ_SETTINGS.get('infiniteLives') ? 99 : game.lives;
    if (livesVal > 5) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(`♥ ${livesVal}`, 276, 44);
    } else {
      const maxDisplay = 5;
      const hSize = 14;
      const hGap  = 18;
      const hStartX = 276;
      const hY = 26;
      for (let i = 0; i < maxDisplay; i++) {
        _drawHeart(hStartX + i * hGap, hY, hSize, i < livesVal);
      }
    }

    const lv = currentLevel ? currentLevel.name : '';
    ctx.fillStyle = "#94a3b8"; ctx.font = "14px system-ui"; ctx.fillText(lv, 390, 44);
    const pows = [];
    if (player.power.blaster)    pows.push("🔫");
    if (player.power.shield)     pows.push("🛡");
    if (player.power.doubleJump) pows.push("🪶");
    if (player.power.dash)       pows.push("👟");
    if (player.power.giant)      pows.push("💪");
    if (pows.length) {
      ctx.font = "20px system-ui";
      ctx.fillText(pows.join(" "), 32, VIEW_H - 20);
    }
    ctx.restore();
  }

  function _roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);     ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  // ── NES-style full-canvas title screen ────────────────────
  function drawTitleScreen() {
    const ASSETS = window.KQ_ASSETS || {};
    // Try full title-screen art first, fall back to a painted scene
    const drew = drawImg(ASSETS.titleLogo, 0, 0, VIEW_W, VIEW_H);

    if (!drew) {
      // Painted placeholder that still feels like a game cover
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, '#1e0a3c'); sky.addColorStop(0.6, '#0f172a'); sky.addColorStop(1, '#1a3a1a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 60; i++) {
        const sx = (i * 137.5) % VIEW_W, sy = (i * 73.1) % (VIEW_H * 0.6);
        ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
      }

      // Title text with glow
      ctx.save();
      ctx.textAlign = 'center';
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 30;
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 72px system-ui, sans-serif';
      ctx.fillText('PLACEHOLDER', VIEW_W / 2, 200);
      ctx.font = '900 48px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
      ctx.fillText('GAME', VIEW_W / 2, 262);
      ctx.shadowBlur = 0;

      // Small hint
      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px system-ui';
      ctx.fillText('Replace assets/art/title-logo.png with your own title art!', VIEW_W / 2, 310);
      ctx.restore();
    }

    // Author credit
    const author = KQ_SETTINGS.get('authorName');
    if (author) {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 14px system-ui';
      ctx.fillText('Made by ' + author + ' 🎮', VIEW_W - 16, VIEW_H - 14);
      ctx.restore();
    }

    // Blinking "PRESS START" — classic NES style
    if (Math.floor(game.time * 2) % 2 === 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('PRESS  START', VIEW_W / 2, VIEW_H - 52);
      ctx.restore();
    }

    // Copyright-style footer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px system-ui';
    ctx.fillText('© YOUR NAME HERE  •  MADE WITH PLACEHOLDER GAME', VIEW_W / 2, VIEW_H - 20);
    ctx.restore();
  }

  function drawHintPopup() {
    if (!hintPopup) return;
    const lines = hintPopup.lines;
    const pad = 28, lineH = 22;
    const boxH = lines.length * lineH + pad * 2 + 48;
    const boxW = 580;
    const bx = VIEW_W/2 - boxW/2, by = VIEW_H/2 - boxH/2;

    ctx.save(); ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = 'rgba(2,6,23,0.82)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#1e293b';
    _roundRect(bx, by, boxW, boxH, 20); ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();

    ctx.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
      const y = by + pad + 16 + i * lineH;
      if (i === 0) {
        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 17px system-ui';
      } else {
        ctx.fillStyle = '#e2e8f0'; ctx.font = '14px system-ui';
      }
      ctx.fillText(lines[i], VIEW_W/2, y);
    }

    // Dismiss button
    const btnY = by + boxH - 36;
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px system-ui';
    ctx.fillText('✅  Got it! Tap anywhere to close', VIEW_W/2, btnY);
    ctx.restore();
  }

  function drawOverlay(title, subtitle, button) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(2,6,23,.64)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "rgba(15,23,42,.86)";
    _roundRect(170, 92, 620, 356, 28); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 2; ctx.stroke();
    const ASSETS = window.KQ_ASSETS || {};
    if (!drawImg(ASSETS.titleLogo, 272, 116, 416, 118)) {
      ctx.fillStyle = "#fbbf24"; ctx.font = "900 56px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(title, VIEW_W / 2, 182);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#e2e8f0"; ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(subtitle, VIEW_W / 2, 270);
    ctx.fillStyle = "#fbbf24"; ctx.font = "900 24px system-ui, sans-serif";
    ctx.fillText(button, VIEW_W / 2, 324);
    ctx.fillStyle = "#cbd5e1"; ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("Move: Arrows/WASD  Jump: Space  Shoot: X  Dash: Shift  Pause: P  Restart: R", VIEW_W/2, 378);
    ctx.fillText("Swap PNG files in assets/art/ to make the game your own!", VIEW_W/2, 410);
    const authorDisplay = KQ_SETTINGS.get('authorName');
    if (authorDisplay) {
      ctx.fillStyle = "#fbbf24"; ctx.font = "bold 15px system-ui";
      ctx.fillText(`Made by ${authorDisplay} 🎮`, VIEW_W/2, 438);
    }
    ctx.restore();
  }

  // ── Pause menu (card with buttons) ────────────────────────
  const PAUSE_BTNS = [
    { label: "▶ Resume",        action: () => { mode = "playing"; } },
    { label: "🔄 Restart Level", action: () => {
        const gmode = KQ_SETTINGS.get('gameMode') || 'platformer';
        if (gmode === 'shooter') { _shooterInit(); mode = 'playing'; }
        else if (gmode === 'brawler') { _brawlerInit(); mode = 'playing'; }
        else if (gmode === 'metroid') { _metroidInit(); mode = 'playing'; }
        else { resetLevel(true); mode = "playing"; }
      } },
    { label: "🏠 Main Menu",    action: () => { mode = "menu"; _showMenuPanel(); } },
  ];
  const PAUSE_CARD = { x: 330, y: 160, w: 300, h: 220 };
  const PAUSE_BTN_H = 48;
  const PAUSE_BTN_GAP = 12;

  function _pauseBtnRect(i) {
    return {
      x: PAUSE_CARD.x + 20,
      y: PAUSE_CARD.y + 60 + i * (PAUSE_BTN_H + PAUSE_BTN_GAP),
      w: PAUSE_CARD.w - 40,
      h: PAUSE_BTN_H
    };
  }

  function _handlePauseHover(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (VIEW_W / rect.width);
    const my = (e.clientY - rect.top) * (VIEW_H / rect.height);
    pauseHover = -1;
    for (let i = 0; i < PAUSE_BTNS.length; i++) {
      const r = _pauseBtnRect(i);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        pauseHover = i; break;
      }
    }
  }

  function _handlePauseClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (VIEW_W / rect.width);
    const my = (e.clientY - rect.top) * (VIEW_H / rect.height);
    for (let i = 0; i < PAUSE_BTNS.length; i++) {
      const r = _pauseBtnRect(i);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        PAUSE_BTNS[i].action(); return;
      }
    }
  }

  function drawPauseMenu() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(2,6,23,.55)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Card
    ctx.fillStyle = "rgba(15,23,42,.95)";
    _roundRect(PAUSE_CARD.x, PAUSE_CARD.y, PAUSE_CARD.w, PAUSE_CARD.h, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = "#fbbf24"; ctx.font = "bold 26px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Paused", PAUSE_CARD.x + PAUSE_CARD.w / 2, PAUSE_CARD.y + 42);

    for (let i = 0; i < PAUSE_BTNS.length; i++) {
      const r = _pauseBtnRect(i);
      const hovered = pauseHover === i;
      ctx.fillStyle = hovered ? "#fbbf24" : "rgba(255,255,255,0.08)";
      _roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill();
      ctx.fillStyle = hovered ? "#111827" : "#f1f5f9";
      ctx.font = "bold 17px system-ui"; ctx.textAlign = "center";
      ctx.fillText(PAUSE_BTNS[i].label, r.x + r.w / 2, r.y + r.h * 0.64);
    }
    ctx.restore();
  }

  // ── Level select screen ────────────────────────────────────
  const LS_COLS   = 3;
  const LS_CARD_W = 240;
  const LS_CARD_H = 110;
  const LS_GAP    = 28;
  const LS_START_X = 60;
  const LS_START_Y = 120;

  function _lsCardRect(i) {
    const col = i % LS_COLS;
    const row = Math.floor(i / LS_COLS);
    return {
      x: LS_START_X + col * (LS_CARD_W + LS_GAP),
      y: LS_START_Y + row * (LS_CARD_H + LS_GAP),
      w: LS_CARD_W, h: LS_CARD_H
    };
  }

  function _handleLevelSelectClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (VIEW_W / rect.width);
    const my = (e.clientY - rect.top) * (VIEW_H / rect.height);

    // Back button (top-left)
    if (mx >= 20 && mx <= 110 && my >= 20 && my <= 55) {
      mode = "menu"; _showMenuPanel(); return;
    }

    const LEVELS = window.KQ_LEVELS || [];
    for (let i = 0; i < LEVELS.length; i++) {
      const r = _lsCardRect(i);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        if (i > highestUnlocked) return; // locked
        levelIndex = i;
        resetLevel(true);
        mode = "playing";
        return;
      }
    }
  }

  function drawLevelSelect() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, "#1e3a5f"); sky.addColorStop(1, "#0f172a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Back button
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    _roundRect(20, 20, 90, 35, 10); ctx.fill();
    ctx.fillStyle = "#f8fafc"; ctx.font = "bold 15px system-ui"; ctx.textAlign = "center";
    ctx.fillText("← Back", 65, 42);

    ctx.fillStyle = "#fbbf24"; ctx.font = "bold 36px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Select a Level", VIEW_W / 2, 85);

    const LEVELS = window.KQ_LEVELS || [];
    for (let i = 0; i < LEVELS.length; i++) {
      const lv = LEVELS[i];
      const r = _lsCardRect(i);
      const locked = i > highestUnlocked;

      ctx.fillStyle = locked ? "rgba(30,41,59,0.8)" : (i === levelIndex ? "rgba(251,191,36,0.2)" : "rgba(15,23,42,0.85)");
      _roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
      ctx.strokeStyle = locked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2; ctx.stroke();

      if (locked) {
        ctx.fillStyle = "#475569"; ctx.font = "bold 28px system-ui"; ctx.textAlign = "center";
        ctx.fillText("🔒", r.x + r.w / 2, r.y + r.h / 2 + 10);
        ctx.fillStyle = "#475569"; ctx.font = "13px system-ui";
        ctx.fillText("Locked", r.x + r.w / 2, r.y + r.h / 2 + 34);
      } else {
        ctx.fillStyle = "#fbbf24"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "left";
        ctx.fillText(`Level ${i + 1}`, r.x + 16, r.y + 28);
        ctx.fillStyle = "#f1f5f9"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "center";
        ctx.fillText(lv.name, r.x + r.w / 2, r.y + 60);
        ctx.fillStyle = "#94a3b8"; ctx.font = "13px system-ui";
        ctx.fillText(`${lv.enemies ? lv.enemies.length : 0} enemies · ${lv.coins ? lv.coins.length : 0} coins`, r.x + r.w / 2, r.y + 82);
      }
    }
    ctx.restore();
  }

  // ── Main loop ──────────────────────────────────────────────
  function update(dt) {
    game.time += dt;
    KQ_GAMEPAD.poll();
    const gmode = KQ_SETTINGS.get('gameMode') || 'platformer';
    if (mode === "playing") {
      if (gmode === 'shooter') {
        updateShooter(dt);
      } else if (gmode === 'brawler') {
        updateBrawler(dt);
      } else if (gmode === 'metroid') {
        updateMetroid(dt);
      } else {
        updateMovingPlatforms(dt);
        updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt);
        if (currentLevel && currentLevel.id === 3 && !bossSpawned && !bossDefeated) {
          if (player.x > (currentLevel.width - 20) * 48) _spawnBoss();
        }
        updateBoss(dt);
        updateEffects(dt); updateCamera(dt);
      }
    } else if (mode === 'gameover' || mode === 'win') {
      updateEffects(dt);
    } else {
      updateEffects(dt);
    }
  }

  function render() {
    const shakeX = screenShake > 0 ? (Math.random()-0.5)*screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random()-0.5)*screenShake : 0;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    if (mode === "title") { drawTitleScreen(); drawHintPopup(); return; }
    if (mode === "menu")  { ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,VIEW_W,VIEW_H); return; }
    if (mode === "editor") { KQ_EDITOR.render(); return; }
    if (mode === "levelselect") { drawLevelSelect(); return; }

    const gmode = KQ_SETTINGS.get('gameMode') || 'platformer';

    if (gmode === 'shooter' && (mode === 'playing' || mode === 'gameover' || mode === 'win' || mode === 'paused')) {
      renderShooter();
      if (mode === 'paused') drawPauseMenu();
      drawHintPopup();
      return;
    }

    if (gmode === 'brawler' && (mode === 'playing' || mode === 'gameover' || mode === 'win' || mode === 'paused')) {
      renderBrawler();
      if (mode === 'paused') drawPauseMenu();
      drawHintPopup();
      return;
    }

    if (gmode === 'metroid' && (mode === 'playing' || mode === 'gameover' || mode === 'win' || mode === 'paused')) {
      renderMetroid();
      if (mode === 'paused') drawPauseMenu();
      drawHintPopup();
      return;
    }

    drawBackground();
    drawParallax();
    ctx.save();
    ctx.translate(Math.round(-cameraX + shakeX), Math.round(shakeY));
    drawWorld(); drawCollectibles(); drawEnemies(); drawProjectiles();
    drawPlayer(); drawBoss(); drawEffects();
    ctx.restore();
    drawHud();

    if (!imagesLoaded) {
      drawOverlay("Kid Quest", "Loading art files…", "Almost ready");
    } else if (mode === "paused") {
      drawPauseMenu();
    } else if (mode === "gameover") {
      drawOverlay("Game Over", `Final Score: ${game.score}`, "Press R · Enter · Tap to Try Again");
    } else if (mode === "win") {
      const LEVELS = window.KQ_LEVELS || [];
      const isLast = levelIndex >= LEVELS.length - 1 && playtestReturnMode !== 'editor';
      drawOverlay(
        isLast ? "You Win!" : "Level Clear!",
        `Score: ${game.score} · Coins: ${game.coins}`,
        isLast ? "Press R / Enter to Play Again" : "Next level loading…"
      );
    }
    drawHintPopup();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt); render();
    requestAnimationFrame(loop);
  }

  // ── Menu HTML panels ───────────────────────────────────────
  function _showMenuPanel()    { _hideAllPanels(); document.getElementById('menuPanel').style.display = 'flex'; }
  function _showSettingsPanel(){ _hideAllPanels(); document.getElementById('settingsPanel').style.display = 'flex'; }
  function _showEditorPanel()  { _hideAllPanels(); document.getElementById('editorPanel').style.display = 'flex'; }
  function _showArtPanel()     { _hideAllPanels(); document.getElementById('artPanel').style.display = 'flex'; }
  function _hideAllPanels() {
    ['menuPanel','settingsPanel','editorPanel','artPanel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function _initMenuEvents() {
    // ── Art panel back ─────────────────────────────────────
    const artBackBtn = document.getElementById('btn-art-back');
    if (artBackBtn) artBackBtn.addEventListener('click', () => { beep('menu'); _showMenuPanel(); });

    // Build art manager UI
    const artContainer = document.getElementById('art-slots-container');
    if (artContainer && window.KQ_ART) KQ_ART.buildUI(artContainer);

    // Art button
    const btnArt = document.getElementById('btn-art');
    if (btnArt) btnArt.addEventListener('click', () => { beep('menu'); _showArtPanel(); });

    // ── Genre picker ───────────────────────────────────────
    function _updateGenreBtns() {
      const cur = KQ_SETTINGS.get('gameMode') || 'platformer';
      document.querySelectorAll('.genre-btn').forEach(b => {
        b.style.background = b.dataset.genre === cur
          ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)';
        b.style.borderColor = b.dataset.genre === cur
          ? '#fbbf24' : 'rgba(255,255,255,0.15)';
        b.style.color = b.dataset.genre === cur ? '#fbbf24' : '#cbd5e1';
      });
      // Show/hide editor button based on genre (no editor for shooter)
      const edBtn = document.getElementById('btn-editor');
      if (edBtn) edBtn.style.display = cur === 'platformer' ? '' : 'none';
    }
    document.querySelectorAll('.genre-btn').forEach(b => {
      b.addEventListener('click', () => {
        beep('menu');
        KQ_SETTINGS.set('gameMode', b.dataset.genre);
        _updateGenreBtns();
      });
    });
    _updateGenreBtns();

    // ── Main menu ──────────────────────────────────────────
    const playBtn = document.getElementById('btn-play');
    if (playBtn) playBtn.addEventListener('click', () => {
      ensureAudio(); beep('menu');
      mode = 'title';
      _hideAllPanels();
    });

    const editorBtn = document.getElementById('btn-editor');
    if (editorBtn) editorBtn.addEventListener('click', () => {
      beep('menu'); mode = 'editor';
      KQ_EDITOR.show();
      _showEditorPanel();
    });

    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      beep('menu'); _buildSettingsUI(); _showSettingsPanel();
    });

    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      beep('menu'); _exportGame();
    });

    const howToPlayBtn = document.getElementById('btn-howtoplay');
    if (howToPlayBtn) howToPlayBtn.addEventListener('click', () => {
      beep('menu');
      alert(
        "🎮 HOW TO PLAY\n\n" +
        "Move:   Arrow Keys or A / D\n" +
        "Jump:   Space, W, or Up Arrow\n" +
        "Shoot:  X  (need the Blaster power-up first)\n" +
        "Dash:   Shift  (need the Dash power-up first)\n" +
        "Pause:  P or Escape\n" +
        "Restart: R\n\n" +
        "Stomp enemies by jumping on them!\n" +
        "Hit question blocks from below for coins.\n" +
        "Collect all 5 power-ups to unlock special moves.\n" +
        "Reach the FLAG to finish the level!\n\n" +
        "Enemy types:\n" +
        "  👾 Walker — patrols platforms\n" +
        "  🐸 Jumper — jumps toward you!\n" +
        "  🦋 Flyer  — floats in the air"
      );
    });

    // ── Settings back ──────────────────────────────────────
    const settingsBackBtn = document.getElementById('btn-settings-back');
    if (settingsBackBtn) settingsBackBtn.addEventListener('click', () => {
      beep('menu'); _showMenuPanel();
    });
    const settingsResetBtn = document.getElementById('btn-settings-reset');
    if (settingsResetBtn) settingsResetBtn.addEventListener('click', () => {
      KQ_SETTINGS.reset(); _buildSettingsUI();
    });

    // ── Level editor new/load ──────────────────────────────
    const editorNewBtn = document.getElementById('btn-editor-new');
    if (editorNewBtn) editorNewBtn.addEventListener('click', () => {
      KQ_EDITOR.newLevel();
    });

    const lvlSelect = document.getElementById('ed-level-select');
    if (lvlSelect) {
      lvlSelect.addEventListener('change', () => {
        const idx = parseInt(lvlSelect.value, 10);
        const lv  = (window.KQ_LEVELS || [])[idx];
        if (lv) KQ_EDITOR.loadLevel(lv);
      });
      // Populate
      (window.KQ_LEVELS || []).forEach((lv, i) => {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = lv.name + (lv._custom ? ' ✏️' : '');
        lvlSelect.appendChild(opt);
      });
    }
  }

  function _buildSettingsUI() {
    const container = document.getElementById('settings-sliders');
    if (!container) return;

    // Author name row at top
    const authorRow = `
      <div class="setting-row" style="margin-bottom:12px">
        <label class="setting-label" style="font-weight:bold">Your Name (for sharing)</label>
        <input type="text" id="sv-authorName" class="ed-input"
          placeholder="What's your name?"
          value="${KQ_SETTINGS.get('authorName') || ''}"
          style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:#f1f5f9;font-size:14px"/>
      </div>`;

    const defs = [
      { key: 'gravityMult',     label: 'Gravity',           min: 0.2, max: 3.0, step: 0.1 },
      { key: 'speedMult',       label: 'Player Speed',      min: 0.3, max: 3.0, step: 0.1 },
      { key: 'jumpMult',        label: 'Jump Height',       min: 0.3, max: 3.0, step: 0.1 },
      { key: 'enemySpeedMult',  label: 'Enemy Speed',       min: 0.0, max: 3.0, step: 0.1 },
      { key: 'projectileSpeed', label: 'Projectile Speed',  min: 0.3, max: 3.0, step: 0.1 },
      { key: 'startLives',      label: 'Starting Lives',    min: 1,   max: 10,  step: 1   },
      { key: 'sfxVolume',       label: 'Sound Volume',      min: 0,   max: 1.0, step: 0.1 },
    ];
    const toggleDefs = [
      { key: 'infiniteLives',  label: '∞ Infinite Lives'   },
      { key: 'invincibleMode', label: '🦸 God Mode (no damage)' },
      { key: 'alwaysBlaster',  label: '🔫 Start with Blaster' },
      { key: 'showHitboxes',   label: '🟩 Show Hitboxes (debug)' },
    ];

    container.innerHTML = authorRow + defs.map(d => `
      <div class="setting-row">
        <label class="setting-label">${d.label}</label>
        <input type="range" class="setting-slider" data-key="${d.key}"
          min="${d.min}" max="${d.max}" step="${d.step}"
          value="${KQ_SETTINGS.get(d.key)}" />
        <span class="setting-val" id="sv-${d.key}">${Number(KQ_SETTINGS.get(d.key)).toFixed(d.step < 1 ? 1 : 0)}</span>
      </div>
    `).join('') + toggleDefs.map(t => `
      <div class="setting-row">
        <label class="setting-label">${t.label}</label>
        <input type="checkbox" class="setting-check" data-key="${t.key}"
          ${KQ_SETTINGS.get(t.key) ? 'checked' : ''} />
      </div>
    `).join('');

    const authorInput = container.querySelector('#sv-authorName');
    if (authorInput) {
      authorInput.addEventListener('input', () => KQ_SETTINGS.set('authorName', authorInput.value.trim()));
    }

    container.querySelectorAll('.setting-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        KQ_SETTINGS.set(slider.dataset.key, val);
        const lbl = container.querySelector(`#sv-${slider.dataset.key}`);
        if (lbl) lbl.textContent = val.toFixed(slider.step < 1 ? 1 : 0);
      });
    });
    container.querySelectorAll('.setting-check').forEach(cb => {
      cb.addEventListener('change', () => KQ_SETTINGS.set(cb.dataset.key, cb.checked));
    });

    // Color tint section
    const tintDefs = [
      { key: 'tintPlayer', label: '🦸 Hero Color' },
      { key: 'tintWalker', label: '👾 Walker Enemy' },
      { key: 'tintJumper', label: '🐸 Jumper Enemy' },
      { key: 'tintFlyer',  label: '🦋 Flyer Enemy' },
      { key: 'tintCoin',   label: '⭐ Coin Color' },
    ];
    const tintSection = document.createElement('div');
    tintSection.innerHTML = `
      <div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08)">
        <div style="font-size:13px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🎨 Color Tints</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:10px">Mix in a color on top of your characters! Leave blank for no tint.</div>
        ${tintDefs.map(t => `
          <div class="setting-row">
            <label class="setting-label">${t.label}</label>
            <input type="color" data-tint-key="${t.key}"
              value="${KQ_SETTINGS.get(t.key) || '#ffffff'}"
              style="width:40px;height:32px;border:none;background:none;cursor:pointer;border-radius:6px"/>
            <button data-tint-clear="${t.key}" style="padding:4px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#94a3b8;font-size:11px;cursor:pointer">✖ Clear</button>
          </div>
        `).join('')}
      </div>`;
    container.appendChild(tintSection);

    tintSection.querySelectorAll('[data-tint-key]').forEach(input => {
      input.addEventListener('input', () => KQ_SETTINGS.set(input.dataset.tintKey, input.value));
    });
    tintSection.querySelectorAll('[data-tint-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        KQ_SETTINGS.set(btn.dataset.tintClear, '');
        const inp = tintSection.querySelector(`[data-tint-key="${btn.dataset.tintClear}"]`);
        if (inp) inp.value = '#ffffff';
      });
    });
  }

  // ── Export ─────────────────────────────────────────────────
  async function _exportGame() {
    try {
      // Collect all JS and CSS source files as text
      const filesToFetch = [
        'js/settings.js', 'js/gamepad.js', 'js/artmanager.js',
        'js/assets.js', 'js/levels.js', 'js/editor.js', 'js/game.js', 'style.css'
      ];
      const fetched = {};
      for (const f of filesToFetch) {
        try { fetched[f] = await (await fetch(f)).text(); }
        catch (e) { fetched[f] = `/* could not load ${f} */`; }
      }

      // Collect all uploaded art as data URLs
      const artOverrides = {};
      if (window.KQ_ART) {
        for (const slot of KQ_ART.getSlots()) {
          const dataURL = KQ_ART.getDataURL(slot.key);
          if (dataURL) artOverrides[slot.key] = dataURL;
        }
      }

      const authorName = KQ_SETTINGS.get('authorName') || '';
      const bakedSettings = KQ_SETTINGS.getAll();

      // Build a self-contained index.html with all JS inlined
      const html = _buildExportHTML(fetched, artOverrides, authorName, bakedSettings);
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const safeName = authorName ? authorName.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-game' : 'my-game';
      a.download = safeName + '.html';
      a.click();
      URL.revokeObjectURL(a.href);

      const artCount = Object.keys(artOverrides).length;
      alert(
        '✅ Game exported!\n\n' +
        (artCount > 0
          ? `🎨 Your pictures are included! Your friend will see YOUR drawings, not colored boxes.\n(${artCount} custom picture${artCount !== 1 ? 's' : ''} baked in)\n\n`
          : '') +
        (authorName ? `Made by: ${authorName}\n\n` : '') +
        'Just send the .html file — your friend opens it in any browser!\n' +
        'No extra files needed.'
      );
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  function _buildExportHTML(files, artOverrides, authorName, bakedSettings) {
    artOverrides = artOverrides || {};
    authorName = authorName || '';
    bakedSettings = bakedSettings || {};
    const title = authorName ? `My Game by ${authorName}` : 'My Game';
    const madeByHTML = authorName
      ? `<p style="text-align:center;color:#94a3b8;font-size:13px;margin:6px 0 0">Made by <strong style="color:#fbbf24">${authorName}</strong> 🎮</p>`
      : '';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"/>
  <title>${title}</title>
  <style>${files['style.css']}</style>
</head>
<body>
  <main id="gameShell">
    <canvas id="game" width="960" height="540" aria-label="Platformer Game"></canvas>
    <div id="gpToast" style="position:fixed;top:16px;right:16px;background:#1e293b;color:#fbbf24;padding:10px 18px;border-radius:10px;font:bold 15px system-ui;opacity:0;transition:opacity .4s;pointer-events:none;z-index:9999"></div>
    <section id="menuPanel" style="display:flex">
      <div class="big-menu">
        <div class="game-title-area">
          <img src="assets/art/title-logo.png" alt="Game Title" class="title-logo-img"
               onerror="this.style.display='none'; document.getElementById('title-text').style.display='block'"/>
          <div id="title-text" class="title-text-fallback" style="display:none">${title}</div>
        </div>
        ${madeByHTML}
        <div class="big-button-row">
          <button class="kid-btn kid-btn-play" id="btn-play">
            <span class="kid-btn-icon">▶️</span>
            <span class="kid-btn-label">PLAY!</span>
            <span class="kid-btn-sub">Start the game</span>
          </button>
        </div>
        <div class="advanced-row">
          <button class="small-btn" id="btn-howtoplay">❓ How to Play</button>
          <button class="small-btn" id="btn-settings">⚙️ Settings</button>
        </div>
        <!-- Hidden stubs so game.js event wiring doesn't crash -->
        <button id="btn-editor"  style="display:none"></button>
        <button id="btn-art"     style="display:none"></button>
        <button id="btn-export"  style="display:none"></button>
      </div>
    </section>
    <section id="artPanel" style="display:none"><div id="art-slots-container"></div></section>
    <section id="settingsPanel" style="display:none">
      <div class="menu-card settings-card">
        <div class="panel-header">
          <button class="back-btn" id="btn-settings-back">← Back</button>
          <h2 class="panel-title">⚙️ Game Settings</h2>
        </div>
        <div id="settings-sliders"></div>
        <button class="small-btn" id="btn-settings-reset" style="margin-top:12px">🔄 Reset Defaults</button>
      </div>
    </section>
    <section id="editorPanel" style="display:none">
      <div id="editorSidePanel"></div>
    </section>
    <nav id="touchControls" aria-label="Touch controls">
      <div class="touch-left">
        <button data-touch="left" aria-label="Move left">◀</button>
        <button data-touch="right" aria-label="Move right">▶</button>
      </div>
      <div class="touch-right">
        <button data-touch="jump"  aria-label="Jump"  class="touch-a">A</button>
        <button data-touch="shoot" aria-label="Shoot" class="touch-b">B</button>
        <button data-touch="dash"  aria-label="Dash"  class="touch-dash">💨</button>
      </div>
    </nav>
  </main>
  <script>
// Baked-in art from the game creator
const _bakedArt = ${JSON.stringify(artOverrides)};
for (const [k, v] of Object.entries(_bakedArt)) {
  try { localStorage.setItem('kq_art_v1_' + k, v); } catch(e) {}
}
// Baked-in settings (genre, physics, tints) — must run before settings.js loads
try { localStorage.setItem('kq_settings', ${JSON.stringify(JSON.stringify(bakedSettings))}); } catch(e) {}
</script>
  <script>${files['js/settings.js']}</script>
  <script>${files['js/gamepad.js']}</script>
  <script>${files['js/artmanager.js']}</script>
  <script>${files['js/assets.js']}</script>
  <script>${files['js/levels.js']}</script>
  <script>${files['js/editor.js']}</script>
  <script>${files['js/game.js']}</script>
</body>
</html>`;
  }

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    loadImages();

    // Init level editor with canvas + side panel
    const edPanel = document.getElementById('editorSidePanel');
    if (edPanel) KQ_EDITOR.init(canvas, edPanel);

    _initMenuEvents();
    _showMenuPanel();

    // Set up a blank level so the canvas has something to draw on startup
    levelIndex = 0;
    resetLevel(true);

    requestAnimationFrame(loop);
  }

  boot();
})();
