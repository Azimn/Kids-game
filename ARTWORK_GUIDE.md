# Artwork Guide — Make It Your Own!

## The only rule: make it square

Every image should be **square** (same width and height).
Any size works — 32×32, 64×64, 100×100, even a photo that's 500×500.
The game stretches or shrinks it automatically to fit.

**PNG files are recommended** because they support transparent backgrounds,
which makes your character look great on top of any background.
JPG files work too — they just won't have a transparent background.

---

## How to swap art

1. Draw or find your image
2. Save it as a PNG (square shape)
3. Rename it to match the filename in the list below
4. Drop it into the `assets/art/` folder
5. Open (or refresh) the game in your browser — done!

The game always shows coloured placeholder shapes for any missing file,
so you can replace one thing at a time.

---

## File list

Drop these files into `assets/art/`:

### Your character (the player)
| Filename | What it shows |
|---|---|
| `player-idle.png` | Standing still |
| `player-run-1.png` | Walking — frame 1 |
| `player-run-2.png` | Walking — frame 2 |
| `player-jump.png` | Jumping |
| `player-hurt.png` | Ouch! Just got hit |

### Enemy
| Filename | What it shows |
|---|---|
| `enemy-walker.png` | The bad guy that walks back and forth |

### Tiles (the blocks that make the ground and platforms)
| Filename | What it shows |
|---|---|
| `tile-ground.png` | Solid ground |
| `tile-brick.png` | Brick block |
| `tile-question.png` | Mystery block (hit from below!) |
| `tile-breakable.png` | Block you can smash with Giant power |
| `tile-spike.png` | Dangerous spike — hurts! |
| `goal-flag.png` | The finish flag |

### Power-ups
| Filename | Power |
|---|---|
| `power-blaster.png` | Shoot energy blasts |
| `power-shield.png` | Block one hit |
| `power-double-jump.png` | Jump again in mid-air |
| `power-dash.png` | Super fast dash |
| `power-giant.png` | Grow big and smash blocks |

### Other stuff
| Filename | What it shows |
|---|---|
| `coin.png` | Collectible coin or star |
| `projectile.png` | The blaster shot (can be skinny rectangle shape instead of square) |
| `background.png` | The sky/scenery behind the level — doesn't have to be square |
| `title-logo.png` | Your game's title on the menu screen — doesn't have to be square |

---

## Tips for kids

- **Hand-drawn art works great!** Draw on paper, take a photo, remove the
  white background with a free tool like remove.bg, save as PNG.
- The **bigger** you draw it, the better it looks (the game scales it down,
  not up, so big drawings stay sharp).
- Use a **transparent background** so your character doesn't have a white box around it.
- You can use the **same image for run-1 and run-2** if you only want to draw one walk frame.
- The **title-logo.png** is how you rename the game — draw your own title!

---

## Making a full drawn level

You can draw an entire level as one background picture and use invisible
collision tiles on top of it.

1. Draw (or paint) your whole level as one wide image
2. Save it as `background.png`
3. In `js/levels.js`, set `hideTiles: true` for your level
4. Use `X` tiles in the level map where the player can stand —
   they'll be invisible but still solid

This way the level looks exactly like your drawing!
