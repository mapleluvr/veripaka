#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
png_pixel_compare.py

Purpose
-------
Answer one narrow question about two PNG files: **do they decode to exactly the
same rendered pixel values?**

It does NOT look at file size, file hash, chunk metadata, or compression
settings as evidence of rendering equality. Those are reported only as context.

Method
------
1. Parse the PNG container by hand (chunks + CRC verification).
2. Decompress IDAT with zlib and reverse the PNG scanline filters.
3. Decode to a canonical 16-bit-per-channel RGBA sample grid
   (palette expansion, tRNS transparency, sub-byte bit depths,
   16-bit big-endian samples and Adam7 interlacing are all handled).
4. Compare the two canonical grids pixel by pixel.

Optional cross-check: if Pillow is importable it is used as a second,
independent decoder and its 8-bit RGBA result is compared against this
decoder's result. Disagreement means the comparison itself is untrustworthy.

Only Python standard library is required. Pillow is optional.

Exit codes: 0 = pixels identical, 1 = pixels differ, 2 = error / unsupported.

Limitations (see also --help and the JSON "limitations" field)
-------------------------------------------------------------
* Compares raw PNG sample values. It says nothing about CSS layout, text
  shaping, antialiasing policy, fonts, device pixel ratio, or which pixels a
  browser *would* have painted. It only compares the two given files.
* Colors are NOT color-managed. An embedded ICC profile / gAMA / cHRM chunk is
  recorded but never applied, so two files holding identical sample values but
  different ICC profiles are reported as pixel-identical.
* APNG animation frames after the first (fcTL/fdAT) are not compared.
* No perceptual similarity, no tolerance threshold: the comparison is exact.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import os
import struct
import sys
import zlib

PNG_SIG = b"\x89PNG\r\n\x1a\n"
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
COLOR_NAMES = {
    0: "grayscale",
    2: "truecolor",
    3: "indexed",
    4: "grayscale+alpha",
    6: "truecolor+alpha",
}
ADAM7 = [
    (0, 0, 8, 8),
    (4, 0, 8, 8),
    (0, 4, 4, 8),
    (2, 0, 4, 4),
    (0, 2, 2, 4),
    (1, 0, 2, 2),
    (0, 1, 1, 2),
]
TOOL_VERSION = "1.0.0"

LIMITATIONS = [
    "Compares only the two supplied PNG files; it does not model browser layout, "
    "CSS, fonts, text shaping, antialiasing policy or device pixel ratio.",
    "No color management: iCCP/gAMA/cHRM/sRGB chunks are recorded but never applied, "
    "so identical samples under different color profiles are reported as identical.",
    "Only the default image of an APNG is compared; later frames are ignored.",
    "Comparison is exact per sample value; there is no perceptual tolerance.",
    "Equal pixels do not prove a product is correct or accepted, only that these "
    "two rendered files agree pixel-for-pixel.",
]


class PngError(Exception):
    pass


