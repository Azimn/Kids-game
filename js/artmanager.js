/*
  KQ_ART — In-Browser Art Manager
  ─────────────────────────────────
  Kids click a picture slot, pick any image from their computer,
  and it shows up in the game immediately. No files, no folders.
  Everything is saved in the browser automatically.
*/

const KQ_ART = (() => {

  const STORAGE_PREFIX = 'kq_art_v1_';
  const MAX_SIZE_BYTES = 600_000; // warn above ~600 KB per image

  // Map from assetPath -> HTMLImageElement (override images)
  const overrideImages = new Map();

  // ── Slot definitions ──────────────────────────────────────
  // These are what show up in the art picker grid.
  // Each slot maps to one or more asset paths in KQ_ASSETS.
  const SLOTS = [
    // ── Player ──────────────────────────────────────────────
    {
      key: 'player_idle',
      label: 'Your Hero',
      sublabel: 'Standing still',
      emoji: '🦸',
      color: '#3b82f6',
      paths: ['assets/art/player-idle.png'],
    },
    {
      key: 'player_run',
      label: 'Hero Walking',
      sublabel: 'Moving frames',
      emoji: '🏃',
      color: '#2563eb',
      paths: ['assets/art/player-run-1.png', 'assets/art/player-run-2.png'],
    },
    {
      key: 'player_jump',
      label: 'Hero Jumping',
      sublabel: 'In the air',
      emoji: '🦘',
      color: '#1d4ed8',
      paths: ['assets/art/player-jump.png'],
    },
    {
      key: 'player_hurt',
      label: 'Hero Hurt',
      sublabel: 'Ouch! Got hit',
      emoji: '😵',
      color: '#dc2626',
      paths: ['assets/art/player-hurt.png'],
    },

    // ── Enemies ──────────────────────────────────────────────
    {
      key: 'enemy_walker',
      label: 'Bad Guy',
      sublabel: 'Walks back and forth',
      emoji: '👾',
      color: '#ea580c',
      paths: ['assets/art/enemy-walker.png'],
    },

    // ── Collectibles ─────────────────────────────────────────
    {
      key: 'coin',
      label: 'Coin / Star',
      sublabel: 'Collect these!',
      emoji: '⭐',
      color: '#ca8a04',
      paths: ['assets/art/coin.png'],
    },

    // ── Power-ups ────────────────────────────────────────────
    {
      key: 'power_blaster',
      label: 'Blaster',
      sublabel: 'Shoot things!',
      emoji: '🔫',
      color: '#0ea5e9',
      paths: ['assets/art/power-blaster.png'],
    },
    {
      key: 'power_shield',
      label: 'Shield',
      sublabel: 'Block hits',
      emoji: '🛡️',
      color: '#06b6d4',
      paths: ['assets/art/power-shield.png'],
    },
    {
      key: 'power_jump',
      label: 'Double Jump',
      sublabel: 'Jump twice!',
      emoji: '🪶',
      color: '#8b5cf6',
      paths: ['assets/art/power-double-jump.png'],
    },
    {
      key: 'power_dash',
      label: 'Dash Boots',
      sublabel: 'Super speed',
      emoji: '👟',
      color: '#6366f1',
      paths: ['assets/art/power-dash.png'],
    },
    {
      key: 'power_giant',
      label: 'Giant',
      sublabel: 'Grow big!',
      emoji: '💪',
      color: '#7c3aed',
      paths: ['assets/art/power-giant.png'],
    },
    {
      key: 'projectile',
      label: 'Blaster Shot',
      sublabel: 'The bullet',
      emoji: '✨',
      color: '#0284c7',
      paths: ['assets/art/projectile.png'],
    },

    // ── Tiles ────────────────────────────────────────────────
    {
      key: 'tile_ground',
      label: 'Ground Block',
      sublabel: 'The floor',
      emoji: '🟫',
      color: '#7c4a2d',
      paths: ['assets/art/tile-ground.png'],
    },
    {
      key: 'tile_question',
      label: 'Mystery Block',
      sublabel: 'Hit from below!',
      emoji: '❓',
      color: '#f59e0b',
      paths: ['assets/art/tile-question.png'],
    },
    {
      key: 'tile_brick',
      label: 'Brick Block',
      sublabel: 'Solid brick',
      emoji: '🧱',
      color: '#b45309',
      paths: ['assets/art/tile-brick.png'],
    },
    {
      key: 'tile_break',
      label: 'Smash Block',
      sublabel: 'Break it!',
      emoji: '💥',
      color: '#9333ea',
      paths: ['assets/art/tile-breakable.png'],
    },
    {
      key: 'tile_spike',
      label: 'Spike',
      sublabel: 'Dangerous!',
      emoji: '⚠️',
      color: '#dc2626',
      paths: ['assets/art/tile-spike.png'],
    },
    {
      key: 'tile_goal',
      label: 'Finish Flag',
      sublabel: 'Reach to win!',
      emoji: '🏁',
      color: '#16a34a',
      paths: ['assets/art/goal-flag.png'],
    },

    // ── Backgrounds & UI ─────────────────────────────────────
    {
      key: 'background',
      label: 'Background',
      sublabel: 'The sky / scenery',
      emoji: '🌄',
      color: '#0369a1',
      paths: [
        'assets/art/background.png',
      ],
      anyShape: true, // backgrounds don't need to be square
    },
    {
      key: 'title_logo',
      label: 'Game Title',
      sublabel: 'Your game\'s name!',
      emoji: '🎮',
      color: '#b45309',
      paths: ['assets/art/title-logo.png'],
      anyShape: true,
    },
  ];

  // ── Load saved images from localStorage ───────────────────
  function init() {
    for (const slot of SLOTS) {
      const raw = _load(slot.key);
      if (raw) _applyDataURL(slot, raw);
    }
  }

  function _load(key) {
    try { return localStorage.getItem(STORAGE_PREFIX + key) || null; }
    catch (e) { return null; }
  }

  function _save(key, dataURL) {
    try { localStorage.setItem(STORAGE_PREFIX + key, dataURL); return true; }
    catch (e) {
      if (e.name === 'QuotaExceededError') return false;
      return false;
    }
  }

  function _remove(key) {
    try { localStorage.removeItem(STORAGE_PREFIX + key); } catch (e) {}
  }

  function _applyDataURL(slot, dataURL) {
    const img = new Image();
    img.onload = () => {
      for (const path of slot.paths) {
        overrideImages.set(path, img);
      }
      // Notify the game to redraw if needed
      document.dispatchEvent(new CustomEvent('kq:artUpdated', { detail: { slot } }));
    };
    img.src = dataURL;
  }

  // ── Public: check if a path has an override ───────────────
  function getOverride(assetPath) {
    return overrideImages.get(assetPath) || null;
  }

  // ── Public: upload a file for a slot ─────────────────────
  function uploadForSlot(slotKey, file, onDone, onError) {
    const slot = SLOTS.find(s => s.key === slotKey);
    if (!slot) { onError && onError('Unknown slot'); return; }

    if (!file.type.startsWith('image/')) {
      onError && onError('Please pick a picture file (PNG, JPG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target.result;

      if (dataURL.length > MAX_SIZE_BYTES * 1.4) { // base64 is ~33% larger
        onError && onError('That image is a bit big! Try a smaller one.');
        return;
      }

      const ok = _save(slotKey, dataURL);
      if (!ok) { onError && onError('Browser storage is full. Try removing some images first.'); return; }

      _applyDataURL(slot, dataURL);
      onDone && onDone(dataURL);
    };
    reader.onerror = () => { onError && onError('Could not read the file.'); };
    reader.readAsDataURL(file);
  }

  // ── Public: clear a slot (go back to default) ────────────
  function clearSlot(slotKey) {
    _remove(slotKey);
    const slot = SLOTS.find(s => s.key === slotKey);
    if (slot) {
      for (const path of slot.paths) overrideImages.delete(path);
      document.dispatchEvent(new CustomEvent('kq:artUpdated', { detail: { slot } }));
    }
  }

  // ── Public: get data URL for a slot (for preview) ────────
  function getDataURL(slotKey) { return _load(slotKey); }

  // ── Public: get all slot definitions ─────────────────────
  function getSlots() { return SLOTS; }

  // ── Build the art picker HTML ─────────────────────────────
  function buildUI(container) {
    container.innerHTML = '';

    // Group slots by category
    const groups = [
      { label: '🦸 Your Hero', keys: ['player_idle','player_run','player_jump','player_hurt'] },
      { label: '👾 Enemies',   keys: ['enemy_walker'] },
      { label: '⭐ Coins & Power-ups', keys: ['coin','power_blaster','power_shield','power_jump','power_dash','power_giant','projectile'] },
      { label: '🧱 Blocks',    keys: ['tile_ground','tile_question','tile_brick','tile_break','tile_spike','tile_goal'] },
      { label: '🌄 Background & Title', keys: ['background','title_logo'] },
    ];

    for (const group of groups) {
      const groupEl = document.createElement('div');
      groupEl.className = 'art-group';
      groupEl.innerHTML = `<div class="art-group-label">${group.label}</div>`;

      const grid = document.createElement('div');
      grid.className = 'art-grid';

      for (const key of group.keys) {
        const slot = SLOTS.find(s => s.key === key);
        if (!slot) continue;
        grid.appendChild(_makeCard(slot));
      }

      groupEl.appendChild(grid);
      container.appendChild(groupEl);
    }
  }

  function _makeCard(slot) {
    const card = document.createElement('div');
    card.className = 'art-card';
    card.dataset.slotKey = slot.key;

    const hasOverride = !!_load(slot.key);

    card.innerHTML = `
      <div class="art-preview" id="art-prev-${slot.key}"
           style="background:${slot.color}22;border-color:${slot.color}55">
        ${hasOverride
          ? `<img src="${_load(slot.key)}" alt="${slot.label}" class="art-thumb"/>`
          : `<span class="art-emoji">${slot.emoji}</span>`}
        ${hasOverride ? `<div class="art-badge">✅</div>` : ''}
      </div>
      <div class="art-card-label">${slot.label}</div>
      <div class="art-card-sub">${slot.sublabel}</div>
      <button class="art-pick-btn" data-key="${slot.key}"
              style="background:${slot.color}">
        📁 Pick a Picture
      </button>
      ${hasOverride
        ? `<button class="art-clear-btn" data-key="${slot.key}">↩ Use Default</button>`
        : ''}
    `;

    // Hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = `fi-${slot.key}`;
    card.appendChild(fileInput);

    // Pick button → open file dialog
    card.querySelector('.art-pick-btn').addEventListener('click', () => {
      fileInput.click();
    });

    // File chosen
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const btn = card.querySelector('.art-pick-btn');
      btn.textContent = '⏳ Loading…';
      btn.disabled = true;

      uploadForSlot(slot.key, file,
        (dataURL) => {
          _refreshCard(card, slot, dataURL);
          btn.textContent = '📁 Pick a Picture';
          btn.disabled = false;
          fileInput.value = '';
        },
        (err) => {
          alert('Oops! ' + err);
          btn.textContent = '📁 Pick a Picture';
          btn.disabled = false;
          fileInput.value = '';
        }
      );
    });

    // Clear button
    const clearBtn = card.querySelector('.art-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm(`Go back to the default picture for "${slot.label}"?`)) {
          clearSlot(slot.key);
          _refreshCard(card, slot, null);
        }
      });
    }

    return card;
  }

  function _refreshCard(card, slot, dataURL) {
    const preview = card.querySelector('.art-preview');
    if (dataURL) {
      preview.innerHTML = `<img src="${dataURL}" alt="${slot.label}" class="art-thumb"/><div class="art-badge">✅</div>`;
      // Add/update clear button
      let clearBtn = card.querySelector('.art-clear-btn');
      if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.className = 'art-clear-btn';
        clearBtn.dataset.key = slot.key;
        clearBtn.textContent = '↩ Use Default';
        card.appendChild(clearBtn);
        clearBtn.addEventListener('click', () => {
          if (confirm(`Go back to the default picture for "${slot.label}"?`)) {
            clearSlot(slot.key);
            _refreshCard(card, slot, null);
          }
        });
      }
    } else {
      preview.innerHTML = `<span class="art-emoji">${slot.emoji}</span>`;
      const clearBtn = card.querySelector('.art-clear-btn');
      if (clearBtn) clearBtn.remove();
    }
  }

  init();
  return { getOverride, uploadForSlot, clearSlot, getDataURL, getSlots, buildUI };
})();
