import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEYS, PAGE_KEYS, validateConfig, validateWifi, mergeConfig,
  makeBackup, readBackup, backupFileName, BadBackup,
  BASELINE_PATHS, supportedPaths, withStocks, PATHS_BY_CFG, pathsForCfg, installablePaths, filterSupported, unsupportedKeys, newlyOffered, flattenPaths,
} from "../web/js/settings.js";
import { DEFAULTS } from "../web/js/form.js";

const bad = (patch, key) => {
  const r = validateConfig(patch);
  assert.equal(r.ok, false, `${JSON.stringify(patch)} should be rejected`);
  assert.ok(typeof r.errors[key] === "string" && r.errors[key].length > 0,
    `error under ${key}, got ${JSON.stringify(r.errors)}`);
  assert.deepEqual(Object.keys(r.errors), [key]);
};
const good = (patch) => {
  const r = validateConfig(patch);
  assert.deepEqual(r, { ok: true, errors: {} }, JSON.stringify(patch));
};

test("KEYS are the firmware's keys in the firmware's order", () => {
  assert.deepEqual(KEYS, ["mount", "theme", "brightness", "tz_name", "tz_rule", "lat", "lon", "clock_format",
    "temp_unit", "wind_unit", "night", "portal", "sitstand", "pages"]);
});

test("PAGE_KEYS are the firmware's pages in order", () => {
  assert.deepEqual(PAGE_KEYS, ["face", "clock", "date", "weather", "ip", "sitstand"]);
});

test("the default config is valid", () => good(DEFAULTS));
test("unknown keys and v are ignored", () => good({ v: 3, ticker: "AAPL", future_key: true }));

test("every bad value is reported, each under its own key", () => {
  const r = validateConfig({ theme: 9, lat: "95", mount: "up", temp_unit: "kelvin", pages: { clock: "yes" } });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["lat", "mount", "pages.clock", "temp_unit", "theme"]);
});

test("firmware error messages", () => {
  assert.equal(validateConfig({ theme: 9 }).errors.theme, "must be a whole number 0-4");
  assert.equal(validateConfig({ lat: "95" }).errors.lat, "a number from -90 to 90");
  assert.equal(validateConfig({ mount: "up" }).errors.mount, 'must be "left" or "right"');
  assert.equal(validateConfig({ portal: { enabled: true, password: "x" } }).errors.portal,
    "password must be 8-26 characters when protection is on");
  assert.equal(validateConfig({ sitstand: { sit_min: 3 } }).errors["sitstand.sit_min"],
    "a whole number from 5 to 120");
});

test("portal password when protection off", () => {
  good({ portal: { enabled: false, password: "" } });
  good({ portal: { enabled: false, password: "optional123" } });
});

test("merge keeps other pages", () => {
  const out = mergeConfig(DEFAULTS, { pages: { ip: false } });
  assert.equal(out.pages.ip, false);
  assert.equal(out.pages.weather, true);
});

test("merge drops unknown keys", () => {
  const out = mergeConfig(DEFAULTS, { github_user: "x", v: 2 });
  assert.equal(Object.hasOwn(out, "github_user"), false);
});

test("makeBackup and readBackup round trip", () => {
  const b = makeBackup(DEFAULTS, "1.3.0", new Date("2026-01-01T12:00:00Z"));
  assert.deepEqual(readBackup(b), DEFAULTS);
});

test("withStocks is a no-op on v3 configs", () => {
  assert.deepEqual(withStocks({ ticker: "AVGO", theme: 2 }), { ticker: "AVGO", theme: 2 });
});

test("BASELINE_PATHS are cfg_v 3 core paths", () => {
  assert.ok(BASELINE_PATHS.includes("pages.weather"));
  assert.ok(!BASELINE_PATHS.includes("pages.moon"));
});

test("pathsForCfg", () => {
  assert.equal(pathsForCfg(1), PATHS_BY_CFG[1]);
  assert.equal(pathsForCfg(3), PATHS_BY_CFG[3]);
  assert.equal(pathsForCfg(9), PATHS_BY_CFG[3]);
  assert.equal(pathsForCfg(undefined), PATHS_BY_CFG[3]);
});

test("filterSupported and unsupportedKeys", () => {
  const supported = new Set(PATHS_BY_CFG[3].filter((p) => p !== "pages.sitstand"));
  const out = filterSupported(DEFAULTS, supported);
  assert.equal(Object.hasOwn(out.pages, "sitstand"), false);
  assert.deepEqual(unsupportedKeys(DEFAULTS, supported), ["pages"]);
});

test("installablePaths", () => {
  assert.equal(installablePaths([{ cfg_v: 3 }]).has("portal.password"), true);
  assert.equal(installablePaths([{ cfg_v: 1 }]).has("stocks"), false);
});

test("flattenPaths opens groups", () => {
  assert.deepEqual(flattenPaths({ portal: { enabled: true, password: "x" } }),
    [["portal.enabled", true], ["portal.password", "x"]]);
});

test("validateWifi", () => {
  assert.equal(validateWifi({ ssid: "a", password: "" }).ok, true);
  assert.equal(validateWifi({ ssid: "", password: "x" }).ok, false);
});

test("readBackup rejects garbage", () => {
  assert.throws(() => readBackup(null), BadBackup);
});

test("backup file name", () => {
  assert.equal(backupFileName(new Date(2026, 0, 3)), "monitor-buddy-settings-2026-01-03.json");
});

test("newlyOffered", () => {
  assert.deepEqual(newlyOffered(new Set(["a"]), new Set(["a", "b"])), ["b"]);
});