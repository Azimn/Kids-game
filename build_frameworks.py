#!/usr/bin/env python3
"""Build 3 standalone framework HTML files and zip them."""
import zipfile, os

SCAFFOLD = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"/>
  <title>__TITLE__</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif}}
    canvas{{display:block;max-width:100%;border:2px solid #334155;border-radius:8px}}
    #info{{color:#94a3b8;font-size:13px;margin-top:10px;text-align:center}}
  </style>
</head>
<body>
<canvas id="game" width="960" height="540"></canvas>
<div id="info">🎮 Arrow Keys / WASD to move &nbsp;·&nbsp; Space / Z = Action &nbsp;·&nbsp; P = Pause &nbsp;·&nbsp; Click canvas first to capture input</div>
<script>
// ── Standalone scaffold: provides all _KQ_ globals the framework modules need ──
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const VIEW_W = 960, VIEW_H = 540, TILE = 48;

// Input
const keys  = Object.create(null);
const _nameMap = {{
  ArrowLeft:'left', a:'left', A:'left',
  ArrowRight:'right', d:'right', D:'right',
  ArrowUp:'up', w:'up', W:'up',
  ArrowDown:'down', s:'down', S:'down',
  ' ':'jump', z:'jump', Z:'jump', Enter:'jump',
  x:'shoot', X:'shoot', ControlLeft:'shoot', ControlRight:'shoot',
  c:'dash', C:'dash', ShiftLeft:'dash', ShiftRight:'dash',
}};
document.addEventListener('keydown', e=>{{ if(!e.repeat){{keys[_nameMap[e.key]||e.code]=true; e.preventDefault();}} }});
document.addEventListener('keyup',   e=>{{ keys[_nameMap[e.key]||e.code]=false; }});

// Touch controls (tap left/right halves of canvas to steer, tap upper-right to jump)
canvas.addEventListener('touchstart', e=>{{
  e.preventDefault();
  for(const t of e.changedTouches){{
    const r=canvas.getBoundingClientRect();
    const x=(t.clientX-r.left)*(VIEW_W/r.width), y=(t.clientY-r.top)*(VIEW_H/r.height);
    if(x<VIEW_W*0.33) keys['left']=true;
    else if(x>VIEW_W*0.66) keys['right']=true;
    else keys['jump']=true;
  }}
}},{{passive:false}});
canvas.addEventListener('touchend', e=>{{ e.preventDefault(); keys['left']=keys['right']=keys['jump']=false; }}, {{passive:false}});

// Settings (minimal stub)
window.KQ_SETTINGS = {{ get: k => ({{gravityMult:1,speedMult:1,jumpMult:1,enemySpeedMult:1,startLives:3,infiniteLives:false,invincibleMode:false,tintPlayer:''}}[k]||null) }};

// Assets (no files in standalone — falls back to colored shapes in all drawImg calls)
window.KQ_ASSETS = {{ player:{{}}, enemies:{{}}, tiles:{{}}, items:{{}}, backgrounds:{{}} }};

// Shared game state
const _game = {{ particles:[], popups:[], score:0 }};

// Audio
let _audioCtx = null;
function _ensureAudio(){{
  if(!_audioCtx){{ const C=window.AudioContext||window.webkitAudioContext; if(C) _audioCtx=new C(); }}
  if(_audioCtx&&_audioCtx.state==='suspended') _audioCtx.resume();
}}
function _beep(type='coin'){{
  _ensureAudio(); if(!_audioCtx) return;
  const map={{coin:[880,.12],jump:[440,.1],shoot:[660,.08],hurt:[220,.2],stomp:[330,.12],win:[880,.5],power:[990,.18],menu:[550,.1]}};
  const [freq,dur]=map[type]||[440,.1];
  const o=_audioCtx.createOscillator(), g=_audioCtx.createGain();
  o.connect(g); g.connect(_audioCtx.destination);
  o.frequency.value=freq; o.type='square';
  g.gain.setValueAtTime(0.15, _audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime+dur);
  o.start(); o.stop(_audioCtx.currentTime+dur);
}}
canvas.addEventListener('click', _ensureAudio, {{once:true}});

// Hint system
let _hint=null, _hintDismissed={{}};
function _showHint(key, lines){{ if(_hintDismissed[key]) return; _hint={{key,lines}}; }}
function _drawHint(){{
  if(!_hint) return;
  const x=80,y=60,w=800,lh=24;
  const h=_hint.lines.length*lh+60;
  ctx.save();
  ctx.fillStyle='rgba(15,23,42,0.93)'; ctx.strokeStyle='#fbbf24'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.roundRect(x,y,w,h,12); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fbbf24'; ctx.font='bold 16px system-ui'; ctx.textAlign='center';
  ctx.fillText('💡 TIP — click or press any key to close', x+w/2, y+28);
  ctx.fillStyle='#e2e8f0'; ctx.font='15px system-ui';
  _hint.lines.forEach((l,i)=>ctx.fillText(l, x+w/2, y+52+i*lh));
  ctx.restore();
}}
document.addEventListener('keydown', ()=>{{ if(_hint){{ _hintDismissed[_hint.key]=true; _hint=null; }} }}, true);
canvas.addEventListener('click', ()=>{{ if(_hint){{ _hintDismissed[_hint.key]=true; _hint=null; }} }});

// drawImg stub (no files → always returns false so code falls through to colored shape)
function _drawImg(){ return false; }

// drawWithTint stub
function _drawWithTint(tint, x, y, w, h, fn){{ fn(); }}

// Particles / popups (simple version)
function _spawnParticles(x,y,color,count=8){{
  for(let i=0;i<count;i++) _game.particles.push({{
    x,y,vx:(Math.random()-0.5)*160,vy:-Math.random()*200-60,life:0.6,maxLife:0.6,color,r:4
  }});
}}
function _updateEffects(dt){{
  _game.particles=_game.particles.filter(p=>{{
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=400*dt; p.life-=dt; return p.life>0;
  }});
  _game.popups=_game.popups.filter(p=>{{ p.y-=40*dt; p.life-=dt; return p.life>0; }});
}}
function _drawEffects(){{
  for(const p of _game.particles){{
    ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
    ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  }}
  ctx.globalAlpha=1;
  for(const p of _game.popups){{
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.fillStyle='#fbbf24'; ctx.font='bold 16px system-ui'; ctx.textAlign='center';
    ctx.fillText(p.text||'', p.x, p.y);
  }}
  ctx.globalAlpha=1;
}}

// Mode
let _mode = 'playing';
function _setMode(m){{ _mode=m; }}

// Expose all globals the framework modules expect
window._KQ_PRESSED     = name=>!!keys[name];
window._KQ_BEEP        = _beep;
window._KQ_CTX         = ctx;
window._KQ_VIEW        = {{W:VIEW_W,H:VIEW_H}};
window._KQ_TILE        = TILE;
window._KQ_SETMODE     = _setMode;
window._KQ_GAME        = _game;
window._KQ_DRAWIMG     = _drawImg;
window._KQ_DRAWWITHTINT= _drawWithTint;
window._KQ_FX_UPDATE   = _updateEffects;
window._KQ_FX_DRAW     = _drawEffects;
window._KQ_HINT        = {{ show:_showHint, draw:_drawHint }};

// ── Framework module JS (inlined below) ──────────────────────────────────────
__MODULE_JS__

// ── Main loop ────────────────────────────────────────────────────────────────
const MODULE = window.__MODULE_GLOBAL__;
MODULE.init();

let _lastTime = performance.now();
function _loop(now){{
  const dt = Math.min((now - _lastTime) / 1000, 0.05);
  _lastTime = now;
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  if(_mode==='playing'||_mode==='gameover'||_mode==='win') MODULE.update(dt);
  MODULE.render();
  _drawHint();
  requestAnimationFrame(_loop);
}}
requestAnimationFrame(_loop);
</script>
</body>
</html>
"""

def build(title, js_file, module_global, out_file):
    with open(js_file, 'r') as f:
        module_js = f.read()
    with open('js/sounds.js', 'r') as f:
        sounds_js = f.read()
    html = SCAFFOLD
    html = html.replace('__TITLE__', title)
    # Inject ZzFX sounds before the module JS, then replace _KQ_BEEP with KQ_SFX
    html = html.replace('__MODULE_JS__', sounds_js + '\n\n' + module_js)
    html = html.replace('__MODULE_GLOBAL__', module_global)
    with open(out_file, 'w') as f:
        f.write(html)
    print(f"Built {out_file} ({len(html)//1024}KB)")

def main():
    os.makedirs('frameworks', exist_ok=True)
    build('🏎️ Kart Racer Framework', 'js/kart.js', 'KQ_KART', 'frameworks/kart-racer.html')
    build('🗡️ Puzzle Room Framework', 'js/zelda.js', 'KQ_ZELDA', 'frameworks/puzzle-room.html')
    build('⚔️ Dungeon Adventure Framework', 'js/rpg.js', 'KQ_RPG', 'frameworks/dungeon-adventure.html')

    # Zip
    with zipfile.ZipFile('frameworks/game-frameworks.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for name in ['kart-racer.html', 'puzzle-room.html', 'dungeon-adventure.html']:
            path = f'frameworks/{name}'
            if os.path.exists(path):
                z.write(path, name)
                print(f"  Added {name} to zip")
            else:
                print(f"  SKIPPED {name} (not found)")
    print("Done → frameworks/game-frameworks.zip")

if __name__ == '__main__':
    main()
