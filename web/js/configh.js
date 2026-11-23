// Import an Arduino config.h (the pre-1.2 way of configuring the Buddy).
import { ruleForZone, ruleFromOffset } from "./tz.js";

const KEY_ORDER = ["mount", "theme", "tz_name", "tz_rule", "lat", "lon", "temp_unit", "wind_unit", "pages", "portal", "sitstand"];

const PAGE_DEFINES = {
  SHOW_FACE: "face", SHOW_CLOCK: "clock", SHOW_DATE: "date", SHOW_WEATHER: "weather",
  SHOW_IP: "ip", SHOW_SITSTAND: "sitstand",
};
const DIRECT = {
  THEME: "theme", TIMEZONE: "tz_name", LAT: "lat", LONG: "lon", TEMP: "temp_unit", WIND: "wind_unit",
};
const HELPERS = ["TZ_RULE", "TZ_OFFSET_HOURS"];
const NIGHT_DEFINES = {
  NIGHT_MODE: "enabled", NIGHT_START_HOUR: "start", NIGHT_END_HOUR: "end", NIGHT_BRIGHTNESS: "brightness",
};

function readValue(rest) {
  const s = rest.trimStart();
  if (s.startsWith('"')) {
    let out = "";
    for (let i = 1; i < s.length; i++) {
      const c = s[i];
      if (c === "\\" && i + 1 < s.length) { out += s[++i]; continue; }
      if (c === '"') return out;
      out += c;
    }
    return out;
  }
  const token = s.match(/^[^\s]*/)[0];
  const cut = token.indexOf("//");
  const bare = cut >= 0 ? token.slice(0, cut) : token;
  if (bare === "true") return true;
  if (bare === "false") return false;
  if (bare !== "" && Number.isFinite(Number(bare))) return Number(bare);
  return bare;
}

export function parseConfigH(text, table) {
  const defines = new Map();
  const skipped = [];
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const line of stripped.split(/\r?\n/)) {
    const m = line.match(/^\s*#define\s+([A-Z_][A-Z0-9_]*)\s+(.*)$/);
    if (!m) continue;
    const [, name, rest] = m;
    const known = name === "MOUNTING_LOCATION" || name in DIRECT || name in PAGE_DEFINES
      || name in NIGHT_DEFINES || name === "CLOCK_12H" || name === "PORTAL_PROTECT" || name === "PORTAL_PASS"
      || name === "SIT_MINUTES" || name === "STAND_MINUTES" || HELPERS.includes(name);
    if (!known) { skipped.push(name); continue; }
    defines.set(name, readValue(rest));
  }

  const config = {};
  const mount = defines.get("MOUNTING_LOCATION");
  if (mount === "LEFT" || mount === "RIGHT") config.mount = mount.toLowerCase();
  for (const [name, key] of Object.entries(DIRECT)) {
    if (defines.has(name)) config[key] = defines.get(name);
  }

  const explicit = defines.get("TZ_RULE");
  let rule = typeof explicit === "string" && explicit !== "" ? explicit : null;
  if (rule === null && typeof config.tz_name === "string") rule = ruleForZone(table, config.tz_name);
  if (rule === null && typeof defines.get("TZ_OFFSET_HOURS") === "number") {
    rule = ruleFromOffset(defines.get("TZ_OFFSET_HOURS"));
  }
  if (rule !== null) config.tz_rule = rule;

  const pages = {};
  for (const [name, page] of Object.entries(PAGE_DEFINES)) {
    if (typeof defines.get(name) === "boolean") pages[page] = defines.get(name);
  }
  if (Object.keys(pages).length) config.pages = pages;

  if (typeof defines.get("CLOCK_12H") === "boolean") config.clock_format = defines.get("CLOCK_12H") ? "12h" : "24h";
  const night = {};
  for (const [name, key] of Object.entries(NIGHT_DEFINES)) {
    const v = defines.get(name);
    if (typeof v === (key === "enabled" ? "boolean" : "number")) night[key] = v;
  }
  if (Object.keys(night).length) config.night = night;

  const portal = {};
  if (typeof defines.get("PORTAL_PROTECT") === "boolean") portal.enabled = defines.get("PORTAL_PROTECT");
  if (typeof defines.get("PORTAL_PASS") === "string") portal.password = defines.get("PORTAL_PASS");
  if (Object.keys(portal).length) config.portal = portal;

  const sitstand = {};
  if (typeof defines.get("SIT_MINUTES") === "number") sitstand.sit_min = defines.get("SIT_MINUTES");
  if (typeof defines.get("STAND_MINUTES") === "number") sitstand.stand_min = defines.get("STAND_MINUTES");
  if (Object.keys(sitstand).length) config.sitstand = sitstand;

  const imported = [...KEY_ORDER, "clock_format", "night"].filter((k) => k in config);
  const defaulted = KEY_ORDER.filter((k) => !(k in config));
  return { config, imported, skipped, defaulted };
}