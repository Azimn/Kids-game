/*
  sounds.js — ZzFX-powered retro sound effects
  Based on ZzFXMicro v1.3.2 by Frank Force (MIT License)
  https://github.com/KilledByAPixel/ZzFX

  Replaces the basic beep() in game.js with rich procedural audio.
  window.KQ_BEEP(type) is the public API — same interface as before.
*/

'use strict';

// ── ZzFXMicro (inline, ~1KB) ──────────────────────────────────────────────
let zzfxV = 0.3;
let zzfxX = null; // created on first user gesture

function _zzfxCtx() {
  if (!zzfxX) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) zzfxX = new C();
  }
  if (zzfxX && zzfxX.state === 'suspended') zzfxX.resume();
  return zzfxX;
}

function zzfx(
  volume=1, randomness=.05, frequency=220, attack=0, sustain=0,
  release=.1, shape=0, shapeCurve=1, slide=0, deltaSlide=0,
  pitchJump=0, pitchJumpTime=0, repeatTime=0, noise=0, modulation=0,
  bitCrush=0, delay=0, sustainVolume=1, decay=0, tremolo=0, filter=0
) {
  const ctx = _zzfxCtx(); if (!ctx) return;
  const sampleRate = 44100;
  const PI2 = Math.PI * 2;
  const abs = Math.abs, sign = v => v < 0 ? -1 : 1;
  let startSlide = slide *= 500 * PI2 / sampleRate / sampleRate;
  let startFrequency = frequency *=
    (1 + randomness * 2 * Math.random() - randomness) * PI2 / sampleRate;
  let modOffset=0, repeat=0, crush=0, jump=1;
  let b=[], t=0, i=0, s=0, f;
  const source = ctx.createBufferSource();
  // biquad filter
  const quality=2, w=PI2*abs(filter)*2/sampleRate,
    cos=Math.cos(w), alpha=Math.sin(w)/2/quality,
    a0=1+alpha, a1=-2*cos/a0, a2=(1-alpha)/a0,
    b0=(1+sign(filter)*cos)/2/a0,
    b1=-(sign(filter)+cos)/a0, b2=b0;
  let x2=0, x1=0, y2=0, y1=0;
  // scale
  attack  = attack  * sampleRate || 9;
  decay   *= sampleRate; sustain *= sampleRate;
  release *= sampleRate; delay   *= sampleRate;
  deltaSlide     *= 500 * PI2 / sampleRate ** 3;
  modulation     *= PI2 / sampleRate;
  pitchJump      *= PI2 / sampleRate;
  pitchJumpTime  *= sampleRate;
  repeatTime      = repeatTime * sampleRate | 0;
  volume         *= zzfxV;
  const length = attack + decay + sustain + release + delay | 0;
  for (; i < length; b[i++] = s * volume) {
    if (!(++crush % (bitCrush * 100 | 0 || 1))) {
      s = shape ? shape>1 ? shape>2 ? shape>3 ? shape>4 ?
        (t/PI2%1 < shapeCurve/2)*2-1 :
        Math.sin(t**3) :
        Math.max(Math.min(Math.tan(t),1),-1) :
        1-(2*t/PI2%2+2)%2 :
        1-4*abs(Math.round(t/PI2)-t/PI2) :
        Math.sin(t);
      s = (repeatTime ?
        1 - tremolo + tremolo * Math.sin(PI2 * i / repeatTime) : 1) *
        (shape>4 ? s : sign(s) * abs(s) ** shapeCurve) *
        (i < attack ? i/attack :
         i < attack+decay ? 1-((i-attack)/decay)*(1-sustainVolume) :
         i < attack+decay+sustain ? sustainVolume :
         i < length-delay ? (length-i-delay)/release*sustainVolume : 0);
      s = delay ? s/2 + (delay > i ? 0 :
        (i < length-delay ? 1 : (length-i)/delay) *
        b[i-delay|0]/2/volume) : s;
      if (filter) s = y1 = b2*x2 + b1*(x2=x1) + b0*(x1=s) - a2*y2 - a1*(y2=y1);
    }
    f = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++);
    t += f + f * noise * Math.sin(i**5);
    if (jump && ++jump > pitchJumpTime) { frequency += pitchJump; startFrequency += pitchJump; jump = 0; }
    if (repeatTime && !(++repeat % repeatTime)) { frequency = startFrequency; slide = startSlide; jump ||= 1; }
  }
  const buf = ctx.createBuffer(1, b.length, sampleRate);
  buf.getChannelData(0).set(b);
  source.buffer = buf;
  source.connect(ctx.destination);
  source.start();
  return source;
}

