/*
  Kid Quest — Visual Level Editor
  ────────────────────────────────
  Opened from the main menu.  Lets kids paint tiles, place coins,
  enemies and power-ups, name their level, then play-test or save it.
*/

const KQ_EDITOR = (() => {

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx;
  let panel;          // the HTML side-panel element
  let active = false;

  const DEFAULT_COLS = 60;
  const DEFAULT_ROWS = 12;
  const TILE_SIZE    = 48;

  let level = null;   // the level object being edited
  let camX  = 0;

  let tool      = 'tile';   // 'tile' | 'coin' | 'powerup' | 'enemy' | 'erase' | 'start' | 'fill'
  let tileTool  = 'X';      // which tile character to paint
  let puTool    = 'blaster';
  let enemyType = 'walker'; // 'walker' | 'jumper' | 'flyer'
  let isPainting = false;

  // Undo / Redo stacks
  const MAX_UNDO = 50;
  let undoStack = [];
  let redoStack = [];

  const TILE_LABELS = {
    'X': 'Ground',
    '?': 'Question',
    'B': 'Smash',
    'S': 'Danger',
    'F': 'Finish',
    '.': 'Erase',
  };

  const TILE_EMOJI = {
    'X': '🟫',
    '?': '❓',
    'B': '💥',
    'S': '⚠️',
    'F': '🏁',
    '.': '✖️',
  };

  const TILE_TIPS = {
    'X': 'This is the GROUND block! Draw your floor with this 🏔️',
    '?': 'Mystery Block! Hit it from below to get coins! 🪙',
    'B': 'Smash Block! Break it with the Giant power-up! 💥',
    'S': 'Danger Spike! Don\'t touch this one! ⚠️',
    'F': 'Finish Flag! Reach here to WIN the level! 🎉',
    '.': 'Eraser! Click tiles to remove them! 🧹',
  };

  const TILE_COLORS = {
    'X': '#7c4a2d',
    '?': '#f59e0b',
    'B': '#9333ea',
    'S': '#e11d48',
    'F': '#22c55e',
  };

  const PU_COLORS = {
    blaster:    '#38bdf8',
    shield:     '#22d3ee',
    doubleJump: '#a78bfa',
    dash:       '#60a5fa',
    giant:      '#a855f7',
  };

  const ENEMY_COLORS = {
    walker: '#fb923c',
    jumper: '#f97316',
    flyer:  '#c084fc',
  };

  // ── Undo helpers ───────────────────────────────────────────
  function _snapshot() {
    if (!level) return;
    undoStack.push(JSON.stringify(level.map));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(level.map));
    level.map = JSON.parse(undoStack.pop());
    _showMsg('Undo ↩');
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(level.map));
    level.map = JSON.parse(redoStack.pop());
    _showMsg('Redo ↪');
  }

  // ── Init ───────────────────────────────────────────────────
  function init(canvasEl, panelEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    panel  = panelEl;
    _buildPanel();
    _bindCanvasEvents();
  }

  // ── New blank level ────────────────────────────────────────
  function newLevel() {
    const rows = [];
    for (let r = 0; r < DEFAULT_ROWS; r++) {
      if (r === DEFAULT_ROWS - 1) rows.push('X'.repeat(DEFAULT_COLS));
      else if (r === DEFAULT_ROWS - 2) rows.push('X'.repeat(DEFAULT_COLS));
      else rows.push('.'.repeat(DEFAULT_COLS));
    }

    level = {
      id: 'custom_' + Date.now(),
      name: 'My Level',
      tileSize: TILE_SIZE,
      width:  DEFAULT_COLS,
      height: DEFAULT_ROWS,
      hideTiles: false,
      playerStart: { x: 96, y: (DEFAULT_ROWS - 3) * TILE_SIZE },
      bgKey: 'bg_meadow',
      map: rows,
      coins:   [],
      powerups:[],
      enemies: [],
      movingPlatforms: [],
      _custom: true,
    };
    undoStack = []; redoStack = [];
    camX = 0;
    _refreshPanel();
  }

  // ── Load existing level for editing ───────────────────────
  function loadLevel(lvlData) {
    level = JSON.parse(JSON.stringify(lvlData));
    level._custom = true;
    if (!level.movingPlatforms) level.movingPlatforms = [];
    undoStack = []; redoStack = [];
    camX = 0;
    _refreshPanel();
  }

  // ── Canvas events ──────────────────────────────────────────
  function _bindCanvasEvents() {
    canvas.addEventListener('mousedown', e => {
      if (!active) return;
      isPainting = true;
      _snapshot();
      _handleClick(e);
    });
    canvas.addEventListener('mousemove', e => {
      if (!active || !isPainting) return;
      _handleClick(e);
    });
    canvas.addEventListener('mouseup',   () => { isPainting = false; });
    canvas.addEventListener('mouseleave',() => { isPainting = false; });

    // Touch
    canvas.addEventListener('touchstart', e => {
      if (!active) return;
      e.preventDefault();
      isPainting = true;
      _snapshot();
      _handleTouch(e);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      if (!active || !isPainting) return;
      e.preventDefault();
      _handleTouch(e);
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isPainting = false; });

    // Scroll with arrow keys / mouse wheel
    canvas.addEventListener('wheel', e => {
      if (!active) return;
      camX = Math.max(0, Math.min(
        level.width * TILE_SIZE - canvas.width,
        camX + e.deltaY * 1.5
      ));
    });
  }

  function _handleTouch(e) {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    _applyTool(t.clientX - rect.left, t.clientY - rect.top);
  }

  function _handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    _applyTool(e.clientX - rect.left, e.clientY - rect.top);
  }

  function _applyTool(screenX, screenY) {
    if (!level) return;
    const worldX = screenX + camX;
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(screenY / TILE_SIZE);

    if (col < 0 || col >= level.width || row < 0 || row >= level.height) return;

    if (tool === 'tile' || tool === 'erase') {
      const ch = tool === 'erase' ? '.' : tileTool;
      _setTile(col, row, ch);
    } else if (tool === 'fill') {
      _floodFill(col, row, tileTool);
      _finishFillTool();
    } else if (tool === 'coin') {
      const px = col * TILE_SIZE + 11, py = row * TILE_SIZE + 11;
      if (!level.coins.find(c => Math.abs(c.x - px) < 10 && Math.abs(c.y - py) < 10))
        level.coins.push({ x: px, y: py });
    } else if (tool === 'powerup') {
      const px = col * TILE_SIZE + 8, py = row * TILE_SIZE + 8;
      if (!level.powerups.find(p => Math.abs(p.x - px) < 20 && Math.abs(p.y - py) < 20))
        level.powerups.push({ type: puTool, x: px, y: py });
    } else if (tool === 'enemy') {
      const px = col * TILE_SIZE, py = row * TILE_SIZE;
      if (!level.enemies.find(en => Math.abs(en.x - px) < 20))
        level.enemies.push({ type: enemyType, x: px, y: py, patrol: enemyType === 'jumper' ? 20 : 150 });
    } else if (tool === 'start') {
      level.playerStart = {
        x: col * TILE_SIZE + 8,
        y: row * TILE_SIZE
      };
    } else if (tool === 'eraseEntity') {
      level.coins   = level.coins.filter(c =>
        !(Math.floor((c.x) / TILE_SIZE) === col && Math.floor(c.y / TILE_SIZE) === row));
      level.powerups = level.powerups.filter(p =>
        !(Math.floor(p.x / TILE_SIZE) === col && Math.floor(p.y / TILE_SIZE) === row));
      level.enemies = level.enemies.filter(en =>
        !(Math.floor(en.x / TILE_SIZE) === col && Math.floor(en.y / TILE_SIZE) === row));
    }
  }

  // ── Flood fill ─────────────────────────────────────────────
  function _floodFill(startCol, startRow, newCh) {
    const oldCh = _getTile(startCol, startRow);
    if (oldCh === newCh) return;
    const queue = [[startCol, startRow]];
    const visited = new Set();
    const key = (c, r) => c + ',' + r;
    visited.add(key(startCol, startRow));
    while (queue.length) {
      const [c, r] = queue.shift();
      if (_getTile(c, r) !== oldCh) continue;
      _setTile(c, r, newCh);
      for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nc >= level.width || nr < 0 || nr >= level.height) continue;
        const k = key(nc, nr);
        if (!visited.has(k)) { visited.add(k); queue.push([nc, nr]); }
      }
    }
  }

  function _finishFillTool() {
    tool = tileTool === '.' ? 'erase' : 'tile';
    isPainting = false;
    _highlightActive();
    _showMsg('Fill done');
  }

  function _setTile(col, row, ch) {
    const rowArr = level.map[row].split('');
    rowArr[col] = ch;
    level.map[row] = rowArr.join('');
  }

  function _getTile(col, row) {
    if (row < 0 || row >= level.height || col < 0 || col >= level.width) return '.';
    return level.map[row][col] || '.';
  }

  // ── Resize ─────────────────────────────────────────────────
  function addWidth() {
    if (!level) return;
    _snapshot();
    const add = 10;
    level.map = level.map.map(row => row + '.'.repeat(add));
    level.width += add;
    _showMsg('+10 columns added');
  }

  function removeWidth() {
    if (!level || level.width <= 20) return;
    _snapshot();
    const rem = 10;
    level.map = level.map.map(row => row.slice(0, -rem));
    level.width -= rem;
    _showMsg('-10 columns removed');
  }

  // ── Render ─────────────────────────────────────────────────
  function render() {
    if (!active || !level) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky background
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#7dd3fc');
    sky.addColorStop(1, '#bae6fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.round(camX), 0);

    // Tiles
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
    const endCol   = Math.min(level.width - 1, Math.ceil((camX + canvas.width) / TILE_SIZE) + 1);

    for (let r = 0; r < level.height; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const ch = _getTile(c, r);
        const x  = c * TILE_SIZE, y = r * TILE_SIZE;
        if (ch !== '.') _drawTile(ctx, ch, x, y);
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let c = startCol; c <= endCol; c++) {
      ctx.beginPath(); ctx.moveTo(c * TILE_SIZE, 0); ctx.lineTo(c * TILE_SIZE, canvas.height); ctx.stroke();
    }
    for (let r = 0; r <= level.height; r++) {
      ctx.beginPath(); ctx.moveTo(startCol * TILE_SIZE, r * TILE_SIZE); ctx.lineTo((endCol + 1) * TILE_SIZE, r * TILE_SIZE); ctx.stroke();
    }

    // Coins
    for (const c of level.coins) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(c.x + 13, c.y + 13, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('C', c.x + 13, c.y + 18);
    }

    // Powerups
    for (const p of level.powerups) {
      ctx.fillStyle = PU_COLORS[p.type] || '#a78bfa';
      ctx.fillRect(p.x, p.y, 32, 32);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.type.slice(0,3).toUpperCase(), p.x + 16, p.y + 20);
    }

    // Enemies
    for (const e of level.enemies) {
      ctx.fillStyle = ENEMY_COLORS[e.type] || '#fb923c';
      ctx.fillRect(e.x, e.y, 40, 34);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      const icon = e.type === 'flyer' ? '🦋' : e.type === 'jumper' ? '🐸' : '👾';
      ctx.fillText(icon, e.x + 20, e.y + 22);
    }

    // Player start
    const ps = level.playerStart;
    ctx.fillStyle = 'rgba(37,99,235,0.7)';
    ctx.fillRect(ps.x, ps.y, 36, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('START', ps.x + 18, ps.y + 27);

    ctx.restore();

    // Scroll bar
    const totalW = level.width * TILE_SIZE;
    const barW   = Math.max(40, (canvas.width / totalW) * canvas.width);
    const barX   = (camX / (totalW - canvas.width)) * (canvas.width - barW);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(barX, canvas.height - 10, barW, 10);

    // Tool cursor label
    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.fillRect(8, 8, 200, 28);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`Tool: ${_toolLabel()}   ← → to scroll`, 16, 27);
  }

  function _toolLabel() {
    if (tool === 'tile') return TILE_LABELS[tileTool] || tileTool;
    if (tool === 'fill') return 'Fill: ' + (TILE_LABELS[tileTool] || tileTool);
    if (tool === 'powerup') return 'Power-up: ' + puTool;
    if (tool === 'enemy') return 'Enemy: ' + enemyType;
    return tool.charAt(0).toUpperCase() + tool.slice(1);
  }

  function _drawTile(ctx, ch, x, y) {
    const T = TILE_SIZE;
    if (ch === 'X') {
      ctx.fillStyle = '#7c4a2d'; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#43a047'; ctx.fillRect(x, y, T, 12);
    } else if (ch === '?') {
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
      ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('?', x + T / 2, y + 32);
    } else if (ch === 'B') {
      ctx.fillStyle = '#9333ea'; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
    } else if (ch === 'S') {
      ctx.fillStyle = '#e11d48';
      ctx.beginPath(); ctx.moveTo(x + 5, y + T); ctx.lineTo(x + T / 2, y + 8); ctx.lineTo(x + T - 5, y + T); ctx.closePath(); ctx.fill();
    } else if (ch === 'F') {
      ctx.fillStyle = '#334155'; ctx.fillRect(x + 8, y - 60, 8, T + 60);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath(); ctx.moveTo(x + 16, y - 54); ctx.lineTo(x + 48, y - 40); ctx.lineTo(x + 16, y - 25); ctx.closePath(); ctx.fill();
    }
  }

  // ── Scroll ─────────────────────────────────────────────────
  function scrollLeft()  { camX = Math.max(0, camX - TILE_SIZE * 3); }
  function scrollRight() { camX = Math.min(level.width * TILE_SIZE - canvas.width, camX + TILE_SIZE * 3); }

  function _levelHasFinish() {
    return !!level && level.map.some(row => row.includes('F'));
  }

  function _saveLevel() {
    if (!level) return;
    saveCustomLevel(level);
    _showMsg(_levelHasFinish() ? 'Level saved!' : 'Saved! Add a finish flag so players can win.');
  }

  function _playtestLevel() {
    if (!level) return;
    if (!_levelHasFinish()) {
      _showMsg('Add a finish flag before testing.');
      return;
    }
    saveCustomLevel(level);
    window.KQ_EDITOR_PLAYTEST = level;
    document.dispatchEvent(new CustomEvent('kq:playtestLevel', { detail: level }));
  }

  // ── HTML side panel ────────────────────────────────────────
  function _buildPanel() {
    panel.innerHTML = `
      <div class="ed-actionbar">
        <button class="ed-btn ed-btn-menu" id="ed-back-actions">Menu</button>
        <button class="ed-btn ed-btn-play" id="ed-playtest-top">Test</button>
        <button class="ed-btn ed-btn-save" id="ed-save-top">Save</button>
      </div>

      <div class="ed-topbar">
        <button class="ed-btn ed-btn-menu" id="ed-back-top">← Menu</button>
      </div>

      <div class="ed-section">
        <label class="ed-label">Level Name</label>
        <input id="ed-name" class="ed-input" type="text" value="My Level" maxlength="30" />
      </div>

      <div class="ed-section">
        <label class="ed-label">Tiles</label>
        <div class="ed-palette" id="ed-tiles" style="display:flex;flex-wrap:wrap;gap:6px">
          ${Object.entries(TILE_LABELS).map(([ch, lbl]) =>
            `<button class="ed-swatch ed-tile ed-swatch-big" data-ch="${ch}" title="${TILE_TIPS[ch] || lbl}"
              style="background:${TILE_COLORS[ch] || '#334155'};width:54px;height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:22px;line-height:1;border-radius:8px;cursor:pointer;border:2px solid rgba(255,255,255,0.2)">
              <span style="font-size:22px">${TILE_EMOJI[ch] || ch}</span>
              <span style="font-size:9px;color:#fff;margin-top:2px;font-weight:bold">${lbl}</span>
            </button>`
          ).join('')}
          <button class="ed-swatch ed-fill-btn" id="ed-fill" title="Fill one connected area"
            style="background:#0ea5e9;width:54px;height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;border:2px solid rgba(255,255,255,0.2)">
            <span style="font-size:22px">🪣</span>
            <span style="font-size:9px;color:#fff;margin-top:2px;font-weight:bold">Fill 1x</span>
          </button>
        </div>
      </div>

      <div class="ed-section">
        <label class="ed-label">Place Items</label>
        <div class="ed-palette">
          <button class="ed-swatch" data-tool="coin"    style="background:#facc15;color:#111">🪙</button>
          <button class="ed-swatch" data-tool="enemy"   style="background:#fb923c">👾</button>
          <button class="ed-swatch" data-tool="start"   style="background:#2563eb">🏁</button>
          <button class="ed-swatch" data-tool="eraseEntity" style="background:#64748b">🗑</button>
        </div>
      </div>

      <details class="ed-advanced">
        <summary>More Tools</summary>

      <div class="ed-section" id="ed-enemy-picker" style="display:none">
        <label class="ed-label">Enemy Type</label>
        <div class="ed-palette">
          <button class="ed-swatch ed-etype active" data-etype="walker" style="background:#fb923c" title="Walker">👾</button>
          <button class="ed-swatch ed-etype" data-etype="jumper" style="background:#f97316" title="Jumper">🐸</button>
          <button class="ed-swatch ed-etype" data-etype="flyer"  style="background:#c084fc" title="Flyer">🦋</button>
        </div>
      </div>

      <div class="ed-section">
        <label class="ed-label">Power-ups</label>
        <div class="ed-palette" id="ed-pus">
          ${Object.entries(PU_COLORS).map(([id, col]) =>
            `<button class="ed-swatch ed-pu" data-pu="${id}" title="${id}"
              style="background:${col}">${id.slice(0,3).toUpperCase()}</button>`
          ).join('')}
        </div>
      </div>

      <div class="ed-section">
        <label class="ed-label">Scroll Level</label>
        <div style="display:flex;gap:6px">
          <button class="ed-btn" id="ed-scrollL">◀ Left</button>
          <button class="ed-btn" id="ed-scrollR">Right ▶</button>
        </div>
      </div>

      <div class="ed-section">
        <label class="ed-label">Resize Level</label>
        <div style="display:flex;gap:6px">
          <button class="ed-btn" id="ed-addW">+ Width</button>
          <button class="ed-btn" id="ed-remW">- Width</button>
        </div>
      </div>

      <div class="ed-section">
        <label class="ed-label">Undo / Redo</label>
        <div style="display:flex;gap:6px">
          <button class="ed-btn" id="ed-undo">↩ Undo</button>
          <button class="ed-btn" id="ed-redo">↪ Redo</button>
        </div>
      </div>

      </details>

      <hr class="ed-hr"/>

      <div class="ed-section">
        <button class="ed-btn ed-btn-play" id="ed-playtest">▶ Play Test</button>
        <button class="ed-btn ed-btn-save" id="ed-save">💾 Save Level</button>
        <button class="ed-btn" id="ed-back">← Back to Menu</button>
      </div>

      <div id="ed-msg" class="ed-msg"></div>
    `;

    // Tile swatch hover tooltips
    panel.querySelectorAll('.ed-tile').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        const ch = btn.dataset.ch;
        _showMsg(TILE_TIPS[ch] || TILE_LABELS[ch] || ch, 4000);
      });
    });

    // Tile swatches
    panel.querySelectorAll('.ed-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        tool     = btn.dataset.ch === '.' ? 'erase' : 'tile';
        tileTool = btn.dataset.ch;
        _highlightActive();
      });
    });

    // Fill / bucket button
    panel.querySelector('#ed-fill').addEventListener('click', () => {
      tool = tool === 'fill' ? (tileTool === '.' ? 'erase' : 'tile') : 'fill';
      _highlightActive();
    });

    // Generic tool buttons
    panel.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        tool = btn.dataset.tool;
        // Show enemy picker when enemy tool selected
        const picker = panel.querySelector('#ed-enemy-picker');
        if (picker) picker.style.display = (tool === 'enemy') ? '' : 'none';
        _highlightActive();
      });
    });

    // Power-up swatches
    panel.querySelectorAll('.ed-pu').forEach(btn => {
      btn.addEventListener('click', () => {
        tool   = 'powerup';
        puTool = btn.dataset.pu;
        _highlightActive();
      });
    });

    // Enemy type picker
    panel.querySelectorAll('.ed-etype').forEach(btn => {
      btn.addEventListener('click', () => {
        enemyType = btn.dataset.etype;
        panel.querySelectorAll('.ed-etype').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    panel.querySelector('#ed-scrollL').addEventListener('click', scrollLeft);
    panel.querySelector('#ed-scrollR').addEventListener('click', scrollRight);
    panel.querySelector('#ed-addW').addEventListener('click', addWidth);
    panel.querySelector('#ed-remW').addEventListener('click', removeWidth);
    panel.querySelector('#ed-undo').addEventListener('click', undo);
    panel.querySelector('#ed-redo').addEventListener('click', redo);

    panel.querySelector('#ed-name').addEventListener('input', e => {
      if (level) level.name = e.target.value.trim() || 'My Level';
    });

    panel.querySelector('#ed-save').addEventListener('click', () => {
      if (!level) return;
      saveCustomLevel(level);
      _showMsg('Level saved! ✅');
    });

    panel.querySelector('#ed-playtest').addEventListener('click', () => {
      if (!level) return;
      saveCustomLevel(level);
      window.KQ_EDITOR_PLAYTEST = level;
      document.dispatchEvent(new CustomEvent('kq:playtestLevel', { detail: level }));
    });

    const saveTopBtn = panel.querySelector('#ed-save-top');
    if (saveTopBtn) saveTopBtn.addEventListener('click', _saveLevel);
    const playtestTopBtn = panel.querySelector('#ed-playtest-top');
    if (playtestTopBtn) playtestTopBtn.addEventListener('click', _playtestLevel);

    panel.querySelectorAll('#ed-back, #ed-back-top, #ed-back-actions').forEach(btn => btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('kq:editorBack'));
    }));

    _highlightActive();
  }

  function _highlightActive() {
    panel.querySelectorAll('.ed-swatch').forEach(b => b.classList.remove('active'));
    if (tool === 'fill') {
      panel.querySelector('#ed-fill').classList.add('active');
      const ch = tileTool === '.' ? '.' : tileTool;
      const btn = panel.querySelector(`.ed-tile[data-ch="${ch}"]`);
      if (btn) btn.classList.add('active');
    } else if (tool === 'tile' || tool === 'erase') {
      const ch = tool === 'erase' ? '.' : tileTool;
      const btn = panel.querySelector(`.ed-tile[data-ch="${ch}"]`);
      if (btn) btn.classList.add('active');
    } else if (tool === 'powerup') {
      const btn = panel.querySelector(`.ed-pu[data-pu="${puTool}"]`);
      if (btn) btn.classList.add('active');
    } else {
      const btn = panel.querySelector(`[data-tool="${tool}"]`);
      if (btn) btn.classList.add('active');
    }
    // Keep enemy type active state
    panel.querySelectorAll('.ed-etype').forEach(b => {
      b.classList.toggle('active', b.dataset.etype === enemyType);
    });
  }

  function _refreshPanel() {
    const inp = panel.querySelector('#ed-name');
    if (inp && level) inp.value = level.name;
  }

  function _showMsg(text, timeout = 2500) {
    const el = panel.querySelector('#ed-msg');
    if (!el) return;
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, timeout);
  }

  // ── Keyboard scroll + undo/redo in editor ──────────────────
  function handleKey(e) {
    if (!active) return;
    if (e.code === 'ArrowLeft')  { scrollLeft();  e.preventDefault(); }
    if (e.code === 'ArrowRight') { scrollRight(); e.preventDefault(); }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
    if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      e.preventDefault(); redo();
    }
  }

  // ── Public API ─────────────────────────────────────────────
  function show() {
    active = true;
    if (!level) newLevel();
  }
  function hide() { active = false; }
  function getLevel() { return level; }
  function isActive() { return active; }

  return { init, show, hide, newLevel, loadLevel, getLevel, render, handleKey, isActive };
})();
