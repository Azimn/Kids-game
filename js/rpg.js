// ============================================================
//  KQ_RPG — Dungeon Adventure RPG Framework
//  Canvas: 960×540  |  Tile: 48  |  Grid: 20×11
// ============================================================
window.KQ_RPG = (() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const TILE = 48;
  const COLS = 20;
  const ROWS = 11;
  const W = 960;
  const H = 540;
  const PANEL_W = 200;          // right-side stats panel width
  const MAP_W = W - PANEL_W;    // 760 px map area

  // ── Internal state ─────────────────────────────────────────
  const rpg = {
    phase: 'classselect',   // classselect | dialog | overworld | battle
    classIdx: 0,            // highlighted class (0=Warrior,1=Wizard,2=Rogue)
    dialogPage: 0,
    dialogLines: [],
    dialogCallback: null,
    player: null,
    enemies: [],            // overworld enemy objects
    npc: null,
    npcTalked: false,
    exit: { tx: 18, ty: 5 },
    battleState: null,      // active battle data
    menuIdx: 0,             // battle menu selection
    phase2Timer: 0,         // generic timer (animation pause, etc.)
    pendingPhase: null,
    clickX: -1, clickY: -1, // mouse click this frame
    _clickHandler: null,
  };

  // ── Class definitions ───────────────────────────────────────
  const CLASSES = [
    {
      name: 'Warrior', icon: '⚔️',
      hp: 120, mp: 20, atk: 18, def: 14,
      color: '#c0392b',
      spell: { name: 'Power Strike', cost: 8, mult: 1.5, type: 'physical' },
      desc: 'Tanky fighter with high DEF',
    },
    {
      name: 'Wizard', icon: '🧙',
      hp: 65, mp: 100, atk: 8, def: 5,
      color: '#8e44ad',
      spell: { name: 'Fireball', cost: 15, mult: 3.0, type: 'magic' },
      desc: 'Glass cannon — huge magic damage',
    },
    {
      name: 'Rogue', icon: '🗡️',
      hp: 90, mp: 50, atk: 14, def: 9,
      color: '#27ae60',
      spell: { name: 'Vanish', cost: 10, mult: 0, type: 'stun' },
      desc: 'Balanced — stuns enemy one turn',
    },
  ];

  // ── Enemy templates ─────────────────────────────────────────
  const ENEMY_TEMPLATES = [
    { name: 'Goblin',     color: '#2ecc71', hp: 15, atk: 6,  def: 2, exp: 8,  gold: 5,  isBoss: false },
    { name: 'Orc',        color: '#e67e22', hp: 25, atk: 10, def: 5, exp: 15, gold: 10, isBoss: false },
    { name: 'Dark Knight',color: '#7f8c8d', hp: 50, atk: 16, def: 8, exp: 30, gold: 25, isBoss: true  },
  ];

  // ── Overworld map layout (0=floor, 1=wall) ──────────────────
  // 20 cols × 11 rows
  const RAW_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];
  // 2 = exit tile position (marked in row 5, col 18)

  // ── Helpers ─────────────────────────────────────────────────
  function ctx() { return window._KQ_CTX; }
  function pressed(k) { return window._KQ_PRESSED && window._KQ_PRESSED(k); }
  function beep(t) { window._KQ_BEEP && window._KQ_BEEP(t); }
  function setMode(m) { window._KQ_SETMODE && window._KQ_SETMODE(m); }

  function rnd(n) { return Math.floor(Math.random() * (n + 1)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function isSolidTile(tx, ty) {
    if (tx < 0 || ty < 0 || ty >= ROWS || tx >= COLS) return true;
    const v = RAW_MAP[ty][tx];
    return v === 1;
  }

  // ── Draw helpers ─────────────────────────────────────────────
  function fillRect(x, y, w, h, color) {
    const c = ctx(); c.fillStyle = color; c.fillRect(x, y, w, h);
  }

  function strokeRect(x, y, w, h, color, lw) {
    const c = ctx(); c.strokeStyle = color; c.lineWidth = lw || 2; c.strokeRect(x, y, w, h);
  }

  function drawText(text, x, y, size, color, align) {
    const c = ctx();
    c.font = `bold ${size}px sans-serif`;
    c.fillStyle = color;
    c.textAlign = align || 'left';
    c.fillText(text, x, y);
  }

  function drawBar(x, y, w, h, pct, bg, fg) {
    fillRect(x, y, w, h, bg);
    fillRect(x, y, Math.round(w * clamp(pct, 0, 1)), h, fg);
    strokeRect(x, y, w, h, '#000', 1);
  }

  function overlay(alpha) {
    fillRect(0, 0, W, H, `rgba(0,0,0,${alpha})`);
  }

  // ── Player factory ───────────────────────────────────────────
  function makePlayer(classIdx) {
    const cl = CLASSES[classIdx];
    return {
      classIdx,
      name: cl.name,
      color: cl.color,
      lvl: 1,
      hp: cl.hp, maxHp: cl.hp,
      mp: cl.mp, maxMp: cl.mp,
      atk: cl.atk, def: cl.def,
      exp: 0, nextExp: 20,
      gold: 0,
      potions: 2,
      // overworld position (pixel)
      x: 2 * TILE + 8,
      y: 5 * TILE + 8,
      w: 28, h: 32,
      vx: 0, vy: 0,
    };
  }

  // ── Overworld enemies ────────────────────────────────────────
  function makeOverworldEnemies() {
    return [
      { idx: 0, tx: 5,  ty: 3, defeated: false },
      { idx: 1, tx: 10, ty: 7, defeated: false },
      { idx: 2, tx: 16, ty: 3, defeated: false },  // boss
    ];
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    rpg.phase = 'classselect';
    rpg.classIdx = 0;
    rpg.dialogPage = 0;
    rpg.player = null;
    rpg.enemies = makeOverworldEnemies();
    rpg.npcTalked = false;
    rpg.battleState = null;
    rpg.menuIdx = 0;
    rpg.phase2Timer = 0;
    rpg.clickX = -1; rpg.clickY = -1;

    // Register mouse click listener (remove old one first)
    if (rpg._clickHandler) {
      const cv = document.getElementById('game');
      if (cv) cv.removeEventListener('click', rpg._clickHandler);
    }
    rpg._clickHandler = (e) => {
      const cv = document.getElementById('game');
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      rpg.clickX = (e.clientX - rect.left) * scaleX;
      rpg.clickY = (e.clientY - rect.top)  * scaleY;
    };
    const cv = document.getElementById('game');
    if (cv) cv.addEventListener('click', rpg._clickHandler);
  }

  // ── CLASS SELECT ─────────────────────────────────────────────
  const BTN_W = 200, BTN_H = 260, BTN_Y = 130, BTN_GAP = 40;
  const BTN_STARTS = [80, 80 + BTN_W + BTN_GAP, 80 + (BTN_W + BTN_GAP) * 2];

  function updateClassSelect() {
    // Keyboard nav
    if (pressed('left'))  { rpg.classIdx = (rpg.classIdx + 2) % 3; beep('menu'); }
    if (pressed('right')) { rpg.classIdx = (rpg.classIdx + 1) % 3; beep('menu'); }
    if (pressed('shoot') || pressed('jump')) { confirmClass(rpg.classIdx); return; }

    // Mouse click
    if (rpg.clickX >= 0) {
      for (let i = 0; i < 3; i++) {
        const bx = BTN_STARTS[i];
        if (rpg.clickX >= bx && rpg.clickX <= bx + BTN_W &&
            rpg.clickY >= BTN_Y && rpg.clickY <= BTN_Y + BTN_H) {
          confirmClass(i); break;
        }
      }
      rpg.clickX = -1; rpg.clickY = -1;
    }
  }

  function confirmClass(idx) {
    rpg.classIdx = idx;
    rpg.player = makePlayer(idx);
    beep('power');
    startDialog([
      "A shadow has fallen over the land...\nmonsters fill the dungeon below.\nOnly a brave hero can save the kingdom!",
      "You enter the dungeon. Strange sounds\necho in the darkness... defeat the\ndungeon boss to escape!",
    ], () => { rpg.phase = 'overworld'; });
  }

  function renderClassSelect() {
    const c = ctx();
    // Background
    fillRect(0, 0, W, H, '#1a0a2e');
    // Stars
    c.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      // deterministic "random" stars
      const sx = ((i * 137 + 29) % W);
      const sy = ((i * 97  + 13) % H);
      c.fillRect(sx, sy, 1, 1);
    }
    // Title
    drawText('⚔  DUNGEON ADVENTURE  ⚔', W / 2, 80, 32, '#f1c40f', 'center');
    drawText('Choose your class:', W / 2, 115, 18, '#bdc3c7', 'center');

    for (let i = 0; i < 3; i++) {
      const cl = CLASSES[i];
      const bx = BTN_STARTS[i];
      const selected = i === rpg.classIdx;
      // Button bg
      fillRect(bx, BTN_Y, BTN_W, BTN_H, selected ? '#2c1a5e' : '#1e1040');
      strokeRect(bx, BTN_Y, BTN_W, BTN_H, selected ? '#f1c40f' : '#555', selected ? 3 : 1);
      // Class color swatch
      fillRect(bx + BTN_W / 2 - 30, BTN_Y + 18, 60, 60, cl.color);
      strokeRect(bx + BTN_W / 2 - 30, BTN_Y + 18, 60, 60, '#000', 1);
      drawText(cl.icon, bx + BTN_W / 2, BTN_Y + 62, 28, '#fff', 'center');
      // Name
      drawText(cl.name, bx + BTN_W / 2, BTN_Y + 105, 20, selected ? '#f1c40f' : '#ecf0f1', 'center');
      // Stats
      const stats = [
        `HP ${cl.hp}  MP ${cl.mp}`,
        `ATK ${cl.atk}  DEF ${cl.def}`,
        cl.spell.name,
        cl.desc,
      ];
      stats.forEach((line, li) => {
        drawText(line, bx + BTN_W / 2, BTN_Y + 130 + li * 22, 13, '#bdc3c7', 'center');
      });
      if (selected) {
        drawText('▼ SELECT ▼', bx + BTN_W / 2, BTN_Y + BTN_H - 16, 14, '#f1c40f', 'center');
      }
    }
    drawText('◄ ► to highlight  |  JUMP/SHOOT to confirm', W / 2, H - 14, 13, '#7f8c8d', 'center');
  }

  // ── DIALOG ───────────────────────────────────────────────────
  function startDialog(lines, callback) {
    rpg.phase = 'dialog';
    rpg.dialogLines = lines;
    rpg.dialogPage = 0;
    rpg.dialogCallback = callback;
    rpg._dialogCooldown = 0.18; // prevent instant advance
  }

  function updateDialog(dt) {
    if (rpg._dialogCooldown > 0) { rpg._dialogCooldown -= dt; return; }
    if (pressed('shoot') || pressed('jump') || rpg.clickX >= 0) {
      rpg.clickX = -1; rpg.clickY = -1;
      rpg.dialogPage++;
      rpg._dialogCooldown = 0.18;
      if (rpg.dialogPage >= rpg.dialogLines.length) {
        rpg.phase = 'dialog_done';
        if (rpg.dialogCallback) rpg.dialogCallback();
      }
      beep('menu');
    }
  }

  function renderDialog() {
    // Draw whatever is behind (overworld or classselect bg)
    if (rpg.phase === 'dialog' || rpg.phase === 'dialog_done') {
      // Dark overlay
      overlay(0.65);
      const bx = 80, by = H / 2 - 80, bw = W - 160, bh = 160;
      fillRect(bx, by, bw, bh, '#0d0721');
      strokeRect(bx, by, bw, bh, '#f1c40f', 2);
      // Speaker label
      drawText('📜 Story', bx + 18, by + 24, 16, '#f1c40f', 'left');
      // Text lines
      const page = rpg.dialogLines[Math.min(rpg.dialogPage, rpg.dialogLines.length - 1)] || '';
      const lines = page.split('\n');
      lines.forEach((ln, li) => {
        drawText(ln, bx + 18, by + 52 + li * 26, 16, '#ecf0f1', 'left');
      });
      // Prompt
      const pageNum = rpg.dialogPage + 1;
      const total   = rpg.dialogLines.length;
      drawText(
        pageNum < total ? 'JUMP/SHOOT → next page' : 'JUMP/SHOOT → continue',
        bx + bw - 18, by + bh - 14, 13, '#f1c40f', 'right'
      );
    }
  }

  // ── OVERWORLD ────────────────────────────────────────────────
  function updateOverworld(dt) {
    const p = rpg.player;
    const speed = 150 * (window.KQ_SETTINGS ? window.KQ_SETTINGS.get('speedMult') : 1);

    // Movement
    let mx = 0, my = 0;
    if (pressed('left'))  mx = -1;
    if (pressed('right')) mx =  1;
    if (pressed('up'))    my = -1;
    if (pressed('down'))  my =  1;

    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;

    // Tile collision
    if (!collidesWithWall(nx, p.y, p.w, p.h)) p.x = clamp(nx, 0, MAP_W - p.w);
    if (!collidesWithWall(p.x, ny, p.w, p.h)) p.y = clamp(ny, 0, H - p.h);

    // Check enemy contact
    for (const e of rpg.enemies) {
      if (e.defeated) continue;
      const ex = e.tx * TILE + 8, ey = e.ty * TILE + 8;
      const ew = 32, eh = 32;
      if (rectsOverlap(p.x, p.y, p.w, p.h, ex, ey, ew, eh)) {
        startBattle(e);
        return;
      }
    }

    // NPC contact
    if (!rpg.npcTalked) {
      const nx2 = 2 * TILE, ny2 = 2 * TILE;
      if (rectsOverlap(p.x, p.y, p.w, p.h, nx2, ny2, 32, 32)) {
        rpg.npcTalked = true;
        startDialog([
          "Adventurer! This dungeon has three\nguardians. Defeat them all to\nunlock the exit stairs!",
          "Use ATTACK to fight, MAGIC costs MP\nbut hits hard. Potions heal 30 HP.\nGood luck — you'll need it!",
        ], () => { rpg.phase = 'overworld'; });
        return;
      }
    }

    // Exit check
    const allDefeated = rpg.enemies.every(e => e.defeated);
    if (allDefeated) {
      const ex = rpg.exit.tx * TILE, ey = rpg.exit.ty * TILE;
      if (rectsOverlap(p.x, p.y, p.w, p.h, ex, ey, TILE, TILE)) {
        beep('win');
        startDialog(["Victory! The dungeon is saved!\nYou are a true hero!"], () => {
          setMode('win');
        });
      }
    }
  }

  function collidesWithWall(px, py, pw, ph) {
    // Check all four corners + centers of edges
    const points = [
      [px, py], [px + pw - 1, py],
      [px, py + ph - 1], [px + pw - 1, py + ph - 1],
    ];
    for (const [x, y] of points) {
      if (isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE))) return true;
    }
    return false;
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function renderOverworld() {
    const c = ctx();
    // Draw map
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const v = RAW_MAP[row][col];
        const x = col * TILE, y = row * TILE;
        if (x + TILE > MAP_W) continue; // don't overdraw into panel
        if (v === 1) {
          fillRect(x, y, TILE, TILE, '#2c3e50');
          strokeRect(x, y, TILE, TILE, '#1a252f', 1);
          // pillar top decoration
          fillRect(x + 4, y + 4, TILE - 8, 6, '#34495e');
        } else {
          fillRect(x, y, TILE, TILE, '#5d4e37');
          strokeRect(x, y, TILE, TILE, '#4a3d2b', 1);
          // subtle floor pattern
          c.fillStyle = 'rgba(0,0,0,0.08)';
          c.fillRect(x + 2, y + 2, 20, 20);
          c.fillRect(x + 26, y + 26, 20, 20);
        }
      }
    }

    // Draw exit
    const allDefeated = rpg.enemies.every(e => e.defeated);
    const ex = rpg.exit.tx * TILE, ey = rpg.exit.ty * TILE;
    if (ex + TILE <= MAP_W) {
      fillRect(ex, ey, TILE, TILE, allDefeated ? '#f39c12' : '#555');
      drawText(allDefeated ? '🚪' : '🔒', ex + TILE / 2, ey + TILE - 6, 28, '#fff', 'center');
    }

    // Draw NPC
    if (!rpg.npcTalked) {
      fillRect(2 * TILE + 4, 2 * TILE + 4, 32, 32, '#3498db');
      strokeRect(2 * TILE + 4, 2 * TILE + 4, 32, 32, '#2980b9', 2);
      drawText('?', 2 * TILE + 20, 2 * TILE + 26, 18, '#fff', 'center');
    }

    // Draw enemies
    for (const e of rpg.enemies) {
      if (e.defeated) continue;
      const tmpl = ENEMY_TEMPLATES[e.idx];
      const ex2 = e.tx * TILE + 8, ey2 = e.ty * TILE + 8;
      // Circle face
      c.beginPath();
      c.arc(ex2 + 16, ey2 + 16, 16, 0, Math.PI * 2);
      c.fillStyle = tmpl.color;
      c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
      // Eyes
      c.fillStyle = '#000';
      c.fillRect(ex2 + 9,  ey2 + 10, 4, 4);
      c.fillRect(ex2 + 19, ey2 + 10, 4, 4);
      // Mouth (frown for boss, neutral for others)
      c.beginPath();
      if (tmpl.isBoss) {
        c.arc(ex2 + 16, ey2 + 24, 6, 0, Math.PI);
        c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
      } else {
        c.fillRect(ex2 + 10, ey2 + 22, 12, 3);
      }
      // Boss crown
      if (tmpl.isBoss) {
        drawText('👑', ex2 + 16, ey2 - 2, 14, '#f1c40f', 'center');
      }
    }

    // Draw player
    const p = rpg.player;
    fillRect(p.x, p.y, p.w, p.h, p.color);
    strokeRect(p.x, p.y, p.w, p.h, '#000', 2);
    // Hero face
    fillRect(p.x + 6,  p.y + 8,  5, 5, '#1a0a2e');
    fillRect(p.x + 17, p.y + 8,  5, 5, '#1a0a2e');
    fillRect(p.x + 8,  p.y + 18, 12, 3, '#1a0a2e');
    // Class initial
    drawText(p.name[0], p.x + p.w / 2, p.y + p.h + 12, 11, '#f1c40f', 'center');

    // Stats panel (right side)
    renderStatsPanel();

    // Hint text
    drawText('Arrow keys: move  |  Approach enemies to fight  |  Find the exit 🚪',
      MAP_W / 2, H - 8, 12, '#95a5a6', 'center');
  }

  function renderStatsPanel() {
    const p = rpg.player;
    const px = MAP_W; // panel starts here
    fillRect(px, 0, PANEL_W, H, '#0d0721');
    strokeRect(px, 0, PANEL_W, H, '#f1c40f', 2);

    // Portrait
    const portSize = 80;
    fillRect(px + 60, 12, portSize, portSize, p.color);
    strokeRect(px + 60, 12, portSize, portSize, '#f1c40f', 2);
    drawText(p.name[0], px + 60 + portSize / 2, 12 + portSize - 16, 36, '#fff', 'center');

    let y = 108;
    drawText(p.name, px + PANEL_W / 2, y, 15, '#f1c40f', 'center'); y += 18;
    drawText(`${CLASSES[p.classIdx].icon} Lv.${p.lvl}`, px + PANEL_W / 2, y, 14, '#ecf0f1', 'center'); y += 22;

    // HP bar
    drawText('HP', px + 10, y, 13, '#e74c3c', 'left');
    drawText(`${p.hp}/${p.maxHp}`, px + PANEL_W - 8, y, 12, '#ecf0f1', 'right'); y += 4;
    drawBar(px + 10, y, PANEL_W - 20, 12, p.hp / p.maxHp, '#5d1616', '#e74c3c'); y += 20;

    // MP bar
    drawText('MP', px + 10, y, 13, '#3498db', 'left');
    drawText(`${p.mp}/${p.maxMp}`, px + PANEL_W - 8, y, 12, '#ecf0f1', 'right'); y += 4;
    drawBar(px + 10, y, PANEL_W - 20, 12, p.mp / p.maxMp, '#162a5d', '#3498db'); y += 22;

    drawText(`ATK ${p.atk}   DEF ${p.def}`, px + PANEL_W / 2, y, 13, '#ecf0f1', 'center'); y += 20;
    drawText(`💰 Gold: ${p.gold}`, px + PANEL_W / 2, y, 13, '#f1c40f', 'center'); y += 18;
    drawText(`EXP: ${p.exp}/${p.nextExp}`, px + PANEL_W / 2, y, 13, '#2ecc71', 'center'); y += 18;

    // EXP bar
    drawBar(px + 10, y, PANEL_W - 20, 8, p.exp / p.nextExp, '#1a4a1a', '#2ecc71'); y += 16;
    drawText(`🧪 Potions: ${p.potions}`, px + PANEL_W / 2, y, 13, '#1abc9c', 'center');
  }

  // ── BATTLE ───────────────────────────────────────────────────
  function startBattle(overworldEnemy) {
    const tmpl = ENEMY_TEMPLATES[overworldEnemy.idx];
    beep('hurt');
    rpg.phase = 'battle';
    rpg.menuIdx = 0;
    rpg.battleState = {
      overworldRef: overworldEnemy,
      enemy: {
        name: tmpl.name,
        color: tmpl.color,
        hp: tmpl.hp, maxHp: tmpl.hp,
        atk: tmpl.atk, def: tmpl.def,
        exp: tmpl.exp, gold: tmpl.gold,
        isBoss: tmpl.isBoss,
        stunned: false,
      },
      log: [`A wild ${tmpl.name} appears!`],
      turn: 'player',   // 'player' | 'enemy' | 'anim' | 'over'
      animTimer: 0,
      pendingMsg: '',
      result: null,     // 'win' | 'lose' | 'run'
    };
    rpg._inputCooldown = 0.25;
  }

  const BATTLE_ACTIONS = ['Attack', 'Magic', 'Item', 'Run'];

  function pushLog(bs, msg) {
    bs.log.push(msg);
    if (bs.log.length > 6) bs.log.shift();
  }

  function calcPhysDamage(atk, def) {
    return Math.max(1, Math.floor(atk - def / 2) + rnd(Math.floor(atk / 3)));
  }

  function calcMagicDamage(p, enemy) {
    const spell = CLASSES[p.classIdx].spell;
    if (spell.type === 'stun') return 0;
    if (spell.type === 'physical') return Math.max(1, Math.floor(p.atk * spell.mult - enemy.def / 4));
    // magic type
    return Math.max(1, Math.floor(p.atk * spell.mult - enemy.def / 4));
  }

  function updateBattle(dt) {
    const bs = rpg.battleState;
    if (!bs) return;

    if (rpg._inputCooldown > 0) { rpg._inputCooldown -= dt; }

    // Animation pause between actions
    if (bs.turn === 'anim') {
      bs.animTimer -= dt;
      if (bs.animTimer <= 0) {
        bs.turn = bs._nextTurn || 'player';
      }
      return;
    }

    if (bs.turn === 'over') return;

    if (bs.turn === 'player') {
      if (rpg._inputCooldown > 0) return;
      if (pressed('up'))   { rpg.menuIdx = (rpg.menuIdx + 3) % 4; beep('menu'); rpg._inputCooldown = 0.18; }
      if (pressed('down')) { rpg.menuIdx = (rpg.menuIdx + 1) % 4; beep('menu'); rpg._inputCooldown = 0.18; }

      if (pressed('shoot') || pressed('jump')) {
        rpg._inputCooldown = 0.25;
        executePlayerAction(rpg.menuIdx);
      }
      return;
    }

    if (bs.turn === 'enemy') {
      // Enemy attacks (boss attacks twice)
      doEnemyTurn();
    }
  }

  function executePlayerAction(idx) {
    const bs = rpg.battleState;
    const p  = rpg.player;
    const e  = bs.enemy;

    if (idx === 0) {
      // Attack
      const dmg = calcPhysDamage(p.atk, e.def);
      e.hp -= dmg;
      pushLog(bs, `${p.name} attacks for ${dmg} damage!`);
      beep('shoot');
    } else if (idx === 1) {
      // Magic
      const spell = CLASSES[p.classIdx].spell;
      if (p.mp < spell.cost) { pushLog(bs, 'Not enough MP!'); return; }
      p.mp -= spell.cost;
      if (spell.type === 'stun') {
        e.stunned = true;
        pushLog(bs, `${p.name} uses ${spell.name}! Enemy is stunned!`);
        beep('power');
      } else {
        const dmg = calcMagicDamage(p, e);
        e.hp -= dmg;
        pushLog(bs, `${p.name} casts ${spell.name} for ${dmg} damage!`);
        beep('power');
      }
    } else if (idx === 2) {
      // Item (potion)
      if (p.potions <= 0) { pushLog(bs, 'No potions left!'); return; }
      p.potions--;
      const heal = 30;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      pushLog(bs, `${p.name} drinks a potion and heals ${heal} HP!`);
      beep('coin');
    } else if (idx === 3) {
      // Run (50% chance)
      if (Math.random() < 0.5) {
        pushLog(bs, `${p.name} escaped!`);
        beep('jump');
        endBattle('run');
        return;
      } else {
        pushLog(bs, "Couldn't escape!");
        beep('hurt');
      }
    }

    // Check if enemy defeated
    if (e.hp <= 0) {
      e.hp = 0;
      endBattle('win');
      return;
    }

    // Pause then enemy turn
    bs.turn = 'anim';
    bs.animTimer = 0.5;
    bs._nextTurn = 'enemy';
  }

  function doEnemyTurn() {
    const bs = rpg.battleState;
    const p  = rpg.player;
    const e  = bs.enemy;
    const attacks = e.isBoss ? 2 : 1;

    if (e.stunned) {
      e.stunned = false;
      pushLog(bs, `${e.name} is stunned and loses their turn!`);
    } else {
      for (let i = 0; i < attacks; i++) {
        const dmg = calcPhysDamage(e.atk, p.def);
        const invincible = window.KQ_SETTINGS && window.KQ_SETTINGS.get('invincibleMode');
        if (!invincible) p.hp -= dmg;
        pushLog(bs, `${e.name} attacks${attacks > 1 ? ' (#' + (i + 1) + ')' : ''} for ${dmg} damage!`);
        beep('hurt');
        if (p.hp <= 0) { p.hp = 0; break; }
      }
    }

    // Check hero dead
    if (p.hp <= 0) {
      endBattle('lose');
      return;
    }

    bs.turn = 'anim';
    bs.animTimer = 0.4;
    bs._nextTurn = 'player';
  }

  function endBattle(result) {
    const bs = rpg.battleState;
    const p  = rpg.player;

    if (result === 'win') {
      const e = bs.enemy;
      bs.overworldRef.defeated = true;
      p.exp  += e.exp;
      p.gold += e.gold;
      pushLog(bs, `Victory! +${e.exp} EXP, +${e.gold} gold!`);
      beep('coin');

      // Level up check
      while (p.exp >= p.nextExp) {
        p.exp -= p.nextExp;
        p.lvl++;
        p.nextExp = p.lvl * 20;
        const hpGain = 15;
        p.maxHp += hpGain;
        p.hp = p.maxHp;
        p.atk = Math.round(p.atk * 1.05);
        p.def = Math.round(p.def * 1.05);
        pushLog(bs, `🎉 Level Up! Now Lv.${p.lvl}!`);
        beep('power');
      }

      if (window._KQ_GAME) window._KQ_GAME.score += e.exp * 10;
    }

    bs.result = result;
    bs.turn   = 'over';
    rpg._inputCooldown = 0.6;

    // After short delay return to overworld or handle gameover
    setTimeout(() => {
      if (result === 'lose') {
        startDialog(["You were defeated...\nRest and try again."], () => {
          setMode('gameover');
        });
      } else {
        rpg.phase = 'overworld';
        rpg.battleState = null;
      }
    }, result === 'win' ? 1800 : 1200);
  }

  function renderBattle() {
    const bs = rpg.battleState;
    if (!bs) return;
    const p  = rpg.player;
    const e  = bs.enemy;
    const c  = ctx();

    // Background gradient
    const grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d0721');
    grad.addColorStop(1, '#1a0a2e');
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    // Floor line
    fillRect(0, 360, W, 4, '#2c1a5e');

    // ── Hero portrait (left) ──
    const heroX = 80, heroY = 180;
    fillRect(heroX, heroY, 80, 100, p.color);
    strokeRect(heroX, heroY, 80, 100, '#f1c40f', 3);
    drawText(p.name[0], heroX + 40, heroY + 65, 44, '#fff', 'center');
    // Shake if just got hit (simple: no state needed, enemy turn flickers)
    drawText(p.name, heroX + 40, heroY - 18, 14, '#f1c40f', 'center');
    // Player HP bar
    drawText(`HP ${p.hp}/${p.maxHp}`, heroX + 40, heroY + 116, 12, '#e74c3c', 'center');
    drawBar(heroX, heroY + 118, 80, 10, p.hp / p.maxHp, '#5d1616', '#e74c3c');
    drawText(`MP ${p.mp}/${p.maxMp}`, heroX + 40, heroY + 142, 12, '#3498db', 'center');
    drawBar(heroX, heroY + 144, 80, 10, p.mp / p.maxMp, '#162a5d', '#3498db');

    // ── Enemy portrait (right) ──
    const enX = W - 240, enY = 160;
    // HP bar above enemy
    drawBar(enX - 20, enY - 26, 120, 14, e.hp / e.maxHp, '#5d1616', '#e74c3c');
    strokeRect(enX - 20, enY - 26, 120, 14, '#000', 1);
    drawText(`${e.name}  ${e.hp}/${e.maxHp}`, enX + 40, enY - 30, 12, '#ecf0f1', 'center');

    c.beginPath();
    c.arc(enX + 40, enY + 50, 50, 0, Math.PI * 2);
    c.fillStyle = e.color;
    c.fill();
    c.strokeStyle = e.stunned ? '#f39c12' : '#000';
    c.lineWidth = 3; c.stroke();
    // Enemy face
    c.fillStyle = '#000';
    c.fillRect(enX + 20, enY + 30, 8, 8);
    c.fillRect(enX + 52, enY + 30, 8, 8);
    c.beginPath();
    c.arc(enX + 40, enY + 62, 10, 0, Math.PI);
    c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
    if (e.isBoss) drawText('👑', enX + 40, enY - 4, 18, '#f1c40f', 'center');
    if (e.stunned) drawText('💫 STUNNED', enX + 40, enY + 118, 14, '#f39c12', 'center');

    // ── Action menu (bottom-left) ──
    const mnX = 30, mnY = 380;
    fillRect(mnX, mnY, 220, 130, 'rgba(13,7,33,0.92)');
    strokeRect(mnX, mnY, 220, 130, '#f1c40f', 2);
    drawText('Action', mnX + 10, mnY + 18, 14, '#f1c40f', 'left');
    BATTLE_ACTIONS.forEach((act, i) => {
      const sel = i === rpg.menuIdx;
      if (sel) fillRect(mnX + 8, mnY + 26 + i * 24, 204, 22, 'rgba(241,196,15,0.2)');
      drawText(`${sel ? '▶ ' : '  '}${act}`, mnX + 14, mnY + 43 + i * 24, 15, sel ? '#f1c40f' : '#ecf0f1', 'left');
    });
    // Potion count
    drawText(`Potions: ${p.potions}`, mnX + 220 - 6, mnY + 126, 11, '#1abc9c', 'right');

    // ── Battle log (bottom-right) ──
    const logX = 270, logY = 380, logW = W - logX - 20, logH = 130;
    fillRect(logX, logY, logW, logH, 'rgba(13,7,33,0.92)');
    strokeRect(logX, logY, logW, logH, '#7f8c8d', 1);
    const lastMsgs = bs.log.slice(-4);
    lastMsgs.forEach((msg, i) => {
      const alpha = 0.4 + 0.6 * ((i + 1) / lastMsgs.length);
      drawText(msg, logX + 10, logY + 26 + i * 26, 14, `rgba(236,240,241,${alpha})`, 'left');
    });

    // Turn indicator
    if (bs.turn === 'player') {
      drawText('Your turn — ↑↓ to select, JUMP/SHOOT to act', W / 2, H - 10, 12, '#f1c40f', 'center');
    } else if (bs.turn === 'enemy' || bs.turn === 'anim') {
      drawText('Enemy is acting...', W / 2, H - 10, 12, '#e74c3c', 'center');
    } else if (bs.turn === 'over') {
      const col = bs.result === 'win' ? '#2ecc71' : bs.result === 'run' ? '#f39c12' : '#e74c3c';
      const msg = bs.result === 'win' ? '🏆 Enemy Defeated!' : bs.result === 'run' ? 'Escaped!' : '💀 Defeated!';
      drawText(msg, W / 2, H / 2, 36, col, 'center');
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────
  function update(dt) {
    dt = Math.min(dt, 0.1); // clamp for tab-switch spikes

    switch (rpg.phase) {
      case 'classselect': updateClassSelect();     break;
      case 'dialog':      updateDialog(dt);        break;
      case 'overworld':   updateOverworld(dt);     break;
      case 'battle':      updateBattle(dt);        break;
    }

    // Reset click after processing
    if (rpg.clickX >= 0) { rpg.clickX = -1; rpg.clickY = -1; }
  }

  // ── RENDER ────────────────────────────────────────────────────
  function render() {
    const c = ctx();
    c.save();

    switch (rpg.phase) {
      case 'classselect':
        renderClassSelect();
        break;
      case 'dialog':
        // Render a simple dark bg behind dialog if not yet in overworld
        if (!rpg.player) {
          fillRect(0, 0, W, H, '#1a0a2e');
        } else {
          renderOverworld();
        }
        renderDialog();
        break;
      case 'overworld':
        renderOverworld();
        break;
      case 'battle':
        renderBattle();
        // Overlay dialog on top if needed
        if (rpg._dialogOnBattle) renderDialog();
        break;
    }

    // FX layer
    if (window._KQ_FX_DRAW) window._KQ_FX_DRAW();
    // Hint layer
    if (window._KQ_HINT) window._KQ_HINT.draw();

    c.restore();
  }

  // ── Public API ────────────────────────────────────────────────
  return { init, update, render };

})();
