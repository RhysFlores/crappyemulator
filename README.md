# crappyemulator

A barebones browser emulator. Pick a game file, it plays. Everything runs locally in the
page — no uploads, no server, no build step, no dependencies.

**Play it:** https://rhysflores.github.io/crappyemulator/

## What it emulates

### NES / Famicom
- Files: `.nes` (iNES and NES 2.0 headers)
- Video, audio, and the Zapper via mouse
- Mappers 0, 1, 2, 3, 4, 5, 7, 9, 11, 34, 38, 66, 71, 79, 94, 118, 119, 140, 180, 240, 241

### SNES / Super Famicom
- Files: `.sfc`, `.smc`
- 65816 CPU, PPU background modes 0–7, SPC700 audio CPU + DSP
- LoROM and HiROM carts with SRAM; 512-byte copier headers are stripped automatically
- **No enhancement chips** — Super FX, SA-1, DSP-1, S-DD1, SPC7110 and CX4 games will not run
- The DSP echo effect is not implemented, and the core is slow enough that it may not hold
  60fps on older machines

### PlayStation (PS1)
- Files: `.cue` + `.bin` (select both at once), or a single `.iso` / `.img`
- No BIOS file needed
- By far the heaviest of the three — it takes a few seconds to compile the wasm and boot

## Controls

| | NES | SNES | PS1 |
|---|---|---|---|
| D-pad | Arrows | Arrows | Arrows |
| A / Cross | X | X | Z |
| B / Circle | Z | Z | X |
| X / Square | — | S | S |
| Y / Triangle | — | A | D |
| L / L1 | — | Q | W |
| R / R1 | — | W | R |
| L2 / R2 | — | — | E / T |
| Start | Enter | Enter | V |
| Select | Right Ctrl | Shift | C |

One player, keyboard only. No save states, no save files, no fast-forward, no gamepads.
Refresh the page to load a different game.

## Running it locally

Plain static files, but they must be served over HTTP — the PS1 core loads a web worker
and `.wasm` files, which `file://` blocks:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Built on

| System | Core | License |
|---|---|---|
| NES | [jsnes](https://github.com/bfirsh/jsnes) | [Apache-2.0](LICENSE-jsnes.txt) |
| SNES | [SnesJs](https://github.com/angelo-wf/SnesJs) by angelo_wf | [MIT](LICENSE-snesjs.txt) |
| PS1 | [wasmpsx](https://github.com/js-emulators/wasmpsx) | [MIT](LICENSE-wasmpsx.txt) |

Game files are not included and are not distributed here.
