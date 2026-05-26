// zelda.js — Top-down Zelda-style Puzzle Room framework
// Canvas: 960x540, TILE=48, Room 20x11 tiles (960x528), HUD 12px strip at bottom
(function () {
  'use strict';

  const T = 48, COLS = 20, ROWS = 11;
  const ROOM_W = COLS * T; // 960
  const ROOM_H = ROWS * T; // 528
  const HUD_Y = ROOM_H;    // 528

  // ── Tile IDs ──────────────────────────────────────────────────────────────
  const FLOOR=0, WALL=1, PUSH_BLOCK=2, SW_OFF=3, SW_ON=4,
        LOCK_DOOR=5, OPEN_DOOR=6, CHEST=7, CHEST_OPEN=8, EXIT=9;

  // ── Build room grid: outer border = WALL, inner 9×18 rows ────────────────
  function buildRoom(inner) {
    // inner[row 0..8][col 0..17] maps to grid[1..9][1..18]
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS-1 || c === 0 || c === COLS-1)
          row.push(WALL);
        else
          row.push(inner[r-1][c-1]);
      }
      grid.push(row);
    }
    return grid;
  }

  function cloneGrid(g) { return g.map(r => r.slice()); }

  // Room templates (base layouts; specific tiles patched below)
  const TEMPLATES = [
    // Room 0 — Entry Hall: two alcoves, chest, locked door
    buildRoom([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ]),
    // Room 1 — Switch Puzzle
    buildRoom([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ]),
    // Room 2 — Boss Room
    buildRoom([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ]),
  ];

  // Patch specific tiles
  TEMPLATES[0][2][17] = CHEST;       // Room 0: chest at col17 row2
  TEMPLATES[0][5][19] = LOCK_DOOR;   // Room 0: locked door at col19 row5 (right wall)
  TEMPLATES[1][5][4]  = PUSH_BLOCK;  // Room 1: pushable block col4 row5
  TEMPLATES[1][5][15] = SW_OFF;      // Room 1: switch col15 row5
  TEMPLATES[1][5][19] = LOCK_DOOR;   // Room 1: locked door col19 row5
  TEMPLATES[2][5][17] = EXIT;        // Room 2: exit col17 row5

  // ── State variables ───────────────────────────────────────────────────────
  let rooms, currentRoom, player, enemies, projectiles;
  let fadeAlpha, fadeDir, fadeCb;
  let gameState; // 'play' | 'win' | 'dead' | 'transition'

  // ── Entity factories ──────────────────────────────────────────────────────
  function makePlayer(x, y) {
    return { x, y, w: 28, h: 32,
      dir: 1, hp: 6, maxHp: 6,
      hasKey: false,
      invTimer: 0, swordTimer: 0, swordCool: 0, swordActive: false };
  }

  function makeSlime(x, y) {
    return { type:'slime', x, y, w:28, h:28, hp:2, maxHp:2,
      walkTimer: Math.random(), walkInterval: 0.8 + Math.random()*0.7,
      dx:0, dy:0, speed:60, hurtTimer:0, dead:false };
  }

  function makeBoss(x, y) {
    return { type:'boss', x, y, w:48, h:48, hp:8, maxHp:8,
      walkTimer:0, walkInterval:1.2,
      dx:0, dy:0, speed:40, hurtTimer:0, dead:false,
      shootTimer:0, shootInterval:2.5 };
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    rooms = TEMPLATES.map(cloneGrid);
    currentRoom = 0;
    player = makePlayer(2*T + 10, 5*T + 8);
    projectiles = [];
    fadeAlpha = 0; fadeDir = 0; fadeCb = null;
    gameState = 'play';
    spawnEnemies();
  }

  function spawnEnemies() {
    enemies = [];
    if (currentRoom === 0) {
      enemies.push(makeSlime(8*T+8, 3*T+8));
      enemies.push(makeSlime(10*T+8, 7*T+8));
    } else if (currentRoom === 1) {
      enemies.push(makeSlime(7*T+8, 3*T+8));
      enemies.push(makeSlime(12*T+8, 7*T+8));
      enemies.push(makeSlime(9*T+8, 5*T+8));
    } else if (currentRoom === 2) {
      enemies.push(makeBoss(13*T, 4*T));
    }
  }

  // ── Tile helpers ──────────────────────────────────────────────────────────
  function tileAt(room, c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return WALL;
    return rooms[room][r][c];
  }
  function setTile(room, c, r, v) { rooms[room][r][c] = v; }
  function isSolid(t) { return t === WALL || t === PUSH_BLOCK || t === LOCK_DOOR; }

  // ── AABB ──────────────────────────────────────────────────────────────────
  function overlaps(ax,ay,aw,ah, bx,by,bw,bh) {
    return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
  }

  function canPlace(room, ex, ey, ew, eh) {
    const c0=Math.floor(ex/T), c1=Math.floor((ex+ew-1)/T);
    const r0=Math.floor(ey/T), r1=Math.floor((ey+eh-1)/T);
    for (let r=r0; r<=r1; r++)
      for (let c=c0; c<=c1; c++)
        if (isSolid(tileAt(room,c,r))) return false;
    return true;
  }

  function moveEntity(room, e, nx, ny) {
    if (canPlace(room, nx, e.y, e.w, e.h)) e.x = nx;
    if (canPlace(room, e.x, ny, e.w, e.h)) e.y = ny;
    e.x = Math.max(0, Math.min(ROOM_W - e.w, e.x));
    e.y = Math.max(0, Math.min(ROOM_H - e.h, e.y));
  }

  // ── Sword hitbox ──────────────────────────────────────────────────────────
  function getSwordBox(p) {
    const sw=44, sh=36, reach=44;
    if (p.dir===0) return {x:p.x+p.w/2-sw/2, y:p.y-reach, w:sw, h:sh};
    if (p.dir===1) return {x:p.x+p.w/2-sw/2, y:p.y+p.h,   w:sw, h:sh};
    if (p.dir===2) return {x:p.x-reach, y:p.y+p.h/2-sh/2,  w:sh, h:sw};
    return             {x:p.x+p.w, y:p.y+p.h/2-sh/2,       w:sh, h:sw};
  }

  // ── Block pushing ─────────────────────────────────────────────────────────
  function tryPush(room, bc, br, dc, dr) {
    const nc=bc+dc, nr=br+dr;
    const dest = tileAt(room, nc, nr);
    if (dest === FLOOR) {
      setTile(room, bc, br, FLOOR);
      setTile(room, nc, nr, PUSH_BLOCK);
      return true;
    }
    if (dest === SW_OFF) {
      setTile(room, bc, br, FLOOR);
      setTile(room, nc, nr, SW_ON);
      // Unlock all locked doors in this room
      for (let r=0; r<ROWS; r++)
        for (let c=0; c<COLS; c++)
          if (rooms[room][r][c] === LOCK_DOOR) rooms[room][r][c] = OPEN_DOOR;
      window._KQ_BEEP('power');
      return true;
    }
    return false;
  }

  function checkBlockPush(mx, my) {
    const p = player;
    const dc = mx>0?1: mx<0?-1:0;
    const dr = my>0?1: my<0?-1:0;
    if (!dc && !dr) return;
    // Tiles the player's leading edge overlaps
    const lx = dc>0 ? p.x+p.w+1 : dc<0 ? p.x-1 : p.x;
    const ly = dr>0 ? p.y+p.h+1 : dr<0 ? p.y-1 : p.y;
    const c0=Math.floor(lx/T), c1=Math.floor((lx+(dc?0:p.w-1))/T);
    const r0=Math.floor(ly/T), r1=Math.floor((ly+(dr?0:p.h-1))/T);
    for (let r=r0; r<=r1; r++)
      for (let c=c0; c<=c1; c++)
        if (tileAt(currentRoom,c,r)===PUSH_BLOCK) tryPush(currentRoom,c,r,dc,dr);
  }

  // ── Fade & room transition ────────────────────────────────────────────────
  function startFade(cb) {
    fadeDir = 1; fadeAlpha = 0; fadeCb = cb;
    gameState = 'transition';
  }

  function updateFade(dt) {
    if (gameState !== 'transition') return;
    fadeAlpha += fadeDir * dt / 0.3;
    if (fadeDir > 0 && fadeAlpha >= 1) {
      fadeAlpha = 1;
      if (fadeCb) { fadeCb(); fadeCb = null; }
      fadeDir = -1;
    } else if (fadeDir < 0 && fadeAlpha <= 0) {
      fadeAlpha = 0; fadeDir = 0;
      gameState = 'play';
    }
  }

  function goRoom(nextRoom, px, py) {
    startFade(() => {
      currentRoom = nextRoom;
      player.x = px; player.y = py;
      projectiles = [];
      spawnEnemies();
    });
  }

  // ── Player update ─────────────────────────────────────────────────────────
  function updatePlayer(dt) {
    const p = player;
    const speed = 180 * ((window.KQ_SETTINGS && window.KQ_SETTINGS.get('speedMult')) || 1);

    if (p.invTimer > 0) p.invTimer -= dt;
    if (p.swordCool > 0) p.swordCool -= dt;
    if (p.swordTimer > 0) { p.swordTimer -= dt; if (p.swordTimer <= 0) p.swordActive = false; }

    // Sword swing
    if ((window._KQ_PRESSED('shoot') || window._KQ_PRESSED('jump')) && p.swordCool <= 0) {
      p.swordActive = true; p.swordTimer = 0.2; p.swordCool = 1.4;
      window._KQ_BEEP('shoot');
    }

    // Movement
    let mx=0, my=0;
    if (window._KQ_PRESSED('left'))  { mx=-1; p.dir=2; }
    if (window._KQ_PRESSED('right')) { mx= 1; p.dir=3; }
    if (window._KQ_PRESSED('up'))    { my=-1; p.dir=0; }
    if (window._KQ_PRESSED('down'))  { my= 1; p.dir=1; }
    if (mx && my) { mx*=0.707; my*=0.707; }

    if (mx || my) checkBlockPush(mx, my);

    moveEntity(currentRoom, p, p.x + mx*speed*dt, p.y + my*speed*dt);

    checkTileInteract();
  }

  function checkTileInteract() {
    const p = player;
    const cc = Math.floor((p.x + p.w/2) / T);
    const cr = Math.floor((p.y + p.h/2) / T);
    const tile = tileAt(currentRoom, cc, cr);

    if (tile === CHEST) {
      p.hasKey = true;
      setTile(currentRoom, cc, cr, CHEST_OPEN);
      window._KQ_BEEP('coin');
      window._KQ_GAME.score += 100;
      if (window._KQ_HINT) window._KQ_HINT.show('zelda_key', ['You found a key!', 'Unlock the door on the right wall.']);
    }

    if (tile === LOCK_DOOR && p.hasKey) {
      setTile(currentRoom, cc, cr, OPEN_DOOR);
      p.hasKey = false;
      window._KQ_BEEP('power');
    }

    // Room exit via open door on right wall col 19 row 5
    if (tile === OPEN_DOOR && cc === 19 && cr === 5) {
      if (currentRoom === 0) goRoom(1, T+4, 5*T+8);
      else if (currentRoom === 1) goRoom(2, T+4, 5*T+8);
    }

    if (tile === EXIT) {
      window._KQ_BEEP('win');
      window._KQ_GAME.score += 500;
      gameState = 'win';
    }
  }

  // ── Enemy update ──────────────────────────────────────────────────────────
  function updateEnemies(dt) {
    const p = player;
    const sb = p.swordActive ? getSwordBox(p) : null;

    for (let i = enemies.length-1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dead) { enemies.splice(i,1); continue; }
      if (e.hurtTimer > 0) e.hurtTimer -= dt;

      // Walk AI
      e.walkTimer -= dt;
      if (e.walkTimer <= 0) {
        e.walkTimer = e.walkInterval + Math.random()*0.4;
        const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
        const d = DIRS[Math.floor(Math.random()*4)];
        e.dx = d[0]; e.dy = d[1];
      }
      moveEntity(currentRoom, e, e.x + e.dx*e.speed*dt, e.y + e.dy*e.speed*dt);

      // Boss shoots
      if (e.type === 'boss') {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.shootInterval;
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          projectiles.push({x:e.x+e.w/2, y:e.y+e.h/2,
            vx:Math.cos(ang)*120, vy:Math.sin(ang)*120, r:4});
        }
      }

      // Contact with player
      if (p.invTimer <= 0 && overlaps(p.x,p.y,p.w,p.h, e.x,e.y,e.w,e.h)) {
        hurtPlayer(1);
      }

      // Sword hit
      if (sb && overlaps(sb.x,sb.y,sb.w,sb.h, e.x,e.y,e.w,e.h)) {
        const dmg = e.type==='boss' ? 2 : 1;
        e.hp -= dmg; e.hurtTimer = 0.3;
        window._KQ_BEEP('stomp');
        if (e.hp <= 0) {
          e.dead = true;
          window._KQ_GAME.score += e.type==='boss' ? 300 : 50;
          spawnParticles(e.x+e.w/2, e.y+e.h/2, e.type==='boss' ? '#ff8800' : '#44ff44');
        }
      }
    }
  }

  // ── Projectile update ─────────────────────────────────────────────────────
  function updateProjectiles(dt) {
    const p = player;
    for (let i = projectiles.length-1; i >= 0; i--) {
      const b = projectiles[i];
      b.x += b.vx*dt; b.y += b.vy*dt;
      if (b.x<0||b.x>ROOM_W||b.y<0||b.y>ROOM_H ||
          isSolid(tileAt(currentRoom, Math.floor(b.x/T), Math.floor(b.y/T)))) {
        projectiles.splice(i,1); continue;
      }
      if (p.invTimer <= 0 && overlaps(b.x-b.r,b.y-b.r,b.r*2,b.r*2, p.x,p.y,p.w,p.h)) {
        hurtPlayer(1); projectiles.splice(i,1);
      }
    }
  }

  function hurtPlayer(dmg) {
    player.hp = Math.max(0, player.hp - dmg);
    player.invTimer = 1.5;
    window._KQ_BEEP('hurt');
    if (player.hp <= 0) gameState = 'dead';
  }

  function spawnParticles(x, y, color) {
    const parts = window._KQ_GAME.particles;
    for (let i=0; i<8; i++) {
      const a = (Math.PI*2*i)/8;
      parts.push({x, y, vx:Math.cos(a)*80, vy:Math.sin(a)*80,
        life:0.5, maxLife:0.5, color, r:4});
    }
  }

  // ── Main update ───────────────────────────────────────────────────────────
  function update(dt) {
    if (gameState === 'transition') { updateFade(dt); return; }
    if (gameState === 'win' || gameState === 'dead') {
      if (window._KQ_PRESSED('jump') || window._KQ_PRESSED('shoot'))
        window._KQ_SETMODE && window._KQ_SETMODE('menu');
      return;
    }
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    if (window._KQ_FX_UPDATE) window._KQ_FX_UPDATE(dt);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const TILE_COLORS = {
    [WALL]:      ['#666688','#7777aa'],
    [FLOOR]:     null,
    [PUSH_BLOCK]:['#aa8844','#ffcc66'],
    [SW_OFF]:    ['#883333','#cc4444'],
    [SW_ON]:     ['#336633','#44ee44'],
    [LOCK_DOOR]: ['#553300','#ffcc00'],
    [OPEN_DOOR]: ['#224422','#44aa44'],
    [CHEST]:     ['#885500','#ffcc00'],
    [CHEST_OPEN]:['#885500','#664400'],
    [EXIT]:      ['#001133','#0055cc'],
  };

  function drawTile(ctx, tile, tx, ty) {
    // Base floor
    ctx.fillStyle = '#3a3a2a';
    ctx.fillRect(tx, ty, T, T);

    switch (tile) {
      case FLOOR:
        ctx.strokeStyle = '#3f3f2f'; ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty, T, T);
        break;
      case WALL:
        ctx.fillStyle = '#666688'; ctx.fillRect(tx, ty, T, T);
        ctx.fillStyle = '#7777aa'; ctx.fillRect(tx+2, ty+2, T-4, T-4);
        break;
      case PUSH_BLOCK:
        ctx.fillStyle = '#aa8844'; ctx.fillRect(tx+4, ty+4, T-8, T-8);
        ctx.strokeStyle = '#ffcc66'; ctx.lineWidth = 2;
        ctx.strokeRect(tx+8, ty+8, T-16, T-16);
        break;
      case SW_OFF:
        ctx.fillStyle = '#883333';
        ctx.beginPath(); ctx.arc(tx+T/2, ty+T/2, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#cc4444';
        ctx.beginPath(); ctx.arc(tx+T/2, ty+T/2, 9, 0, Math.PI*2); ctx.fill();
        break;
      case SW_ON:
        ctx.fillStyle = '#224422';
        ctx.beginPath(); ctx.arc(tx+T/2, ty+T/2, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#44ee44';
        ctx.beginPath(); ctx.arc(tx+T/2, ty+T/2, 9, 0, Math.PI*2); ctx.fill();
        break;
      case LOCK_DOOR:
        ctx.fillStyle = '#553300'; ctx.fillRect(tx, ty, T, T);
        ctx.fillStyle = '#bb8800'; ctx.fillRect(tx+14, ty+6, 20, 26);
        ctx.fillStyle = '#444400';
        ctx.beginPath(); ctx.arc(tx+T/2, ty+14, 7, 0, Math.PI*2); ctx.fill();
        break;
      case OPEN_DOOR:
        ctx.fillStyle = '#224422'; ctx.fillRect(tx, ty, T, T);
        ctx.fillStyle = '#44aa44'; ctx.fillRect(tx+4, ty+4, T-8, T-8);
        break;
      case CHEST:
        ctx.fillStyle = '#885500'; ctx.fillRect(tx+5, ty+12, T-10, T-20);
        ctx.fillStyle = '#cc9900'; ctx.fillRect(tx+5, ty+8, T-10, 9);
        ctx.fillStyle = '#ffee66'; ctx.fillRect(tx+T/2-3, ty+10, 6, 5);
        break;
      case CHEST_OPEN:
        ctx.fillStyle = '#885500'; ctx.fillRect(tx+5, ty+18, T-10, T-26);
        ctx.fillStyle = '#664400'; ctx.fillRect(tx+5, ty+8, T-10, 10);
        break;
      case EXIT:
        ctx.fillStyle = '#001133'; ctx.fillRect(tx, ty, T, T);
        ctx.fillStyle = '#0055cc'; ctx.fillRect(tx+5, ty+5, T-10, T-10);
        ctx.fillStyle = '#88bbff'; ctx.font='18px sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('★', tx+T/2, ty+T/2);
        ctx.textAlign='left';
        break;
    }
  }

  function drawEnemy(ctx, e) {
    const flash = e.hurtTimer > 0 && Math.floor(e.hurtTimer*20)%2===0;
    ctx.globalAlpha = flash ? 0.35 : 1;
    if (e.type === 'boss') {
      ctx.fillStyle = e.hurtTimer > 0 ? '#ff7755' : '#cc2200';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = e.hurtTimer > 0 ? '#ffaa88' : '#ff4400';
      ctx.fillRect(e.x+4, e.y+4, e.w-8, e.h-8);
      // eyes
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(e.x+8, e.y+12, 8, 8); ctx.fillRect(e.x+32, e.y+12, 8, 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(e.x+10, e.y+14, 4, 4); ctx.fillRect(e.x+34, e.y+14, 4, 4);
      // HP bar
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#330000'; ctx.fillRect(e.x, e.y-8, e.w, 5);
      ctx.fillStyle = '#ff2200'; ctx.fillRect(e.x, e.y-8, e.w*(e.hp/e.maxHp), 5);
    } else {
      ctx.fillStyle = e.hurtTimer > 0 ? '#ff9999' : '#44cc44';
      ctx.beginPath(); ctx.arc(e.x+e.w/2, e.y+e.h/2, e.w/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = e.hurtTimer > 0 ? '#ffcccc' : '#228822';
      ctx.beginPath(); ctx.arc(e.x+e.w/2, e.y+e.h/2, e.w/2-5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(e.x+6, e.y+8, 4, 5); ctx.fillRect(e.x+18, e.y+8, 4, 5);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(ctx) {
    const p = player;
    const blink = p.invTimer > 0 && Math.floor(p.invTimer*12)%2===0;
    if (blink) return;
    ctx.fillStyle = '#4488ff'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#2266dd'; ctx.fillRect(p.x+4, p.y+4, p.w-8, p.h-8);
    // Direction dot (white eye side)
    ctx.fillStyle = '#ffffff';
    if      (p.dir===1) { ctx.fillRect(p.x+5, p.y+8, 5,5); ctx.fillRect(p.x+18, p.y+8, 5,5); }
    else if (p.dir===0) { ctx.fillRect(p.x+5, p.y+16, 5,5); ctx.fillRect(p.x+18, p.y+16, 5,5); }
    else if (p.dir===2) { ctx.fillRect(p.x+5, p.y+10, 5,5); ctx.fillRect(p.x+5, p.y+20, 5,5); }
    else                { ctx.fillRect(p.x+18, p.y+10, 5,5); ctx.fillRect(p.x+18, p.y+20, 5,5); }
    // Sword arc
    if (p.swordActive) {
      const sb = getSwordBox(p);
      ctx.fillStyle = 'rgba(180,210,255,0.5)';
      ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
      ctx.strokeStyle = '#99bbff'; ctx.lineWidth = 2;
      ctx.strokeRect(sb.x, sb.y, sb.w, sb.h);
    }
  }

  function drawHUD(ctx, V) {
    // Bottom strip
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, HUD_Y, V.W, V.H - HUD_Y);
    const hy = HUD_Y + (V.H - HUD_Y) / 2;

    // Hearts (3 hearts = 6 HP)
    const totalHearts = 3;
    const filledHearts = Math.ceil(player.hp / 2);
    for (let i=0; i<totalHearts; i++) {
      const filled = i < filledHearts;
      ctx.fillStyle = filled ? '#ff3344' : '#554455';
      ctx.beginPath(); ctx.arc(16 + i*22, hy, 7, 0, Math.PI*2); ctx.fill();
      if (filled) {
        ctx.fillStyle = '#ff99aa';
        ctx.beginPath(); ctx.arc(13 + i*22, hy-2, 3, 0, Math.PI*2); ctx.fill();
      }
    }

    // Key indicator
    if (player.hasKey) {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 13px sans-serif';
      ctx.textBaseline = 'middle'; ctx.fillText('KEY', 84, hy);
    }

    // Score
    ctx.fillStyle = '#ffee88'; ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SCORE: ' + window._KQ_GAME.score, V.W/2, hy);

    // Room label
    const labels = ['Entry Hall','Switch Puzzle','Boss Room'];
    ctx.fillStyle = '#99aacc'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(labels[currentRoom], V.W - 94, hy);
    ctx.textAlign = 'left';
  }

  function drawMinimap(ctx, V) {
    const mx=V.W-88, my=4, mw=84, mh=42;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#445566'; ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);
    const spacing = mw / 4;
    for (let i=0; i<3; i++) {
      const dx = mx + spacing*(i+1), dy = my + mh/2;
      const active = i === currentRoom;
      ctx.fillStyle = active ? '#ffcc00' : '#2a3a4a';
      ctx.beginPath(); ctx.arc(dx, dy, active?8:5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = active ? '#ffee88' : '#445566';
      ctx.lineWidth = 1; ctx.stroke();
      if (i < 2) {
        ctx.strokeStyle = '#334455'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(dx+5, dy); ctx.lineTo(dx+spacing-5, dy); ctx.stroke();
      }
    }
  }

  function drawEndOverlay(ctx, V) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(V.W/2-210, V.H/2-85, 420, 170);
    ctx.strokeStyle = '#445566'; ctx.lineWidth = 2;
    ctx.strokeRect(V.W/2-210, V.H/2-85, 420, 170);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (gameState === 'win') {
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 38px sans-serif';
      ctx.fillText('YOU WIN!', V.W/2, V.H/2 - 30);
      ctx.fillStyle = '#ffffff'; ctx.font = '18px sans-serif';
      ctx.fillText('Puzzle Room Cleared! Score: ' + window._KQ_GAME.score, V.W/2, V.H/2 + 8);
    } else {
      ctx.fillStyle = '#ff4444'; ctx.font = 'bold 38px sans-serif';
      ctx.fillText('GAME OVER', V.W/2, V.H/2 - 30);
      ctx.fillStyle = '#ffffff'; ctx.font = '18px sans-serif';
      ctx.fillText('You ran out of hearts.', V.W/2, V.H/2 + 8);
    }
    ctx.fillStyle = '#888888'; ctx.font = '14px sans-serif';
    ctx.fillText('Press JUMP or SHOOT to continue', V.W/2, V.H/2 + 46);
    ctx.textAlign = 'left';
  }

  function render() {
    const ctx = window._KQ_CTX;
    const V = window._KQ_VIEW;
    ctx.save();

    // Draw room tiles
    const grid = rooms[currentRoom];
    for (let r=0; r<ROWS; r++)
      for (let c=0; c<COLS; c++)
        drawTile(ctx, grid[r][c], c*T, r*T);

    // Enemies
    for (const e of enemies) { if (!e.dead) drawEnemy(ctx, e); }

    // Projectiles
    ctx.fillStyle = '#ff5500';
    for (const b of projectiles) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    }

    // Player
    drawPlayer(ctx);

    // FX layer
    if (window._KQ_FX_DRAW) window._KQ_FX_DRAW();

    // HUD + minimap
    drawHUD(ctx, V);
    drawMinimap(ctx, V);

    // Hint
    if (window._KQ_HINT && window._KQ_HINT.draw) window._KQ_HINT.draw();

    // Fade overlay
    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, V.W, V.H);
    }

    // End overlay
    if (gameState === 'win' || gameState === 'dead') drawEndOverlay(ctx, V);

    ctx.restore();
  }

  // ── Export ────────────────────────────────────────────────────────────────
  window.KQ_ZELDA = { init, update, render };
}());
