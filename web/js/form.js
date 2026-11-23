// The settings form's logic: the request it sends, its badges, its Wi-Fi
// choices, its errors and its help texts. Pure: no DOM, no Web Serial, so the
// tests run it (web-tests/form.test.mjs). app.js draws the form.
import { S } from "./strings.js";
import { validateConfig, validateWifi, PATHS_BY_CFG, filterSupported, mergeConfig, newlyOffered } from "./settings.js";
import { ruleForZone } from "./tz.js";
import { pageList } from "./preview.js";

// The firmware's built-in values: config/config.h.example, which the release
// builds use, with tz_rule from the zone table. The form starts here
// when there is no board to ask (path B). KEEP IN SYNC with config.h.example;
// form.test.mjs compares the two.
export const DEFAULTS = Object.freeze({
  mount: "left",
  theme: 2,
  brightness: 180,
  tz_name: "Europe/Berlin",
  tz_rule: "CET-1CEST,M3.5.0,M10.5.0/3",
  lat: "48.1374",
  lon: "11.5755",
  clock_format: "24h",
  temp_unit: "celsius",
  wind_unit: "kmh",
  night: Object.freeze({ enabled: false, start: 23, end: 7, brightness: 26 }),
  portal: Object.freeze({ enabled: true, password: "buddy1234" }),
  sitstand: Object.freeze({ sit_min: 30, stand_min: 10 }),
  pages: Object.freeze({
    face: true, clock: true, date: true, weather: true, ip: true, sitstand: true,
  }),
});

// Flows, as spec §4. flash: the flow writes firmware; erase: it erases first.
export const FLOWS = Object.freeze({
  change: { flash: false, erase: false },  // path A: settings only
  review: { flash: false, erase: false },  // after a flash that added keys
  update: { flash: true, erase: false },   // path A
  fresh: { flash: true, erase: true },     // path A
  upgrade: { flash: true, erase: false },  // path B, from 1.1 or older
  install: { flash: true, erase: true },   // path B, a new board
  recover: { flash: true, erase: false },  // path B, a Buddy that can't start: no form
  setup: { flash: false, erase: false },   // after a recovery that found nothing saved
});

export function afterRecovery(got) {
  return got && got.stored === true ? "keep" : "setup";
}

// A board's GET config as the form shows it. Missing keys from newer firmware
// are filled from DEFAULTS; unknown legacy keys are dropped by knownWith on save.
export function fromBoard(config) {
  const out = structuredClone(config || {});
  if (!Object.hasOwn(out, "clock_format")) out.clock_format = DEFAULTS.clock_format;
  if (!out.night) out.night = { ...DEFAULTS.night };
  if (!out.portal) out.portal = { ...DEFAULTS.portal };
  if (!out.sitstand) out.sitstand = { ...DEFAULTS.sitstand };
  if (!out.pages) out.pages = { ...DEFAULTS.pages };
  for (const p of ["ip", "sitstand"]) {
    if (!Object.hasOwn(out.pages, p)) out.pages = { ...out.pages, [p]: DEFAULTS.pages[p] };
  }
  if (!Object.hasOwn(out, "brightness")) out.brightness = DEFAULTS.brightness;
  return out;
}

export function backupConfig(boardConfig) {
  const out = fromBoard(boardConfig);
  if (!boardConfig || !Object.hasOwn(boardConfig, "brightness")) delete out.brightness;
  return out;
}

export function wifiChoices(info, path) {
  const flow = FLOWS[path] || FLOWS.change;
  const wifi = info && info.wifi;
  const choices = [];
  if (!flow.erase && wifi && wifi.saved) {
    choices.push({ value: "keep", label: S.form.wifiKeep(wifi.ssid || "") });
  } else if (!info && path === "upgrade") {
    choices.push({ value: "keep", label: S.form.wifiKeepUnknown });
  }
  choices.push({ value: "new", label: S.form.wifiNew });
  return choices;
}

const DEFAULT_SUPPORTED = new Set(PATHS_BY_CFG[3]);

export function newFormState(config, {
  flow, info = null, added = [], imported = [], location = [], supported = DEFAULT_SUPPORTED, teaser = [],
} = {}) {
  return {
    flow,
    config: structuredClone(config),
    wifi: { configure: true, choice: wifiChoices(info, flow)[0].value, ssid: "", password: "" },
    added: [...added],
    imported: [...imported],
    location: [...location],
    supported: new Set(supported),
    teaser: new Set(teaser || []),
  };
}

