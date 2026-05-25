# Placeholder Game — Kids Platformer Kit

A classic-style platformer you can make your own by swapping out the artwork.
Inspired by Super Mario Bros, Mega Man, Castlevania, and Ninja Gaiden.

## Run the game

Open `index.html` in any web browser.

For the best experience (especially the Export feature), run a local server first:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Make it your own

See **ARTWORK_GUIDE.md** for the full list of files to replace.

**Short version:** drop square PNG files into `assets/art/` using the
filenames listed in the guide. Any size works — the game scales everything automatically.

## Controls

| Action | Keys | Gamepad |
|---|---|---|
| Move | Arrow Keys / A D | Left stick / D-pad |
| Jump | Space / W / Up | A button |
| Shoot | X / K | X button |
| Dash | Shift / J | B button |
| Pause | P / Escape | Start |
| Restart | R | — |

Touch buttons appear automatically on phones and tablets.

## Features

- **3 built-in levels** that auto-advance when you reach the flag
- **5 power-ups:** Blaster, Shield, Double Jump, Dash, Giant
- **Visual level editor** — paint tiles, place enemies and items, play-test instantly
- **Settings panel** — sliders for gravity, speed, jump height, enemy speed, volume; toggles for god mode, infinite lives, and more
- **Gamepad support** — plug in any controller and play
- **Export button** — bundles the whole game into a single HTML file to share with friends
- **Custom levels** saved in the browser automatically

## File structure

```
index.html          ← open this to play
style.css
js/
  settings.js       ← game modifier settings (saved between sessions)
  gamepad.js        ← controller support
  assets.js         ← art file paths (edit to rename files)
  levels.js         ← level data (edit to change/add levels)
  editor.js         ← level editor logic
  game.js           ← main game engine
assets/
  art/              ← DROP YOUR ARTWORK HERE
ARTWORK_GUIDE.md    ← full art guide for kids
```

## Adding more power-ups

Power-ups are not capped at five. To add one:

1. Add a new image to `assets/art/`
2. Add a new key in the `items` section of `js/assets.js`
3. Add a `{ type: "yourPowerup", x: ..., y: ... }` entry in a level in `js/levels.js`
4. Add its behavior in the `collectPowerup()` function in `js/game.js`