# --------------------------------------------------------------------------- #
# container
# --------------------------------------------------------------------------- #
def read_png(path):
    with open(path, "rb") as fh:
        data = fh.read()
    if data[:8] != PNG_SIG:
        raise PngError("not a PNG file (bad signature): %s" % path)

    chunks = []
    idat = bytearray()
    plte = None
    trns = None
    ihdr = None
    pos = 8
    while pos + 8 <= len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        if len(body) != length:
            raise PngError("truncated chunk %r" % ctype)
        (crc,) = struct.unpack(">I", data[pos + 8 + length : pos + 12 + length])
        crc_ok = crc == (zlib.crc32(ctype + body) & 0xFFFFFFFF)
        if ctype == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", body)
        elif ctype == b"IDAT":
            idat += body
        elif ctype == b"PLTE":
            plte = body
        elif ctype == b"tRNS":
            trns = body
        chunks.append(
            {
                "type": ctype.decode("latin-1"),
                "length": length,
                "crc32_ok": crc_ok,
                "data_sha256": hashlib.sha256(body).hexdigest()[:16],
            }
        )
        pos += 12 + length
        if ctype == b"IEND":
            break

    if ihdr is None:
        raise PngError("missing IHDR")
    w, h, depth, ctype, comp, filt, interlace = ihdr
    if comp != 0 or filt != 0:
        raise PngError("unsupported compression/filter method")
    if ctype not in CHANNELS:
        raise PngError("unsupported color type %d" % ctype)
    allowed = {0: (1, 2, 4, 8, 16), 2: (8, 16), 3: (1, 2, 4, 8), 4: (8, 16), 6: (8, 16)}
    if depth not in allowed[ctype]:
        raise PngError("invalid bit depth %d for color type %d" % (depth, ctype))
    if ctype == 3 and plte is None:
        raise PngError("indexed image without PLTE")

    return {
        "path": os.path.abspath(path),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "ihdr": {
            "width": w,
            "height": h,
            "bitDepth": depth,
            "colorType": ctype,
            "colorTypeName": COLOR_NAMES[ctype],
            "interlace": interlace,
            "interlaceName": "Adam7" if interlace == 1 else "none",
        },
        "chunks": chunks,
        "ancillary": [c["type"] for c in chunks if c["type"][0].islower()],
        "idat": bytes(idat),
        "plte": plte,
        "trns": trns,
    }


