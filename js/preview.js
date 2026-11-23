// A virtual Buddy in its printed holder, showing the chosen theme, mounting
// side and pages live.

import { createFace, SCREEN_W, SCREEN_H } from "./face.js?v=7c17e37a83";
import { S } from "./strings.js?v=7c17e37a83";

const NS = "http://www.w3.org/2000/svg";
const FG = "#ffffff";
const BG = "#000000";
const DOT_OFF = "#5a5a5a";
export const CYCLE_MS = 3000;

const ROLES = ["time", "sec", "dateWd", "dateBig", "value", "label", "temp", "wicon", "wsub",
  "priceUp", "priceDown", "ticker"];

function theme(over) {
  const t = {};
  for (const r of ROLES) t[r] = over[r] ?? FG;
  return Object.freeze(t);
}

const CY = "#00c8ff";
const GRAY = "#78828c";
export const THEMES = Object.freeze([
  theme({}),
  theme({ sec: CY, dateWd: CY, temp: CY, priceUp: CY, priceDown: CY, label: GRAY, wsub: GRAY }),
  theme({
    sec: "#ffb428", dateWd: "#ffb428", temp: "#ff8c3c", wicon: "#ffd25a", wsub: "#3cc8c8",
    priceUp: "#3cdc78", priceDown: "#ff505a", label: GRAY,
  }),
  theme({
    time: "#ffb428", sec: "#ffd25a", dateWd: "#ffb428", dateBig: "#f5e1be", value: "#ebd7b4",
    label: "#967850", temp: "#ffb428", wicon: "#ffd25a", wsub: "#b4966e",
    priceUp: "#ffb428", priceDown: "#ffb428", ticker: "#f5e1be",
  }),
  theme({
    time: CY, sec: "#3cc8c8", dateWd: "#5aaaff", dateBig: "#cddceb", value: "#cddceb",
    label: "#96a0b9", temp: CY, wicon: "#5aaaff", wsub: "#3cc8c8",
    priceUp: CY, priceDown: CY, ticker: "#cddceb",
  }),
]);

export function themeColors(n) {
  return THEMES[Number.isInteger(n) && n >= 0 && n < THEMES.length ? n : 0];
}

export const SHOWN_ORDER = ["face", "clock", "date", "weather", "ip", "sitstand"];

export function pageList(config) {
  const pages = (config && config.pages) || {};
  const list = SHOWN_ORDER.filter((key) => pages[key]);
  return list.length ? list : ["face"];
}

export const GLYPHS = {
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.", "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####", "3": "#####|...#.|..#..|...#.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.", "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": "..##.|.#...|#....|####.|#...#|#...#|.###.", "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.", "9": ".###.|#...#|#...#|.####|....#|...#.|.##..",
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#", B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.", D: "###..|#..#.|#...#|#...#|#...#|#..#.|###..",
  E: "#####|#....|#....|####.|#....|#....|#####", F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.####", H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: ".###.|..#..|..#..|..#..|..#..|..#..|.###.", J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#", L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#", N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.", P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#", R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.", T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.", V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.", X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|#...#|.#.#.|..#..|..#..|..#..", Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  ".": ".....|.....|.....|.....|.....|.##..|.##..", "-": ".....|.....|.....|#####|.....|.....|.....",
  ":": ".....|.##..|.##..|.....|.##..|.##..|.....", "/": ".....|....#|...#.|..#..|.#...|#....|.....",
  "+": ".....|..#..|..#..|#####|..#..|..#..|.....", "%": "##...|##..#|...#.|..#..|.#...|#..##|...##",
  "$": "..#..|.####|#.#..|.###.|..#.#|####.|..#..",
};
GLYPHS["—"] = GLYPHS["-"];

export function textPath(text, x, y, size) {
  let d = "";
  [...String(text)].forEach((ch, i) => {
    const g = GLYPHS[ch.toUpperCase()];
    if (!g) return;
    const ox = x + i * 6 * size;
    g.split("|").forEach((row, r) => {
      let c = 0;
      while (c < 5) {
        if (row[c] !== "#") { c++; continue; }
        const start = c;
        while (c < 5 && row[c] === "#") c++;
        d += `M${ox + start * size} ${y + r * size}h${(c - start) * size}v${size}h${(start - c) * size}z`;
      }
    });
  });
  return d;
}

export const textWidth = (text, size) => [...String(text)].length * 6 * size;

const txt = (text, x, y, size, color) =>
  `<path fill="${color}" d="${textPath(text, x, y, size)}"/>`;
const centred = (text, y, size, color) =>
  txt(text, Math.floor((SCREEN_W - textWidth(text, size)) / 2), y, size, color);
const rrect = (x, y, w, h, r, color) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${color}"/>`;

