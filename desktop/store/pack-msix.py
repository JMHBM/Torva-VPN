#!/usr/bin/env python3
"""Build an unsigned MSIX from a packed Electron folder (Store signs on ingest)."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import time
import xml.sax.saxutils
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BLOCK = 65536
BG = (18, 20, 22, 255)
FG = (213, 219, 211, 255)
MUTED = (139, 146, 137, 255)

SKIP_NAMES = {"install.cmd", "uninstall.cmd"}
FOOTPRINT = {"appxblockmap.xml", "[content_types].xml", "appxsignature.p7x"}

CONTENT_DEFAULTS = {
    "xml": "application/vnd.ms-appx.manifest+xml",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "ico": "image/x-icon",
    "svg": "image/svg+xml",
    "exe": "application/x-msdownload",
    "dll": "application/x-msdownload",
    "bin": "application/octet-stream",
    "dat": "application/octet-stream",
    "pak": "application/octet-stream",
    "node": "application/octet-stream",
    "js": "application/javascript",
    "cjs": "application/javascript",
    "mjs": "application/javascript",
    "css": "text/css",
    "html": "text/html",
    "htm": "text/html",
    "json": "application/json",
    "txt": "text/plain",
    "md": "text/plain",
    "bat": "application/x-bat",
    "cmd": "application/x-bat",
    "ps1": "text/plain",
}


def load_identity(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    for key in ("name", "publisher", "publisherDisplayName", "displayName", "version", "description"):
        if not str(data.get(key, "")).strip():
            raise SystemExit(f"store/identity.json missing {key}")
    if data["publisher"].startswith("CN=INSERT"):
        print("[msix] warning: replace identity.publisher with your Partner Center CN before Store upload")
    return data


def circle_mark(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color=FG) -> None:
    for scale, width, alpha in ((1.0, max(2, r // 10), 80), (0.68, max(2, r // 10), 160), (0.32, 0, 255)):
        rr = int(r * scale)
        box = [cx - rr, cy - rr, cx + rr, cy + rr]
        if width:
            draw.ellipse(box, outline=color[:3] + (alpha,), width=width)
        else:
            draw.ellipse(box, fill=color[:3] + (alpha,))


def fit_icon(icon: Image.Image, size: int, pad_ratio: float = 0.18) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    inner = max(1, int(size * (1 - pad_ratio * 2)))
    mark = icon.convert("RGBA").resize((inner, inner), Image.Resampling.LANCZOS)
    x = (size - inner) // 2
    canvas.alpha_composite(mark, (x, x))
    return canvas


def wide_tile(icon: Image.Image, w: int, h: int) -> Image.Image:
    canvas = Image.new("RGBA", (w, h), BG)
    draw = ImageDraw.Draw(canvas)
    side = int(h * 0.72)
    mark = icon.convert("RGBA").resize((side, side), Image.Resampling.LANCZOS)
    y = (h - side) // 2
    canvas.alpha_composite(mark, (int(h * 0.14), y))
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(18, h // 5))
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(12, h // 8))
    except OSError:
        font = ImageFont.load_default()
        small = font
    tx = int(h * 0.14) + side + int(h * 0.12)
    draw.text((tx, h * 0.28), "TORVA", fill=FG, font=font)
    draw.text((tx, h * 0.58), "VPN", fill=MUTED, font=small)
    return canvas


def splash(icon: Image.Image, w: int, h: int) -> Image.Image:
    canvas = Image.new("RGBA", (w, h), BG)
    side = int(h * 0.42)
    mark = icon.convert("RGBA").resize((side, side), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((w - side) // 2, int(h * 0.18)))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    except OSError:
        font = ImageFont.load_default()
    text = "Torva VPN"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, int(h * 0.68)), text, fill=FG, font=font)
    return canvas


def write_assets(icon_path: Path, assets: Path) -> None:
    assets.mkdir(parents=True, exist_ok=True)
    icon = Image.open(icon_path)
    fit_icon(icon, 50).save(assets / "StoreLogo.png")
    fit_icon(icon, 44).save(assets / "Square44x44Logo.png")
    fit_icon(icon, 71).save(assets / "Square71x71Logo.png")
    fit_icon(icon, 150).save(assets / "Square150x150Logo.png")
    fit_icon(icon, 310).save(assets / "Square310x310Logo.png")
    wide_tile(icon, 310, 150).save(assets / "Wide310x150Logo.png")
    splash(icon, 620, 300).save(assets / "SplashScreen.png")
    fit_icon(icon, 300, 0.12).save(assets / "StoreLogo300.png")


def write_listing_art(icon_path: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    icon = Image.open(icon_path)
    fit_icon(icon, 300, 0.12).save(dest / "logo-300.png")
    img = Image.new("RGBA", (1920, 1080), (9, 10, 11, 255))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((360, 120, 1560, 960), radius=28, fill=BG)
    mark = icon.convert("RGBA").resize((220, 220), Image.Resampling.LANCZOS)
    img.alpha_composite(mark, (850, 260))
    try:
        title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 72)
        body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
    except OSError:
        title = ImageFont.load_default()
        body = title
    draw.text((760, 520), "Torva VPN", fill=FG, font=title)
    lines = [
        "One click. Traffic through Tor.",
        "$9.99 once. No ads. No subscriptions.",
        "Free lifetime updates.",
    ]
    y = 640
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=body)
        tw = bbox[2] - bbox[0]
        draw.text(((1920 - tw) // 2, y), line, fill=MUTED, font=body)
        y += 52
    img.save(dest / "screenshot-1920x1080.png")


def manifest_xml(identity: dict) -> str:
    esc = xml.sax.saxutils.escape
    return f"""<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:uap5="http://schemas.microsoft.com/appx/manifest/uap/windows10/5"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
  xmlns:desktop="http://schemas.microsoft.com/appx/manifest/desktop/windows10"
  xmlns:desktop6="http://schemas.microsoft.com/appx/manifest/desktop/windows10/6"
  IgnorableNamespaces="uap uap5 rescap desktop desktop6">
  <Identity
    Name="{esc(identity["name"])}"
    Publisher="{esc(identity["publisher"])}"
    Version="{esc(identity["version"])}"
    ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>{esc(identity["displayName"])}</DisplayName>
    <PublisherDisplayName>{esc(identity["publisherDisplayName"])}</PublisherDisplayName>
    <Description>{esc(identity["description"])}</Description>
    <Logo>Assets\\StoreLogo.png</Logo>
    <desktop6:RegistryWriteVirtualization>disabled</desktop6:RegistryWriteVirtualization>
    <desktop6:FileSystemWriteVirtualization>disabled</desktop6:FileSystemWriteVirtualization>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources>
    <Resource Language="en-us" />
  </Resources>
  <Applications>
    <Application Id="TorvaVPN" Executable="Torva.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
        DisplayName="{esc(identity["displayName"])}"
        Description="{esc(identity["description"])}"
        BackgroundColor="#121416"
        Square150x150Logo="Assets\\Square150x150Logo.png"
        Square44x44Logo="Assets\\Square44x44Logo.png">
        <uap:DefaultTile
          Wide310x150Logo="Assets\\Wide310x150Logo.png"
          Square71x71Logo="Assets\\Square71x71Logo.png"
          Square310x310Logo="Assets\\Square310x310Logo.png">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo" />
            <uap:ShowOn Tile="wide310x150Logo" />
            <uap:ShowOn Tile="square310x310Logo" />
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>
        <uap:SplashScreen Image="Assets\\SplashScreen.png" BackgroundColor="#121416" />
      </uap:VisualElements>
      <Extensions>
        <desktop:Extension Category="windows.startupTask" Executable="Torva.exe" EntryPoint="Windows.FullTrustApplication">
          <desktop:StartupTask TaskId="TorvaVPNStartup" Enabled="false" DisplayName="Torva VPN" />
        </desktop:Extension>
        <uap5:Extension Category="windows.appExecutionAlias">
          <uap5:AppExecutionAlias>
            <uap5:ExecutionAlias Alias="torva.exe" />
          </uap5:AppExecutionAlias>
        </uap5:Extension>
      </Extensions>
    </Application>
  </Applications>
  <Capabilities>
    <Capability Name="internetClient" />
    <Capability Name="privateNetworkClientServer" />
    <rescap:Capability Name="runFullTrust" />
    <rescap:Capability Name="unvirtualizedResources" />
    <rescap:Capability Name="allowElevation" />
  </Capabilities>
