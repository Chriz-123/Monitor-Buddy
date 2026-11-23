import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseConfigH } from "../web/js/configh.js";
import { DEFAULTS } from "../web/js/form.js";

const table = { "Europe/Berlin": "CET-1CEST,M3.5.0,M10.5.0/3" };
const fixture = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const PAGES = { face: true, clock: true, date: true, weather: true, ip: true, sitstand: true };

test("config.h.example aligns with DEFAULTS", () => {
  const example = readFileSync(new URL("../config/config.h.example", import.meta.url), "utf8");
  const { config } = parseConfigH(example, table);
  assert.equal(config.mount, DEFAULTS.mount);
  assert.equal(config.tz_name, DEFAULTS.tz_name);
  assert.equal(config.pages.ip, true);
  assert.equal(config.portal.enabled, true);
  assert.equal(config.portal.password, DEFAULTS.portal.password);
  assert.equal(config.sitstand.sit_min, DEFAULTS.sitstand.sit_min);
});

test("1.1.0 example imports known keys", () => {
  const r = parseConfigH(fixture("config.h.v1.1.0"), table);
  assert.equal(r.config.mount, "left");
  assert.ok(r.skipped.includes("GITHUB_USER"));
  assert.ok(r.skipped.includes("TICKER"));
});

test("portal and sitstand defines", () => {
  const r = parseConfigH('#define PORTAL_PROTECT false\n#define PORTAL_PASS "test1234"\n#define SIT_MINUTES 40\n#define STAND_MINUTES 12\n', table);
  assert.deepEqual(r.config.portal, { enabled: false, password: "test1234" });
  assert.deepEqual(r.config.sitstand, { sit_min: 40, stand_min: 12 });
});

test("SHOW_IP and SHOW_SITSTAND map to pages", () => {
  const r = parseConfigH("#define SHOW_IP false\n#define SHOW_SITSTAND true\n", table);
  assert.equal(r.config.pages.ip, false);
  assert.equal(r.config.pages.sitstand, true);
});