# Peg Drop Deluxe — Stabilized Canonical Source

This directory is the canonical source tree for the stabilized Game Boy Color build.
It compiles directly with GBDK 4.3.0. The build workflow creates `hUGEDriver.lib`
from the upstream hUGEDriver source using RGBDS 0.6.1, then links the release and
debug ROMs from these checked-in source files.

## Stabilization baseline

- 15 orange targets and retuned score multipliers
- one Game Boy-appropriate physics update with nearest-peg collision selection
- 16-bit broad-phase collision checks and division-free reflection/separation
- low-energy stall recovery and a 240-update shot limit
- adaptive particle load and cached sprite writes
- channel 1 reserved for sound effects; music uses channels 2–4
- separate production and debug ROMs
- state-aware PyBoy regression with real pass/fail assertions

## Build

Set `LCC` to the GBDK `lcc` executable and place a compatible
`hUGEDriver.lib` in this directory, then run:

```sh
make LCC=/path/to/gbdk/bin/lcc
```

The outputs are:

- `pegdrop_deluxe.gb` — production ROM
- `pegdrop_deluxe_debug.gb` — debug-state test ROM

The successful CI baseline and ROM hashes are recorded in the accompanying report files.
