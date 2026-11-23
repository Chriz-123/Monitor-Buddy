#include <unity.h>
#include <string.h>
#include <string>
#include <ArduinoJson.h>
#include "settings.h"

void setUp() {}
void tearDown() {}

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

static std::string dump(const Settings &s) {
  JsonDocument d;
  settingsToJson(s, d.to<JsonObject>());
  std::string out;
  serializeJson(d, out);
  return out;
}

static bool hasAdded(const AddedKeys &a, const char *key) {
  for (uint8_t i = 0; i < a.count; i++)
    if (strcmp(a.keys[i], key) == 0) return true;
  return false;
}

static void defaultsAsFile(JsonDocument &file) {
  settingsToJson(makeDefaults(), file.to<JsonObject>());
}

static void test_to_json_writes_every_key() {
  JsonDocument d;
  settingsToJson(makeDefaults(), d.to<JsonObject>());
  TEST_ASSERT_EQUAL(CONFIG_VERSION, d["v"].as<int>());
  TEST_ASSERT_EQUAL_STRING("left", d["mount"]);
  TEST_ASSERT_EQUAL(2, d["theme"].as<int>());
  TEST_ASSERT_EQUAL(180, d["brightness"].as<int>());
  TEST_ASSERT_EQUAL_STRING("Europe/Berlin", d["tz_name"]);
  TEST_ASSERT_EQUAL_STRING("CET-1CEST,M3.5.0,M10.5.0/3", d["tz_rule"]);
  TEST_ASSERT_EQUAL_STRING("48.1374", d["lat"]);
  TEST_ASSERT_EQUAL_STRING("11.5755", d["lon"]);
  TEST_ASSERT_EQUAL_STRING("celsius", d["temp_unit"]);
  TEST_ASSERT_EQUAL_STRING("kmh", d["wind_unit"]);
  TEST_ASSERT_TRUE(d["portal"]["enabled"].as<bool>());
  TEST_ASSERT_EQUAL_STRING("buddy1234", d["portal"]["password"]);
  TEST_ASSERT_EQUAL(30, d["sitstand"]["sit_min"].as<int>());
  TEST_ASSERT_EQUAL(10, d["sitstand"]["stand_min"].as<int>());
  for (uint8_t i = 0; i < SETTINGS_PAGE_COUNT; i++)
    TEST_ASSERT_TRUE(d["pages"][SETTINGS_PAGE_KEYS[i]].as<bool>());
}

