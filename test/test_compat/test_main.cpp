// Compatibility: current settings ignore unknown legacy keys (stock, coin,
// github, moon) from older config files and fill missing new keys with defaults.
#include <unity.h>
#include <fstream>
#include <sstream>
#include <string>
#include <ArduinoJson.h>
#include "settings.h"

void setUp() {}
void tearDown() {}

static std::string readFixture(const char *name) {
  std::ifstream f(std::string("test/fixtures/") + name, std::ios::binary);
  TEST_ASSERT_TRUE_MESSAGE(f.good(), name);
  std::stringstream ss;
  ss << f.rdbuf();
  std::string s = ss.str();
  while (!s.empty() && (s.back() == '\n' || s.back() == '\r')) s.pop_back();
  return s;
}

static Settings makeDefaults() {
  Settings s{};
  s.mount = MOUNT_LEFT;
  s.theme = 2;
  s.brightness = 180;
  strcpy(s.tzName, "Europe/Berlin");
  strcpy(s.tzRule, "CET-1CEST,M3.5.0,M10.5.0/3");
  strcpy(s.lat, "48.1374");
  strcpy(s.lon, "11.5755");
  s.clockFormat = CLOCK_24H;
  s.tempUnit = TEMP_CELSIUS;
  s.windUnit = WIND_KMH;
  s.night = {false, 23, 7, 26};
  s.portal = {true, ""};
  strcpy(s.portal.password, "buddy1234");
  s.sitstand = {30, 10};
  for (uint8_t i = 0; i < SETTINGS_PAGE_COUNT; i++) s.pages[i] = true;
  return s;
}

static void test_legacy_1_2_file_loads_known_keys() {
  JsonDocument doc;
  TEST_ASSERT_FALSE(deserializeJson(doc, readFixture("config-1.2.0.json")));
  Settings out{};
  AddedKeys added;
  JsonDocument inv;
  settingsLoad(makeDefaults(), doc.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_EQUAL(0, inv.size());
  // Known overlapping keys from the 1.2 file are applied.
  TEST_ASSERT_EQUAL_STRING(doc["tz_name"] | "", out.tzName);
  TEST_ASSERT_EQUAL(doc["theme"].as<int>(), out.theme);
  // New keys appear in added when absent from the file.
  bool sawPortal = false, sawSit = false, sawIp = false;
  for (uint8_t i = 0; i < added.count; i++) {
    if (strcmp(added.keys[i], "portal") == 0) sawPortal = true;
    if (strcmp(added.keys[i], "sitstand") == 0) sawSit = true;
    if (strcmp(added.keys[i], "pages.ip") == 0) sawIp = true;
  }
  TEST_ASSERT_TRUE(sawPortal);
  TEST_ASSERT_TRUE(sawSit);
  TEST_ASSERT_TRUE(sawIp);
}

static void test_future_unknown_keys_are_ignored() {
  JsonDocument doc;
  TEST_ASSERT_FALSE(deserializeJson(doc, readFixture("config-future.json")));
  Settings out{};
  AddedKeys added;
  JsonDocument inv;
  settingsLoad(makeDefaults(), doc.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  // Unknown keys (stocks, coins, …) do not error; known ones still apply.
  TEST_ASSERT_EQUAL(0, inv.size());
  if (!doc["theme"].isNull()) TEST_ASSERT_EQUAL(doc["theme"].as<int>(), out.theme);
  if (!doc["brightness"].isNull()) TEST_ASSERT_EQUAL(doc["brightness"].as<int>(), out.brightness);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_legacy_1_2_file_loads_known_keys);
  RUN_TEST(test_future_unknown_keys_are_ignored);
  return UNITY_END();
}
