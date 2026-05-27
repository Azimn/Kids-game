# Polish review — findings & fixes

Reviewed the latest build. I applied 3 verified fixes (below) and left a few
design-level items for you to decide on. I also debunked several false alarms
so you don't waste time on them.

## ✅ Fixed in this zip (3 files)

### 1. CRASH: platformer boss crashes the game — `js/game.js`
`drawBoss()` referenced `ASSETS` but never declared it in scope (every other
render fn declares `const ASSETS = window.KQ_ASSETS || {}` locally). When the
level-3 boss appears, `drawBoss()` throws `ReferenceError: ASSETS is not
defined` and the render loop dies.
**Fix:** added `const ASSETS = window.KQ_ASSETS || {};` at the top of `drawBoss()`.

### 2. PROGRESSION: Puzzle Room can't go past room 0 — `js/puzzle.js`
In `checkTransition()` line 163 was:
```js
if (t===T.ODOOR||t===T.LDOOR) return; // don't pass through locked
```
This returns early when the player stands on an **open** door (ODOOR) too — but
the right/left-wall transition checks right below it require the player to be on
that ODOOR tile. So the open door never triggers a room change: the puzzle is
unwinnable past the first room.
**Fix:** `if (t===T.LDOOR) return;` — locked door still blocks, open door passes.

### 3. Settings sliders silently do nothing in kart/puzzle/dungeon + sound volume — `js/settings.js`
`KQ_SETTINGS` is declared with a top-level `const`, which does **not** attach to
`window`. So `window.KQ_SETTINGS` is `undefined` everywhere. The 3 new genre
modules and `sounds.js` all read settings via `window.KQ_SETTINGS`, so:
- speed/gravity/etc. sliders have no effect in Kart/Puzzle/Dungeon
- the SFX-volume slider has no effect (sound always plays at the 0.7 default)
**Fix:** one line at the end of settings.js: `window.KQ_SETTINGS = KQ_SETTINGS;`
This repairs all of the above at once (game.js already uses the bare global, so
nothing else needs to change).

## 🤔 Worth doing, but design calls (left for you)

### A. Kart Racer has no "lose" — `js/kart.js`
`endRace(true)` only fires when the **player** hits 3 laps. There's no check for
an AI kart finishing first, so `endRace(false)` / gameover is never reachable —
the kid always eventually wins. Not a crash (no soft-lock), but it makes the race
feel pointless. Suggest: when any AI kart reaches `TOTAL_LAPS`, call
`endRace(false)` and show final placement. Tune so it's still winnable for a 5yo.

### B. Dungeon level-up curve is too flat — `js/dungeon.js`
`p.nextExp = p.lvl * 20`. With only 3 enemies total (8/15/30 EXP), leveling
barely matters. If you want leveling to feel meaningful, either add more
encounters or steepen the curve (e.g. `20 + lvl*lvl*15`). Pure tuning, no bug.

### C. Dead state `dialog_done` — `js/dungeon.js`
`updateDialog()` sets `phase='dialog_done'` then immediately runs the callback
which overwrites the phase. All 4 `startDialog()` calls pass a callback, so it's
harmless today — but if anyone ever calls `startDialog(lines)` with **no**
callback, the phase sticks at `dialog_done` (no `case` in the `update()` switch)
and the game freezes. Cheap insurance: add `case 'dialog_done': break;` or drop
the intermediate state.

## ❌ Checked and NOT problems (don't chase these)

- **kart.js `_KQ_DRAW_IMG`**: correct. The host bridge exposes `_KQ_DRAW_IMG`
  (with the underscore), so kart/puzzle/dungeon art loads fine.
- **`_KQ_VIEW` / `_KQ_TILE` "missing" from the bridge**: the modules don't use
  them — they have their own `W/H/TILE` constants. No action needed.
- **Dungeon mouse-click listener "leak"**: `init()` correctly removes the prior
  handler before re-adding. No leak.
- **Dungeon dialog "freeze"**: not real — see item C above for the only edge case.

## Note on the bridge
The host→module contract is just these globals (all present): `_KQ_CTX`,
`_KQ_GAME`, `_KQ_PRESSED`, `_KQ_BEEP`, `_KQ_DRAW_IMG`, `_KQ_FX_UPDATE`,
`_KQ_FX_DRAW`, `_KQ_HINT.{show,draw}`, `_KQ_SETMODE`, plus the now-fixed
`window.KQ_SETTINGS` and `window.KQ_ASSETS`. If you add genres, use these.