export const previewConfig = (state) => filterSupported(state.config, state.supported);

export const offered = (state, path) => !!(state && state.supported && state.supported.has(path));

export const LOCATION_KEYS = Object.freeze(["lat", "lon", "tz_name"]);

export function locationMissing(state) {
  const flow = FLOWS[state.flow];
  if (!flow || !(flow.erase || state.flow === "upgrade" || state.flow === "setup")) return false;
  const given = state.location || [];
  return !LOCATION_KEYS.every((k) => given.includes(k));
}

export function boardLocation(got) {
  if (!got || got.stored !== true || !got.config) return [];
  const c = got.config;
  const builtIn = LOCATION_KEYS.every((k) => String(c[k]) === String(DEFAULTS[k]));
  return builtIn ? [] : [...LOCATION_KEYS];
}

export function formToRequest(state) {
  const req = { config: state.supported ? filterSupported(state.config, state.supported) : structuredClone(state.config) };
  const w = state.wifi;
  if (w && w.configure && w.choice === "new") req.wifi = { ssid: w.ssid, password: w.password };
  return req;
}

export function fieldState(state, path) {
  if (state.supported && state.supported.has(path)) return "on";
  if (state.teaser && state.teaser.has(path)) return "greyed";
  return "hidden";
}

const topOf = (p) => String(p).split(/[.[]/)[0];
function listed(list, key) {
  if (!list) return false;
  return [...list].some((k) => k === key
    || (topOf(k) === topOf(key) && (k === topOf(k) || key === topOf(key))));
}

export function badgesFor(key, { added = [], imported = [] } = {}) {
  const out = [];
  if (listed(added, key)) out.push("new");
  if (listed(imported, key)) out.push("imported");
  return out;
}

export function helpFor(key) {
  if (!Object.hasOwn(S.help, key) || typeof S.help[key] !== "string" || !S.help[key].trim()) {
    throw new Error(`no help text for "${key}"`);
  }
  return S.help[key];
}

export function fieldMessage(key, raw) {
  if (key.startsWith("pages.")) return S.errors.page;
  if (Object.hasOwn(S.errors, key)) return S.errors[key];
  const text = String(raw || S.problem.generic);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function applyAfterFlash(f, boardConfig, now) {
  const fresh = newlyOffered(f.supported, now);
  f.supported = now;
  f.config = filterSupported(mergeConfig(fromBoard(boardConfig), f.config), now);
  if (!f.config.night) f.config.night = { ...DEFAULTS.night };
  if (!f.config.portal) f.config.portal = { ...DEFAULTS.portal };
  if (!f.config.sitstand) f.config.sitstand = { ...DEFAULTS.sitstand };
  const chosen = (f.touched && f.touched.has("brightness")) || (f.imported || []).includes("brightness");
  const flow = FLOWS[f.flow];
  if (!chosen && !(flow && flow.erase) && now.has("brightness") && boardConfig && Number.isInteger(boardConfig.brightness)) {
    f.config.brightness = boardConfig.brightness;
  }
  return fresh;
}

export function formErrors(state, zones) {
  const out = {};
  const { errors } = validateConfig(state.config);
  for (const [key, raw] of Object.entries(errors)) out[key] = fieldMessage(key, raw);
  if (!out.tz_name && zones && ruleForZone(zones, state.config.tz_name) === null) {
    out.tz_name = S.errors.tzUnknown;
  }
  if (locationMissing(state)) out.location = S.errors.location;
  if (fieldState(state, "night.enabled") !== "on") {
    for (const key of Object.keys(out)) {
      if (key === "night" || key.startsWith("night.") || key === "clock_format") delete out[key];
    }
  }
  if (fieldState(state, "brightness") !== "on") delete out.brightness;
  if (fieldState(state, "portal.enabled") !== "on") {
    for (const key of Object.keys(out)) {
      if (key === "portal" || key.startsWith("portal.")) delete out[key];
    }
  }
  if (fieldState(state, "sitstand.sit_min") !== "on") {
    for (const key of Object.keys(out)) {
      if (key === "sitstand" || key.startsWith("sitstand.")) delete out[key];
    }
  }
  const w = state.wifi;
  if (w && w.configure && w.choice === "new") {
    for (const [key, raw] of Object.entries(validateWifi({ ssid: w.ssid, password: w.password }).errors)) {
      out[key] = fieldMessage(key, raw);
    }
  }
  return out;
}

export function redactLog(text) {
  return String(text)
    .replace(/("portal"\s*:\s*\{[^}]*"password"\s*:\s*)"(?:[^"\\]|\\.)*"/g, '$1"<redacted>"')
    .replace(/("password"\s*:\s*)"(?:[^"\\]|\\.)+"/g, '$1"<redacted>"');
}

