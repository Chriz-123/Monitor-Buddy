import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULTS, formToRequest, badgesFor, helpFor, wifiChoices, formErrors, fromBoard,
  redactLog, addsSettings, newFormState,
  locationMissing, boardLocation, LOCATION_KEYS, parseRich, escapeRich,
  joinedWifi, resultKind, offered, WIFI_WAIT_MS, locationSummary, FLOWS, afterRecovery,
  fieldState, previewPageFor,
  applyAfterFlash, backupConfig,
  hourLabel, percentToLevel, levelToPercent,
} from "../web/js/form.js";
import { KEYS, mergeConfig, PATHS_BY_CFG, pathsForCfg, filterSupported, supportedPaths, validateConfig } from "../web/js/settings.js";
import { parseConfigH } from "../web/js/configh.js";
import { S } from "../web/js/strings.js";

const zones = JSON.parse(readFileSync(new URL("../web/vendor/posix_tz_db/zones.json", import.meta.url)));
const example = readFileSync(new URL("../config/config.h.example", import.meta.url), "utf8");

const INFO_SAVED = { ok: true, cmd: "INFO", fw: "1.2.0", cfg_v: 1, wifi: { saved: true, ssid: "HomeNet", connected: true } };
const INFO_NONE = { ok: true, cmd: "INFO", fw: "1.2.0", cfg_v: 1, wifi: { saved: false, ssid: "", connected: false } };

const state = (wifi) => ({ config: structuredClone(DEFAULTS), wifi });

// ── formToRequest: the spec §4 Wi-Fi rules ────────────────

test("Wi-Fi on with new credentials: wifi is included", () => {
  const r = formToRequest(state({ configure: true, choice: "new", ssid: "HomeNet", password: "secret123" }));
  assert.deepEqual(r.wifi, { ssid: "HomeNet", password: "secret123" });
  assert.deepEqual(r.config, DEFAULTS);
});

test("Wi-Fi on with keep: wifi is omitted", () => {
  const r = formToRequest(state({ configure: true, choice: "keep", ssid: "typed", password: "typed123" }));
  assert.equal("wifi" in r, false);
});

test("Wi-Fi off: wifi is omitted, whatever was typed", () => {
  const r = formToRequest(state({ configure: false, choice: "new", ssid: "HomeNet", password: "secret123" }));
  assert.equal("wifi" in r, false);
});

test("an open network sends an empty password, not a missing one", () => {
  const r = formToRequest(state({ configure: true, choice: "new", ssid: "Cafe", password: "" }));
  assert.deepEqual(r.wifi, { ssid: "Cafe", password: "" });
});

test("the request's config is a copy", () => {
  const s = state({ configure: false });
  const r = formToRequest(s);
  r.config.pages.face = false;
  assert.equal(s.config.pages.face, true);
});

// ── wifiChoices ───────────────────────────────────────────

const values = (choices) => choices.map((c) => c.value);

test("keep is offered, first, when the board reports saved Wi-Fi", () => {
  const c = wifiChoices(INFO_SAVED, "change");
  assert.deepEqual(values(c), ["keep", "new"]);
  assert.match(c[0].label, /HomeNet/);
  assert.deepEqual(values(wifiChoices(INFO_SAVED, "update")), ["keep", "new"]);
});

test("no keep when the board has no saved Wi-Fi", () => {
  assert.deepEqual(values(wifiChoices(INFO_NONE, "change")), ["new"]);
});

test("no keep for a fresh install: the erase wipes the saved Wi-Fi", () => {
  assert.deepEqual(values(wifiChoices(INFO_SAVED, "fresh")), ["new"]);
});

test("path B: keep is offered for upgrades, not for a fresh install", () => {
  const up = wifiChoices(null, "upgrade");
  assert.deepEqual(values(up), ["keep", "new"]);
  assert.equal(up[0].label, S.form.wifiKeepUnknown);
  assert.deepEqual(values(wifiChoices(null, "install")), ["new"]);
});