static void test_load_without_file_keeps_defaults_and_adds_nothing() {
  Settings out; AddedKeys added; JsonDocument inv;
  settingsLoad(makeDefaults(), JsonVariantConst(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_EQUAL_STRING(dump(makeDefaults()).c_str(), dump(out).c_str());
  TEST_ASSERT_EQUAL(0, added.count);
  TEST_ASSERT_EQUAL(0, inv.size());
}

static void test_load_applies_every_key() {
  JsonDocument file;
  deserializeJson(file,
    "{\"v\":3,\"mount\":\"right\",\"theme\":4,\"brightness\":99,"
    "\"tz_name\":\"Europe/Berlin\",\"tz_rule\":\"CET-1CEST,M3.5.0,M10.5.0/3\","
    "\"lat\":\"48.1374\",\"lon\":\"11.5755\","
    "\"clock_format\":\"12h\",\"temp_unit\":\"fahrenheit\",\"wind_unit\":\"mph\","
    "\"night\":{\"enabled\":true,\"start\":22,\"end\":6,\"brightness\":40},"
    "\"portal\":{\"enabled\":false,\"password\":\"\"},"
    "\"sitstand\":{\"sit_min\":45,\"stand_min\":15},"
    "\"pages\":{\"face\":true,\"clock\":false,\"date\":true,\"weather\":true,"
    "\"ip\":false,\"sitstand\":true}}");
  Settings out; AddedKeys added; JsonDocument inv;
  settingsLoad(makeDefaults(), file.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_EQUAL(MOUNT_RIGHT, out.mount);
  TEST_ASSERT_EQUAL(4, out.theme);
  TEST_ASSERT_EQUAL_STRING("Europe/Berlin", out.tzName);
  TEST_ASSERT_EQUAL(TEMP_FAHRENHEIT, out.tempUnit);
  TEST_ASSERT_EQUAL(WIND_MPH, out.windUnit);
  TEST_ASSERT_EQUAL(CLOCK_12H_FORMAT, out.clockFormat);
  TEST_ASSERT_TRUE(out.night.enabled);
  TEST_ASSERT_FALSE(out.portal.enabled);
  TEST_ASSERT_EQUAL(45, out.sitstand.sitMin);
  TEST_ASSERT_EQUAL(15, out.sitstand.standMin);
  TEST_ASSERT_FALSE(out.pages[1]);  // clock
  TEST_ASSERT_FALSE(out.pages[4]);  // ip
  TEST_ASSERT_TRUE(out.pages[5]);   // sitstand
  TEST_ASSERT_EQUAL(0, added.count);
  TEST_ASSERT_EQUAL(0, inv.size());
}

static void test_load_missing_key_keeps_default_and_reports_it() {
  JsonDocument file;
  defaultsAsFile(file);
  file.remove("tz_name");
  file["theme"] = 4;
  Settings out; AddedKeys added; JsonDocument inv;
  settingsLoad(makeDefaults(), file.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_EQUAL(4, out.theme);
  TEST_ASSERT_EQUAL_STRING("Europe/Berlin", out.tzName);
  TEST_ASSERT_TRUE(hasAdded(added, "tz_name"));
}

static void test_load_missing_page_is_reported() {
  JsonDocument file;
  defaultsAsFile(file);
  file["pages"].remove("ip");
  Settings out; AddedKeys added; JsonDocument inv;
  settingsLoad(makeDefaults(), file.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_TRUE(out.pages[4]);
  TEST_ASSERT_TRUE(hasAdded(added, "pages.ip"));
}

static void test_load_invalid_value_keeps_default() {
  JsonDocument file;
  defaultsAsFile(file);
  file["theme"] = 9;
  file["lat"] = "north";
  Settings out; AddedKeys added; JsonDocument inv;
  settingsLoad(makeDefaults(), file.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_EQUAL(2, out.theme);
  TEST_ASSERT_EQUAL_STRING("48.1374", out.lat);
  TEST_ASSERT_FALSE(inv["theme"].isNull());
  TEST_ASSERT_FALSE(inv["lat"].isNull());
}

static void test_load_ignores_unknown_keys() {
  JsonDocument file;
  defaultsAsFile(file);
  file["ticker"] = "AAPL";
  file["future_key"] = 1;
  Settings out; AddedKeys added; JsonDocument inv;
  settingsLoad(makeDefaults(), file.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_EQUAL_STRING(dump(makeDefaults()).c_str(), dump(out).c_str());
}

static void test_merge_partial_changes_only_that_key() {
  JsonDocument patch;
  deserializeJson(patch, "{\"theme\":1}");
  Settings out; JsonDocument errs;
  TEST_ASSERT_TRUE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  Settings expected = makeDefaults();
  expected.theme = 1;
  TEST_ASSERT_EQUAL_STRING(dump(expected).c_str(), dump(out).c_str());
}

static void test_merge_partial_pages() {
  JsonDocument patch;
  deserializeJson(patch, "{\"pages\":{\"ip\":false}}");
  Settings out; JsonDocument errs;
  TEST_ASSERT_TRUE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_FALSE(out.pages[4]);
  TEST_ASSERT_TRUE(out.pages[0]);
  TEST_ASSERT_TRUE(out.pages[5]);
}

static void test_merge_portal_and_sitstand() {
  JsonDocument patch;
  deserializeJson(patch, "{\"portal\":{\"enabled\":false,\"password\":\"\"},"
                         "\"sitstand\":{\"sit_min\":40,\"stand_min\":12}}");
  Settings out; JsonDocument errs;
  TEST_ASSERT_TRUE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_FALSE(out.portal.enabled);
  TEST_ASSERT_EQUAL(40, out.sitstand.sitMin);
  TEST_ASSERT_EQUAL(12, out.sitstand.standMin);
}

static void test_merge_rejects_short_portal_password() {
  JsonDocument patch;
  deserializeJson(patch, "{\"portal\":{\"enabled\":true,\"password\":\"short\"}}");
  Settings out; JsonDocument errs;
  TEST_ASSERT_FALSE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_FALSE(errs["portal"].isNull());
}

static void test_merge_rejects_bad_values_with_errors() {
  JsonDocument patch;
  deserializeJson(patch,
    "{\"theme\":9,\"lat\":\"95\",\"mount\":\"up\","
    "\"temp_unit\":\"kelvin\",\"pages\":{\"clock\":\"yes\"}}");
  Settings out; JsonDocument errs;
  TEST_ASSERT_FALSE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_FALSE(errs["theme"].isNull());
  TEST_ASSERT_FALSE(errs["lat"].isNull());
  TEST_ASSERT_FALSE(errs["mount"].isNull());
  TEST_ASSERT_FALSE(errs["temp_unit"].isNull());
  TEST_ASSERT_FALSE(errs["pages.clock"].isNull());
}

static void test_merge_rejects_non_object() {
  JsonDocument patch;
  deserializeJson(patch, "[1]");
  Settings out; JsonDocument errs;
  TEST_ASSERT_FALSE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_FALSE(errs["config"].isNull());
}

static void test_merge_ignores_unknown() {
  JsonDocument patch;
  deserializeJson(patch, "{\"v\":3,\"ticker\":\"AAPL\",\"future_key\":true}");
  Settings out; JsonDocument errs;
  TEST_ASSERT_TRUE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_EQUAL(0, errs.size());
}

static void test_merge_rejects_non_decimal_coordinates() {
  const char *bad[] = {" 48", "\n48", "0x1A", "1e1"};
  for (const char *v : bad) {
    JsonDocument patch;
    patch.to<JsonObject>()["lat"] = v;
    Settings out; JsonDocument errs;
    TEST_ASSERT_FALSE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
    TEST_ASSERT_FALSE(errs["lat"].isNull());
  }
}

static void test_merge_accepts_etc_gmt_tz_name() {
  JsonDocument patch;
  deserializeJson(patch, "{\"tz_name\":\"Etc/GMT+8\"}");
  Settings out; JsonDocument errs;
  TEST_ASSERT_TRUE(settingsMerge(makeDefaults(), patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_EQUAL_STRING("Etc/GMT+8", out.tzName);
}

static void test_round_trip_through_json() {
  Settings s = makeDefaults();
  s.mount = MOUNT_RIGHT; s.theme = 0; s.windUnit = WIND_MPH; s.pages[3] = false;
  strcpy(s.tzRule, "EST5EDT,M3.2.0,M11.1.0");
  JsonDocument file;
  deserializeJson(file, dump(s));
  Settings out; AddedKeys added; JsonDocument inv;
  settingsLoad(makeDefaults(), file.as<JsonVariantConst>(), out, added, inv.to<JsonObject>());
  TEST_ASSERT_EQUAL_STRING(dump(s).c_str(), dump(out).c_str());
}

static bool runWifi(const char *json, char *ssid, char *pass, JsonDocument &errs) {
  JsonDocument w;
  deserializeJson(w, json);
  return wifiValidate(w.as<JsonVariantConst>(), ssid, 33, pass, 64, errs.to<JsonObject>());
}

static void test_wifi_valid() {
  char ssid[33], pass[64]; JsonDocument errs;
  TEST_ASSERT_TRUE(runWifi("{\"ssid\":\"Home\",\"password\":\"secret123\"}", ssid, pass, errs));
  TEST_ASSERT_EQUAL_STRING("Home", ssid);
  TEST_ASSERT_EQUAL_STRING("secret123", pass);
}

static void test_wifi_open_network() {
  char ssid[33], pass[64]; JsonDocument errs;
  TEST_ASSERT_TRUE(runWifi("{\"ssid\":\"Cafe\",\"password\":\"\"}", ssid, pass, errs));
  TEST_ASSERT_EQUAL_STRING("", pass);
}

static void test_wifi_password_is_required() {
  char ssid[33], pass[64]; JsonDocument errs;
  TEST_ASSERT_FALSE(runWifi("{\"ssid\":\"Cafe\"}", ssid, pass, errs));
  TEST_ASSERT_EQUAL_STRING("must be text (empty for an open network)", errs["wifi.password"] | "");
}

static void test_wifi_rejects_bad_input() {
  char ssid[33], pass[64]; JsonDocument errs;
  TEST_ASSERT_FALSE(runWifi("{\"ssid\":\"\",\"password\":\"secret123\"}", ssid, pass, errs));
  TEST_ASSERT_FALSE(errs["wifi.ssid"].isNull());
  TEST_ASSERT_FALSE(runWifi("{\"ssid\":\"Home\",\"password\":\"short77\"}", ssid, pass, errs));
  TEST_ASSERT_FALSE(errs["wifi.password"].isNull());
}

static void test_tz_rule_whole_hours_east() {
  char r[24];
  TEST_ASSERT_TRUE(tzRuleFromOffset(8, r, sizeof r));
  TEST_ASSERT_EQUAL_STRING("<+08>-8", r);
}

static void test_tz_rule_utc() {
  char r[24];
  TEST_ASSERT_TRUE(tzRuleFromOffset(0, r, sizeof r));
  TEST_ASSERT_EQUAL_STRING("UTC0", r);
}

static void test_merge_keeps_brightness_when_the_key_is_absent() {
  Settings current = makeDefaults(), out{};
  current.brightness = 120;
  JsonDocument patch, errs;
  deserializeJson(patch, "{\"theme\":1}");
  TEST_ASSERT_TRUE(settingsMerge(current, patch.as<JsonVariantConst>(), out, errs.to<JsonObject>()));
  TEST_ASSERT_EQUAL(120, out.brightness);
  TEST_ASSERT_EQUAL(1, out.theme);
}

static void test_largest_get_reply_fits_with_room() {
  Settings s = makeDefaults();
  s.mount = MOUNT_RIGHT; s.theme = 4;
  memset(s.tzName, 'a', 64); s.tzName[64] = '\0';
  memset(s.tzRule, 'A', 64); s.tzRule[64] = '\0';
  memset(s.portal.password, 'p', 26); s.portal.password[26] = '\0';
  strcpy(s.lat, "-12.34567890123");
  strcpy(s.lon, "-123.4567890123");
  s.tempUnit = TEMP_FAHRENHEIT;
  s.clockFormat = CLOCK_12H_FORMAT;
  s.brightness = 255;
  s.night = {false, 23, 22, 255};
  s.sitstand = {120, 60};
  JsonDocument d;
  d["ok"] = true; d["cmd"] = "GET"; d["id"] = 4294967295UL;
  d["v"] = CONFIG_VERSION; d["stored"] = true;
  settingsToJson(s, d["config"].to<JsonObject>());
  JsonArray added = d["added"].to<JsonArray>();
  const char *all[] = {"brightness", "clock_format", "night", "portal", "sitstand", "pages.ip", "pages.sitstand"};
  for (const char *k : all) added.add(k);
  size_t line = 4 + measureJson(d) + 1;
  TEST_ASSERT_LESS_OR_EQUAL(2048 * 3 / 4, line);
}

static void test_largest_set_line_fits_with_room() {
  Settings s = makeDefaults();
  memset(s.tzName, 'a', 64); s.tzName[64] = '\0';
  memset(s.tzRule, 'A', 64); s.tzRule[64] = '\0';
  memset(s.portal.password, 'p', 26); s.portal.password[26] = '\0';
  strcpy(s.lat, "-12.34567890123");
  strcpy(s.lon, "-123.4567890123");
  JsonDocument d;
  d["id"] = 4294967295UL;
  settingsToJson(s, d["config"].to<JsonObject>());
  d["wifi"]["ssid"] = std::string(32, 's');
  d["wifi"]["password"] = std::string(63, 'p');
  size_t line = 8 + measureJson(d) + 1;
  TEST_ASSERT_LESS_OR_EQUAL(2048 * 3 / 4, line);
}

int main(int, char **) {
  UNITY_BEGIN();
  RUN_TEST(test_to_json_writes_every_key);
  RUN_TEST(test_load_without_file_keeps_defaults_and_adds_nothing);
  RUN_TEST(test_load_applies_every_key);
  RUN_TEST(test_load_missing_key_keeps_default_and_reports_it);
  RUN_TEST(test_load_missing_page_is_reported);
  RUN_TEST(test_load_invalid_value_keeps_default);
  RUN_TEST(test_load_ignores_unknown_keys);
  RUN_TEST(test_merge_partial_changes_only_that_key);
  RUN_TEST(test_merge_partial_pages);
  RUN_TEST(test_merge_portal_and_sitstand);
  RUN_TEST(test_merge_rejects_short_portal_password);
  RUN_TEST(test_merge_rejects_bad_values_with_errors);
  RUN_TEST(test_merge_rejects_non_object);
  RUN_TEST(test_merge_ignores_unknown);
  RUN_TEST(test_merge_rejects_non_decimal_coordinates);
  RUN_TEST(test_merge_accepts_etc_gmt_tz_name);
  RUN_TEST(test_round_trip_through_json);
  RUN_TEST(test_wifi_valid);
  RUN_TEST(test_wifi_open_network);
  RUN_TEST(test_wifi_password_is_required);
  RUN_TEST(test_wifi_rejects_bad_input);
  RUN_TEST(test_tz_rule_whole_hours_east);
  RUN_TEST(test_tz_rule_utc);
  RUN_TEST(test_merge_keeps_brightness_when_the_key_is_absent);
  RUN_TEST(test_largest_get_reply_fits_with_room);
  RUN_TEST(test_largest_set_line_fits_with_room);
  return UNITY_END();
}