export function locationSummary(config, placeLabel = "") {
  const c = config || {};
  const lat = String(c.lat ?? "").trim();
  const lon = String(c.lon ?? "").trim();
  const zone = String(c.tz_name ?? "").trim();
  const coords = lat && lon ? `${lat}, ${lon}` : lat || lon;
  return [String(placeLabel || "").trim(), coords, zone].filter(Boolean).join(" · ");
}

export const THEMED_PAGES = Object.freeze(["clock", "date", "weather", "ip", "sitstand"]);

export const hourLabel = (h, format) => {
  if (format !== "12h") return `${String(h).padStart(2, "0")}:00`;
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
};
export const levelToPercent = (l) => Math.round((l * 100) / 255);
export const percentToLevel = (p) => Math.max(8, Math.min(255, Math.round((p * 255) / 100)));

export function previewPageFor(key, config) {
  switch (key) {
    case "temp_unit": case "wind_unit": case "lat": case "lon": case "city": return "weather";
    case "tz_name": case "tz_rule": case "clock_format": return "clock";
    case "mount": return "face";
    case "brightness": return "stay";
    case "sit_min": case "stand_min": case "sitstand.sit_min": case "sitstand.stand_min": return "sitstand";
    case "portal.enabled": case "portal.password": return null;
    case "theme": {
      const shown = pageList(config);
      return THEMED_PAGES.find((p) => shown.includes(p)) || "stay";
    }
    default: break;
  }
  if (typeof key === "string" && (key === "night" || key.startsWith("night."))) return "clock";
  if (typeof key === "string" && key.startsWith("pages.")) {
    const page = key.slice("pages.".length);
    return config && config.pages && config.pages[page] === true ? page : null;
  }
  return null;
}

export const WIFI_WAIT_MS = 30000;

export function joinedWifi(info, ssid) {
  return !!(info && info.wifi && info.wifi.connected && info.wifi.ssid === ssid);
}

export function resultKind(req, info) {
  const w = (info && info.wifi) || {};
  if (req && req.wifi) return joinedWifi(info, req.wifi.ssid) ? "connected" : "wifiFailed";
  if (!w.saved) return "hotspot";
  return "saved";
}

export function addsSettings(entry, info) {
  if (!entry || !info) return false;
  const a = Number(entry.cfg_v), b = Number(info.cfg_v);
  return Number.isFinite(a) && Number.isFinite(b) && a > b;
}

export function escapeRich(text) {
  return String(text).replace(/[\\*`[\]]/g, (c) => `\\${c}`);
}

export function parseRich(text) {
  const s = String(text);
  const out = [];
  let buf = "";
  const flush = () => { if (buf) { out.push({ type: "text", text: buf }); buf = ""; } };
  const until = (i, delim) => {
    let v = "";
    while (i < s.length) {
      if (s[i] === "\\" && i + 1 < s.length) { v += s[i + 1]; i += 2; continue; }
      if (s.startsWith(delim, i)) return [v, i + delim.length];
      v += s[i++];
    }
    return null;
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) { buf += s[i + 1]; i += 2; continue; }
    if (s.startsWith("**", i)) {
      const r = until(i + 2, "**");
      if (r && r[0]) { flush(); out.push({ type: "strong", text: r[0] }); i = r[1]; continue; }
    } else if (c === "`") {
      const r = until(i + 1, "`");
      if (r && r[0]) { flush(); out.push({ type: "code", text: r[0] }); i = r[1]; continue; }
    } else if (c === "[") {
      const r = until(i + 1, "]");
      const m = r && /^\((https:\/\/[^)\s]+)\)/.exec(s.slice(r[1]));
      if (m && r[0]) { flush(); out.push({ type: "link", text: r[0], href: m[1] }); i = r[1] + m[0].length; continue; }
    }
    buf += c;
    i++;
  }
  flush();
  return out;
}