# Firmware flashen (dieser Fork)

Kurzüberblick. Details stehen in [README §4](../README.md#4-board-flashen).

## Was geht über GitHub?

Ja — aber **nicht** über <https://monitor-buddy.com/> (das ist Upstream und installiert die Original-Firmware).

Für **diesen** Fork:

1. **GitHub Pages** einmalig aktivieren: Repo → Settings → Pages → Source **GitHub Actions**.
2. Einen **Release** mit Tag `vX.Y.Z` (z. B. `v1.4.0`) veröffentlichen.
3. Die Workflows bauen `monitor-buddy-….bin`, hängen sie an den Release und spiegeln sie nach Pages.
4. Flasher-URL danach: `https://chriz-123.github.io/Monitor-Buddy/`

Ohne Release / ohne Pages: keine installierbare Firmware über den Browser von GitHub.

## Lokal (ohne Pages)

```bash
python tools/local_flasher.py --serve
```

Öffnet den Web-Flasher unter `http://127.0.0.1:8080/` (Chrome/Edge + USB).

## PlatformIO

Wie im README ab §4.1: bauen und per USB hochladen (`pio run -t upload`).