function dots(count, index) {
  const start = SCREEN_W / 2 - ((count - 1) * 16) / 2;
  let s = "";
  for (let i = 0; i < count; i++) {
    s += i === index
      ? `<circle cx="${start + i * 16}" cy="${SCREEN_H - 12}" r="3" fill="${FG}"/>`
      : `<circle cx="${start + i * 16}" cy="${SCREEN_H - 12}" r="2" fill="none" stroke="${DOT_OFF}" stroke-width="1.25"/>`;
  }
  return s;
}

const SEG_MASKS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
function digit(x, y, n, w, h, t, color) {
  const half = h / 2;
  const r = t / 2;
  const segs = [
    [x + t, y, w - 2 * t, t], [x + w - t, y + t, t, half - t], [x + w - t, y + half, t, half - t],
    [x + t, y + h - t, w - 2 * t, t], [x, y + half, t, half - t], [x, y + t, t, half - t],
    [x + t, y + half - t / 2, w - 2 * t, t],
  ];
  return segs.map((s, i) => (SEG_MASKS[n % 10] & (1 << i) ? rrect(...s, r, color) : "")).join("");
}

const two = (n) => String(n).padStart(2, "0");

export function drawClock(c, now, blinkColon, h12 = false) {
  const hh24 = now.getHours();
  const hh = h12 ? (hh24 % 12 || 12) : hh24;
  const mm = now.getMinutes();
  const ss = now.getSeconds();
  const W = 54, H = 100, T = 10, Y = 18;
  let s = (!h12 || hh >= 10 ? digit(8, Y, Math.floor(hh / 10), W, H, T, c.time) : "") + digit(70, Y, hh % 10, W, H, T, c.time);
  if (h12) s += txt(hh24 < 12 ? "AM" : "PM", 282, Y + 4, 2, c.sec);
  if (!blinkColon || ss % 2 === 0) {
    s += rrect(134, Y + 28, 11, 11, 5, c.time) + rrect(134, Y + 62, 11, 11, 5, c.time);
  }
  s += digit(154, Y, Math.floor(mm / 10), W, H, T, c.time) + digit(216, Y, mm % 10, W, H, T, c.time);
  return s + txt(two(ss), 278, Y + H - 24, 3, c.sec);
}

