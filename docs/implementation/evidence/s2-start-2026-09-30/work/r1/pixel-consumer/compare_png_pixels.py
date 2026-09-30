#!/usr/bin/env python3
"""
compare_png_pixels.py - dependency-free, reusable PNG *pixel* equality checker.

Purpose
-------
Decide whether two PNG files render the exact same pixel raster, independent of
PNG compression settings, chunk layout, or ancillary metadata. It does NOT
compare file bytes/digests; it decodes the image data and compares normalized
RGBA8 rasters pixel by pixel.

Only Python 3 standard library is used (struct, zlib, hashlib, argparse, json),
so it runs anywhere without installing anything.

Supported input (for exact comparison):
  - PNG signature + CRC-validated chunks
  - bit depth 1/2/4/8/16
  - color types 0 (gray), 2 (RGB), 3 (palette), 4 (gray+alpha), 6 (RGBA)
  - interlace: none and Adam7
  - tRNS transparency (normalized into the alpha channel)
Anything else is reported as UNSUPPORTED (exit code 2) rather than guessed.

Interpretation of results:
  exit 0  -> normalized pixel rasters are byte-identical
  exit 1  -> pixel rasters differ (details printed / written to JSON)
  exit 2  -> could not compare (missing file, corrupt/unsupported PNG)

Usage:
  python compare_png_pixels.py A.png B.png
  python compare_png_pixels.py A.png B.png --json result.json --diff diff.png
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import sys
import zlib

PNG_SIG = b"\x89PNG\r\n\x1a\n"
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
ADAM7 = [(0, 0, 8, 8), (4, 0, 8, 8), (0, 4, 4, 8), (2, 0, 4, 4),
         (0, 2, 2, 4), (1, 0, 2, 2), (0, 1, 1, 2)]


class PngError(Exception):
    pass


# --------------------------------------------------------------------------- #
# Container parsing
# --------------------------------------------------------------------------- #
def parse_chunks(data: bytes):
    if data[:8] != PNG_SIG:
        raise PngError("not a PNG (bad signature)")
    off, chunks = 8, []
    while off + 8 <= len(data):
        (length,) = struct.unpack(">I", data[off:off + 4])
        ctype = data[off + 4:off + 8]
        end = off + 8 + length
        if end + 4 > len(data):
            raise PngError("truncated chunk %r" % ctype)
        payload = data[off + 8:end]
        (stored_crc,) = struct.unpack(">I", data[end:end + 4])
        calc_crc = zlib.crc32(ctype + payload) & 0xFFFFFFFF
        chunks.append({
            "type": ctype.decode("latin-1"),
            "length": length,
            "crc_ok": stored_crc == calc_crc,
            "data": payload,
        })
        off = end + 4
    return chunks


def parse_ihdr(payload: bytes) -> dict:
    if len(payload) != 13:
        raise PngError("bad IHDR length")
    w, h, bd, ct, comp, filt, inter = struct.unpack(">IIBBBBB", payload)
    if comp != 0:
        raise PngError("unsupported compression method %d" % comp)
    if filt != 0:
        raise PngError("unsupported filter method %d" % filt)
    if bd not in (1, 2, 4, 8, 16):
        raise PngError("unsupported bit depth %d" % bd)
    if ct not in CHANNELS:
        raise PngError("unsupported color type %d" % ct)
    if inter not in (0, 1):
        raise PngError("unsupported interlace method %d" % inter)
    if ct in (2, 4, 6) and bd < 8:
        raise PngError("invalid bit depth %d for color type %d" % (bd, ct))
    return {"width": w, "height": h, "bit_depth": bd, "color_type": ct,
            "interlace": inter}


# --------------------------------------------------------------------------- #
# Scanline reconstruction
# --------------------------------------------------------------------------- #
def unfilter(raw: bytes, height: int, stride: int, bpp: int) -> bytes:
    out = bytearray()
    prev = bytearray(stride)
    pos = 0
    for _ in range(height):
        if pos >= len(raw):
            raise PngError("truncated decompressed image data")
        ft = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        if len(line) != stride:
            raise PngError("truncated scanline")
        pos += stride
        if ft == 0:
            pass
        elif ft == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ft == 3:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ft == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                if pa <= pb and pa <= pc:
                    pr = a
                elif pb <= pc:
                    pr = b
                else:
                    pr = c
                line[i] = (line[i] + pr) & 0xFF
        else:
            raise PngError("unknown filter type %d" % ft)
        out += line
        prev = line
    return bytes(out)


def _sample(row: bytes, idx: int, bit_depth: int) -> int:
    if bit_depth == 8:
        return row[idx]
    if bit_depth == 16:
        return (row[2 * idx] << 8) | row[2 * idx + 1]
    per = 8 // bit_depth
    byte = row[idx // per]
    shift = 8 - bit_depth * ((idx % per) + 1)
    return (byte >> shift) & ((1 << bit_depth) - 1)


def _to_rgba8_row(row, width, bit_depth, color_type, palette, trns):
    ch = CHANNELS[color_type]
    maxv = (1 << bit_depth) - 1
    out = bytearray()
    for x in range(width):
        base = x * ch
        if color_type == 0:
            g = _sample(row, base, bit_depth)
            v = g * 255 // maxv if bit_depth < 8 else (g >> 8 if bit_depth == 16 else g)
            a = 0 if (trns is not None and g == trns) else 255
            out += bytes((v, v, v, a))
        elif color_type == 2:
            r = _sample(row, base, bit_depth)
            g = _sample(row, base + 1, bit_depth)
            b = _sample(row, base + 2, bit_depth)
            if bit_depth == 16:
                r, g, b = r >> 8, g >> 8, b >> 8
            a = 255
            if trns is not None and (r, g, b) == trns:
                a = 0
            out += bytes((r, g, b, a))
        elif color_type == 3:
            i = _sample(row, base, bit_depth)
            if palette is None or i * 3 + 2 >= len(palette):
                raise PngError("palette index out of range")
            a = trns[i] if (trns is not None and i < len(trns)) else 255
            out += bytes((palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2], a))
        elif color_type == 4:
            g = _sample(row, base, bit_depth)
            a = _sample(row, base + 1, bit_depth)
            if bit_depth == 16:
                g, a = g >> 8, a >> 8
            out += bytes((g, g, g, a))
        else:  # 6
            r = _sample(row, base, bit_depth)
            g = _sample(row, base + 1, bit_depth)
            b = _sample(row, base + 2, bit_depth)
            a = _sample(row, base + 3, bit_depth)
            if bit_depth == 16:
                r, g, b, a = r >> 8, g >> 8, b >> 8, a >> 8
            out += bytes((r, g, b, a))
    return bytes(out)


def decode_png(path: str) -> dict:
    with open(path, "rb") as fh:
        data = fh.read()
    chunks = parse_chunks(data)
    if not chunks or chunks[0]["type"] != "IHDR":
        raise PngError("missing IHDR")
    if not all(c["crc_ok"] for c in chunks):
        raise PngError("chunk CRC mismatch")
    ihdr = parse_ihdr(chunks[0]["data"])
    w, h, bd, ct, inter = (ihdr["width"], ihdr["height"], ihdr["bit_depth"],
                           ihdr["color_type"], ihdr["interlace"])

    palette = trns = None
    idat = bytearray()
    for c in chunks[1:]:
        if c["type"] == "PLTE":
            palette = c["data"]
        elif c["type"] == "tRNS":
            trns = c["data"]
        elif c["type"] == "IDAT":
            idat += c["data"]
        elif c["type"] == "IEND":
            break
    if not idat:
        raise PngError("no IDAT data")

    if ct == 3 and palette is None:
        raise PngError("palette image without PLTE")

    # tRNS -> comparable form
    if ct == 0 and trns is not None and len(trns) >= 2:
        trns = struct.unpack(">H", trns[:2])[0]
    elif ct == 2 and trns is not None and len(trns) >= 6:
        trns = struct.unpack(">HHH", trns[:6])
        trns = tuple(v >> 8 for v in trns)  # only 8-bit RGB supported here
    elif ct == 3 and trns is not None:
        trns = list(trns)

    raw = zlib.decompress(bytes(idat))

    rgba = bytearray(w * h * 4)

    if inter == 0:
        stride = (w * CHANNELS[ct] * bd + 7) // 8
        bpp = max(1, (CHANNELS[ct] * bd) // 8)
        lines = unfilter(raw, h, stride, bpp)
        for y in range(h):
            row = lines[y * stride:(y + 1) * stride]
            rgba[y * w * 4:(y + 1) * w * 4] = _to_rgba8_row(
                row, w, bd, ct, palette, trns)
    else:
        pos = 0
        for (x0, y0, dx, dy) in ADAM7:
            pw = (w - x0 + dx - 1) // dx
            ph = (h - y0 + dy - 1) // dy
            if pw <= 0 or ph <= 0:
                continue
            stride = (pw * CHANNELS[ct] * bd + 7) // 8
            bpp = max(1, (CHANNELS[ct] * bd) // 8)
            need = ph * (stride + 1)
            lines = unfilter(raw[pos:pos + need], ph, stride, bpp)
            pos += need
            for py in range(ph):
                row = lines[py * stride:(py + 1) * stride]
                rr = _to_rgba8_row(row, pw, bd, ct, palette, trns)
                y = y0 + py * dy
                for px in range(pw):
                    x = x0 + px * dx
                    o = (y * w + x) * 4
                    rgba[o:o + 4] = rr[px * 4:px * 4 + 4]

    return {
        "path": path,
        "width": w,
        "height": h,
        "bit_depth": bd,
        "color_type": ct,
        "interlace": inter,
        "chunks": [{"type": c["type"], "length": c["length"],
                    "crc_ok": c["crc_ok"]} for c in chunks],
        "file_bytes": len(data),
        "file_sha256": hashlib.sha256(data).hexdigest(),
        "pixel_rgba8_sha256": hashlib.sha256(bytes(rgba)).hexdigest(),
        "rgba": bytes(rgba),
    }


# --------------------------------------------------------------------------- #
# Comparison
# --------------------------------------------------------------------------- #
def compare(a: dict, b: dict) -> dict:
    same_dims = (a["width"], a["height"]) == (b["width"], b["height"])
    res = {
        "a": {k: a[k] for k in ("path", "width", "height", "bit_depth",
                                "color_type", "interlace", "file_bytes",
                                "file_sha256", "pixel_rgba8_sha256")},
        "b": {k: b[k] for k in ("path", "width", "height", "bit_depth",
                                "color_type", "interlace", "file_bytes",
                                "file_sha256", "pixel_rgba8_sha256")},
        "same_dimensions": same_dims,
        "file_sha256_equal": a["file_sha256"] == b["file_sha256"],
        "pixel_rgba8_sha256_equal":
            a["pixel_rgba8_sha256"] == b["pixel_rgba8_sha256"],
    }
    if not same_dims:
        res["pixels_equal"] = False
        res["reason"] = "dimensions differ"
        return res

    ra, rb = a["rgba"], b["rgba"]
    n = len(ra)
    diff_pixels = 0
    diff_channels = 0
    max_delta = 0
    delta_hist = {}
    minx = miny = 10 ** 9
    maxx = maxy = -1
    w = a["width"]
    for i in range(0, n, 4):
        d = 0
        for k in range(4):
            dv = abs(ra[i + k] - rb[i + k])
            if dv:
                d = 1
                diff_channels += 1
                delta_hist[dv] = delta_hist.get(dv, 0) + 1
                if dv > max_delta:
                    max_delta = dv
        if d:
            diff_pixels += 1
            p = i // 4
            x, y = p % w, p // w
            minx, maxx = min(minx, x), max(maxx, x)
            miny, maxy = min(miny, y), max(maxy, y)

    total = w * a["height"]
    res.update({
        "pixels_equal": diff_pixels == 0,
        "total_pixels": total,
        "differing_pixels": diff_pixels,
        "differing_pixel_fraction": diff_pixels / total if total else 0.0,
        "differing_channels": diff_channels,
        "max_channel_delta": max_delta,
        "channel_delta_histogram": dict(sorted(delta_hist.items())),
        "diff_bbox_xyxy": ([minx, miny, maxx, maxy]
                           if diff_pixels else None),
    })
    return res


# --------------------------------------------------------------------------- #
# Diff image (stdlib PNG writer)
# --------------------------------------------------------------------------- #
def _png_chunk(ctype: bytes, payload: bytes) -> bytes:
    return (struct.pack(">I", len(payload)) + ctype + payload +
            struct.pack(">I", zlib.crc32(ctype + payload) & 0xFFFFFFFF))


def write_diff_png(path, a, b, amplify=True):
    w, h = a["width"], a["height"]
    ra, rb = a["rgba"], b["rgba"]
    rows = bytearray()
    for y in range(h):
        rows.append(0)
        for x in range(w):
            i = (y * w + x) * 4
            if ra[i:i + 4] == rb[i:i + 4]:
                g = (ra[i] + ra[i + 1] + ra[i + 2]) // 3
                g = 200 + g * 55 // 255          # dimmed grayscale base
                rows += bytes((g, g, g))
            else:
                m = max(abs(ra[i + k] - rb[i + k]) for k in range(3))
                if amplify:
                    m = min(255, m * 4 + 60)
                rows += bytes((255, 255 - m, 255 - m))  # red-ish = difference
    png = PNG_SIG + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += _png_chunk(b"IDAT", zlib.compress(bytes(rows), 9))
    png += _png_chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)
    return path


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Compare two PNG files by decoded pixel raster "
                    "(metadata/compression independent).")
    ap.add_argument("a", help="reference PNG path")
    ap.add_argument("b", help="candidate PNG path")
    ap.add_argument("--json", help="write machine-readable result JSON here")
    ap.add_argument("--diff", help="write a visual diff PNG here")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    try:
        ia = decode_png(args.a)
        ib = decode_png(args.b)
    except (OSError, PngError, zlib.error) as exc:
        print("UNSUPPORTED/ERROR: %s" % exc, file=sys.stderr)
        if args.json:
            with open(args.json, "w", encoding="utf-8") as fh:
                json.dump({"status": "error", "error": str(exc)}, fh, indent=2)
        return 2

    res = compare(ia, ib)
    res["status"] = "identical" if res["pixels_equal"] else "different"

    if not args.quiet:
        print("A: %s  %dx%d  bitdepth=%d colortype=%d interlace=%d  bytes=%d"
              % (args.a, ia["width"], ia["height"], ia["bit_depth"],
                 ia["color_type"], ia["interlace"], ia["file_bytes"]))
        print("B: %s  %dx%d  bitdepth=%d colortype=%d interlace=%d  bytes=%d"
              % (args.b, ib["width"], ib["height"], ib["bit_depth"],
                 ib["color_type"], ib["interlace"], ib["file_bytes"]))
        print("file sha256 equal (NOT the criterion): %s" % res["file_sha256_equal"])
        print("decoded RGBA8 sha256 A: %s" % ia["pixel_rgba8_sha256"])
        print("decoded RGBA8 sha256 B: %s" % ib["pixel_rgba8_sha256"])
        print("PIXELS EQUAL: %s" % res["pixels_equal"])
        if not res["pixels_equal"] and "differing_pixels" in res:
            print("  differing pixels: %d / %d (%.4f%%)"
                  % (res["differing_pixels"], res["total_pixels"],
                     100 * res["differing_pixel_fraction"]))
            print("  differing channels: %d  max channel delta: %d"
                  % (res["differing_channels"], res["max_channel_delta"]))
            print("  diff bbox [x0,y0,x1,y1]: %s" % res["diff_bbox_xyxy"])
            print("  channel delta histogram: %s" % res["channel_delta_histogram"])

    if args.diff:
        write_diff_png(args.diff, ia, ib)
        if not args.quiet:
            print("wrote visual diff: %s" % args.diff)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(res, fh, indent=2)
        if not args.quiet:
            print("wrote result JSON: %s" % args.json)

    return 0 if res["pixels_equal"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
