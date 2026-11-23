import unittest
import mb_serial


class ParseSetArgs(unittest.TestCase):
    def test_theme_and_pages(self):
        self.assertEqual(mb_serial.parse_set_args(["theme=3", "pages.ip=false"]),
                         {"config": {"theme": 3, "pages": {"ip": False}}})

    def test_expected_keys(self):
        keys = mb_serial.expected_keys(3)
        for key in ("portal", "sitstand", "clock_format", "night", "brightness", "pages"):
            self.assertIn(key, keys)
        self.assertNotIn("stocks", keys)
        self.assertNotIn("coins", keys)
        self.assertNotIn("github_user", keys)

    def test_set_clock_format_and_night_fields(self):
        self.assertEqual(mb_serial.parse_set_args(["clock_format=12h"]), {"config": {"clock_format": "12h"}})
        self.assertEqual(mb_serial.parse_set_args(["night.start=22", "night.enabled=true"]),
                         {"config": {"night": {"start": 22, "enabled": True}}})
        with self.assertRaises(ValueError):
            mb_serial.parse_set_args(["night.start=late"])
        with self.assertRaises(ValueError):
            mb_serial.parse_set_args(["night.colour=1"])

    def test_set_brightness_is_a_number(self):
        self.assertEqual(mb_serial.parse_set_args(["brightness=200"]), {"config": {"brightness": 200}})
        with self.assertRaisesRegex(ValueError, "brightness must be a whole number"):
            mb_serial.parse_set_args(["brightness=bright"])

    def test_portal_and_sitstand(self):
        self.assertEqual(
            mb_serial.parse_set_args(["portal.enabled=false", "portal.password=", "sitstand.sit_min=45"]),
            {"config": {"portal": {"enabled": False, "password": ""}, "sitstand": {"sit_min": 45}}})
        with self.assertRaises(ValueError):
            mb_serial.parse_set_args(["sitstand.sit_min=late"])

    def test_ip_page_switch(self):
        self.assertEqual(mb_serial.parse_set_args(["pages.ip=false"]), {"config": {"pages": {"ip": False}}})

    def test_unknown_legacy_keys_rejected(self):
        for arg in ("stocks=AAPL", "coins=BTC-USD", "ticker=AVGO", "pages.coin=false"):
            with self.assertRaises(ValueError):
                mb_serial.parse_set_args([arg])


class VerifyChange(unittest.TestCase):
    def verify(self, want, have):
        from unittest import mock
        with mock.patch.object(mb_serial, "_read_ok", return_value={"config": have}):
            return mb_serial.verify_change(None, "SET", {"config": want})

    def test_night_fields_are_compared_one_by_one(self):
        have = {"night": {"enabled": False, "start": 22, "end": 7, "brightness": 40}}
        self.assertEqual(self.verify({"night": {"start": 22}}, have)[0], True)
        self.assertEqual(self.verify({"night": {"start": 22, "enabled": False}}, have)[0], True)
        ok, detail = self.verify({"night": {"start": 21}}, have)
        self.assertFalse(ok)
        self.assertIn("night.start", detail)
        self.assertFalse(self.verify({"night": {"enabled": True}}, have)[0])
        self.assertFalse(self.verify({"night": {"start": 22}}, {})[0])

    def test_pages_still_compared_one_by_one(self):
        self.assertTrue(self.verify({"pages": {"ip": False}}, {"pages": {"ip": False, "sitstand": True}})[0])
        self.assertFalse(self.verify({"pages": {"ip": True}}, {"pages": {"ip": False}})[0])


class Redact(unittest.TestCase):
    def test_portal_password_redacted(self):
        out = mb_serial.redact({"portal": {"enabled": True, "password": "secret12"}})
        self.assertEqual(out["portal"]["password"], mb_serial.REDACTED)


if __name__ == "__main__":
    unittest.main()