const WEEKDAYS = ["SONNTAG", "MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "SAMSTAG"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];

function drawDate(c, now) {
  return centred(WEEKDAYS[now.getDay()], 14, 4, c.dateWd)
    + centred(`${MONTHS[now.getMonth()]} ${two(now.getDate())}`, 62, 6, c.dateBig)
    + centred(String(now.getFullYear()), 126, 3, c.value);
}

function sun(cx, cy, color) {
  let s = `<circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="${color}" stroke-width="1.5"/>`;
  for (let i = 0; i < 8; i++) {
    const a = i * 0.7854;
    s += `<line x1="${(cx + Math.cos(a) * 30).toFixed(1)}" y1="${(cy + Math.sin(a) * 30).toFixed(1)}"`
      + ` x2="${(cx + Math.cos(a) * 40).toFixed(1)}" y2="${(cy + Math.sin(a) * 40).toFixed(1)}"`
      + ` stroke="${color}" stroke-width="1.5"/>`;
  }
  return s;
}

function drawWeather(c, config) {
  const f = config.temp_unit === "fahrenheit";
  const mph = config.wind_unit === "mph";
  const temp = f ? "75" : "24";
  const wind = `W ${mph ? 7 : 12}${mph ? "MPH" : "KMH"}`;
  return sun(250, 66, c.wicon)
    + txt(temp, 14, 34, 8, c.temp)
    + txt(f ? "F" : "C", 14 + textWidth(temp, 8), 34, 3, c.temp)
    + txt("KLAR", 14, 116, 2, c.wsub)
    + txt("H 40%", 14, 140, 2, c.label)
    + txt(wind, SCREEN_W - 14 - textWidth(wind, 2), 140, 2, c.label);
}

const SAMPLE_IP = "192.168.1.42";

export function drawIp(c) {
  return centred("IP ADRESSE", 24, 2, c.label)
    + centred(SAMPLE_IP, 72, 5, c.value)
    + centred("WLAN", 134, 2, c.label);
}

export function drawSitStand(c, config) {
  const sit = config?.sitstand?.sit_min ?? 30;
  const stand = config?.sitstand?.stand_min ?? 10;
  return centred("STEH/SITZ", 18, 2, c.label)
    + txt("SITZEN", 20, 52, 3, c.temp)
    + txt(`${String(sit).padStart(2, "0")} MIN`, 20, 88, 2, c.value)
    + txt("STEHEN", 170, 52, 3, c.sec)
    + txt(`${String(stand).padStart(2, "0")} MIN`, 170, 88, 2, c.value)
    + centred("12:34 REST", 130, 2, c.label);
}

export function formatCount(n) {
  n = Math.max(0, Math.trunc(n));
  if (n < 100000) return String(n);
  if (n < 1000000) return `${Math.floor(n / 1000)}k`;
  if (n < 10000000) {
    const tenths = Math.floor(n / 100000);
    return `${Math.floor(tenths / 10)}.${tenths % 10}M`;
  }
  return `${Math.floor(n / 1000000)}M`;
}

export function followerTextSize(formatted) {
  return [...String(formatted)].length === 5 ? 5 : 6;
}

export function subDotY(index, count, screenH) {
  return Math.trunc(screenH / 2) - Math.trunc(((count - 1) * 14) / 2) + index * 14;
}

export function clickStep(index, count) {
  return index + 1 < count ? { index: index + 1, nextPage: false } : { index: 0, nextPage: true };
}

const VIEW_W = 460;
const VIEW_H = 252;
let uid = 0;

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const DEFAULT_CONFIG = { mount: "left", theme: 0, pages: { face: true } };
export const HOLD_MS = 5000;

export class PageCycle {
  constructor({ onChange = () => {}, cycleMs = CYCLE_MS, reduced = () => false } = {}) {
    this.onChange = onChange;
    this.cycleMs = cycleMs;
    this.reduced = reduced;
    this.pages = ["face"];
    this.index = 0;
    this.paused = false;
    this.holding = false;
    this.timer = 0;
    this.holdTimer = 0;
  }

  get page() { return this.pages[this.index]; }

  setPages(list) {
    if (list.join() === this.pages.join()) return false;
    const current = this.page;
    this.pages = [...list];
    const keep = this.pages.indexOf(current);
    this.index = keep >= 0 ? keep : 0;
    if (keep < 0) this.onChange();
    this.schedule();
    return true;
  }

  next() {
    this.endHold();
    this.index = (this.index + 1) % this.pages.length;
    this.onChange();
    this.schedule();
  }

  setPaused(paused) {
    this.paused = !!paused;
    this.schedule();
  }

  showPage(page, holdMs = HOLD_MS) {
    if (page !== null && page !== undefined) {
      const i = this.pages.indexOf(page);
      if (i < 0) return false;
      if (i !== this.index) { this.index = i; this.onChange(); }
    }
    clearTimeout(this.holdTimer);
    this.holding = true;
    this.holdTimer = setTimeout(() => { this.holding = false; this.holdTimer = 0; this.schedule(); }, holdMs);
    this.schedule();
    return true;
  }

  endHold() {
    clearTimeout(this.holdTimer);
    this.holdTimer = 0;
    this.holding = false;
  }

  schedule() {
    clearInterval(this.timer);
    this.timer = 0;
    if (this.pages.length > 1 && !this.reduced() && !this.paused && !this.holding) {
      this.timer = setInterval(() => {
        this.index = (this.index + 1) % this.pages.length;
        this.onChange();
      }, this.cycleMs);
    }
  }

  get cycling() { return this.timer !== 0; }

  destroy() {
    clearInterval(this.timer);
    clearTimeout(this.holdTimer);
    this.timer = this.holdTimer = 0;
  }
}

export function createPreview(container) {
  const id = `buddy-preview-${++uid}`;
  const figure = document.createElement("figure");
  figure.className = "buddy-preview";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "buddy-preview__device";
  button.setAttribute("aria-label", S.previewLabel);
  const bar = document.createElement("figcaption");
  bar.className = "buddy-preview__bar";
  const caption = document.createElement("span");
  caption.className = "buddy-preview__caption";
  const pause = document.createElement("button");
  pause.type = "button";
  pause.className = "buddy-preview__pause";
  bar.append(caption, pause);

  const svg = el("svg", { viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, "aria-hidden": "true", focusable: "false" });
  const defs = el("defs", {}, svg);
  const clip = el("clipPath", { id: `${id}-clip` }, defs);
  el("rect", { width: SCREEN_W, height: SCREEN_H, rx: 14 }, clip);
  const glare = el("linearGradient", { id: `${id}-glare`, x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  el("stop", { offset: "0", "stop-color": "#fff", "stop-opacity": "0.07" }, glare);
  el("stop", { offset: "0.45", "stop-color": "#fff", "stop-opacity": "0" }, glare);

  const holder = el("g", {}, svg);
  el("rect", { class: "bp-body", x: 360, y: 52, width: 92, height: 148, rx: 16 }, holder);
  const monitor = el("g", {}, svg);
  el("rect", { class: "bp-bezel", x: 424, y: -20, width: 80, height: VIEW_H + 40, rx: 10 }, monitor);
  el("rect", { class: "bp-panel", x: 438, y: -20, width: 80, height: VIEW_H + 40 }, monitor);
  const body = el("g", {}, svg);
  el("rect", { class: "bp-body", x: 14, y: 14, width: 372, height: 224, rx: 34 }, body);
  el("rect", { class: "bp-rim", x: 14.5, y: 14.5, width: 371, height: 223, rx: 33.5 }, body);
  el("rect", { class: "bp-port", x: 286, y: 233, width: 34, height: 5, rx: 2.5 }, body);
  el("rect", { class: "bp-glass", x: 28, y: 28, width: 344, height: 196, rx: 24 }, body);
  const screen = el("g", { transform: "translate(40 40)" }, body);
  const content = el("g", { "clip-path": `url(#${id}-clip)` }, screen);
  el("rect", { width: SCREEN_W, height: SCREEN_H, fill: BG }, content);
  const page = el("g", {}, content);
  const faceHost = el("g", {}, content);
  const dotLayer = el("g", {}, content);
  el("rect", { x: 28, y: 28, width: 344, height: 196, rx: 24, fill: `url(#${id}-glare)`, "pointer-events": "none" }, body);

  button.appendChild(svg);
  figure.append(button, bar);
  container.appendChild(figure);

  let config = DEFAULT_CONFIG;
  let face = null;
  let tick = 0;
  let compact = false;
  const pauseText = document.createElement("span");
  pauseText.className = "buddy-preview__pause-text";
  pause.append(pauseText);

  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const reduced = () => !!(mq && mq.matches);
  const cycle = new PageCycle({ onChange: () => draw(), reduced });

  function layout() {
    const right = config.mount === "right";
    svg.setAttribute("viewBox", compact ? `${right ? 100 : 40} 40 ${SCREEN_W} ${SCREEN_H}` : `0 0 ${VIEW_W} ${VIEW_H}`);
    figure.classList.toggle("buddy-preview--compact", compact);
    holder.setAttribute("transform", right ? `rotate(180 ${VIEW_W / 2} ${VIEW_H / 2})` : "");
    body.setAttribute("transform", right ? `rotate(180 ${VIEW_W / 2} ${VIEW_H / 2})` : "");
    monitor.setAttribute("transform", right ? `translate(${VIEW_W} 0) scale(-1 1)` : "");
    content.setAttribute("transform", right ? `rotate(180 ${SCREEN_W / 2} ${SCREEN_H / 2})` : "");
  }

  function draw() {
    const key = cycle.page;
    const c = themeColors(config.theme);
    const now = new Date();
    if (key === "face") {
      page.innerHTML = "";
      if (!face) face = createFace(faceHost);
    } else {
      if (face) { face.destroy(); face = null; }
      const blink = !reduced();
      page.innerHTML = key === "clock" ? drawClock(c, now, blink, config.clock_format === "12h")
        : key === "date" ? drawDate(c, now)
        : key === "weather" ? drawWeather(c, config)
        : key === "ip" ? drawIp(c)
        : key === "sitstand" ? drawSitStand(c, config)
        : "";
    }
    dotLayer.innerHTML = dots(cycle.pages.length, cycle.index);
    let text = S.pageNames[key];
    if (key === "weather" || key === "ip" || key === "sitstand") text += ` (${S.previewSample})`;
    caption.textContent = text;
  }

  function syncPause() {
    pause.hidden = cycle.pages.length < 2 || reduced();
    pauseText.textContent = cycle.paused ? S.previewPlay : S.previewPause;
    pause.dataset.paused = String(cycle.paused);
  }

  tick = setInterval(() => { if (cycle.page === "clock") draw(); }, 1000);

  const next = () => { cycle.next(); };
  button.addEventListener("click", next);
  const togglePause = () => { cycle.setPaused(!cycle.paused); syncPause(); };
  pause.addEventListener("click", togglePause);
  const onMotion = () => { cycle.schedule(); draw(); syncPause(); };
  if (mq) mq.addEventListener("change", onMotion);

  function update(nextConfig) {
    config = nextConfig || DEFAULT_CONFIG;
    cycle.setPages(pageList(config));
    layout();
    draw();
    syncPause();
  }

  update(DEFAULT_CONFIG);

  return {
    update,
    showPage(pageKey, holdMs = HOLD_MS) { return cycle.showPage(pageKey, holdMs); },
  showEntry() { return false; },
    setCompact(on) { compact = !!on; layout(); },
    destroy() {
      cycle.destroy();
      clearInterval(tick);
      if (face) face.destroy();
      if (mq) mq.removeEventListener("change", onMotion);
      button.removeEventListener("click", next);
      pause.removeEventListener("click", togglePause);
      figure.remove();
    },
  };
}