test("a new form defaults to the first choice and Wi-Fi on", () => {
  const f = newFormState(DEFAULTS, { flow: "change", info: INFO_SAVED });
  assert.equal(f.wifi.configure, true);
  assert.equal(f.wifi.choice, "keep");
  assert.equal(newFormState(DEFAULTS, { flow: "install", info: null }).wifi.choice, "new");
});

// ── badgesFor ─────────────────────────────────────────────

test("keys in added get New, imported keys get Imported", () => {
  assert.deepEqual(badgesFor("ticker", { added: ["ticker"], imported: [] }), ["new"]);
  assert.deepEqual(badgesFor("ticker", { added: [], imported: ["ticker"] }), ["imported"]);
  assert.deepEqual(badgesFor("ticker", { added: ["ticker"], imported: ["ticker"] }), ["new", "imported"]);
  assert.deepEqual(badgesFor("theme", { added: ["ticker"], imported: ["mount"] }), []);
  assert.deepEqual(badgesFor("theme", {}), []);
});

test("pages: the firmware's pages.<name> paths and an imported pages object", () => {
  assert.deepEqual(badgesFor("pages.moon", { added: ["pages.moon"] }), ["new"]);
  assert.deepEqual(badgesFor("pages.clock", { added: ["pages.moon"] }), []);
  assert.deepEqual(badgesFor("pages.clock", { imported: ["pages"] }), ["imported"]);
  assert.deepEqual(badgesFor("pages", { added: ["pages.moon"] }), ["new"]);
});

// ── helpFor and the help texts ────────────────────────────

test("every setting has a help text", () => {
  for (const key of [...KEYS, "wifi.ssid", "wifi.password", "wifi.configure", "wifi.keep", "city"]) {
    assert.equal(typeof S.help[key], "string", `S.help["${key}"] is missing`);
    assert.ok(S.help[key].trim().length > 10, `S.help["${key}"] is empty`);
    assert.equal(helpFor(key), S.help[key]);
  }
});

test("helpFor throws for an unknown key", () => {
  assert.throws(() => helpFor("no_such_setting"), /no_such_setting/);
});

// ── Defaults, board values, validation ────────────────────

test("DEFAULTS are config.h.example's values, as the firmware is built", () => {
  const { config } = parseConfigH(example, zones);
  assert.deepEqual(mergeConfig(DEFAULTS, config), DEFAULTS);
  assert.deepEqual(Object.keys(DEFAULTS).sort(), [...KEYS].sort());
});

test("formErrors: valid defaults have none", () => {
  assert.deepEqual(formErrors(newFormState(DEFAULTS, { flow: "change", info: INFO_SAVED }), zones), {});
});

test("formErrors: a time zone not in the table is a field error", () => {
  const f = newFormState({ ...DEFAULTS, tz_name: "Mars/Olympus" }, { flow: "change", info: INFO_SAVED });
  const e = formErrors(f, zones);
  assert.deepEqual(Object.keys(e), ["tz_name"]);
  assert.equal(e.tz_name, S.errors.tzUnknown);
});

test("formErrors: Wi-Fi is checked only when new credentials are chosen", () => {
  const f = newFormState(DEFAULTS, { flow: "install", info: null, location: ["lat", "lon", "tz_name"] });
  f.wifi = { configure: true, choice: "new", ssid: "", password: "short" };
  assert.deepEqual(Object.keys(formErrors(f, zones)).sort(), ["wifi.password", "wifi.ssid"]);
  f.wifi.configure = false;
  assert.deepEqual(formErrors(f, zones), {});
});

test("formErrors: messages come from strings.js, keyed like the firmware's", () => {
  const f = newFormState({ ...DEFAULTS, lat: "95", theme: 9 }, { flow: "change", info: INFO_SAVED });
  const e = formErrors(f, zones);
  assert.equal(e.lat, S.errors.lat);
  assert.equal(e.theme, S.errors.theme);
});

// ── Checks, logs and the update note ──────────────────────

test("the update note appears only when the format version goes up", () => {
  assert.equal(addsSettings({ cfg_v: 2 }, { cfg_v: 1 }), true);
  assert.equal(addsSettings({ cfg_v: 1 }, { cfg_v: 1 }), false);
  assert.equal(addsSettings({ cfg_v: 2 }, null), false);
});

