const statusEl = document.getElementById("status");
const controlsEl = document.getElementById("controls");
const gameEl = document.getElementById("game");
const input = document.getElementById("files");

const controls = {
  nes: "Controls: Arrows = D-pad, X = A, Z = B, Enter = Start, Right Ctrl = Select",
  snes: "Controls: Arrows = D-pad, X = A, Z = B, S = X, A = Y, Q = L, W = R, Enter = Start, Shift = Select",
  psx: "Controls: Arrows = D-pad, Z = Cross, X = Circle, S = Square, D = Triangle, W = L1, R = R1, E = L2, T = R2, V = Start, C = Select. Click the game if keys don't respond."
};

function ext(name) {
  return name.split(".").pop().toLowerCase();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load " + src));
    document.body.appendChild(s);
  });
}

function readBytes(file) {
  return file.arrayBuffer().then(b => new Uint8Array(b));
}

input.onchange = () => {
  const files = Array.from(input.files);
  if (!files.length) return;
  start(files).catch(e => {
    statusEl.textContent = "Error: " + e.message;
  });
};

async function start(files) {
  const nes = files.find(f => ext(f.name) === "nes");
  const snes = files.find(f => ["sfc", "smc"].includes(ext(f.name)));
  const cue = files.find(f => ext(f.name) === "cue");
  const disc = files.find(f => ["bin", "iso", "img"].includes(ext(f.name)));

  if (nes) return startNes(nes);
  if (snes) return startSnes(snes);
  if (cue) return startPsxCue(cue, files);
  if (disc) return startPsx(disc);

  statusEl.textContent = "That file type isn't supported. Use .nes, .sfc, .smc, or .cue + .bin.";
}

function begin(system, name) {
  input.disabled = true;
  statusEl.textContent = "Playing " + name + ". Refresh the page to load a different game.";
  controlsEl.textContent = controls[system];
}

async function startNes(file) {
  await loadScript("jsnes.min.js");
  const data = await readBytes(file);
  gameEl.style.width = "512px";
  gameEl.style.height = "480px";
  const browser = new jsnes.Browser({
    container: gameEl,
    onError: e => { statusEl.textContent = "Error: " + e.message; }
  });
  browser.loadROM(data);
  begin("nes", file.name);
}

function log(text) {
  console.log(text);
}

function getByteRep(v) {
  return ("0" + v.toString(16)).slice(-2).toUpperCase();
}

function getWordRep(v) {
  return ("000" + v.toString(16)).slice(-4).toUpperCase();
}

function getLongRep(v) {
  return ("00000" + v.toString(16)).slice(-6).toUpperCase();
}

function clearArray(arr) {
  arr.fill(0);
}

function headerScore(rom, base) {
  if (rom.length < base + 0x40) return -1;
  let score = 0;
  const comp = rom[base + 0x1c] | (rom[base + 0x1d] << 8);
  const sum = rom[base + 0x1e] | (rom[base + 0x1f] << 8);
  if ((comp ^ sum) === 0xffff) score += 4;
  const map = rom[base + 0x15] & 0x0f;
  if (base === 0x7fc0 && (map === 0 || map === 2)) score += 2;
  if (base === 0xffc0 && (map === 1 || map === 5)) score += 2;
  return score;
}

async function startSnes(file) {
  for (const f of ["cart", "dsp", "spc", "apu", "pipu", "cpu", "snes"]) {
    await loadScript("snes/" + f + ".js");
  }
  let rom = await readBytes(file);
  if (rom.length % 0x8000 === 512) rom = rom.slice(512);
  const hiRom = headerScore(rom, 0xffc0) > headerScore(rom, 0x7fc0);

  const snes = new Snes();
  if (!snes.loadRom(rom, hiRom)) {
    statusEl.textContent = "Couldn't load that SNES ROM.";
    return;
  }
  snes.reset(true);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 480;
  gameEl.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, 512, 480);

  const actx = new AudioContext();
  const perFrame = Math.floor(actx.sampleRate / 60);
  const bufL = new Float64Array(perFrame);
  const bufR = new Float64Array(perFrame);
  const ringL = new Float32Array(8192);
  const ringR = new Float32Array(8192);
  let writePos = 0;
  let readPos = 0;
  const node = actx.createScriptProcessor(2048, 0, 2);
  node.onaudioprocess = e => {
    const outL = e.outputBuffer.getChannelData(0);
    const outR = e.outputBuffer.getChannelData(1);
    if (writePos - readPos < 2048) readPos = Math.max(0, writePos - 2048);
    if (writePos - readPos > 6144) readPos = writePos - 4096;
    for (let i = 0; i < 2048; i++) {
      outL[i] = ringL[readPos & 8191];
      outR[i] = ringR[readPos & 8191];
      readPos++;
    }
  };
  node.connect(actx.destination);
  actx.resume();

  const keys = {
    z: 0, a: 1, shift: 2, enter: 3,
    arrowup: 4, arrowdown: 5, arrowleft: 6, arrowright: 7,
    x: 8, s: 9, q: 10, w: 11
  };
  window.addEventListener("keydown", e => {
    const b = keys[e.key.toLowerCase()];
    if (b !== undefined) {
      e.preventDefault();
      snes.setPad1ButtonPressed(b);
    }
  });
  window.addEventListener("keyup", e => {
    const b = keys[e.key.toLowerCase()];
    if (b !== undefined) {
      e.preventDefault();
      snes.setPad1ButtonReleased(b);
    }
  });

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += Math.min(now - last, 100);
    last = now;
    while (acc >= 1000 / 60) {
      snes.runFrame(false);
      snes.setSamples(bufL, bufR, perFrame);
      for (let i = 0; i < perFrame; i++) {
        ringL[writePos & 8191] = bufL[i];
        ringR[writePos & 8191] = bufR[i];
        writePos++;
      }
      acc -= 1000 / 60;
    }
    snes.setPixels(img.data);
    ctx.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  begin("snes", file.name);
}

async function startPsxCue(cue, files) {
  const text = await cue.text();
  const names = [...text.matchAll(/FILE\s+"?([^"\r\n]+?)"?\s+BINARY/gi)].map(m => m[1].split(/[\\/]/).pop());
  if (!names.length) {
    statusEl.textContent = "Couldn't read that .cue file.";
    return;
  }
  const bin = files.find(f => f.name.toLowerCase() === names[0].toLowerCase());
  if (!bin) {
    statusEl.textContent = "Also select " + names[0] + " together with the .cue file.";
    return;
  }
  return startPsx(bin);
}

async function startPsx(file) {
  const player = document.createElement("wasmpsx-player");
  gameEl.appendChild(player);
  await loadScript("wasmpsx.min.js");
  await new Promise(r => setTimeout(r, 500));
  player.readFile(file);
  begin("psx", file.name);
}