// ── Sound presets ─────────────────────────────────────────────────────────
// Each array matches zzfx() parameters in order.
// Tweak numbers on https://zzfx.3d2k.com/ (the ZzFX sound designer tool)
const SFX = {
  // Jump: short upward chirp
  jump:    [.8, .05, 320, .01, .06, .05, 0, 1.8, 14, , , , , , , , , , , ,],
  // Coin collect: bright sparkle
  coin:    [1,  .05, 880, .01, .06, .08, 0, 2,   ,  , 280, .08, , , , , , , , ,],
  // Shoot / fire: short blaster zap
  shoot:   [.7, .05, 600, .01, .03, .06, 1, 1.5, -30, , , , , , , , , , , ,],
  // Hurt / take damage: buzzy thud
  hurt:    [1,  .1,  180, .01, .05, .1,  3, ,    ,  , , , , , .3, , , , , ,],
  // Stomp on enemy: satisfying thwack
  stomp:   [1,  .05, 200, .01, .02, .08, 1, 1.5, ,  , , , , , , , , , , ,],
  // Win / level clear: ascending fanfare
  win:     [1,  .02, 350, .01, .4,  .4,  0, 1.2, 6, , 200, .15, , , , , , .8, , ,],
  // Power-up: sparkly ascending chord
  power:   [1,  .02, 440, .01, .1,  .25, 0, 1.5, 8, , 120, .1,  , , , , , .9, , ,],
  // Menu blip: soft click
  menu:    [.5, .05, 440, .01, .02, .04, 0, 1,   ,  , , , , , , , , , , ,],
  // Explosion (boss, kart crash): deep rumble
  explode: [1,  .4,  40,  .01, .15, .4,  2, ,    -10, , , , , .6, , 8, , , , ,],
  // Blip (dialog advance, UI confirm)
  blip:    [.5, .02, 660, .005,.01, .05, 0, 1.2, ,  , , , , , , , , , , ,],
  // Sword swing (zelda)
  sword:   [.7, .05, 340, .005,.02, .1,  2, 1.5, -20, , , , , , , , , , , ,],
  // Door unlock
  unlock:  [.8, .02, 280, .01, .08, .2,  0, 1.2, 4, , 100, .1,  , , , , , .8, , ,],
  // Battle hit (RPG)
  hit:     [1,  .1,  220, .01, .04, .12, 1, 1.3, ,  , , , , .2, , , , , , ,],
  // Level up (RPG)
  levelup: [1,  .01, 300, .01, .5,  .5,  0, 1.5, 10, , 300,.2, , , , , , 1, , ,],
  // Engine rev (kart) — short buzzy loop hint
  engine:  [.3, .1,  80,  .01, .05, .08, 2, ,    2,  , , , , .1, 3, , , , , ,],
  // Dash burst
  dash:    [.8, .05, 220, .005,.03, .11, 2, 1.2, 35, , , , , .15, , , , , , ,],
  // Brick / block break
  break:   [.8, .2,  120, .005,.04, .13, 3, ,    -12, , , , , .35, , 4, , , , ,],
};

// ── Public API ───────────────────────────────────────────────────────────
// Maps the existing beep(type) call names to ZzFX presets.
// New names (sword, unlock, hit, levelup, explode, blip, engine) are also available.
function KQ_BEEP_ZzFX(type = 'menu') {
  const vol = (window.KQ_SETTINGS && KQ_SETTINGS.get('sfxVolume')) ?? 0.7;
  zzfxV = vol * 0.35; // ZzFX volume is already pretty loud at 0.3
  const preset = SFX[type] || SFX.menu;
  try { zzfx(...preset); } catch(e) { /* silently ignore if AudioContext blocked */ }
}

// Expose for use by game.js and external genre modules
window.KQ_SFX     = KQ_BEEP_ZzFX;
window._KQ_BEEP   = KQ_BEEP_ZzFX; // also patch the external module global