# --------------------------------------------------------------------------- #
# scanline filters
# --------------------------------------------------------------------------- #
def _paeth(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def unfilter_row(ftype, row, prev, bpp):
    """In-place reverse a PNG filter. row/prev are bytearrays of equal length."""
    n = len(row)
    if ftype == 0:
        return
    if ftype == 1:
        for i in range(bpp, n):
            row[i] = (row[i] + row[i - bpp]) & 0xFF
    elif ftype == 2:
        for i in range(n):
            row[i] = (row[i] + prev[i]) & 0xFF
    elif ftype == 3:
        for i in range(n):
            a = row[i - bpp] if i >= bpp else 0
            row[i] = (row[i] + ((a + prev[i]) >> 1)) & 0xFF
    elif ftype == 4:
        for i in range(n):
            a = row[i - bpp] if i >= bpp else 0
            c = prev[i - bpp] if i >= bpp else 0
            row[i] = (row[i] + _paeth(a, prev[i], c)) & 0xFF
    else:
        raise PngError("unknown filter type %d" % ftype)


# --------------------------------------------------------------------------- #
# sample decoding
# --------------------------------------------------------------------------- #
def unpack_samples(row, count, channels, depth):
    """Return list of `count` tuples of `channels` raw integer samples."""
    out = []
    if depth == 8:
        for i in range(count):
            o = i * channels
            out.append(tuple(row[o : o + channels]))
    elif depth == 16:
        for i in range(count):
            o = i * channels * 2
            out.append(tuple(struct.unpack(">%dH" % channels, row[o : o + channels * 2])))
    else:
        maxv = (1 << depth) - 1
        per_byte = 8 // depth
        for i in range(count):
            tup = []
            for c in range(channels):
                bit = (i * channels + c) * depth
                byte = row[bit >> 3]
                shift = 8 - depth - (bit & 7)
                tup.append((byte >> shift) & maxv)
            out.append(tuple(tup))
    return out


def sample_to_16(v, depth):
    if depth == 16:
        return v
    if depth == 8:
        return v * 257
    maxv = (1 << depth) - 1
    return v * 65535 // maxv


def make_pixel_mapper(png):
    ct = png["ihdr"]["colorType"]
    depth = png["ihdr"]["bitDepth"]
    trns = png["trns"]
    plte = png["plte"]

    if ct == 3:
        palette = []
        for i in range(len(plte) // 3):
            r, g, b = plte[3 * i : 3 * i + 3]
            a = trns[i] if (trns is not None and i < len(trns)) else 255
            palette.append((r * 257, g * 257, b * 257, a * 257))

        def mapper(sample):
            idx = sample[0]
            if idx >= len(palette):
                raise PngError("palette index %d out of range" % idx)
            return palette[idx]

        return mapper

    if ct == 0:
        key = None
        if trns is not None and len(trns) >= 2:
            key = struct.unpack(">H", trns[:2])[0]

        def mapper(sample):
            v = sample_to_16(sample[0], depth)
            if key is not None and sample[0] == key:
                return (v, v, v, 0)
            return (v, v, v, 65535)

        return mapper

    if ct == 4:
        def mapper(sample):
            g = sample_to_16(sample[0], depth)
            a = sample_to_16(sample[1], depth)
            return (g, g, g, a)

        return mapper

    # ct == 2 or 6
    key = None
    if ct == 2 and trns is not None and len(trns) >= 6:
        key = struct.unpack(">HHH", trns[:6])

    if ct == 2:
        def mapper(sample):
            r, g, b = (sample_to_16(s, depth) for s in sample[:3])
            if key is not None and tuple(sample[:3]) == key:
                return (r, g, b, 0)
            return (r, g, b, 65535)

        return mapper

    def mapper(sample):
        r, g, b, a = (sample_to_16(s, depth) for s in sample[:4])
        return (r, g, b, a)

    return mapper


def decode_to_rgba16(png):
    """Decode to a list of rows; each row is one bytearray of width*8 bytes."""
    ihdr = png["ihdr"]
    w, h = ihdr["width"], ihdr["height"]
    depth = ihdr["bitDepth"]
    ct = ihdr["colorType"]
    interlace = ihdr["interlace"]
    ch = CHANNELS[ct]
    mapper = make_pixel_mapper(png)

    try:
        raw = zlib.decompress(png["idat"])
    except zlib.error as exc:
        raise PngError("IDAT zlib decompression failed: %s" % exc)

    canvas = [bytearray(w * 8) for _ in range(h)]
    passes = ADAM7 if interlace == 1 else [(0, 0, 1, 1)]
    pos = 0
    for (x0, y0, dx, dy) in passes:
        pw = (w - x0 + dx - 1) // dx if w > x0 else 0
        ph = (h - y0 + dy - 1) // dy if h > y0 else 0
        if pw == 0 or ph == 0:
            continue
        rowbytes = (pw * ch * depth + 7) // 8
        bpp = max(1, (ch * depth) // 8)
        prev = bytearray(rowbytes)
        for j in range(ph):
            if pos + 1 + rowbytes > len(raw):
                raise PngError("truncated image data")
            ftype = raw[pos]
            pos += 1
            row = bytearray(raw[pos : pos + rowbytes])
            pos += rowbytes
            unfilter_row(ftype, row, prev, bpp)
            samples = unpack_samples(row, pw, ch, depth)
            target = canvas[y0 + j * dy]
            for i in range(pw):
                x = x0 + i * dx
                off = x * 8
                target[off : off + 8] = struct.pack(">HHHH", *mapper(samples[i]))
            prev = row

    return canvas, {"decompressedBytes": len(raw), "trailingBytes": len(raw) - pos}


# --------------------------------------------------------------------------- #
# optional independent decoder
# --------------------------------------------------------------------------- #
def pil_reference(path):
    """Independent decode via Pillow -> 8-bit RGBA bytes. Returns None if unavailable."""
    try:
        from PIL import Image  # noqa
    except Exception:
        return None
    try:
        with Image.open(path) as im:
            im = im.convert("RGBA")
            if im.mode == "RGBA" and im.size[0] * im.size[1] > 0:
                return im.size, im.tobytes()
            return None
    except Exception as exc:  # pragma: no cover
        return {"error": str(exc)}


def cross_check(png, rows):
    """Compare this decoder's output with Pillow's. Returns a dict."""
    ref = pil_reference(png["path"])
    if ref is None:
        return {"available": False, "reason": "Pillow not importable"}
    if isinstance(ref, dict):
        return {"available": True, "agreement": "unknown", "error": ref["error"]}
    size, blob = ref
    w, h = png["ihdr"]["width"], png["ihdr"]["height"]
    depth = png["ihdr"]["bitDepth"]
    if size != (w, h):
        return {"available": True, "agreement": "no", "reason": "size mismatch", "pilSize": list(size)}
    if depth == 16:
        return {
            "available": True,
            "agreement": "skipped",
            "reason": "16-bit source: Pillow would down-convert, so its 8-bit output is not an exact oracle",
        }
    mismatches = 0
    first = None
    for y in range(h):
        row = rows[y]
        base = y * w * 4
        for x in range(w):
            off = x * 8
            mine = (row[off], row[off + 2], row[off + 4], row[off + 6])  # high bytes
            theirs = tuple(blob[base + x * 4 : base + x * 4 + 4])
            if mine != theirs:
                mismatches += 1
                if first is None:
                    first = {"x": x, "y": y, "ours": list(mine), "pillow": list(theirs)}
    return {
        "available": True,
        "agreement": "yes" if mismatches == 0 else "no",
        "decoder": "Pillow %s" % __import__("PIL").__version__,
        "mismatchedPixels": mismatches,
        "firstMismatch": first,
    }


# --------------------------------------------------------------------------- #
# comparison
# --------------------------------------------------------------------------- #
def compare_rows(rows_a, rows_b, w, h, max_report):
    total = w * h
    differing = 0
    bbox = None  # minx, miny, maxx, maxy
    examples = []
    chan_max = [0, 0, 0, 0]
    chan_sum = [0, 0, 0, 0]
    row_diffs = 0

    for y in range(h):
        ra = rows_a[y]
        rb = rows_b[y]
        if ra == rb:
            continue
        row_diffs += 1
        for x in range(w):
            off = x * 8
            pa = ra[off : off + 8]
            pb = rb[off : off + 8]
            if pa == pb:
                continue
            differing += 1
            av = struct.unpack(">HHHH", pa)
            bv = struct.unpack(">HHHH", pb)
            for c in range(4):
                d = abs(av[c] - bv[c])
                chan_sum[c] += d
                if d > chan_max[c]:
                    chan_max[c] = d
            if bbox is None:
                bbox = [x, y, x, y]
            else:
                if x < bbox[0]:
                    bbox[0] = x
                if y < bbox[1]:
                    bbox[1] = y
                if x > bbox[2]:
                    bbox[2] = x
                if y > bbox[3]:
                    bbox[3] = y
            if len(examples) < max_report:
                examples.append(
                    {
                        "x": x,
                        "y": y,
                        "referenceRGBA16": list(av),
                        "candidateRGBA16": list(bv),
                        "deltaRGBA16": [abs(av[c] - bv[c]) for c in range(4)],
                    }
                )

    stats = {
        "totalPixels": total,
        "differingPixels": differing,
        "identicalPixels": total - differing,
        "identicalFraction": round((total - differing) / total, 9) if total else None,
        "rowsWithDifferences": row_diffs,
        "maxChannelDelta16": chan_max,
        "sumChannelDelta16": chan_sum,
        "boundingBox": (
            {
                "minX": bbox[0],
                "minY": bbox[1],
                "maxX": bbox[2],
                "maxY": bbox[3],
                "width": bbox[2] - bbox[0] + 1,
                "height": bbox[3] - bbox[1] + 1,
            }
            if bbox
            else None
        ),
        "examples": examples,
    }
    return stats


def write_diff_png(path, rows_a, rows_b, w, h):
    """Write an RGB8 PNG: identical pixels dimmed from reference, differences pure red."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter type 0
        ra = rows_a[y]
        rb = rows_b[y]
        line = bytearray()
        for x in range(w):
            off = x * 8
            if ra[off : off + 8] == rb[off : off + 8]:
                r = ra[off] >> 1
                g = ra[off + 2] >> 1
                b = ra[off + 4] >> 1
            else:
                r, g, b = 255, 0, 0
            line += bytes((r, g, b))
        raw += line

    def chunk(ctype, body):
        return (
            struct.pack(">I", len(body))
            + ctype
            + body
            + struct.pack(">I", zlib.crc32(ctype + body) & 0xFFFFFFFF)
        )

    out = PNG_SIG
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    out += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(out)
    return os.path.abspath(path)


# --------------------------------------------------------------------------- #
# reporting
# --------------------------------------------------------------------------- #
def file_context(png):
    return {
        "path": png["path"],
        "fileBytes": png["bytes"],
        "fileSha256": png["sha256"],
        "ihdr": png["ihdr"],
        "chunkTypes": [c["type"] for c in png["chunks"]],
        "ancillaryChunkTypes": png["ancillary"],
        "allChunkCrc32Valid": all(c["crc32_ok"] for c in png["chunks"]),
        "idatBytes": len(png["idat"]),
    }


def run(args):
    if not os.path.isfile(args.reference):
        raise PngError("reference image not found: %s" % args.reference)
    if not os.path.isfile(args.candidate):
        raise PngError("candidate image not found: %s" % args.candidate)

    ref = read_png(args.reference)
    cand = read_png(args.candidate)

    warnings = []
    a_meta = ref["ihdr"]
    b_meta = cand["ihdr"]
    same_size = (a_meta["width"], a_meta["height"]) == (b_meta["width"], b_meta["height"])

    rows_a, info_a = decode_to_rgba16(ref)
    rows_b, info_b = decode_to_rgba16(cand)

    result = {
        "tool": "png_pixel_compare.py",
        "toolVersion": TOOL_VERSION,
        "runAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "command": " ".join([os.path.basename(sys.executable)] + sys.argv),
        "inputs": {"reference": file_context(ref), "candidate": file_context(cand)},
        "comparisonScope": "decoded pixel samples of the two files only",
        "dimensionsMatch": same_size,
        "identicalDimensionsOrResized": None,
        "pixelsIdentical": None,
        "stats": None,
        "structuralNotes": [],
        "crossCheck": {},
        "warnings": warnings,
        "limitations": LIMITATIONS,
        "diffImage": None,
    }

    for key in ("bitDepth", "colorType", "interlace"):
        if a_meta[key] != b_meta[key]:
            result["structuralNotes"].append(
                "encoded form differs: %s reference=%s candidate=%s "
                "(comparison uses decoded RGBA16 samples, so this alone is not a rendering difference)"
                % (key, a_meta[key], b_meta[key])
            )
    if ref["ancillary"] != cand["ancillary"]:
        result["structuralNotes"].append(
            "ancillary metadata chunks differ: reference=%s candidate=%s"
            % (ref["ancillary"], cand["ancillary"])
        )
    if ref["idat"] != cand["idat"]:
        result["structuralNotes"].append("IDAT byte streams differ (compression/filters/encoding differ)")
    if info_a["trailingBytes"] or info_b["trailingBytes"]:
        warnings.append("trailing bytes after final scanline in decompressed stream")
    for png in (ref, cand):
        bad = [c["type"] for c in png["chunks"] if not c["crc32_ok"]]
        if bad:
            warnings.append("CRC mismatch in %s: %s" % (png["path"], bad))
    if any(c["type"] == "acTL" for c in ref["chunks"] + cand["chunks"]):
        warnings.append("APNG detected: only the default/first frame is compared")

    if not same_size:
        result["pixelsIdentical"] = False
        result["stats"] = {
            "totalPixels": None,
            "differingPixels": None,
            "note": "image dimensions differ; no resampling is performed",
        }
        warnings.append("dimensions differ: reference %dx%d vs candidate %dx%d"
                        % (a_meta["width"], a_meta["height"], b_meta["width"], b_meta["height"]))
    else:
        w, h = a_meta["width"], a_meta["height"]
        stats = compare_rows(rows_a, rows_b, w, h, args.max_report)
        result["stats"] = stats
        result["pixelsIdentical"] = stats["differingPixels"] == 0
        if not args.no_cross_check:
            ca = cross_check(ref, rows_a)
            cb = cross_check(cand, rows_b)
            result["crossCheck"] = {"reference": ca, "candidate": cb}
            for name, c in (("reference", ca), ("candidate", cb)):
                if c.get("available") and c.get("agreement") == "no":
                    warnings.append("cross-decoder disagreement for %s: comparison result unreliable"
                                    % name)
        if args.diff and not result["pixelsIdentical"]:
            result["diffImage"] = write_diff_png(args.diff, rows_a, rows_b, w, h)

    result["verdict"] = (
        "PIXELS_IDENTICAL" if result["pixelsIdentical"]
        else "PIXELS_DIFFER" if result["pixelsIdentical"] is not None
        else "INCONCLUSIVE"
    )

    lines = []
    lines.append("verdict: %s" % result["verdict"])
    lines.append("reference: %s (%dx%d, %s, depth %d, %s, %d bytes)"
                 % (os.path.basename(args.reference), a_meta["width"], a_meta["height"],
                    a_meta["colorTypeName"], a_meta["bitDepth"], a_meta["interlaceName"], ref["bytes"]))
    lines.append("candidate: %s (%dx%d, %s, depth %d, %s, %d bytes)"
                 % (os.path.basename(args.candidate), b_meta["width"], b_meta["height"],
                    b_meta["colorTypeName"], b_meta["bitDepth"], b_meta["interlaceName"], cand["bytes"]))
    lines.append("file sha256 differ: %s" % (ref["sha256"] != cand["sha256"]))
    if result["stats"]:
        s = result["stats"]
        if s.get("totalPixels"):
            lines.append("pixels: total=%d differing=%d identical=%d (%.9f identical) rows_with_diffs=%d"
                         % (s["totalPixels"], s["differingPixels"], s["identicalPixels"],
                            s["identicalFraction"], s["rowsWithDifferences"]))
            lines.append("max per-channel delta (16-bit units) RGBA = %s" % (s["maxChannelDelta16"],))
            lines.append("difference bounding box = %s" % (s["boundingBox"],))
        else:
            lines.append("pixels: %s" % s.get("note"))
    for ex in (result["stats"] or {}).get("examples", []):
        lines.append("  example diff at (%d,%d): ref=%s cand=%s" % (ex["x"], ex["y"],
                     ex["referenceRGBA16"], ex["candidateRGBA16"]))
    for note in result["structuralNotes"]:
        lines.append("structural note: %s" % note)
    for name, c in result["crossCheck"].items():
        lines.append("cross-check %s: %s" % (name, c))
    for wmsg in warnings:
        lines.append("warning: %s" % wmsg)
    result["summaryLines"] = lines
    print("\n".join(lines))

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(result, fh, indent=2, ensure_ascii=False)
        print("json: %s" % os.path.abspath(args.json))

    return 0 if result["pixelsIdentical"] else (2 if result["pixelsIdentical"] is None else 1)


# --------------------------------------------------------------------------- #
# self test
# --------------------------------------------------------------------------- #
def _png_encode(path, w, h, rgb_rows, interlace=0, palette=None, extra_chunks=(), compresslevel=6):
    """Encode 8-bit RGB(A) rows into a PNG (test helper; supports Adam7)."""
    depth = 8
    ct = 3 if palette else 2
    ch = 1 if palette else 3
    raw = bytearray()
    passes = ADAM7 if interlace == 1 else [(0, 0, 1, 1)]
    for (x0, y0, dx, dy) in passes:
        pw = (w - x0 + dx - 1) // dx if w > x0 else 0
        ph = (h - y0 + dy - 1) // dy if h > y0 else 0
        for j in range(ph):
            raw.append(0)
            line = bytearray()
            for i in range(pw):
                px = rgb_rows[y0 + j * dy][x0 + i * dx]
                if palette:
                    line.append(px if isinstance(px, int) else px[0])
                else:
                    line += bytes(px[:3])
            raw += line

    def chunk(ctype, body):
        return struct.pack(">I", len(body)) + ctype + body + struct.pack(">I", zlib.crc32(ctype + body) & 0xFFFFFFFF)

    out = PNG_SIG
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, depth, ct, 0, 0, interlace))
    if palette:
        out += chunk(b"PLTE", palette)
    for ctype, body in extra_chunks:
        out += chunk(ctype, body)
    out += chunk(b"IDAT", zlib.compress(bytes(raw), compresslevel))
    out += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(out)
    return out


def selftest(args):
    d = os.path.abspath(args.dir)
    os.makedirs(d, exist_ok=True)
    w, h = 37, 23

    def pattern(x, y):
        # kept to <=256 distinct colours so the palette variant below stays valid
        return ((x % 4) * 85, (y % 4) * 85, ((x + y) % 4) * 85)

    base = [[pattern(x, y) for x in range(w)] for y in range(h)]
    changed = [row[:] for row in base]
    changed[5][9] = (1, 2, 3)
    changed[5][10] = (4, 5, 6)
    changed[20][36] = (7, 8, 9)

    paths = {}

    def p(name):
        pth = os.path.join(d, name)
        paths[name] = pth
        return pth

    # 1. plain, 2. recompressed with metadata + different filters-free stream
    _png_encode(p("base.png"), w, h, base, compresslevel=1)
    _png_encode(p("recompressed_meta.png"), w, h, base, compresslevel=9,
                extra_chunks=[(b"tEXt", b"Software\x00selftest"), (b"pHYs", struct.pack(">IIB", 2835, 2835, 1))])
    # 3. Adam7 interlaced, same pixels
    _png_encode(p("adam7.png"), w, h, base, interlace=1, compresslevel=6)
    # 4. palette version, same pixels (palette of the used colours)
    used = sorted({px for row in base for px in row})
    plte = b"".join(bytes(c) for c in used)
    index = {c: i for i, c in enumerate(used)}
    _png_encode(p("palette.png"), w, h, [[index[px] for px in row] for row in base], palette=plte)
    # 5. genuinely different pixels
    _png_encode(p("changed.png"), w, h, changed, compresslevel=6)

    script = os.path.abspath(__file__)
    cases = [
        ("base_vs_recompressed_meta", "base.png", "recompressed_meta.png", 0),
        ("base_vs_adam7", "base.png", "adam7.png", 0),
        ("base_vs_palette", "base.png", "palette.png", 0),
        ("base_vs_changed", "base.png", "changed.png", 1),
    ]
    out = {"dir": d, "cases": [], "allPassed": True}
    for name, a, b, expect in cases:
        rc = run(argparse.Namespace(
            reference=paths[a], candidate=paths[b], json=os.path.join(d, name + ".json"),
            diff=os.path.join(d, name + ".diff.png"), no_cross_check=getattr(args, "no_cross_check", False),
            max_report=25))
        ok = rc == expect
        out["cases"].append({"case": name, "reference": paths[a], "candidate": paths[b],
                             "expectedExit": expect, "actualExit": rc, "passed": ok})
        out["allPassed"] = out["allPassed"] and ok
        print("selftest case %-28s expected exit %d got %d -> %s"
              % (name, expect, rc, "PASS" if ok else "FAIL"))
    with open(os.path.join(d, "selftest_summary.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)
    print("selftest allPassed: %s" % out["allPassed"])
    print("selftest artifacts: %s" % d)
    return 0 if out["allPassed"] else 2


# --------------------------------------------------------------------------- #
def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Decode two PNGs and compare their pixel samples exactly.",
        epilog="Exit codes: 0 pixels identical, 1 pixels differ, 2 error/unsupported.")
    ap.add_argument("reference", nargs="?", help="reference PNG path")
    ap.add_argument("candidate", nargs="?", help="candidate PNG path")
    ap.add_argument("--json", help="write a machine-readable JSON report to this path")
    ap.add_argument("--diff", help="write a diff PNG (red = differing pixel) when differences exist")
    ap.add_argument("--max-report", type=int, default=10, help="max differing pixels listed in detail")
    ap.add_argument("--no-cross-check", action="store_true", help="skip the Pillow cross-check")
    ap.add_argument("--selftest", action="store_true", help="run built-in decoder self-tests")
    ap.add_argument("--dir", default="pixel_check_selftest", help="work dir for --selftest")
    args = ap.parse_args(argv)

    try:
        if args.selftest:
            return selftest(args)
        if not args.reference or not args.candidate:
            ap.error("reference and candidate PNG paths are required (or use --selftest)")
        return run(args)
    except PngError as exc:
        print("ERROR: %s" % exc, file=sys.stderr)
        return 2
    except FileNotFoundError as exc:
        print("ERROR: %s" % exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
