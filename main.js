const cores = {
  nes: "nes",
  unf: "nes",
  fds: "nes",
  sfc: "snes",
  smc: "snes",
  fig: "snes",
  swc: "snes",
  cue: "psx",
  bin: "psx",
  iso: "psx",
  img: "psx",
  chd: "psx",
  pbp: "psx",
  m3u: "psx"
};

document.getElementById("start").onclick = () => {
  const rom = document.getElementById("rom").files[0];
  const bios = document.getElementById("bios").files[0];
  const status = document.getElementById("status");

  if (!rom) {
    status.textContent = "Choose a ROM first.";
    return;
  }

  let ext = rom.name.split(".").pop().toLowerCase();
  let core = cores[ext];

  if (ext === "zip" || ext === "7z") {
    core = prompt("System for this archive? (nes, snes, psx)", "nes");
  }

  if (!core) {
    status.textContent = "Unsupported file type: ." + ext;
    return;
  }

  document.getElementById("start").disabled = true;
  status.textContent = "Loading " + rom.name + " (" + core + ")... Refresh the page to load another game.";

  const game = document.getElementById("game");
  game.style.width = "640px";
  game.style.height = "480px";

  window.EJS_player = "#game";
  window.EJS_core = core;
  window.EJS_gameName = rom.name.replace(/\.[^.]+$/, "");
  window.EJS_gameUrl = URL.createObjectURL(rom);
  window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
  window.EJS_startOnLoaded = true;

  if (bios && core === "psx") {
    window.EJS_biosUrl = URL.createObjectURL(bios);
  }

  const s = document.createElement("script");
  s.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
  document.body.appendChild(s);
};
