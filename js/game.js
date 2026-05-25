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
  let mode        = "menu";   // menu | playing | paused | editor | settings | howtoplay | gameover | win | levelselect
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
    if (mode === "menu") {
      // Go to level select instead of directly playing
      mode = "levelselect";
      _hideAllPanels();
      return;
    }
    if (mode === "gameover" || mode === "win") {
      resetLevel(true); mode = "playing";
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
      p.x += p.vx * dt; p.life -= dt;
      let hitTile = false;
      queryTiles(p, (ch, tx, ty, r) => {
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
    }
    game.projectiles = game.projectiles.filter(p => p.life > 0);
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

  // ── Render helpers ─────────────────────────────────────────
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
        if (!drawImg((ASSETS.enemies||{}).jumper, e.x, e.y, e.w, e.h, { flip })) {
          ctx.fillStyle = '#f97316'; ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = '#111827';
          ctx.fillRect(e.x + (flip ? 22 : 8), e.y + 10, 6, 6);
        }
      } else if (e.type === 'flyer') {
        if (!drawImg((ASSETS.enemies||{}).flyer, e.x, e.y, e.w, e.h, { flip })) {
          ctx.fillStyle = '#c084fc'; ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = '#111827';
          ctx.fillRect(e.x + (flip ? 20 : 8), e.y + 8, 6, 6);
          // Wings
          ctx.fillStyle = 'rgba(192,132,252,0.5)';
          const wingFlap = Math.sin(game.time * 10) * 6;
          ctx.fillRect(e.x - 10, e.y + wingFlap, 10, 16);
          ctx.fillRect(e.x + e.w, e.y + wingFlap, 10, 16);
        }
      } else {
        if (!drawImg((ASSETS.enemies||{}).walker, e.x, e.y, e.w, e.h, { flip })) {
          ctx.fillStyle = "#fb923c"; ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = "#111827";
          ctx.fillRect(e.x + (flip ? 25 : 9), e.y + 10, 6, 6);
        }
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
    if (!drawImg(frame, player.x, player.y, player.w, player.h, { flip })) {
      ctx.fillStyle = player.power.giant ? "#a855f7" : "#2563eb";
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(player.x + (flip ? 8 : player.w - 14), player.y + 11, 6, 6);
    }
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
      if (!drawImg(ASSETS.projectile, p.x, p.y, p.w, p.h, { flip: p.dir < 0 })) {
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
    ctx.restore();
  }

  // ── Pause menu (card with buttons) ────────────────────────
  const PAUSE_BTNS = [
    { label: "▶ Resume",        action: () => { mode = "playing"; } },
    { label: "🔄 Restart Level", action: () => { resetLevel(true); mode = "playing"; } },
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
    if (mode === "playing") {
      updateMovingPlatforms(dt);
      updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt);
      updateEffects(dt); updateCamera(dt);
    } else {
      updateEffects(dt);
    }
  }

  function render() {
    const shakeX = screenShake > 0 ? (Math.random()-0.5)*screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random()-0.5)*screenShake : 0;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    if (mode === "editor") {
      KQ_EDITOR.render();
      return;
    }

    if (mode === "levelselect") {
      drawLevelSelect();
      return;
    }

    drawBackground();
    drawParallax();
    ctx.save();
    ctx.translate(Math.round(-cameraX + shakeX), Math.round(shakeY));
    drawWorld(); drawCollectibles(); drawEnemies(); drawProjectiles();
    drawPlayer(); drawEffects();
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

    // ── Main menu ──────────────────────────────────────────
    document.getElementById('btn-play').addEventListener('click', () => {
      ensureAudio(); beep('menu');
      mode = 'levelselect';
      _hideAllPanels();
    });

    document.getElementById('btn-editor').addEventListener('click', () => {
      beep('menu'); mode = 'editor';
      KQ_EDITOR.show();
      _showEditorPanel();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      beep('menu'); _buildSettingsUI(); _showSettingsPanel();
    });

    document.getElementById('btn-export').addEventListener('click', () => {
      beep('menu'); _exportGame();
    });

    document.getElementById('btn-howtoplay').addEventListener('click', () => {
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
    document.getElementById('btn-settings-back').addEventListener('click', () => {
      beep('menu'); _showMenuPanel();
    });
    document.getElementById('btn-settings-reset').addEventListener('click', () => {
      KQ_SETTINGS.reset(); _buildSettingsUI();
    });

    // ── Level editor new/load ──────────────────────────────
    document.getElementById('btn-editor-new').addEventListener('click', () => {
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

    container.innerHTML = defs.map(d => `
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

      // Build a self-contained index.html with all JS inlined
      const html = _buildExportHTML(fetched);
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'my-game.html';
      a.click();
      URL.revokeObjectURL(a.href);

      alert(
        '✅ Game exported!\n\n' +
        '"my-game.html" downloaded.\n\n' +
        'To share it with a friend:\n' +
        '1. Copy my-game.html\n' +
        '2. Copy your assets/art/ folder next to it\n' +
        '3. Your friend opens my-game.html in a browser!\n\n' +
        'The game works even without the art folder — it just shows coloured shapes.'
      );
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  function _buildExportHTML(files) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"/>
  <title>My Game</title>
  <style>${files['style.css']}</style>
</head>
<body>
  <main id="gameShell">
    <canvas id="game" width="960" height="540" aria-label="Platformer Game"></canvas>
    <div id="gpToast" style="position:fixed;top:16px;right:16px;background:#1e293b;color:#fbbf24;padding:10px 18px;border-radius:10px;font:bold 15px system-ui;opacity:0;transition:opacity .4s;pointer-events:none;z-index:9999"></div>
    <section id="menuPanel" style="display:flex">
      <div class="menu-card">
        <div class="menu-title">Placeholder Game</div>
        <p class="menu-sub">Replace title-logo.png to change the title!</p>
        <button class="menu-btn menu-btn-primary" id="btn-play">▶ Play Game</button>
        <button class="menu-btn" id="btn-editor">🗺 Level Editor</button>
        <button class="menu-btn" id="btn-settings">⚙ Settings &amp; Modifiers</button>
        <button class="menu-btn" id="btn-howtoplay">❓ How to Play</button>
        <button class="menu-btn" id="btn-export">📦 Export My Game</button>
      </div>
    </section>
    <section id="settingsPanel" style="display:none">
      <div class="menu-card settings-card">
        <div class="menu-title" style="font-size:28px">⚙ Settings</div>
        <p class="menu-sub">Tweak the game to make it your own!</p>
        <div id="settings-sliders"></div>
        <div style="display:flex;gap:12px;margin-top:18px">
          <button class="menu-btn" id="btn-settings-reset">🔄 Reset Defaults</button>
          <button class="menu-btn menu-btn-primary" id="btn-settings-back">← Back</button>
        </div>
      </div>
    </section>
    <section id="editorPanel" style="display:none">
      <div id="editorSidePanel"></div>
    </section>
    <nav id="touchControls" aria-label="Touch controls">
      <button data-touch="left">◀</button>
      <button data-touch="right">▶</button>
      <button data-touch="jump">A</button>
      <button data-touch="shoot">B</button>
      <button data-touch="dash">Dash</button>
    </nav>
  </main>
  <script>${files['js/settings.js']}</script>
  <script>${files['js/gamepad.js']}</script>
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