</Package>
"""


def collect_payload(app_dir: Path, extra_files: dict[str, Path]) -> list[tuple[str, Path]]:
    items: list[tuple[str, Path]] = []
    for root, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d not in {".cache"}]
        for name in files:
            if name.lower() in SKIP_NAMES:
                continue
            full = Path(root) / name
            rel = full.relative_to(app_dir).as_posix()
            items.append((rel, full))
    for rel, full in extra_files.items():
        items.append((rel.replace("\\", "/"), full))
    items.sort(key=lambda x: x[0].lower())
    return items


def block_hashes(path: Path) -> tuple[int, list[tuple[bytes, int]]]:
    size = path.stat().st_size
    blocks = []
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(BLOCK)
            if not chunk:
                break
            blocks.append((hashlib.sha256(chunk).digest(), len(chunk)))
    if not blocks:
        blocks.append((hashlib.sha256(b"").digest(), 0))
    return size, blocks


def content_types_xml(rels: list[str]) -> str:
    exts = set()
    overrides = []
    for rel in rels:
        name = Path(rel).name
        if "." not in name:
            overrides.append("/" + rel.replace("\\", "/"))
            continue
        ext = name.rsplit(".", 1)[-1].lower()
        if ext not in CONTENT_DEFAULTS:
            CONTENT_DEFAULTS[ext] = "application/octet-stream"
        exts.add(ext)
    lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    ]
    for ext in sorted(exts):
        lines.append(
            f'  <Default Extension="{xml.sax.saxutils.escape(ext)}" ContentType="{CONTENT_DEFAULTS[ext]}" />'
        )
    lines.append('  <Default Extension="xml" ContentType="application/vnd.ms-appx.manifest+xml" />')
    lines.append(
        '  <Override PartName="/AppxManifest.xml" ContentType="application/vnd.ms-appx.manifest+xml" />'
    )
    lines.append(
        '  <Override PartName="/AppxBlockMap.xml" ContentType="application/vnd.ms-appx.blockmap+xml" />'
    )
    for part in overrides:
        lines.append(
            f'  <Override PartName="{xml.sax.saxutils.escape(part)}" ContentType="application/octet-stream" />'
        )
    lines.append("</Types>")
    return "\n".join(lines) + "\n"


def blockmap_xml(files: list[tuple[str, Path, int]]) -> str:
    """files: (backslash name, path, lfh_size)"""
    lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
        '<BlockMap xmlns="http://schemas.microsoft.com/appx/2010/blockmap" HashMethod="http://www.w3.org/2001/04/xmlenc#sha256">',
    ]
    for name, path, lfh in files:
        size, blocks = block_hashes(path)
        lines.append(
            f'  <File Name="{xml.sax.saxutils.escape(name)}" Size="{size}" LfhSize="{lfh}">'
        )
        for digest, length in blocks:
            b64 = base64.b64encode(digest).decode("ascii")
            if length == BLOCK:
                lines.append(f'    <Block Hash="{b64}"/>')
            else:
                lines.append(f'    <Block Hash="{b64}" Size="{length}"/>')
        lines.append("  </File>")
    lines.append("</BlockMap>")
    return "\n".join(lines) + "\n"


def local_header_size(name_bytes: bytes, extra: bytes = b"") -> int:
    return 30 + len(name_bytes) + len(extra)


def pack_msix(payload: list[tuple[str, Path]], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()

    hashed: list[tuple[str, Path, int, bytes]] = []
    for rel, path in payload:
        if Path(rel).name.lower() in FOOTPRINT:
            continue
        zip_name = rel.replace("/", "\\")
        name_bytes = zip_name.encode("utf-8")
        lfh = local_header_size(name_bytes)
        hashed.append((zip_name, path, lfh, name_bytes))

    blockmap = blockmap_xml([(n, p, l) for n, p, l, _ in hashed])
    types = content_types_xml([n.replace("\\", "/") for n, *_ in hashed])

    tmp_dir = dest.parent / ".msix-meta"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir()
    (tmp_dir / "AppxBlockMap.xml").write_text(blockmap, encoding="utf-8")
    (tmp_dir / "[Content_Types].xml").write_text(types, encoding="utf-8")

    with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as zf:
        for zip_name, path, _lfh, name_bytes in hashed:
            info = zipfile.ZipInfo(zip_name)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 0
            info.create_version = 20
            info.extract_version = 20
            info.flag_bits = 0x0800
            now = time.localtime()[:6]
            info.date_time = now
            data = path.read_bytes()
            zf.writestr(info, data)
        for meta in ("AppxBlockMap.xml", "[Content_Types].xml"):
            info = zipfile.ZipInfo(meta)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 0
            info.create_version = 20
            info.extract_version = 20
            info.flag_bits = 0x0800
            info.date_time = time.localtime()[:6]
            zf.writestr(info, (tmp_dir / meta).read_bytes())

    shutil.rmtree(tmp_dir, ignore_errors=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("app_dir")
    parser.add_argument("output")
    parser.add_argument("--identity", default=str(Path(__file__).with_name("identity.json")))
    parser.add_argument("--icon", default="")
    args = parser.parse_args()

    app_dir = Path(args.app_dir).resolve()
    output = Path(args.output).resolve()
    identity = load_identity(Path(args.identity))
    store_dir = Path(__file__).resolve().parent
    assets = store_dir / "Assets"
    listing = store_dir / "listing"
    icon = Path(args.icon) if args.icon else app_dir / "resources" / "icon.png"
    if not icon.exists():
        raise SystemExit(f"icon missing: {icon}")

    print("[msix] generating Store assets")
    write_assets(icon, assets)
    write_listing_art(icon, listing)

    manifest_path = store_dir / "AppxManifest.xml"
    manifest_path.write_text(manifest_xml(identity), encoding="utf-8")

    extra = {
        "AppxManifest.xml": manifest_path,
        "Assets/StoreLogo.png": assets / "StoreLogo.png",
        "Assets/Square44x44Logo.png": assets / "Square44x44Logo.png",
        "Assets/Square71x71Logo.png": assets / "Square71x71Logo.png",
        "Assets/Square150x150Logo.png": assets / "Square150x150Logo.png",
        "Assets/Square310x310Logo.png": assets / "Square310x310Logo.png",
        "Assets/Wide310x150Logo.png": assets / "Wide310x150Logo.png",
        "Assets/SplashScreen.png": assets / "SplashScreen.png",
    }
    payload = collect_payload(app_dir, extra)
    print(f"[msix] packing {len(payload)} files -> {output}")
    pack_msix(payload, output)
    mb = output.stat().st_size / (1024 * 1024)
    print(f"[msix] {output} ({mb:.1f} MB)")


if __name__ == "__main__":
    main()
