// =============================================================
//  ASSET MANAGER
//  Loads images and falls back to placeholder shapes if the
//  file doesn't exist — so the game always runs even with no art.
// =============================================================

class AssetManager {
  constructor() {
    this._cache = {};      // url -> HTMLImageElement (or null = missing)
    this._pending = 0;
    this._done = 0;
  }

  // Queue an image for loading.  Returns immediately; call whenReady().
  load(url) {
    if (url in this._cache) return;
    this._cache[url] = null;   // mark as requested-but-loading
    this._pending++;

    const img = new Image();
    img.onload = () => {
      this._cache[url] = img;
      this._done++;
    };
    img.onerror = () => {
      // Missing file is OK — drawing code uses placeholder
      this._cache[url] = null;
      this._done++;
    };
    img.src = url;
  }

  // Load every path referenced in the manifest
  loadAll(manifest) {
    const walk = (node) => {
      if (typeof node === 'string') { this.load(node); }
      else if (Array.isArray(node)) { node.forEach(walk); }
      else if (node && typeof node === 'object') { Object.values(node).forEach(walk); }
    };
    walk(manifest);
  }

  get(url) { return this._cache[url] || null; }

  get progress() {
    if (this._pending === 0) return 1;
    return this._done / this._pending;
  }

  get ready() { return this._pending === this._done; }

  // ── Drawing helpers ────────────────────────────────────────

  // Draw an image or a coloured placeholder rectangle
  drawOrRect(ctx, url, x, y, w, h, placeholderColor = '#888', label = '') {
    const img = this.get(url);
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      ctx.fillStyle = placeholderColor;
      ctx.fillRect(x, y, w, h);
      if (label) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = `bold ${Math.floor(h * 0.35)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2, w - 4);
      }
    }
  }

  // Draw a frame from an animation array
  drawFrame(ctx, urls, frameIndex, x, y, w, h, placeholderColor = '#888', flipX = false) {
    if (!urls || urls.length === 0) {
      ctx.fillStyle = placeholderColor;
      ctx.fillRect(x, y, w, h);
      return;
    }
    const url = urls[frameIndex % urls.length];
    if (flipX) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      this.drawOrRect(ctx, url, 0, 0, w, h, placeholderColor);
      ctx.restore();
    } else {
      this.drawOrRect(ctx, url, x, y, w, h, placeholderColor);
    }
  }
}

const assets = new AssetManager();