// ── Copy rules ────────────────────────────────────────────

test("copy: no exclamation marks, no please, simply or just", () => {
  const texts = [];
  const walk = (v, path) => {
    if (typeof v === "string") texts.push([path, v]);
    else if (typeof v === "function") texts.push([path, String(v("X", "Y", "Z"))]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(S, "S");
  assert.ok(texts.length > 100);
  // The two refusal screens keep Eric's own wording, "Please" included (2026-10-17).
  const ownWording = new Set(["S.notBuddy.parts", "S.notBuddy.chip"]);
  const german = new Set(["S.form.passwordHint", "S.form.setErrors", "S.form.invalid", "S.problem.retry"]);
  for (const [path, t] of texts) {
    assert.doesNotMatch(t, /!/, `${path} has an exclamation mark`);
    if (german.has(path)) continue;
    const banned = ownWording.has(path) ? /\b(simply|just)\b/i : /\b(please|simply|just)\b/i;
    assert.doesNotMatch(t, banned, `${path}: "${t}"`);
  }
});

// ── A fresh install needs a location (Eric, 2026-10-11) ───

test("a fresh install can't go ahead on the built-in location", () => {
  for (const flow of ["fresh", "install"]) {
    const f = newFormState(DEFAULTS, { flow, info: null });
    assert.equal(locationMissing(f), true, flow);
    assert.equal(formErrors(f, zones).location, S.errors.location);
  }
});

test("picking a place, typing all three values, or importing them is enough", () => {
  const f = newFormState(DEFAULTS, { flow: "install", info: null });
  f.location = ["lat", "lon"];
  assert.equal(locationMissing(f), true, "the time zone is still missing");
  f.location = [...LOCATION_KEYS];
  assert.equal(locationMissing(f), false);
  assert.equal("location" in formErrors(f, zones), false);
});

test("path A updates and settings changes keep the board's location", () => {
  for (const flow of ["change", "review", "update"]) {
    assert.equal(locationMissing(newFormState(DEFAULTS, { flow, info: INFO_SAVED })), false, flow);
  }
});

test("a path B upgrade needs a location too, unless an import or the user gave it", () => {
  // No INFO on path B: skipping the config.h import would write the built-in place.
  const f = newFormState(DEFAULTS, { flow: "upgrade", info: null });
  assert.equal(locationMissing(f), true);
  assert.equal(formErrors(f, zones).location, S.errors.location);
  // An import (config.h or backup) marks all three keys as given.
  const imported = newFormState(DEFAULTS, { flow: "upgrade", info: null, location: [...LOCATION_KEYS] });
  assert.equal(locationMissing(imported), false);
  assert.equal("location" in formErrors(imported, zones), false);
  // Two of the three are not enough.
  assert.equal(locationMissing(newFormState(DEFAULTS, { flow: "upgrade", info: null, location: ["lat", "lon"] })), true);
});

test("a board's saved, non-default location counts; defaults or unsaved don't", () => {
  const mine = { ...DEFAULTS, lat: "50.1109", lon: "11.5755", tz_name: "Europe/Berlin" };
  assert.deepEqual(boardLocation({ stored: true, config: mine }), [...LOCATION_KEYS]);
  assert.deepEqual(boardLocation({ stored: false, config: mine }), []);
  assert.deepEqual(boardLocation({ stored: true, config: { ...DEFAULTS } }), []);
  assert.deepEqual(boardLocation(null), []);
});

// ── Markup and escaping ───────────────────────────────────

test("parseRich reads bold, code and https links", () => {
  assert.deepEqual(parseRich("Join **Monitor-Buddy-Setup**, use `AAPL`, see [docs](https://x.io/a)."), [
    { type: "text", text: "Join " },
    { type: "strong", text: "Monitor-Buddy-Setup" },
    { type: "text", text: ", use " },
    { type: "code", text: "AAPL" },
    { type: "text", text: ", see " },
    { type: "link", text: "docs", href: "https://x.io/a" },
    { type: "text", text: "." },
  ]);
  assert.deepEqual(parseRich("[no](http://insecure.example)"), [{ type: "text", text: "[no](http://insecure.example)" }]);
});

test("escaped board data stays plain text", () => {
  const ssid = "**x** [a](https://evil.example) `c` back\slash";
  const tokens = parseRich(S.result.connected(escapeRich(ssid)));
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, "text");
  assert.equal(tokens[0].text, S.result.connected(ssid));
});

// ── The result after a save ───────────────────────────────

test("the result follows spec §4", () => {
  const up = { wifi: { saved: true, ssid: "Home", connected: true } };
  const down = { wifi: { saved: true, ssid: "Home", connected: false } };
  const none = { wifi: { saved: false, ssid: "", connected: false } };
  const sent = { config: {}, wifi: { ssid: "Home", password: "secret123" } };
  assert.equal(resultKind(sent, up), "connected");
  assert.equal(resultKind(sent, down), "wifiFailed");
  assert.equal(resultKind(sent, { wifi: { saved: true, ssid: "Other", connected: true } }), "wifiFailed");
  assert.equal(resultKind({ config: {} }, none), "hotspot");
  assert.equal(resultKind({ config: {} }, up), "saved");
  assert.equal(joinedWifi(null, "Home"), false);
  assert.equal(WIFI_WAIT_MS, 30000);
});

// ── The place summary under the city search (GUI review, 2026-10-12) ──

test("the summary names the place when it came from the city search", () => {
  const c = { lat: "48.1374", lon: "11.5755", tz_name: "Europe/Berlin" };
  assert.equal(locationSummary(c, "Munich, Bavaria, Germany"), "Munich, Bavaria, Germany · 48.1374, 11.5755 · Europe/Berlin");
});

test("from an import or the board: coordinates and zone only", () => {
  assert.equal(locationSummary({ lat: "1.3119", lon: "103.8149", tz_name: "Asia/Singapore" }), "1.3119, 103.8149 · Asia/Singapore");
});

test("missing parts are left out; nothing set gives an empty line", () => {
  assert.equal(locationSummary({ lat: "48.1", lon: "", tz_name: "" }), "48.1");
  assert.equal(locationSummary({ lat: "", lon: "", tz_name: "UTC" }), "UTC");
  assert.equal(locationSummary({}), "");
  assert.equal(locationSummary(null, ""), "");
});


// ── Enter never submits (Eric, 2026-10-12) ────────────────

// Enter in a field submits a form implicitly, through its submit button. So
// the app has none: every button is type "button", and the form's submit
// event saves nothing. A new field or button can't bring the bug back.
const appSource = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");

test("no submit button anywhere in the app", () => {
  assert.doesNotMatch(appSource, /type:\s*["']submit["']/);
  const buttons = [...appSource.matchAll(/h\(\s*["']button["']\s*,\s*\{([^}]*)/g)];
  assert.ok(buttons.length >= 5, "found the app's buttons");
  for (const [call, attrs] of buttons) assert.match(attrs, /type:\s*["']button["']/, call);
});

test("the settings form's submit event only cancels", () => {
  const handlers = [...appSource.matchAll(/addEventListener\(\s*["']submit["']\s*,([^\n]*)/g)].map((m) => m[1].trim());
  assert.deepEqual(handlers, ["(e) => e.preventDefault());"]);
});

// ── Counts: singular for exactly 1 ────────────────────────


// ── Hardware-test fixes (2026-10-12) ──────────────────────


test("the footer carries the copyright line LICENSE asks for", () => {
  const licence = readFileSync(new URL("../LICENSE", import.meta.url), "utf8");
  const holder = licence.match(/Copyright \(c\) (\d{4}) (.+)/);
  assert.equal(S.about.copyright, `© ${holder[1]}`);
  assert.equal(S.about.author, holder[2].trim());
  assert.match(S.about.licenceUrl, /\/LICENSE$/);
});

// ── H: recovering a Buddy keeps what it saved (2026-10-12) ─

test("recovery flashes without erasing; the setup form after it doesn't flash", () => {
  assert.deepEqual(FLOWS.recover, { flash: true, erase: false });
  assert.deepEqual(FLOWS.setup, { flash: false, erase: false });
});

test("after a recovery flash: keep what was stored, else set the Buddy up", () => {
  assert.equal(afterRecovery({ ok: true, stored: true, config: {} }), "keep");
  assert.equal(afterRecovery({ ok: true, stored: false, config: {} }), "setup");
  assert.equal(afterRecovery({ ok: true, config: {} }), "setup");
  assert.equal(afterRecovery(null), "setup");
});

test("setting up after a recovery needs a location, and keeps the Wi-Fi it found", () => {
  assert.equal(locationMissing({ flow: "setup", location: [] }), true);
  assert.equal(locationMissing({ flow: "setup", location: [...LOCATION_KEYS] }), false);
  assert.equal(wifiChoices(INFO_SAVED, "setup")[0].value, "keep");
});

test("every flow with a form has its texts", () => {
  for (const flow of Object.keys(FLOWS).filter((k) => k !== "recover")) {
    assert.equal(typeof S.form.submit[flow], "string", `submit.${flow}`);
    assert.equal(typeof S.form.say[flow], "string", `say.${flow}`);
  }
});

// ── Supported paths in the form (spec §5.3) ───────────────


test("a form from a board offers what its GET reported", () => {
  const f = newFormState(DEFAULTS, { flow: "change", supported: ["theme", "pages.face"] });
  assert.equal(offered(f, "theme"), true);
  assert.equal(offered(f, "pages.ip"), false);
});


test("badges match a group or list path to its top-level key and back", () => {
  assert.deepEqual(badgesFor("pages.moon", { added: ["pages"] }), ["new"]);
  assert.deepEqual(badgesFor("pages", { imported: ["pages.moon"] }), ["imported"]);
  assert.deepEqual(badgesFor("coins[1].pair", { added: ["coins"] }), ["new"]);
  assert.deepEqual(badgesFor("coins", { added: ["coins.style"] }), ["new"]);
  assert.deepEqual(badgesFor("pages.moon", { added: ["pages.face"] }), []);
});

// ── The flows pass the board's supported paths on (spec §5.3) ──

test("every form built from a GET passes that GET's supported paths", () => {
  const fromGet = appSource.match(/newFormState\(fromBoard\(got\.config\)[^)]*\)/g) || [];
  assert.ok(fromGet.length >= 3, "the GET-based forms");
  for (const call of fromGet) assert.match(call, /supported: supportedPaths\(got\.config\)/, call);
});

test("flash flows take supported from the picked release, not the running board", () => {
  assert.match(appSource, /function startFlashFlow[\s\S]*?supported: pathsForCfg\(app\.releases\[0\]\.cfg_v\)/);
  assert.match(appSource, /flow: "fresh"[\s\S]*?supported: pathsForCfg\(app\.releases\[0\]\.cfg_v\)/);
});

test("changing the firmware version recomputes what the form offers", () => {
  assert.match(appSource, /f\.supported = new Set\(pathsForCfg\(entry\.cfg_v\)\)/);
});

test("the form knows what an installable release could add", () => {
  assert.match(appSource, /f\.teaser = installablePaths\(app\.releases\)/);
});


// Replaced in coin-page Task 7: every switch is built, and fieldState hides or
// greys each one for the picked firmware (the pin below).
test("the page switches follow the picked firmware", () => {
  assert.match(appSource, /fieldState\(f, `pages\.\$\{p\}`\)/);
  // What phase 1 pinned: a page the firmware doesn't have isn't shown (hidden), and
  // one only a newer release has is greyed with that release named.
  assert.match(appSource, /const st = fieldState\(f, `pages\.\$\{p\}`\);\s*el\.hidden = st === "hidden";\s*input\.disabled = st === "greyed";/);
  assert.match(appSource, /firstWith\(`pages\.\$\{p\}`\)[\s\S]{0,120}newerNote\(release\.version\)/);
});

test("the backup import leaves out what the board doesn't support", () => {
  assert.match(appSource, /unsupportedKeys\(cfg, f\.supported\)/);
  assert.ok(typeof S.form.backupPartly === "function");
  const text = S.form.backupPartly(11, ["wind_unit"]);
  assert.match(text, /wind_unit/);
  assert.doesNotMatch(text, /!|\bplease\b|\bsimply\b|\bjust\b/i);
});

// ── Stock slots (spec stocks-and-coins §6.1, D15) ─────────




test("confetti after every finished flash, not after a plain settings save", () => {
  assert.match(appSource, /if \(kind === "connected" \|\| \(installed && kind !== "wifiFailed"\)\) confetti\(\);/);
  assert.equal((appSource.match(/\bconfetti\(\);/g) || []).length, 1);
});

test("a silent board gets a second look after the board check, once", () => {
  assert.match(appSource, /else await checkThenPathB\(\{ askAgain: true \}\);/);
  assert.match(appSource, /if \(askAgain\) return await secondLook\(\);/);
  // Trouble seen before writing (a boot loop, download mode) doesn't ask again.
  assert.match(appSource, /app\.info = null;\s*return checkThenPathB\(\);/);
});

test("hour labels follow the clock format and store 0-23", () => {
  assert.equal(hourLabel(23, "24h"), "23:00");
  assert.equal(hourLabel(23, "12h"), "11 PM");
  assert.equal(hourLabel(0, "12h"), "12 AM");
  assert.equal(hourLabel(12, "12h"), "12 PM");
  assert.equal(hourLabel(7, "24h"), "07:00");
});

test("the night slider shows percent and stores 8-255", () => {
  assert.equal(levelToPercent(8), 3);
  assert.equal(levelToPercent(255), 100);
  assert.equal(percentToLevel(100), 255);
  assert.equal(percentToLevel(3), 8);
  assert.equal(percentToLevel(1), 8);
});

// A 1.2 board's config: none of the 1.3 keys.
const config120 = () => filterSupported(DEFAULTS, new Set(PATHS_BY_CFG[1]));

test("a 1.2 board on the way to 1.3 starts with the defaults in the form", () => {
  const board = config120();
  assert.equal(Object.hasOwn(board, "clock_format"), false);
  assert.equal(Object.hasOwn(board, "night"), false);
  const f = newFormState(fromBoard(board), { flow: "update", supported: [...PATHS_BY_CFG[2]] });
  assert.equal(f.config.clock_format, "24h");
  assert.deepEqual({ ...f.config.night }, { enabled: false, start: 23, end: 7, brightness: 26 });
});

test("fromBoard keeps a 1.3 board's own clock format and night mode", () => {
  const night = { enabled: true, start: 22, end: 6, brightness: 40 };
  const out = fromBoard({ ...config120(), clock_format: "12h", night });
  assert.equal(out.clock_format, "12h");
  assert.deepEqual(out.night, night);
});

test("a 1.2 target's request has neither clock_format nor night", () => {
  const f = newFormState(fromBoard(config120()), { flow: "change", info: INFO_SAVED, supported: [...pathsForCfg(1)] });
  const cfg = formToRequest(f).config;
  assert.equal(Object.hasOwn(cfg, "clock_format"), false);
  assert.equal(Object.hasOwn(cfg, "night"), false);
});

test("a 1.3 target's request carries the clock format and night mode", () => {
  const f = newFormState(fromBoard(config120()), { flow: "change", info: INFO_SAVED, supported: [...PATHS_BY_CFG[2]] });
  const cfg = formToRequest(f).config;
  assert.equal(cfg.clock_format, "24h");
  assert.deepEqual({ ...cfg.night }, { enabled: false, start: 23, end: 7, brightness: 26 });
});

test("previewPageFor sends clock_format and night.* to the clock page, and only those", () => {
  const cfg = { ...DEFAULTS };
  for (const k of ["clock_format", "night", "night.enabled", "night.start", "night.end", "night.brightness"]) {
    assert.equal(previewPageFor(k, cfg), "clock", k);
  }
  assert.notEqual(previewPageFor("nightly", cfg), "clock");
});

test("the Clock box sits right after Location; below 1.3 only its note shows", () => {
  const appSource = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
  assert.match(appSource, /locationSection, clockSection,/);
  assert.match(appSource, /clockFields\.hidden = st !== "on";/);
  assert.equal(fieldState(newFormState(DEFAULTS, { flow: "change", info: INFO_SAVED }), "clock_format"), "on");
  assert.equal(fieldState(newFormState(DEFAULTS, { flow: "change", info: INFO_SAVED, supported: [...PATHS_BY_CFG[2]] }), "clock_format"), "on");
});

test("the settings page follows the setup flow: the boxes are appended in this order", () => {
  const src = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
  const calls = src.match(/form\.append\(([^;]*)\);/g).map((c) => c.replace(/\s+/g, " "));
  const order = calls.find((c) => c.includes("wifiSection"));
  assert.equal(order, "form.append(wifiSection, lookSection, unitsSection, locationSection, clockSection, portalSection, sitstandSection);");
  for (const k of ["wifi", "look", "units", "location", "clock", "portal", "sitstand"]) {
    assert.ok(src.includes(`section(S.form.sections.${k},`), k);
  }
  assert.equal(S.form.sections.look, "Aussehen und Seiten");
  // The pages ride inside the Look box, after the day slider.
  assert.match(src, /lookSection\.append\(levelRows, levelNote, pagesBlock\);/);
  assert.doesNotMatch(src, /form\.append\(section\(S\.form\.sections\.(?!firmware)/);
});

test("night errors only count where night mode is offered", () => {
  const bad = { ...DEFAULTS, night: { ...DEFAULTS.night, start: 5, end: 5 } };
  const old = newFormState(bad, { flow: "update", supported: [...pathsForCfg(1)] });
  const e120 = formErrors(old, zones);
  assert.deepEqual(Object.keys(e120).filter((k) => k === "night" || k.startsWith("night.") || k === "clock_format"), []);
  const now = newFormState(bad, { flow: "update", supported: [...PATHS_BY_CFG[2]] });
  assert.ok(formErrors(now, zones).night);
});

test("the default brightness is 1.2's 180 by day and 10 % at night", () => {
  assert.equal(DEFAULTS.brightness, 180);
  assert.equal(levelToPercent(DEFAULTS.brightness), 71);
  assert.equal(levelToPercent(DEFAULTS.night.brightness), 10);
  assert.equal(percentToLevel(10), DEFAULTS.night.brightness);
});

test("the day slider's percent survives a reload, and drawing it keeps the level", () => {
  for (let p = 3; p <= 100; p++) {
    const f = newFormState({ ...DEFAULTS, brightness: percentToLevel(p) }, { flow: "change", info: INFO_SAVED, supported: [...PATHS_BY_CFG[2]] });
    assert.equal(levelToPercent(formToRequest(f).config.brightness), p, String(p));
  }
  const src = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
  assert.equal((src.match(/config\.brightness = /g) || []).length, 1);
});

test("fromBoard seeds the brightness when absent and keeps a board's value", () => {
  assert.equal(fromBoard(config120()).brightness, DEFAULTS.brightness);
  assert.equal(fromBoard({ ...config120(), brightness: 120 }).brightness, 120);
});

test("a 1.2 target's request has no brightness; a 1.3 target's does", () => {
  const old = newFormState(fromBoard(config120()), { flow: "change", info: INFO_SAVED, supported: [...pathsForCfg(1)] });
  assert.equal(Object.hasOwn(formToRequest(old).config, "brightness"), false);
  const now = newFormState(fromBoard(config120()), { flow: "change", info: INFO_SAVED, supported: [...PATHS_BY_CFG[2]] });
  assert.equal(formToRequest(now).config.brightness, DEFAULTS.brightness);
});

test("a brightness error only counts where it is offered", () => {
  const bad = { ...DEFAULTS, brightness: 7 };
  assert.equal(formErrors(newFormState(bad, { flow: "update", supported: [...pathsForCfg(1)] }), zones).brightness, undefined);
  assert.ok(formErrors(newFormState(bad, { flow: "update", supported: [...PATHS_BY_CFG[2]] }), zones).brightness);
});

test("the preview holds its page for the brightness", () => {
  assert.equal(previewPageFor("brightness", { ...DEFAULTS }), "stay");
});

test("updating a 1.2 board keeps the level it has, not the form's default", () => {
  const now = new Set(PATHS_BY_CFG[2]);
  const board = { ...DEFAULTS, brightness: 120 };
  const untouched = newFormState(fromBoard(config120()), { flow: "update", supported: [...PATHS_BY_CFG[2]] });
  applyAfterFlash(untouched, board, now);
  assert.equal(formToRequest(untouched).config.brightness, 120);
  const moved = newFormState(fromBoard(config120()), { flow: "update", supported: [...PATHS_BY_CFG[2]] });
  moved.touched = new Set(["brightness"]);
  moved.config.brightness = 60;
  applyAfterFlash(moved, board, now);
  assert.equal(formToRequest(moved).config.brightness, 60);
  const imported = newFormState({ ...fromBoard(config120()), brightness: 70 }, { flow: "update", imported: ["brightness"], supported: [...PATHS_BY_CFG[2]] });
  applyAfterFlash(imported, board, now);
  assert.equal(formToRequest(imported).config.brightness, 70);
});

test("an erasing flash keeps the form's brightness: the board only has its default", () => {
  const f = newFormState({ ...DEFAULTS, brightness: 120 }, { flow: "fresh", info: INFO_SAVED, supported: [...PATHS_BY_CFG[2]] });
  applyAfterFlash(f, { ...DEFAULTS }, new Set(PATHS_BY_CFG[2]));
  assert.equal(formToRequest(f).config.brightness, 120);
});

test("the day slider is in Look and pages; the night slider is in the Night mode fold-out", () => {
  const src = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
  assert.ok(src.indexOf("S.form.sections.look") < src.indexOf("S.form.dayBrightness"));
  assert.match(src, /const levelRows = h\("div", \{\}, dayLevel\.el\);/);
  assert.match(src, /nightRows = \[\s*nightSwitch\.el,\s*h\("div", \{ class: "grid-2" \}, nightStart\.el, nightEnd\.el\), nightError,\s*nightLevel\.el,\s*\];/);
  assert.match(src, /"night\.end", "night\.enabled", "night\.brightness"\]/);
  assert.match(src, /nightLevel\.input\.disabled = off && nightLevel\.error\.hidden;/);
  assert.doesNotMatch(src, /nightNeedsSwitch/);
  assert.match(src, /newerNote\(first\.version\)/);
});

test("the board copies its level into settings before every read and write", () => {
  const main = readFileSync(new URL("../src/main.cpp", import.meta.url), "utf8");
  assert.equal((main.match(/settings\.brightness = brightnessLevel;/g) || []).length, 4);
  assert.match(main, /brightnessLevel = next\.brightness;\s+brightnessSavePending = true;/);
});

test("every night percent 3-100 survives a reload, and an untouched slider keeps the level", () => {
  for (let p = 3; p <= 100; p++) assert.equal(levelToPercent(percentToLevel(p)), p, String(p));
  assert.equal(levelToPercent(8), 3);
  assert.equal(levelToPercent(255), 100);
  // The stored level is written only by the slider's own input handler, so
  // drawing the form (which shows the rounded percent) never changes it.
  const src = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
  assert.equal((src.match(/night\.brightness = /g) || []).length, 1);
});

test("after a flash to a 1.2 target the form still has night (the Clock box reads it)", () => {
  const f = newFormState(DEFAULTS, { flow: "change", supported: pathsForCfg(1) });
  applyAfterFlash(f, mergeConfig(DEFAULTS, {}), new Set(pathsForCfg(1)));
  assert.ok(f.config.night);
  assert.equal(f.config.night.enabled, false);
  const req = formToRequest(f);
  assert.equal("night" in req.config, false);
  assert.equal("brightness" in req.config, false);
});

test("a backup of a board that reports no brightness carries none", () => {
  assert.equal("brightness" in backupConfig({ mount: "left" }), false);
  assert.equal(backupConfig({ mount: "left", brightness: 90 }).brightness, 90);
  assert.ok(backupConfig({ mount: "left" }).night);
});
