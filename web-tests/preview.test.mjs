import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { THEMES, themeColors, pageList, textWidth, PageCycle, HOLD_MS, CYCLE_MS, textPath, SHOWN_ORDER, GLYPHS, drawClock, drawIp, drawSitStand, formatCount, followerTextSize, subDotY } from "../web/js/preview.js";
import { previewPageFor, previewConfig, newFormState, DEFAULTS } from "../web/js/form.js";
import { PATHS_BY_CFG } from "../web/js/settings.js";

const all = { face: true, clock: true, date: true, weather: true, ip: true, sitstand: true };

test("SHOWN_ORDER matches firmware page keys", () => {
  assert.deepEqual(SHOWN_ORDER, ["face", "clock", "date", "weather", "ip", "sitstand"]);
});

test("page list: enabled pages in order", () => {
  assert.deepEqual(pageList({ pages: all }), SHOWN_ORDER);
  assert.deepEqual(pageList({ pages: { clock: true, ip: true } }), ["clock", "ip"]);
  assert.deepEqual(pageList({ pages: {} }), ["face"]);
});

test("five themes; Classic is all white", () => {
  assert.equal(THEMES.length, 5);
  assert.ok(Object.values(THEMES[0]).every((v) => v === "#ffffff"));
  assert.equal(themeColors(9), THEMES[0]);
});

test("pixel text advances 6 px per character times the size", () => {
  assert.equal(textWidth("AVGO", 4), 96);
  assert.equal(textPath("-", 10, 20, 2), "M10 26h10v2h-10z");
});

function cycleWith(pages, opts = {}) {
  const seen = [];
  const c = new PageCycle({ onChange: () => seen.push(c.page), ...opts });
  c.setPages(pages);
  return { c, seen };
}
const timers = (t) => { mock.timers.enable({ apis: ["setInterval", "setTimeout"] }); t.after(() => mock.timers.reset()); };

test("the cycle advances every CYCLE_MS", (t) => {
  timers(t);
  const { c } = cycleWith(["face", "clock", "weather"]);
  mock.timers.tick(CYCLE_MS);
  assert.equal(c.page, "clock");
});

test("showPage holds then resumes", (t) => {
  timers(t);
  const { c } = cycleWith(["face", "clock", "weather", "ip"]);
  c.showPage("weather");
  mock.timers.tick(HOLD_MS + 1);
  mock.timers.tick(CYCLE_MS);
  assert.equal(c.page, "ip");
});

test("which page a setting jumps to", () => {
  const cfg = { pages: { ...all, stock: false } };
  assert.equal(previewPageFor("temp_unit", cfg), "weather");
  assert.equal(previewPageFor("tz_name", cfg), "clock");
  assert.equal(previewPageFor("sitstand.sit_min", cfg), "sitstand");
  assert.equal(previewPageFor("mount", cfg), "face");
  assert.equal(previewPageFor("theme", cfg), "clock");
  assert.equal(previewPageFor("pages.ip", cfg), "ip");
});

test("preview config respects supported paths", () => {
  const cfg = { ...DEFAULTS };
  const old = newFormState(cfg, { flow: "update", supported: PATHS_BY_CFG[1] });
  assert.equal(pageList(previewConfig(old)).includes("ip"), false);
  const next = newFormState(cfg, { flow: "update", supported: PATHS_BY_CFG[3] });
  assert.equal(pageList(previewConfig(next)).includes("ip"), true);
});

test("draw helpers return SVG path fragments", () => {
  const c = THEMES[2];
  assert.ok(drawIp(c).length > 100);
  assert.ok(drawSitStand(c, DEFAULTS).length > 100);
  assert.ok(drawClock(c, new Date(2026, 0, 1, 12, 34, 56), true).length > 50);
});

test("formatCount and followerTextSize", () => {
  assert.equal(formatCount(24553), "24553");
  assert.equal(followerTextSize("10000"), 5);
});

test("subDotY mirrors the firmware", () => {
  assert.equal(subDotY(0, 2, 172), 79);
});

test("GLYPHS has German weekday letters", () => {
  assert.ok(GLYPHS.A);
});