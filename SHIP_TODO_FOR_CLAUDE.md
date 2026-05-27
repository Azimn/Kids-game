# Ship TODO for Claude

This build is usable and smoke-tested, but these are the next items I would hand to another developer before calling it a polished public release.

## Highest priority

0. Rebuild the default Platformer levels from proven hand-crafted layouts. (BLOCKER)
   - Problem: the current default levels in `js/levels.js` were AI-generated. Some are
     literally unwinnable (gaps too wide, no reachable path to the flag) and others are
     unfairly hard because enemies/spikes were sprinkled in at random.
   - Fix: transcribe known-good layouts from a hand-crafted classic (Super Mario Bros.
     1-1, 1-2, etc., or the Game Boy Super Mario Land levels). Those were tuned by hand,
     so reproducing their tile/enemy/coin positions guarantees a beatable, well-paced level.
   - How: map the source layout onto our grid. Tile size is 48px, maps are arrays of
     equal-length strings (legend at the top of `js/levels.js`: `.`=air `X`=ground
     `?`=question `B`=breakable `S`=spike `F`=flag). Enemies/coins/powerups use pixel
     X/Y (col*48, row*48).
   - Acceptance: every default level is completable start-to-flag without taking
     unavoidable damage, and difficulty ramps gently across the set.
   - Note: deferred for now per product owner — captured here so it isn't lost.

1. Run a real kid-mode UX pass.
   - Goal: a young child should understand the default Platformer flow without reading instructions.
   - Watch for tiny labels, clipped buttons, confusing advanced drawers, and places where the app exposes too many choices at once.

2. Mobile play needs a dedicated pass.
   - The canvas scales now, but touch controls, menu spacing, and portrait layout still need hands-on tuning on actual phones/tablets.
   - Confirm playability for Platformer first; other genres can be secondary.

3. Export QA across every game type.
   - Platformer, Shooter, Beat-em-up, Dungeon, Kart, and Puzzle should each export to one standalone HTML file.
   - Confirm exported files preserve custom art, selected game type, title screen, settings, and sound.

4. Art fallback audit for non-platformer custom art.
   - Platformer hero/enemy fallback rules are now safer.
   - Dungeon, Kart, and Puzzle should get the same careful review so missing custom frames never create weird default/custom mixtures.

## Polish

5. Finalize product branding.
   - The temporary default is `Kids Game Maker`.
   - Decide the final product name and update README, title screen art, export title copy, and any screenshots consistently.

6. Make advanced controls calmer.
   - Settings still have a lot of power-user options together.
   - Consider splitting into `Easy`, `More`, and `Debug` sections, with debug hidden by default.

7. Improve artwork import feedback.
   - Add clearer success/failure messages, image size guidance, and maybe automatic crop/fit preview.
   - Current import works, but the workflow is still plain.

8. Add a lightweight smoke-test script.
   - Automate: load app, press start, open menu, launch every game mode, open Art, open Settings, export one file.
   - This would catch regressions much faster than manual testing.

## Nice to have

9. Add save slots / shareable project files.
   - Kids may want to make more than one game without overwriting browser storage.

10. Better default art scale.
   - Several sprites still feel small, especially for young kids and mobile.
   - A consistent visual scale pass would make the whole app feel friendlier.

11. Accessibility pass.
   - Keyboard focus, readable contrast, large target sizes, and reduced-motion behavior should be checked.

12. Rename any remaining internal placeholder language.
   - The visible app title now uses `Kids Game Maker`, but comments, docs, or old screenshots may still need a final branding pass.
