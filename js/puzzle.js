// zelda.js — Top-down Zelda-style Puzzle Room framework
// Canvas: 960x540, TILE=48, Room 20x11 tiles = 960x528, HUD 12px bottom
(function () {
  'use strict';

  const TILE = 48, COLS = 20, ROWS = 11;
  const ROOM_W = COLS * TILE, ROOM_H = ROWS * TILE; // 960x528
  const T = { FLOOR:0, WALL:1, BLOCK:2, SW_OFF:3, SW_ON:4, LDOOR:5, ODOOR:6, CHEST:7, CHEST_OPEN:8, EXIT:9 };

  function art(key, x, y, w, h) {
    const path = window.KQ_ASSETS && window.KQ_ASSETS.puzzle && window.KQ_ASSETS.puzzle[key];
    return !!(path && window._KQ_DRAW_IMG && window._KQ_DRAW_IMG(path, x, y, w, h));
  }

  // ── Room definitions ────────────────────────────────────────────────────────
  function makeRoom(inner) {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      g.push([]);
      for (let c = 0; c < COLS; c++) {
        const border = r===0||r===ROWS-1||c===0||c===COLS-1;
        g[r].push(border ? T.WALL : T.FLOOR);
      }
    }
    inner(g);
    return g;
  }

  function buildRooms() {
    const r0 = makeRoom(g => {
      // two alcoves via interior walls
      for (let r=2;r<=4;r++) g[r][5]=T.WALL;
      for (let r=6;r<=8;r++) g[r][5]=T.WALL;
      for (let c=5;c<=7;c++) g[2][c]=T.WALL;
      for (let c=5;c<=7;c++) g[8][c]=T.WALL;
      g[2][17]=T.CHEST;          // chest with key
      g[5][19]=T.LDOOR;          // right wall locked door
    });
    const r1 = makeRoom(g => {
      g[5][4]=T.BLOCK;           // pushable block
      g[5][15]=T.SW_OFF;         // switch
      g[5][19]=T.LDOOR;          // right wall locked door (opens on switch)
      g[5][0]=T.ODOOR;           // left wall open door (back to room 0)
    });
    const r2 = makeRoom(g => {
      g[5][0]=T.ODOOR;           // left wall open door (from room 1)
      g[5][17]=T.EXIT;           // exit tile
    });
    return [r0, r1, r2];
  }

  // ── State ───────────────────────────────────────────────────────────────────
  let rooms, currentRoom, tiles;
  let player, enemies, projectiles;
  let hasKey, switchDone;
  let fadeAlpha, fadeDir, fadeCb;
  let gameState; // 'play','win','dead'
  let bossShootTimer;

  function initPlayer(x, y) {
    return { x, y, w:28, h:32, vx:0, vy:0, hp:6, maxHp:6,
             dir:1, swordTimer:0, swordCooldown:0, invTimer:0,
             hurtFlash:0, dead:false };
  }

  function spawnSlime(cx, cy, hp=2) {
    return { x:cx*TILE+10, y:cy*TILE+10, w:28, h:28,
             hp, maxHp:hp, walkTimer:0, walkDur:0, dx:0, dy:0,
             hurtTimer:0, isBoss:hp>2 };
  }

  function loadRoom(idx, px, py) {
    currentRoom = idx;
    tiles = rooms[idx].map(r => [...r]);
    projectiles = [];
    bossShootTimer = 2.5;
    if (idx === 0) {
      enemies = [spawnSlime(8,3), spawnSlime(12,7)];
    } else if (idx === 1) {
      enemies = [spawnSlime(8,3), spawnSlime(10,7), spawnSlime(14,3)];
    } else {
      enemies = [{ x:12*TILE, y:5*TILE-14, w:40, h:44,
                   hp:8, maxHp:8, walkTimer:0, walkDur:0, dx:0, dy:0,
                   hurtTimer:0, isBoss:true }];
    }
    player.x = px; player.y = py;
    player.swordTimer = 0; player.swordCooldown = 0;
    switchDone = switchDone || false;
  }

  // ── Tile helpers ─────────────────────────────────────────────────────────────
  function tileAt(r, c) {
    if (r<0||r>=ROWS||c<0||c>=COLS) return T.WALL;
    return tiles[r][c];
  }
  function setTile(r, c, v) { if(r>=0&&r<ROWS&&c>=0&&c<COLS) tiles[r][c]=v; }
  function isSolid(t) { return t===T.WALL||t===T.BLOCK||t===T.LDOOR; }

  // ── AABB helpers ─────────────────────────────────────────────────────────────
  function overlaps(a, b) {
    return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
  }

  function resolveAxis(obj, axis, delta) {
    obj[axis] += delta;
    const x1=Math.floor(obj.x/TILE), x2=Math.floor((obj.x+obj.w-1)/TILE);
    const y1=Math.floor(obj.y/TILE), y2=Math.floor((obj.y+obj.h-1)/TILE);
    let pushed = false;
    for (let r=y1;r<=y2;r++) for (let c=x1;c<=x2;c++) {
      if (!isSolid(tileAt(r,c))) continue;
      const tx=c*TILE, ty=r*TILE;
      if (axis==='x') {
        if (delta>0) obj.x=tx-obj.w; else obj.x=tx+TILE;
        // attempt block push
        if (tileAt(r,c)===T.BLOCK && !pushed) {
          pushed = tryPushBlock(r,c, delta>0?1:-1, 0);
        }
      } else {
        if (delta>0) obj.y=ty-obj.h; else obj.y=ty+TILE;
        if (tileAt(r,c)===T.BLOCK && !pushed) {
          pushed = tryPushBlock(r,c, 0, delta>0?1:-1);
        }
      }
    }
  }

  function tryPushBlock(br, bc, dc, dr) {
    const nr=br+dr, nc=bc+dc;
    if (tileAt(nr,nc)!==T.FLOOR && tileAt(nr,nc)!==T.SW_OFF) return false;
    const dest = tileAt(nr,nc);
    setTile(br,bc,T.FLOOR);
    setTile(nr,nc,T.BLOCK);
    if (dest===T.SW_OFF && !switchDone) {
      switchDone = true;
      // mark switch under block visually — block covers it; open all locked doors
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
        if (tiles[r][c]===T.LDOOR) setTile(r,c,T.ODOOR);
      }
      window._KQ_BEEP('power');
    }
    return true;
  }

  // ── Sword hitbox ─────────────────────────────────────────────────────────────
  function swordBox() {
    const p=player, reach=44, sw=44, sh=36;
    let sx=p.x, sy=p.y;
    if (p.dir===0) { sx=p.x+(p.w-sw)/2; sy=p.y-reach; }
    else if(p.dir===1){ sx=p.x+(p.w-sw)/2; sy=p.y+p.h; }
    else if(p.dir===2){ sx=p.x-reach; sy=p.y+(p.h-sh)/2; }
    else              { sx=p.x+p.w;   sy=p.y+(p.h-sh)/2; }
    return {x:sx,y:sy,w:sw,h:sh};
  }

  // ── Transitions ──────────────────────────────────────────────────────────────
  function startFade(dir, cb) { fadeAlpha=dir>0?0:1; fadeDir=dir; fadeCb=cb; }

  function checkTransition() {
    const p=player;
    const pc=Math.floor((p.x+p.w/2)/TILE);
    const pr=Math.floor((p.y+p.h/2)/TILE);
    const t=tileAt(pr,pc);
    if (t===T.LDOOR) return; // locked door blocks; open door allows passage
    // right wall passage
    if (pc>=COLS-1 && tileAt(pr,COLS-1)===T.ODOOR) {
      if (currentRoom<2) {
        startFade(1,()=>{ loadRoom(currentRoom+1, TILE+2, 5*TILE+8); startFade(-1,null); });
      }
    }
    // left wall passage
    if (pc<=0 && tileAt(pr,0)===T.ODOOR) {
      if (currentRoom>0) {
        startFade(1,()=>{ loadRoom(currentRoom-1, (COLS-2)*TILE-player.w-2, 5*TILE+8); startFade(-1,null); });
      }
    }
    // exit tile
    if (t===T.EXIT) {
      startFade(1,()=>{ gameState='win'; window._KQ_BEEP('win'); });
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    rooms = buildRooms();
    hasKey = false;
    switchDone = false;
    fadeAlpha = 0; fadeDir = 0; fadeCb = null;
    gameState = 'play';
    player = initPlayer(2*TILE+10, 5*TILE+8);
    loadRoom(0, 2*TILE+10, 5*TILE+8);
    window._KQ_HINT && window._KQ_HINT.show('zelda',[
      'Find the key in the chest!',
      'Space or B = swing sword',
      'Push block onto switch to open door'
    ]);
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  function update(dt) {
    if (gameState!=='play') {
      if (gameState==='win'||gameState==='dead') {
        if (window._KQ_PRESSED('jump')||window._KQ_PRESSED('shoot')) {
          if (gameState==='win') window._KQ_SETMODE && window._KQ_SETMODE('menu');
          else init();
        }
      }
      return;
    }
    updateFade(dt);
    if (fadeDir>0) return; // mid-fade out: pause
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    checkTransition();
    if (player.hp<=0 && gameState==='play') { gameState='dead'; window._KQ_BEEP('hurt'); }
  }

  function updateFade(dt) {
    if (fadeDir===0) return;
    fadeAlpha += fadeDir * dt / 0.3;
    if (fadeDir>0 && fadeAlpha>=1) { fadeAlpha=1; fadeDir=0; if(fadeCb){fadeCb(); fadeCb=null;} }
    if (fadeDir<0 && fadeAlpha<=0) { fadeAlpha=0; fadeDir=0; }
  }

  function updatePlayer(dt) {
    const p=player;
    const spd = 180 * (window.KQ_SETTINGS ? (window.KQ_SETTINGS.get('speedMult')||1) : 1);
    let mx=0, my=0;
    if (window._KQ_PRESSED('left'))  { mx=-1; p.dir=2; }
    if (window._KQ_PRESSED('right')) { mx= 1; p.dir=3; }
    if (window._KQ_PRESSED('up'))    { my=-1; p.dir=0; }
    if (window._KQ_PRESSED('down'))  { my= 1; p.dir=1; }
    if (mx&&my) { mx*=0.707; my*=0.707; }

    resolveAxis(p, 'x', mx*spd*dt);
    resolveAxis(p, 'y', my*spd*dt);
    // clamp inside room
    p.x=Math.max(0,Math.min(p.x, ROOM_W-p.w));
    p.y=Math.max(0,Math.min(p.y, ROOM_H-p.h));

    // sword
    if (p.swordCooldown>0) p.swordCooldown-=dt;
    if (p.swordTimer>0) p.swordTimer-=dt;
    if ((window._KQ_PRESSED('shoot')||window._KQ_PRESSED('jump')) && p.swordCooldown<=0) {
      p.swordTimer=0.2; p.swordCooldown=1.4;
      window._KQ_BEEP('shoot');
      // check sword hits
      const sb=swordBox();
      enemies.forEach(e => {
        if (e.hp<=0) return;
        if (overlaps(sb,e)) { hitEnemy(e, e.isBoss?2:1); }
      });
    }

    // invincibility
    if (p.invTimer>0) p.invTimer-=dt;

    // chest interaction
    const cx2=Math.floor((p.x+p.w/2)/TILE), cy2=Math.floor((p.y+p.h/2)/TILE);
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dc,dr])=>{
      const t=tileAt(cy2+dr,cx2+dc);
      if (t===T.CHEST && !hasKey) {
        setTile(cy2+dr,cx2+dc,T.CHEST_OPEN);
        hasKey=true;
        window._KQ_BEEP('coin');
        window._KQ_GAME && (window._KQ_GAME.score+=100);
      }
    });
    // use key on locked door
    if (hasKey) {
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dc,dr])=>{
        if (tileAt(cy2+dr,cx2+dc)===T.LDOOR) {
          setTile(cy2+dr,cx2+dc,T.ODOOR);
          hasKey=false;
          window._KQ_BEEP('power');
        }
      });
    }
  }

  function hitEnemy(e, dmg) {
    e.hp-=dmg; e.hurtTimer=0.3;
    if (e.hp<=0) {
      window._KQ_BEEP('stomp');
      window._KQ_GAME && (window._KQ_GAME.score+=e.isBoss?500:50);
      spawnParticles(e.x+e.w/2, e.y+e.h/2, e.isBoss?'#f80':'#4f4');
    } else window._KQ_BEEP('hurt');
  }

  function spawnParticles(x, y, color) {
    const g = window._KQ_GAME; if(!g) return;
    for (let i=0;i<10;i++) {
      const a=Math.random()*Math.PI*2, spd=40+Math.random()*80;
      g.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
        life:0.6,maxLife:0.6,r:4,color});
    }
  }

  function updateEnemies(dt) {
    const p=player;
    // boss shooting
    if (currentRoom===2 && enemies.length>0 && enemies[0].hp>0) {
      bossShootTimer-=dt;
      if (bossShootTimer<=0) {
        bossShootTimer=2.5;
        const b=enemies[0];
        const dx=(p.x+p.w/2)-(b.x+b.w/2), dy=(p.y+p.h/2)-(b.y+b.h/2);
        const len=Math.sqrt(dx*dx+dy*dy)||1;
        projectiles.push({x:b.x+b.w/2,y:b.y+b.h/2,vx:dx/len*120,vy:dy/len*120,r:4});
        window._KQ_BEEP('shoot');
      }
    }
    enemies.forEach(e => {
      if (e.hp<=0) return;
      if (e.hurtTimer>0) e.hurtTimer-=dt;
      // random walk
      e.walkTimer-=dt;
      if (e.walkTimer<=0) {
        const dirs=[[1,0],[-1,0],[0,1],[0,-1],[0,0]];
        const d=dirs[Math.floor(Math.random()*dirs.length)];
        e.dx=d[0]; e.dy=d[1];
        e.walkDur=0.8+Math.random()*0.7;
        e.walkTimer=e.walkDur;
      }
      const spd=e.isBoss?80:60;
      resolveAxis(e,'x',e.dx*spd*dt);
      resolveAxis(e,'y',e.dy*spd*dt);
      e.x=Math.max(0,Math.min(e.x,ROOM_W-e.w));
      e.y=Math.max(0,Math.min(e.y,ROOM_H-e.h));
      // hurt player
      if (p.invTimer<=0 && overlaps(p,e)) {
        p.hp-=1; p.invTimer=1.5;
        window._KQ_BEEP('hurt');
      }
    });
    // remove dead
    for (let i=enemies.length-1;i>=0;i--) { if(enemies[i].hp<=0) enemies.splice(i,1); }
  }

  function updateProjectiles(dt) {
    const p=player;
    for (let i=projectiles.length-1;i>=0;i--) {
      const b=projectiles[i];
      b.x+=b.vx*dt; b.y+=b.vy*dt;
      // wall collision
      const tc=Math.floor(b.x/TILE), tr=Math.floor(b.y/TILE);
      if (isSolid(tileAt(tr,tc))||b.x<0||b.x>ROOM_W||b.y<0||b.y>ROOM_H) {
        projectiles.splice(i,1); continue;
      }
      // player hit
      if (p.invTimer<=0) {
        const dist=Math.hypot(b.x-(p.x+p.w/2), b.y-(p.y+p.h/2));
        if (dist < b.r+14) {
          p.hp-=1; p.invTimer=1.5; window._KQ_BEEP('hurt');
          projectiles.splice(i,1);
        }
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function render() {
    const ctx = window._KQ_CTX;
    ctx.save();
    drawRoom(ctx);
    drawEnemies(ctx);
    drawPlayer(ctx);
    drawProjectiles(ctx);
    drawHUD(ctx);
    drawMinimap(ctx);
    window._KQ_FX_DRAW && window._KQ_FX_DRAW();
    window._KQ_HINT && window._KQ_HINT.draw();
    if (fadeAlpha>0) {
      ctx.globalAlpha=fadeAlpha;
      ctx.fillStyle='#000';
      ctx.fillRect(0,0,ROOM_W,ROOM_H);
      ctx.globalAlpha=1;
    }
    if (gameState==='win') {
      if (window._KQ_DRAW_CREDITS) { window._KQ_DRAW_CREDITS(ctx); }
      else drawOverlay(ctx,'YOU ESCAPED!','Puzzle solved - great job!','Press Space to continue','#ffd700');
    }
    if (gameState==='dead') drawOverlay(ctx,'GAME OVER','You ran out of hearts...','Press Space to try again','#ff4444');
    ctx.restore();
  }

  const TILE_COLORS = {
    [T.FLOOR]:'#c8b87a', [T.WALL]:'#5a4a3a', [T.BLOCK]:'#8b6914',
    [T.SW_OFF]:'#cc4444', [T.SW_ON]:'#44cc44', [T.LDOOR]:'#8b4513',
    [T.ODOOR]:'#c8a060', [T.CHEST]:'#d4a020', [T.CHEST_OPEN]:'#a07810',
    [T.EXIT]:'#40e080'
  };

  function drawRoom(ctx) {
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      const t=tiles[r][c];
      const px=c*TILE, py=r*TILE;
      ctx.fillStyle=TILE_COLORS[t]||'#888';
      ctx.fillRect(px,py,TILE,TILE);
      // details
      if (t===T.WALL) {
        ctx.fillStyle='#3a2a1a';
        ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
      } else if (t===T.CHEST||t===T.CHEST_OPEN) {
        if (art('chest', px+4, py+4, TILE-8, TILE-8)) continue;
        ctx.fillStyle=t===T.CHEST?'#c87000':'#7a5000';
        ctx.fillRect(px+6,py+8,TILE-12,TILE-16);
        ctx.fillStyle='#ffd700';
        ctx.fillRect(px+6,py+8,TILE-12,8);
        if (t===T.CHEST) { ctx.fillStyle='#000'; ctx.fillRect(px+TILE/2-3,py+12,6,6); }
      } else if (t===T.LDOOR||t===T.ODOOR) {
        if (art('door', px+4, py+4, TILE-8, TILE-8)) continue;
        ctx.fillStyle=t===T.LDOOR?'#5a2800':'#a07030';
        ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
        if (t===T.LDOOR) { ctx.fillStyle='#ffd700'; ctx.fillRect(px+TILE/2-5,py+TILE/2-3,10,6); }
      } else if (t===T.EXIT) {
        ctx.fillStyle='#20a050';
        ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
        ctx.fillStyle='#80ff80';
        ctx.font='bold 22px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('★',px+TILE/2,py+TILE/2);
      } else if (t===T.SW_OFF||t===T.SW_ON) {
        ctx.fillStyle=t===T.SW_OFF?'#991111':'#119911';
        ctx.beginPath();
        ctx.arc(px+TILE/2,py+TILE/2,12,0,Math.PI*2);
        ctx.fill();
      } else if (t===T.BLOCK) {
        if (art('block', px+4, py+4, TILE-8, TILE-8)) continue;
        ctx.fillStyle='#a07820';
        ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
        ctx.strokeStyle='#c09830'; ctx.lineWidth=2;
        ctx.strokeRect(px+4,py+4,TILE-8,TILE-8);
      }
      // grid line subtle
      ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=0.5;
      ctx.strokeRect(px,py,TILE,TILE);
    }
  }

  function drawPlayer(ctx) {
    const p=player;
    const blink = p.invTimer>0 && Math.floor(p.invTimer/0.1)%2===0;
    if (blink) return;
    // body
    if (art('hero', p.x, p.y, p.w, p.h)) return;
    ctx.fillStyle='#4488ff';
    ctx.fillRect(p.x,p.y,p.w,p.h);
    // face direction indicator
    ctx.fillStyle='#ffcc88';
    const fx=p.x+p.w/2, fy=p.y+p.h/2;
    ctx.fillRect(p.x+4,p.y+2,p.w-8,14);
    // eyes
    ctx.fillStyle='#222';
    if (p.dir===1||p.dir===0) {
      const ey = p.dir===1?p.y+6:p.y+4;
      ctx.fillRect(p.x+6,ey,4,4); ctx.fillRect(p.x+p.w-10,ey,4,4);
    }
    // sword swing
    if (p.swordTimer>0) {
      const sb=swordBox();
      ctx.fillStyle='rgba(200,200,255,0.7)';
      ctx.fillRect(sb.x,sb.y,sb.w,sb.h);
      ctx.fillStyle='#aaeeff';
      ctx.fillRect(sb.x+sb.w/2-2,sb.y+sb.h/2-2,4,4);
    }
    void fx; void fy;
  }

  function drawEnemies(ctx) {
    enemies.forEach(e=>{
      if (e.hp<=0) return;
      const flash=e.hurtTimer>0;
      if (!flash && art(e.isBoss ? 'boss' : 'slime', e.x, e.y, e.w, e.h)) return;
      ctx.fillStyle=flash?'#ff4444':(e.isBoss?'#cc44cc':'#44cc44');
      ctx.fillRect(e.x,e.y,e.w,e.h);
      // eyes
      ctx.fillStyle='#000';
      ctx.fillRect(e.x+5,e.y+6,5,5); ctx.fillRect(e.x+e.w-10,e.y+6,5,5);
      // boss HP bar
      if (e.isBoss) {
        const bw=60, bx=e.x+(e.w-bw)/2, by=e.y-10;
        ctx.fillStyle='#400'; ctx.fillRect(bx,by,bw,6);
        ctx.fillStyle='#f04'; ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),6);
      }
    });
  }

  function drawProjectiles(ctx) {
    projectiles.forEach(b=>{
      ctx.fillStyle='#ff8800';
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffee00';
      ctx.beginPath(); ctx.arc(b.x-1,b.y-1,b.r-2,0,Math.PI*2); ctx.fill();
    });
  }

  function drawHUD(ctx) {
    // HUD strip at y=528 (12px)
    ctx.fillStyle='#1a1a2e';
    ctx.fillRect(0,ROOM_H,960,12);
    // Also draw full HUD at top overlay
    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,300,36);
    // Hearts
    const hp=player.hp;
    for (let i=0;i<3;i++) {
      const filled = hp>=(i*2+2);
      const half   = !filled && hp>=(i*2+1);
      ctx.fillStyle=filled?'#ff2244':(half?'#ff6688':'#553344');
      ctx.beginPath();
      const hx=14+i*38, hy=14;
      // simple heart shape via bezier
      ctx.save(); ctx.translate(hx,hy);
      ctx.beginPath();
      ctx.moveTo(0,4);
      ctx.bezierCurveTo(-10,-6,-16,6,0,16);
      ctx.bezierCurveTo(16,6,10,-6,0,4);
      ctx.fill();
      ctx.restore();
    }
    // Score
    ctx.fillStyle='#ffd700';
    ctx.font='bold 14px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
    const score = window._KQ_GAME ? window._KQ_GAME.score : 0;
    ctx.fillText('★ '+ score, 130, 18);
    ctx.fillStyle='#e2e8f0';
    ctx.font='bold 12px sans-serif';
    ctx.fillText('Space/B: sword', 130, 32);
    // Key
    if (hasKey) {
      if (!art('key', 218, 4, 24, 24)) {
        ctx.fillStyle='#ffd700';
        ctx.font='bold 16px sans-serif';
        ctx.fillText('Key', 220, 14);
      }
    }
  }

  function drawMinimap(ctx) {
    const mx=870, my=6, mw=80, mh=44;
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(mx,my,mw,mh);
    ctx.strokeStyle='#888'; ctx.lineWidth=1;
    ctx.strokeRect(mx,my,mw,mh);
    const names=['Entry','Switch','Boss'];
    for (let i=0;i<3;i++) {
      const dotX=mx+13+i*27, dotY=my+mh/2;
      ctx.fillStyle=i===currentRoom?'#ffd700':'#555';
      ctx.beginPath(); ctx.arc(dotX,dotY,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=i===currentRoom?'#000':'#888';
      ctx.font='7px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(names[i].substring(0,3),dotX,dotY+13);
      // connector
      if (i<2) { ctx.strokeStyle='#666'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(dotX+7,dotY); ctx.lineTo(dotX+20,dotY); ctx.stroke(); }
    }
  }

  function drawOverlay(ctx, title, sub, prompt, titleColor) {
    ctx.fillStyle='rgba(0,0,0,0.72)';
    ctx.fillRect(240,160,480,220);
    ctx.strokeStyle='#888'; ctx.lineWidth=2;
    ctx.strokeRect(240,160,480,220);
    ctx.fillStyle=titleColor||'#ffd700';
    ctx.font='bold 48px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(title,480,235);
    ctx.fillStyle='#ffffff';
    ctx.font='20px sans-serif';
    ctx.fillText(sub,480,285);
    ctx.fillStyle='#aaaaaa';
    ctx.font='14px sans-serif';
    ctx.fillText(prompt,480,330);
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  window.KQ_ZELDA = { init, update, render };
})();


// ── Main loop ────────────────────────────────────────────────────────────────
