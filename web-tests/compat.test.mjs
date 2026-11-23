import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readBackup, validateConfig, mergeConfig, pathsForCfg, filterSupported, unsupportedKeys } from "../web/js/settings.js";
import { DEFAULTS, newFormState, offered } from "../web/js/form.js";
import { parseConfigH } from "../web/js/configh.js";

const fixture = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");

test("an old 1.2 backup keeps only known v3 keys when merged", () => {
  const backup = JSON.parse(fixture("backup-1.2.0.json"));
  const cfg = readBackup(backup);
  const merged = mergeConfig(DEFAULTS, cfg);
  assert.equal(merged.mount, "left");
  assert.equal(merged.tz_name, "Europe/Berlin");
  assert.ok(merged.portal);
  assert.ok(merged.pages.ip);
  assert.equal(Object.hasOwn(merged, "github_user"), false);
});

test("filtering a legacy backup for cfg_v 1 drops v3-only groups", () => {
  const cfg = readBackup(JSON.parse(fixture("backup-1.2.0.json")));
  const supported = new Set(pathsForCfg(1));
  const kept = filterSupported(mergeConfig(DEFAULTS, cfg), supported);
  assert.equal(Object.hasOwn(kept, "portal"), false);
  assert.equal(kept.lat, "48.1374");
});

test("path B upgrade offers cfg_v 3 baseline paths", () => {
  const f = newFormState(DEFAULTS, { flow: "upgrade", supported: pathsForCfg(3) });
  assert.equal(offered(f, "portal.enabled"), true);
  assert.equal(offered(f, "pages.ip"), true);
});

test("a 1.1 config.h still parses and validates after merge with DEFAULTS", () => {
  const table = { "Asia/Singapore": "<+08>-8" };
  const { config } = parseConfigH(fixture("config.h.v1.1.0"), table);
  const merged = mergeConfig(DEFAULTS, config);
  assert.equal(validateConfig(merged).ok, true);
});