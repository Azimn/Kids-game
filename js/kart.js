// kart.js — Mario Kart-style top-down kart racer
// Exports window.KQ_KART = { init, update, render }

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  const W = 960, H = 540;
  const CX = 480, CY = 270;
  const OUTER_RX = 370, OUTER_RY = 200;
  const INNER_RX = 200, INNER_RY = 100;
  const CENTER_RX = (OUTER_RX + INNER_RX) / 2; // 285
  const CENTER_RY = (OUTER_RY + INNER_RY) / 2; // 150
  const HALF_W = 85;
  const NUM_WAYPOINTS = 32;
  const MAX_SPEED = 280;
  const BOOST_SPEED = 450;
  const AI_SPEED_MULT = 0.88;
  const TOTAL_LAPS = 3;
  const KART_SIZE = 22;
  const ITEM_BOX_SIZE = 24;
  const BOOST_DURATION = 3;
  const ITEM_RESPAWN = 8;

  // ── Waypoints along centerline ellipse ────────────────────────────────────
  function makeWaypoints() {
    const pts = [];
    for (let i = 0; i < NUM_WAYPOINTS; i++) {
      const a = (i / NUM_WAYPOINTS) * Math.PI * 2 - Math.PI / 2; // start at top
      pts.push({ x: CX + CENTER_RX * Math.cos(a), y: CY + CENTER_RY * Math.sin(a) });
    }
    return pts;
  }
  const WAYPOINTS = makeWaypoints();

  function nearestWaypoint(x, y) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < NUM_WAYPOINTS; i++) {
      const dx = WAYPOINTS[i].x - x, dy = WAYPOINTS[i].y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function isOffTrack(x, y) {
    const nx = (x - CX) / OUTER_RX, ny = (y - CY) / OUTER_RY;
    const outerDist = nx * nx + ny * ny;
    const ix = (x - CX) / INNER_RX, iy = (y - CY) / INNER_RY;
    const innerDist = ix * ix + iy * iy;
    return outerDist > 1 || innerDist < 1;
  }

  function art(key, x, y, w, h) {
    const path = window.KQ_ASSETS && window.KQ_ASSETS.kart && window.KQ_ASSETS.kart[key];
    return !!(path && window._KQ_DRAW_IMG && window._KQ_DRAW_IMG(path, x, y, w, h));
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let player, aiKarts, itemBoxes, countdown, raceStarted, raceOver;
  let showResult, resultTitle, resultSub;

  function makeKart(x, y, angle, color, isPlayer) {
    return {
      x, y, angle, speed: 0, color, isPlayer,
      lapCount: 0, waypointIndex: nearestWaypoint(x, y),
      prevWpIndex: nearestWaypoint(x, y),
      item: null,        // 'boost' | 'shield' | null
      shielded: false,
      boostTimer: 0,
      aiTargetWp: 1,
    };
  }

  function makeItemBox(angle) {
    const a = angle * Math.PI * 2 - Math.PI / 2;
    return {
      x: CX + CENTER_RX * Math.cos(a),
      y: CY + CENTER_RY * Math.sin(a),
      active: true,
      respawnTimer: 0,
    };
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const speedMult = (window.KQ_SETTINGS && window.KQ_SETTINGS.get('speedMult')) || 1;

    // Player starts near bottom of track (angle ≈ 0.5, which is roughly the top)
    const startA = -Math.PI / 2; // top of oval
    const startX = CX + CENTER_RX * Math.cos(startA);
    const startY = CY + CENTER_RY * Math.sin(startA) + HALF_W * 0.5; // slightly below start line

    player = makeKart(startX, startY + 40, 0, '#3b82f6', true);
    player._speedMult = speedMult;

    aiKarts = [
      makeKart(startX - 40, startY + 80, 0, '#ef4444', false),
      makeKart(startX + 40, startY + 80, 0, '#22c55e', false),
    ];
    // Set AI initial waypoint targets
    aiKarts.forEach(k => { k.aiTargetWp = 1; k.waypointIndex = 0; });

    itemBoxes = [0.25, 0.5, 0.625, 0.875].map(makeItemBox);

    countdown = 3;
    raceStarted = false;
    raceOver = false;
    showResult = false;

    if (window._KQ_HINT) {
      window._KQ_HINT.show('kart', [
        'Left / Right to steer',
        'Up or A button to go',
        'B / Dash to use item',
        '3 laps to win!',
      ]);
    }
  }

  // ── Countdown ─────────────────────────────────────────────────────────────
  let countdownTimer = 0;

  function resetCountdown() {
    countdown = 3;
    countdownTimer = 1.0;
    raceStarted = false;
  }

  // ── Lap Detection ─────────────────────────────────────────────────────────
  function checkLap(kart) {
    if (raceOver) return;
    const wp = nearestWaypoint(kart.x, kart.y);
    const prev = kart.prevWpIndex;
    // Crossed start/finish: waypoint jumps from high (>24) to low (<4)
    if (prev > 24 && wp < 4) {
      kart.lapCount++;
      if (kart.isPlayer) {
        if (kart.lapCount >= TOTAL_LAPS) {
          endRace(true);
        } else {
          window._KQ_BEEP && window._KQ_BEEP('coin');
        }
      } else if (kart.lapCount >= TOTAL_LAPS) {
        endRace(false);
      }
    }
    kart.prevWpIndex = wp;
    kart.waypointIndex = wp;
  }

  function endRace(won) {
    raceOver = true;
    showResult = true;
    if (won) {
      resultTitle = 'You Win!';
      resultSub = 'Congratulations — 1st place!';
      window._KQ_BEEP && window._KQ_BEEP('win');
      window._KQ_SETMODE && window._KQ_SETMODE('win');
    } else {
      resultTitle = 'Race Over';
      resultSub = 'Better luck next time!';
      window._KQ_SETMODE && window._KQ_SETMODE('gameover');
    }
  }

  // ── Player Update ─────────────────────────────────────────────────────────
  function updatePlayer(dt) {
    const P = window._KQ_PRESSED;
    const sm = player._speedMult || 1;
    const maxSpd = (player.boostTimer > 0 ? BOOST_SPEED : MAX_SPEED) * sm;
    const turnRate = 2.8;
    const accelerating = P('up') || P('jump');

    if (P('left'))  player.angle -= turnRate * dt * (player.speed / maxSpd + 0.3);
    if (P('right')) player.angle += turnRate * dt * (player.speed / maxSpd + 0.3);

    if (accelerating) {
      player.speed = Math.min(player.speed + 400 * dt, maxSpd);
    } else if (P('down')) {
      player.speed = Math.max(player.speed - 500 * dt, 0);
    } else {
      player.speed = Math.max(player.speed - 180 * dt, 0);
    }

    // Off-track penalty
    if (isOffTrack(player.x, player.y)) {
      player.speed = Math.min(player.speed, maxSpd * 0.4);
    }

    // Boost timer
    if (player.boostTimer > 0) {
      player.boostTimer -= dt;
      if (player.boostTimer <= 0) player.boostTimer = 0;
    }

    // Use item
    if (P('shoot') || P('dash')) {
      if (player.item === 'boost' && player.boostTimer <= 0) {
        player.boostTimer = BOOST_DURATION;
        player.item = null;
        window._KQ_BEEP && window._KQ_BEEP('power');
      } else if (player.item === 'shield' && !player.shielded) {
        player.shielded = true;
        player.item = null;
        window._KQ_BEEP && window._KQ_BEEP('jump');
      }
    }

    moveKart(player, dt);
    checkLap(player);
  }

  function moveKart(kart, dt) {
    kart.x += Math.cos(kart.angle) * kart.speed * dt;
    kart.y += Math.sin(kart.angle) * kart.speed * dt;
  }

  // ── AI Update ─────────────────────────────────────────────────────────────
  function updateAI(kart, dt) {
    const sm = (window.KQ_SETTINGS && window.KQ_SETTINGS.get('speedMult')) || 1;
    const maxSpd = MAX_SPEED * AI_SPEED_MULT * sm;

    const target = WAYPOINTS[kart.aiTargetWp];
    const dx = target.x - kart.x, dy = target.y - kart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const desiredAngle = Math.atan2(dy, dx);

    // Steer toward target
    let diff = desiredAngle - kart.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    kart.angle += Math.sign(diff) * Math.min(Math.abs(diff), 2.5 * dt);

    // Accelerate
    kart.speed = Math.min(kart.speed + 300 * dt, maxSpd);
    if (isOffTrack(kart.x, kart.y)) kart.speed = Math.min(kart.speed, maxSpd * 0.4);

    if (dist < 30) {
      kart.aiTargetWp = (kart.aiTargetWp + 1) % NUM_WAYPOINTS;
    }

    moveKart(kart, dt);
    checkLap(kart);
  }

  // ── Item Boxes ─────────────────────────────────────────────────────────────
  function updateItemBoxes(dt) {
    itemBoxes.forEach(box => {
      if (!box.active) {
        box.respawnTimer -= dt;
        if (box.respawnTimer <= 0) box.active = true;
      }
    });

    // Check pickup by player
    itemBoxes.forEach(box => {
      if (!box.active) return;
      const dx = box.x - player.x, dy = box.y - player.y;
      if (dx * dx + dy * dy < (ITEM_BOX_SIZE + KART_SIZE) * (ITEM_BOX_SIZE + KART_SIZE) * 0.5) {
        box.active = false;
        box.respawnTimer = ITEM_RESPAWN;
        if (!player.item) {
          player.item = Math.random() < 0.6 ? 'boost' : 'shield';
          window._KQ_BEEP && window._KQ_BEEP('coin');
        }
      }
    });
  }

  // ── Race Position ──────────────────────────────────────────────────────────
  function getRacePosition() {
    const all = [player, ...aiKarts];
    const scored = all.map(k => ({
      kart: k,
      score: k.lapCount * NUM_WAYPOINTS + k.waypointIndex,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.findIndex(s => s.kart === player) + 1;
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  let _countdownAccum = 0;
  let _cdInitialized = false;

  function update(dt) {
    if (!player) return;

    // Handle restart
    if (showResult) {
      const P = window._KQ_PRESSED;
      if (P && (P('jump') || P('shoot'))) {
        init();
        _cdInitialized = false;
      }
      return;
    }

    // Initialize countdown once
    if (!_cdInitialized) {
      countdown = 3;
      _countdownAccum = 0;
      _cdInitialized = true;
    }

    if (!raceStarted) {
      _countdownAccum += dt;
      if (_countdownAccum >= 1.0) {
        _countdownAccum -= 1.0;
        countdown--;
        if (countdown <= 0) {
          raceStarted = true;
          window._KQ_BEEP && window._KQ_BEEP('power');
        } else {
          window._KQ_BEEP && window._KQ_BEEP('menu');
        }
      }
      return;
    }

    updatePlayer(dt);
    aiKarts.forEach(k => updateAI(k, dt));
    updateItemBoxes(dt);

    if (window._KQ_FX_UPDATE) window._KQ_FX_UPDATE(dt);
  }

  // ── Drawing Helpers ────────────────────────────────────────────────────────
  function drawTrack(ctx) {
    // Outer grass (background)
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, W, H);

    // Asphalt (outer ellipse)
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(CX, CY, OUTER_RX, OUTER_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner grass
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(CX, CY, INNER_RX, INNER_RY, 0, 0, Math.PI * 2);
    ctx.fill();

    // White dashed centerline
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 18]);
    ctx.beginPath();
    ctx.ellipse(CX, CY, CENTER_RX, CENTER_RY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Track edge lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(CX, CY, OUTER_RX - 4, OUTER_RY - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(CX, CY, INNER_RX + 4, INNER_RY + 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Checkered start/finish line at top of oval
    const sfX = CX - 24;
    const sfY = CY - CENTER_RY;
    const tileSize = 8;
    const cols = 6, rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#fff' : '#000';
        ctx.fillRect(sfX + c * tileSize - (cols * tileSize) / 2, sfY - (rows * tileSize) / 2 + r * tileSize, tileSize, tileSize);
      }
    }
  }

  function drawItemBoxes(ctx, t) {
    itemBoxes.forEach(box => {
      if (!box.active) return;
      const pulse = 1 + 0.12 * Math.sin(t * 4);
      const s = ITEM_BOX_SIZE * pulse;
      if (art('itemBox', box.x - s / 2, box.y - s / 2, s, s)) return;
      // Glow
      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(box.x - s / 2, box.y - s / 2, s, s);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1e293b';
      ctx.font = `bold ${Math.round(s * 0.7)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', box.x, box.y);
      ctx.restore();
    });
  }

  function drawKart(ctx, kart) {
    ctx.save();
    ctx.translate(kart.x, kart.y);
    ctx.rotate(kart.angle);

    // Shield aura
    if (kart.shielded) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, KART_SIZE + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Boost flame
    if (kart.boostTimer > 0) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-KART_SIZE * 0.5, -KART_SIZE * 0.3);
      ctx.lineTo(-KART_SIZE * 1.4, 0);
      ctx.lineTo(-KART_SIZE * 0.5, KART_SIZE * 0.3);
      ctx.fill();
    }

    if (art(kart.isPlayer ? 'player' : 'rival', -KART_SIZE, -KART_SIZE, KART_SIZE * 2, KART_SIZE * 2)) {
      ctx.restore();
      return;
    }

    // Kart body
    ctx.fillStyle = kart.color;
    ctx.beginPath();
    ctx.roundRect(-KART_SIZE * 0.9, -KART_SIZE * 0.6, KART_SIZE * 1.8, KART_SIZE * 1.2, 5);
    ctx.fill();

    // Windshield
    ctx.fillStyle = 'rgba(186,230,253,0.7)';
    ctx.fillRect(KART_SIZE * 0.1, -KART_SIZE * 0.4, KART_SIZE * 0.5, KART_SIZE * 0.8);

    // Wheels
    ctx.fillStyle = '#1e293b';
    [[-0.5, -0.75], [0.5, -0.75], [-0.5, 0.75], [0.5, 0.75]].forEach(([fx, fy]) => {
      ctx.fillRect(
        fx * KART_SIZE * 1.1 - 5,
        fy * KART_SIZE - 4,
        10, 8
      );
    });

    // Driver label
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(KART_SIZE * 0.6)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', 0, 0);

    ctx.restore();
  }

  function ordinal(n) {
    return n === 1 ? '1st' : n === 2 ? '2nd' : '3rd';
  }

  function drawHUD(ctx) {
    const pos = getRacePosition();
    const kmh = Math.round(player.speed * 3.6 * 0.35);
    const itemEmoji = player.item === 'boost' ? 'Boost' : player.item === 'shield' ? 'Shield' : '-';

    ctx.save();
    ctx.font = 'bold 20px system-ui';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'left';
    ctx.fillText(`Lap ${Math.min(player.lapCount + 1, TOTAL_LAPS)} / ${TOTAL_LAPS}`, 16, 30);
    ctx.fillText(`${kmh} km/h`, 16, 56);
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('Up/A: gas   B/Dash: item', 16, 82);

    ctx.textAlign = 'right';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText(ordinal(pos), W - 16, 30);
    if (player.item && art(player.item === 'boost' ? 'boost' : 'shield', W - 46, 38, 30, 30)) {
      // Custom item icon drawn.
    } else {
      ctx.font = '18px system-ui';
      ctx.fillText(itemEmoji, W - 16, 58);
    }
    ctx.restore();
  }

  function drawCountdown(ctx, t) {
    if (raceStarted) return;
    const label = countdown > 0 ? String(countdown) : 'GO!';
    const scale = 1 + 0.3 * ((_countdownAccum < 0.3) ? (1 - _countdownAccum / 0.3) : 0);
    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(scale, scale);
    ctx.font = 'bold 100px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = countdown > 0 ? '#fbbf24' : '#4ade80';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 12;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  function _kartOverlay(title, sub) {
    const ctx = window._KQ_CTX;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(240, 160, 480, 220);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(title, 480, 240);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px system-ui';
    ctx.fillText(sub, 480, 290);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px system-ui';
    ctx.fillText('Press Enter or Tap to play again', 480, 330);
    ctx.restore();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  let _renderTime = 0;

  function render() {
    if (!player) return;
    const ctx = window._KQ_CTX;
    if (!ctx) return;

    _renderTime += 0.016;

    drawTrack(ctx);
    drawItemBoxes(ctx, _renderTime);

    // Draw AI karts behind player
    aiKarts.forEach(k => drawKart(ctx, k));
    drawKart(ctx, player);

    if (window._KQ_FX_DRAW) window._KQ_FX_DRAW();

    drawHUD(ctx);

    if (!raceStarted && !showResult) {
      drawCountdown(ctx, _renderTime);
    }

    if (window._KQ_HINT) window._KQ_HINT.draw();

    if (showResult) {
      _kartOverlay(resultTitle, resultSub);
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  window.KQ_KART = { init, update, render };

}());


// ── Main loop ────────────────────────────────────────────────────────────────
