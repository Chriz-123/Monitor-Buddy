#!/usr/bin/env python3
"""Baut eine lokale Web-Flasher-Seite unter `_site/` und kann sie ausliefern.

Der Browser-Flasher braucht `firmware/releases.json` plus die `.bin`-Dateien
daneben — genau wie die GitHub-Pages-Site. Dieses Skript erzeugt das lokal.

    python tools/local_flasher.py              # Firmware bauen (falls nötig) + _site/
    python tools/local_flasher.py --serve      # danach http://127.0.0.1:8080
    python tools/local_flasher.py --port 9000 --serve
    python tools/local_flasher.py --skip-build # vorhandene .bin nutzen

Chrome oder Edge, USB-C-Datenkabel, dann die lokale URL öffnen.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import http.server
import socketserver
import subprocess
import sys
from datetime import date
from pathlib import Path

import pages_site as ps

REPO = Path(__file__).resolve().parent.parent
BUILD = REPO / ".pio" / "build" / "esp32-c6"
CFG = re.compile(r"static\s+const\s+int\s+CONFIG_VERSION\s*=\s*(\d+)\s*;")


def cfg_version() -> int:
    text = (REPO / "lib" / "settings" / "settings.h").read_text(encoding="utf-8")
    m = CFG.search(text)
    if not m:
        raise SystemExit("CONFIG_VERSION nicht in lib/settings/settings.h gefunden")
    return int(m.group(1))


def ensure_factory_bin(skip_build: bool) -> Path:
    factory = BUILD / "firmware.factory.bin"
    if skip_build and factory.is_file():
        return factory
    if not skip_build or not factory.is_file():
        print("Baue Firmware (pio run -e esp32-c6)…")
        subprocess.run(["pio", "run", "-e", "esp32-c6"], cwd=REPO, check=True)
    if not factory.is_file():
        raise SystemExit(
            f"{factory} fehlt nach dem Build. "
            "Prüfe platformio.ini / pio-Ausgabe.")
    return factory


def assemble(out: Path, version: str, bin_path: Path) -> Path:
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(REPO / "web", out)
    stamp = ps.site_version(out)
    print(f"Site-Version {stamp}: {ps.stamp_assets(out, stamp)} URLs gestempelt")

    tag = f"v{version}"
    name = ps.asset_name(version)
    dest_dir = out / "firmware" / tag
    dest_dir.mkdir(parents=True)
    dest = dest_dir / name
    shutil.copy2(bin_path, dest)
    data = dest.read_bytes()
    entry = ps.release_entry(
        tag, f"{date.today().isoformat()}T00:00:00Z", False, data, cfg_version(),
        repo=ps.repo_url(REPO))
    entry["file"] = f"firmware/{tag}/{name}"
    manifest = ps.build_manifest([entry])
    (out / "firmware" / "releases.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"releases.json: {version} ({len(data)} Bytes, sha256={entry['sha256'][:12]}…)")
    return out


def serve(root: Path, port: int) -> None:
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(root), **k)

    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        url = f"http://127.0.0.1:{port}/"
        print(f"\nWeb-Flasher läuft: {url}")
        print("Chrome/Edge öffnen, Buddy per USB anschließen, „Buddy verbinden“.")
        print("Strg+C zum Beenden.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nBeendet.")


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default="_site", help="Ausgabeordner (Standard: _site)")
    p.add_argument("--version", default="1.4.0-dev", help="Versionsstring für releases.json")
    p.add_argument("--skip-build", action="store_true", help="Vorhandene .bin nutzen")
    p.add_argument("--serve", action="store_true", help="Danach lokalen HTTP-Server starten")
    p.add_argument("--port", type=int, default=8080)
    args = p.parse_args(argv)

    out = (REPO / args.out).resolve()
    problem = ps.check_out_dir(REPO, out)
    if problem:
        print(f"OUT_DIR ungeeignet: {problem}", file=sys.stderr)
        return 2

    bin_path = ensure_factory_bin(args.skip_build)
    assemble(out, args.version.lstrip("v"), bin_path)
    if args.serve:
        serve(out, args.port)
    else:
        print(f"\nFertig. Starten mit:\n  python tools/local_flasher.py --skip-build --serve")
        print(f"oder:\n  python -m http.server {args.port} --bind 127.0.0.1 --directory {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
