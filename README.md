# Monitor-Buddy

[![Platform](https://img.shields.io/badge/platform-ESP32--C6-2ec27e?logo=espressif)](https://www.espressif.com/en/products/socs/esp32-c6)
[![Arduino](https://img.shields.io/badge/framework-Arduino-00979d?logo=arduino)](https://www.arduino.cc/)
[![License](https://img.shields.io/badge/license-MIT-6c757d)](LICENSE)

**Ein kleiner Begleiter für den Monitorrand.** Er zieht Grimassen, folgt Bewegungen mit den Augen und zeigt nebenbei Wetter, Datum, die aktuelle IP-Adresse und einen Steh/Sitz-Timer für den Rücken.

> Deutschsprachiger Fork von [IdefixRC/Monitor-Buddy](https://github.com/IdefixRC/Monitor-Buddy): ohne Mond/Aktien/Coins/GitHub, dafür IP-Anzeige, Steh/Sitz-Timer und optionaler Portal-Passwortschutz.

![Monitor-Buddy mounted on a monitor](docs/images/hero.jpg)

---

## 1. Monitor-Buddy kennenlernen

Dein Monitor hat einen Rahmen. Der tut nichts. Monitor-Buddy ändert das.

Ein kleiner Touchscreen klemmt an der Kante und hält dich beim Arbeiten Gesellschaft: Gesicht, Blinzeln, Augenbewegung per Sensor. Tippen wechselt den Ausdruck.

Illustriertes [Handbuch (PDF)](docs/Monitor-Buddy-Manual.pdf) vom Upstream-Projekt: Überblick und Einstellungen (teils noch auf Englisch / ältere Features).

**Seiten & Funktionen in diesem Fork:**

- **Animiertes Gesicht** (QMI8658)
- **Uhr** und **Wochentag / Datum** (NTP, 24h oder 12h)
- **Wetter** (Temperatur, Zustand, Luftfeuchte, Wind)
- **IP-Adresse** der aktuellen WLAN-Verbindung
- **Steh/Sitz-Timer** (rückenfreundlich; Dauer im Web-Flasher)
- **Nachtmodus**, **5 Themes**, Seiten ein/aus, Montage links/rechts
- **WLAN-Hotspot** mit Captive Portal, optional mit Passwortschutz

Hardware: **Waveshare ESP32-C6-Touch-LCD-1.47** + **3D-gedruckter Clip**. Kein Löten.

---

## 2. Was du brauchst

| Item                                                                          | Quantity | Where                                                                                                                |
| ----------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| 3D-printed holder: `Monitor-Buddy_flat.STL` **or** `Monitor-Buddy_recess.STL` **or** one of the Top Mount options | 1        | [MakerWorld](https://makerworld.com/en/models/3241960-monitor-buddy)                                                 |
| Waveshare ESP32-C6-Touch-LCD-1.47                                             | 1        | [AliExpress](https://s.click.aliexpress.com/e/_c33mPWKx) · [Amazon](https://www.amazon.com/dp/B0F8B8VJR6)            |
| USB-C cable (power and flashing)                                              | 1        | [AliExpress](https://www.aliexpress.com/item/1005008819293735.html) · [Amazon](https://www.amazon.com/dp/B0CMP2LSP2) |

**IMPORTANT:** Please make sure you purchase the touchscreen version of the ESP-32-C6  (see link above). Non-touchscreen versions are smaller and will not fit the holder. In addition, the code will not work as intended **!!**

You also need a computer with **Chrome or Edge** to flash the board once. After that the USB-C cable is only for power, so any charger or a spare USB port on the monitor will do.

Nothing else. No resistors, no headers, no hot glue.

---

## 3. Assembly

![Picture of the flat holder with double sided tape](docs/images/flat-holder.jpg)

### a) Print the holder

There are two versions of the mount. Pick one:

- **`Monitor-Buddy_flat.STL`** has a flat back. Stick it to the side of your monitor with a strip of ordinary double-sided tape.
- **`Monitor-Buddy_recess.STL`** has a recess sized for **3M Dual Lock** tape. Use this one if you want to be able to pull the Buddy off and put it back without peeling anything.

PLA or PETG is recommended. Only minor supports needed.

Both versions work on either side of your monitor: for the right side, mount the holder turned upside down and choose **Right** as the mounting side in the web flasher (or set `MOUNTING_LOCATION` to `RIGHT` if you build it yourself, see [4.5](#45-personalize-your-buddy)) so the screen reads the right way up.

### b) Slide the board into the holder

![Sliding the board into the holder](docs/images/assembly-slide-in.jpg)

The Waveshare board slides straight into the printed part and is held by friction. No glue, no screws.

### c) Flash the board

Firmware flashen: [Kapitel 4](#4-board-flashen) (lokal, GitHub Pages oder PlatformIO). Einmal reicht.

### d) Apply power and enjoy your new monitor friend

Plug in the USB-C cable. If you gave it your Wi-Fi in the web flasher, it connects straight away. With no Wi-Fi configured, it opens its setup hotspot instead (see [4.9](#49-first-boot-connect-it-to-wi-fi)).

If you print one, **post a picture of your build on MakerWorld**, and if the model saved you some time, a like or a boost is appreciated. 🙏

---

## 4. Board flashen

Drei Wege — wichtig: **[monitor-buddy.com](https://monitor-buddy.com/) ist das Upstream-Projekt** und flasht die Original-Firmware (mit Aktien/Coins/Mond). Für **diesen Fork** brauchst du einen der Wege unten.

Voraussetzung überall: **Chrome oder Edge** am PC (Web Serial), USB-C-**Datenkabel**.

### A) Lokal im Browser (schnell zum Ausprobieren)

```bash
# einmalig: PlatformIO / pioarduino wie in 4.1–4.2
pip install platformio   # oder pioarduino-Extension in VS Code
python tools/local_flasher.py --serve
```

Das Skript baut die Firmware (falls nötig), legt unter `_site/` den Web-Flasher plus `firmware/releases.json` an und startet `http://127.0.0.1:8080/`. Dort **Buddy verbinden** → Neuinstallation / Einstellungen.

Nur Site neu aufbauen, wenn die `.bin` schon da ist:

```bash
python tools/local_flasher.py --skip-build --serve
```

### B) Über GitHub (Pages + Release) — dauerhafte Flasher-URL

So bekommst du eine öffentliche Flasher-Seite wie Upstream, aber mit **deiner** Firmware:

1. Im Repo unter **Settings → Pages**: Source **GitHub Actions** wählen (einmalig).
2. Einen **Release** anlegen, z. B. Tag `v1.4.0` (Semver `vX.Y.Z` oder `vX.Y.Z-rcN`).
3. Workflow **Release firmware** baut `monitor-buddy-….bin`, hängt sie an den Release und triggert **Pages**.
4. Flasher dann unter  
   `https://chriz-123.github.io/Monitor-Buddy/`  
   (genau diese URL erscheint erst, wenn Pages einmal erfolgreich gelaufen ist).

Ohne Release gibt es keine `.bin` in Pages — der Flasher kann dann keine Firmware installieren (Einstellungen ändern ginge nur, wenn schon eine passende Firmware auf dem Board läuft).

### C) Direkt mit PlatformIO (ohne Browser)

Wie bisher: Projekt öffnen, `config/config.h` optional anpassen, **Upload**. Details ab [4.1](#41-install-vs-code).

### Web-Flasher: Bedienung

![Monitor-Buddy web flasher](docs/images/web-flasher.png)

1. Buddy per USB anschließen, Flasher öffnen, **Buddy verbinden**.
2. **Neuinstallation** / **Einstellungen ändern** / **Firmware aktualisieren** / Backup / Reset.
3. Im Formular u. a.: Standort (Stadtsuche), WLAN, Seiten (Gesicht, Uhr, Datum, Wetter, IP, Steh/Sitz), Theme, Helligkeit, Nachtmodus, **Hotspot-Passwortschutz**, Sitz-/Steh-Minuten.
4. Speichern/Installieren → Buddy startet neu.

Unterbrochene Installation: wieder verbinden → **Firmware erneut installieren**. BOOT/RESET-Taster braucht der Web-Flasher nicht.

---

### Building it yourself

This guide assumes you have never used VS Code or pioarduino. It is written for **Windows**, with notes for **macOS** and **Linux** where they differ. It takes about 20 minutes the first time, most of which is software downloading in the background.

The board is a **Waveshare ESP32-C6-Touch-LCD-1.47**. The ESP32-C6 is new enough that it needs the **pioarduino** build platform, a community fork of the standard ESP32 tooling. The steps below install everything.

### 4.1 Install VS Code

![VS Code download page](docs/images/vscode-install.png)

1. Go to <https://code.visualstudio.com/>.
2. Download the build for your OS and run the installer.
3. On Windows, accept the defaults. Ticking "Add to PATH" is helpful but not required.

Launch VS Code when it finishes.

### 4.2 Install the pioarduino IDE extension

![Installing the pioarduino extension](docs/images/pioarduino-ext.png)

1. Click the **Extensions** icon in the left sidebar (the four-squares icon), or press `Ctrl+Shift+X`.
2. Search for **`pioarduino`**.
3. Install the **pioarduino IDE** extension.
4. Wait for it to finish setting up. It downloads a Python environment and its core tooling in the background, which can take a few minutes. A **pioarduino** bar appears along the bottom of the window when it is ready.

> **Already have the official PlatformIO extension?** It also works with this project, because the pioarduino platform is pulled in by URL from `platformio.ini`. If you are starting fresh, use the pioarduino extension. It tracks new Espressif chips more closely.

> **macOS / Linux:** identical. The extension installs its own Python environment, so you do not need to install Python yourself.

### 4.3 Get the Monitor-Buddy code

1. Open the [**latest release**](https://github.com/IdefixRC/Monitor-Buddy/releases/latest).
2. Under **Assets**, download the **`Monitor-Buddy-<version>.zip`** file (for example `Monitor-Buddy-1.0.1.zip`). It contains only the files needed to build and flash, nothing else.
   From 1.2.0 on, each release also has a ready-made firmware file, `monitor-buddy-<version>.bin`. That's the file the web flasher installs.
3. Extract it somewhere permanent, for example `Documents\Monitor-Buddy`. Do not run it from inside the ZIP or from your Downloads folder.

> Prefer Git? `git clone https://github.com/IdefixRC/Monitor-Buddy.git` works too. You just get the full repo (docs, screenshots, CI) alongside the code.

### 4.4 Open the project

1. In VS Code: **File > Open Folder**, and select the `Monitor-Buddy` folder (the one that contains `platformio.ini`).
2. If VS Code asks whether you trust the authors, say yes.
3. The first time you open it, pioarduino reads `platformio.ini` and downloads the pioarduino platform, the ESP32-C6 toolchain, and the libraries this project uses (`Arduino_GFX`, `ArduinoJson`, `AyresWiFiManager`). This is a large download, several hundred MB, and only happens once.

Wait until the terminal activity stops before moving on.

### 4.5 Personalize your Buddy

One file to touch: `config/config.h`. It is plain text, edit it right inside VS Code.

**a) Create your config file**

1. In the VS Code file explorer, open the `config` folder and find `config.h.example`.
2. Right-click it, **Copy**, then **Paste** into the same `config` folder. Rename the copy to `config.h`.
3. `config/config.h` is gitignored on purpose: it holds your Finnhub API key, so it never gets committed. `config.h.example` is the only config file tracked by git.

![Creating config.h](docs/images/config-file.png)

**b) Edit your settings**

Open `config/config.h` and change these `#define` lines:

| Setting                        | What to put                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `MOUNTING_LOCATION`            | `LEFT` or `RIGHT`, the side of the monitor your Buddy is mounted on                                                           |
| `THEME`                        | `0` to `4`, see the comments above the line                                                                                   |
| `GITHUB_USER`                  | your GitHub username to show the GitHub page; `""` (the default) hides it                                                     |
| `TIMEZONE`                     | your IANA timezone name, for example `"Europe/Berlin"` ([list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `TZ_OFFSET_HOURS`              | your offset from UTC in hours, for example `1` for CET, `-5` for US Eastern                                                   |
| `TICKER`                       | a US stock symbol, for example `"AAPL"`                                                                                       |
| `STOCKKEY`                     | your free Finnhub API key from <https://finnhub.io/> to show the stock page; `""` (the default) hides it                      |
| `LAT` / `LONG`                 | your latitude and longitude for weather                                                                                       |
| `TEMP` / `WIND`                | `"celsius"` or `"fahrenheit"`, `"kmh"` or `"mph"`                                                                             |
| `SHOW_FACE`, `SHOW_CLOCK`, ... | `true` or `false` to enable or disable each page                                                                              |
| `TZ_RULE`                      | optional, a POSIX time zone rule with daylight saving; `""` uses `TZ_OFFSET_HOURS`                                            |
| `CLOCK_12H`                    | `true` for a 12-hour clock with AM/PM; `false` (the default) for 24 hours                                                     |
| `NIGHT_MODE`                   | `true` to dim the screen between `NIGHT_START_HOUR` and `NIGHT_END_HOUR` (whole hours 0-23, they must differ)                 |
| `NIGHT_BRIGHTNESS`             | the night level, 8-255                                                                                                        |

Save the file (`Ctrl+S`).

Don't care about stocks? Leave `STOCKKEY` as `""` and the stock page stays hidden. Enter your key to show it. The same goes for `GITHUB_USER`: empty hides the GitHub page. You can also switch the page off with `SHOW_STOCK false`. If you skip creating `config/config.h` entirely, the build falls back to the defaults in `config.h.example`.

**Settings saved on the board win.** From firmware 1.2.0 on, the Buddy can also keep its settings on the board itself, in `/config.json`. The web flasher saves them there, and so does `tools/mb_serial.py`. Once they're saved, `config/config.h` only fills in settings the board doesn't have, so editing it and uploading again changes nothing that's already saved. To change a saved setting, use the web flasher's **Change settings**, or the tool, for example `python tools/mb_serial.py COM4 set ticker=AVGO` (use your board's port instead of `COM4`; `get` shows what is saved). To delete the saved settings, run `python tools/mb_serial.py COM4 defaults`: the Buddy restarts on your `config.h` values and keeps its Wi-Fi and brightness. The tool needs Python 3 and one package: `pip install pyserial`. The setup page's erase also deletes the saved settings, and the Buddy goes back to your `config.h` values, but it clears the Wi-Fi and brightness too.

**A night swipe saves too.** Swiping up or down during night mode saves the night level on the board. On a Buddy with no `/config.json` yet, that first swipe creates one, and from then on your `config.h` edits are ignored for the settings it holds, as after any save from the web flasher. A normal daytime brightness swipe doesn't do this.

Want daylight saving? Set `TZ_RULE` to a POSIX time zone rule, for example `"CET-1CEST,M3.5.0,M10.5.0/3"` for Central Europe. Left empty, the clock uses the fixed `TZ_OFFSET_HOURS`.

### 4.6 Plug in the board

Connect the Waveshare board to your computer with the USB-C cable.

- **Windows 10 / 11:** the board uses the ESP32-C6's built-in USB, so it usually appears with no driver install. If Device Manager shows an unknown device, install the Espressif USB-JTAG/serial driver from <https://github.com/espressif/esp-usb-jtag>.
- **macOS:** no driver needed. The port shows up as `/dev/cu.usbmodemXXXX`.
- **Linux:** no driver needed. The port is usually `/dev/ttyACM0`. If uploads fail with a permissions error, add yourself to the `dialout` group: `sudo usermod -aG dialout $USER`, then log out and back in.

pioarduino detects the port automatically. You do not normally need to select it by hand.

### 4.7 Build and upload the firmware

![The pioarduino toolbar](docs/images/pio-toolbar.png)

Along the top bar of VS Code, pioarduino adds a row of small icons:

1. Click the **checkmark (Build)** first. This compiles the project. The first build takes a few minutes. It ends with `SUCCESS`.
2. Click the **right-arrow (Upload)**. This flashes the firmware onto the board. The screen goes dark for a moment and then the Buddy starts up.

If the upload can't find or open the board, close any serial monitor that is open on it (the pioarduino monitor holds the port too), unplug the Buddy, plug it back in and click Upload again. The board switches into upload mode by itself, so you never need the BOOT button for this. If an upload got cut off and the Buddy no longer starts, the [web flasher](#the-web-flasher-recommended) reinstalls it and keeps your saved settings.

### 4.8 Updating to a new version

With the web flasher, connect your Buddy and choose **Update firmware**. Your settings and Wi-Fi stay on the board. Built it yourself? Then:

1. Download and extract the new release as in [4.3](#43-get-the-monitor-buddy-code), into a new folder.
2. Copy your `config/config.h` from the old folder into the new one.
3. Open the new folder and click **Upload** as in [4.7](#47-build-and-upload-the-firmware).

Coming from 1.1.0 or older? Your `config.h` keeps working as it is. You can also switch to the web flasher now: **Upgrade from 1.1 or older** imports your `config.h` and keeps your Wi-Fi, and from then on you never rebuild to change a setting. A `TZ_RULE` line is new and optional; without it the clock works as before, except that half-hour zones such as India (+5.5), which 1.1.0 cut down to whole hours, are now correct.

Your saved Wi-Fi and brightness stay on the board, so the Buddy reconnects by itself after the update. Coming from 1.0.2 or older? The old setup page is removed on the first start, and from then on the setup page follows your phone's language.

### 4.9 First boot: connect it to Wi-Fi

![The Wi-Fi setup portal on a phone](docs/images/portal-phone.jpg)

If you entered your Wi-Fi in the web flasher, the Buddy is already connected and you can skip this. With no Wi-Fi configured, the Buddy starts its own hotspot at power-on.

1. On your phone or laptop, join the Wi-Fi network **`Monitor-Buddy-Setup`**, password **`buddy1234`**.
2. A setup page should open by itself. If it does not, open a browser and go to **`http://192.168.4.1`**.
3. Pick your home network, enter its password, and save.
4. The Buddy reboots and connects. The clock, weather, and other pages fill in within a few seconds.

To change the Wi-Fi later, **press and hold anywhere on the touchscreen for about 3 seconds**. The setup hotspot comes back.

### 4.10 Everyday controls

| Do this                                         | What happens                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Swipe left / right                              | Next / previous page                                                                             |
| Swipe up / down                                 | Brighter / dimmer. Keep dragging for bigger steps. The level is remembered across restarts.      |
| Tap the face                                    | Change the expression                                                                            |
| Tap the stock or coin page                      | Next stock or coin, when you have more than one. The dots on the right edge show which one.      |
| Double-tap                                      | Stop or restart the automatic page scrolling                                                     |
| Tilt or move the Buddy                          | The eyes follow the motion                                                                       |
| Hold the screen still for about 3 seconds       | Open the Wi-Fi setup hotspot. Hold again for 3 seconds to close it.                              |
| During night mode: tap                          | Normal brightness for 30 seconds. The tap does nothing else.                                     |
| During night mode: swipe left / right           | Same as a tap: normal brightness for 30 seconds, no page change.                                 |
| During night mode: swipe up / down              | Brighter / dimmer **night** level, saved on the board. The banner says `NIGHT 20%`. The daytime brightness can only be changed outside night hours. |
| **Factory reset**: open the Wi-Fi setup page (hold the screen for 3 seconds) and press **erase** | Erases Wi-Fi, brightness and board settings. Restarts into Wi-Fi setup on its built-in values.    |

The board also has a **BOOT** button, next to **RESET**. Check the labels, because RESET just restarts the Buddy. BOOT only counts in a short window while the Buddy starts up, not while it is running. Unplug and plug back in, and as soon as the screen shows **CONNECTING** (or **WIFI SETUP**), press BOOT within 2 seconds:

- **Hold 2 to 5 seconds**: opens the Wi-Fi setup hotspot.
- **Hold 5 seconds or more**: forgets the saved Wi-Fi and restarts into Wi-Fi setup. Brightness and the settings saved on the board are kept. To erase those as well, use **erase** on the setup page; the Buddy then goes back to its built-in `config.h` values.

Don't hold BOOT while plugging in: that starts the chip's download mode instead. The screen stays dark, and the computer sees a different device on a new port (on Windows, a new COM number) instead of your Buddy. Unplug it and plug it back in without touching BOOT.

The built-in values are the release defaults, or your `config/config.h` settings if you built the firmware yourself, so a factory reset doesn't touch them. To reset only the settings and keep the Wi-Fi and brightness, use **Reset to defaults** in the web flasher.

### 4.11 Troubleshooting

| Symptom                                           | Fix                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The web flasher doesn't list the Buddy            | Use Chrome or Edge on a computer, and a USB-C cable that carries data (many are charge-only). Close any program that has the port open, such as a serial monitor in VS Code, then unplug the Buddy and plug it back in. On Windows, check Device Manager for an unknown device and install the driver linked in [4.6](#46-plug-in-the-board). |
| The Buddy restarts when you connect it            | Normal after it has been idle for a while. The web flasher restarts it once to reach it, then carries on. Your settings stay. |
| The flasher calls a working Buddy new or older    | Click **Check again** on that page. Don't choose **Fresh install**, which erases your settings. |
| The flasher says it's not a Buddy board           | It found an ESP32-C6 without the touchscreen and motion sensor, usually the Waveshare ESP32-C6-LCD-1.47 without touch. Monitor-Buddy needs the touchscreen version, the ESP32-C6-Touch-LCD-1.47 (see [2](#2-what-you-need)). Nothing was written to the board.                                                                                |
| The flasher says no compatible board was found    | The board isn't an ESP32-C6 at all, for example an ESP32-S3 or ESP32-C3. Connect a Waveshare ESP32-C6-Touch-LCD-1.47 (see [2](#2-what-you-need)). Nothing was written to the board.                                                                                                                                                           |
| The Buddy stays dark after an interrupted install | Its firmware didn't finish installing. Connect it in the web flasher and choose **Install the firmware again**. The settings saved on the board stay.                                                                                                                                                                                         |
| No port shown / Upload can't find the board       | Try a different USB-C cable. Many are charge-only. On Windows, check Device Manager for an unknown device and install the driver linked in [4.6](#46-plug-in-the-board).                                                                                                                                                                      |
| Upload starts then fails                          | Close any serial monitor on the port, unplug the Buddy, plug it back in and click Upload again. If it no longer starts, reinstall it with the web flasher; your saved settings stay.                                                                                                                                                          |
| Clock or weather never updates                    | Wi-Fi did not connect. Set it in the web flasher's **Change settings**, or hold the screen for 3 seconds and redo the setup. Then check the location and time zone there too. Built it yourself without saved settings? Check `TZ_OFFSET_HOURS` and `TZ_RULE` in `config/config.h` and flash again.                                           |
| Screen is upside down                             | Your Buddy is mounted on the other side. Change the **Mounting side** in the web flasher's **Change settings**. Built it yourself? Set `MOUNTING_LOCATION` to `LEFT` or `RIGHT` in `config/config.h` and flash again; settings saved on the board win, so change those in the web flasher or with the tool (`set mount=right`).               |
| Screen too dark to read                           | Swipe up a few times to raise the brightness, or set it under **Look and pages** in the web flasher's **Change settings**. During night hours a swipe changes the night level. Still too dark? Press **erase** on the setup page (clears the board settings too; see [4.10](#410-everyday-controls)).                                                                                                                                                                                       |
| IP-Seite zeigt keine Adresse                      | Kein WLAN: 3 s halten für Setup-Hotspot, oder WLAN im Web-Flasher setzen. |
| Steh/Sitz-Timer springt zu schnell/langsam        | Im Web-Flasher unter Steh/Sitz die Minuten anpassen (`sit_min` / `stand_min`). Tippen auf der Seite wechselt die Phase sofort. |
| Build fails mentioning `ArduinoJson`              | Deprecation _warnings_ from `ArduinoJson` are expected and harmless. Only a red `error` is a real problem.                                                                                                                                                                                                                                    |

---

## Acknowledgements

Monitor-Buddy builds on the work of others:

- **[schematik.io](https://schematik.io/)** Tiny ESP DeskBuddy, the starting-point idea.
- **[EDISON-SCIENCE-CORNER / DESKBUDDY-1.0](https://github.com/EDISON-SCIENCE-CORNER/DESKBUDDY-1.0)** for additional face designs.
- **[AyresWiFiManager](https://github.com/ayresnet/AyresWiFiManager)** for the captive-portal Wi-Fi setup. Monitor-Buddy uses the [IdefixRC fork](https://github.com/IdefixRC/AyresWiFiManager), which adds Arduino core 3.x support, the multilingual setup page and a time sync that never blocks.
- **[esptool-js](https://github.com/espressif/esptool-js)** by Espressif (Apache-2.0), which the web flasher uses to write the firmware from the browser.
- **[posix_tz_db](https://github.com/nayarsystems/posix_tz_db)** (MIT) for the time zone table, with its rules kept up to date from the [IANA time zone database](https://www.iana.org/time-zones).
- **[Open-Meteo](https://open-meteo.com/)** for the weather and the web flasher's city search.

Contributors:

- **[AmyJoT](https://github.com/AmyJoT)** for the brightness swipe, a sturdier touch read and the first network changes that keep the UI responsive ([#3](https://github.com/IdefixRC/Monitor-Buddy/pull/3)).
- **[Killo1988](https://github.com/Killo1988)** for the Coinbase chart, the 12-hour clock and night mode ([#22](https://github.com/IdefixRC/Monitor-Buddy/pull/22), [#24](https://github.com/IdefixRC/Monitor-Buddy/issues/24)), and a batch of fixes ([#25](https://github.com/IdefixRC/Monitor-Buddy/pull/25)).

## License

MIT. See [LICENSE](LICENSE).
