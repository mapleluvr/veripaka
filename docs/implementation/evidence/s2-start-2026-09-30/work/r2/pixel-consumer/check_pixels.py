#!/usr/bin/env python3
"""check_pixels.py - decoded-pixel equality checker for two image files.

Purpose: decide whether two images have identical *rendered pixels*, ignoring
PNG compression choices, chunk layout and ancillary metadata. It does NOT treat
file bytes/hashes as evidence, and it does NOT render anything.

Usage:
    python check_pixels.py REFERENCE CANDIDATE [options]

Options:
    --json-out PATH   also write the machine-readable result JSON to PATH
    --diff-out PATH   write an amplification/diff visualization PNG (needs Pillow)
    --quiet           do not print the JSON result to stdout

Exit codes (stable contract for reuse):
    0  decoded pixels are identical
    1  decoded pixels differ
    2  incomparable (size/mode mismatch, unreadable file, missing dependency)

Dependencies: Pillow (required), numpy (optional; pure-PIL fallback exists).
Scope limits are stated in the "limits" field of the emitted result and should
be reproduced verbatim when reporting a conclusion.
"""

import argparse
import hashlib
import json
import sys

LIMITS = [
    "Compares decoded pixel samples of the two given files only; it does not "
    "re-render any page, DOM, or application.",
    "Byte-level differences (PNG compression, chunk order, metadata/tEXt/"
    "timestamps, EXIF) are deliberately ignored and are NOT rendering diffs.",
    "A pass means the two files decode to the same pixel matrix. It is not "
    "evidence that either image is correct, current, or the intended output.",
    "A pass does not establish that the real rendering pipeline is "
    "deterministic; it only characterizes these two artifacts.",
    "Decoder-dependent behavior (color profiles, gamma chunks, 16-bit "
    "downconversion, palette/alpha normalization) can affect the comparison; "
    "HDR/ICC transforms and interlaced edge cases are not covered.",
    "No tolerance is applied: any single differing channel sample fails the "
    "exact check (use the reported delta statistics to judge near-matches).",
]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def describe(path):
    from PIL import Image

    with Image.open(path) as im:
        im.load()
        info = {
            "path": path,
            "sha256": sha256_file(path),
            "format": im.format,
            "mode": im.mode,
            "size": [im.size[0], im.size[1]],
            "frames": getattr(im, "n_frames", 1),
            "animation": bool(getattr(im, "is_animated", False)),
            "png_info_keys": sorted(im.info.keys()),
        }
        return info, im.copy()


def compare(ref_path, cand_path):
    from PIL import Image

    result = {
        "check": "decoded-pixel-equality",
        "checker": "check_pixels.py",
        "tolerance": "none (exact per-sample)",
        "limits": LIMITS,
    }

    ref_info, ref_im = describe(ref_path)
    cand_info, cand_im = describe(cand_path)
    try:
        from PIL import __version__ as pillow_version
    except Exception:
        pillow_version = "unknown"
    try:
        import numpy
        np_version = numpy.__version__
    except Exception:
        numpy = None
        np_version = None
    result["environment"] = {"pillow": pillow_version, "numpy": np_version}

    result["reference"] = ref_info
    result["candidate"] = cand_info
    result["dimensionsMatch"] = ref_info["size"] == cand_info["size"]
    result["modeMatch"] = ref_info["mode"] == cand_info["mode"]
    result["bytesIdentical"] = ref_info["sha256"] == cand_info["sha256"]
    result["frameCountMatch"] = ref_info["frames"] == cand_info["frames"]

    def incomparable(reason):
        result["comparable"] = False
        result["reason"] = reason
        result["verdict"] = "incomparable"
        result["identicalPixels"] = None
        return result

    if not result["dimensionsMatch"]:
        return incomparable("dimensions differ: %s vs %s" % (
            ref_info["size"], cand_info["size"]))
    if not result["frameCountMatch"]:
        return incomparable("frame count differs (animated/multi-page input)")

    # Normalize to a comparable channel basis: prefer RGBA8, which is lossless
    # for L/RGB/RGBA/P sources. Palette images are expanded, which can change
    # the *file* representation but not the visible color samples.
    ref_rgba = ref_im.convert("RGBA")
    cand_rgba = cand_im.convert("RGBA")
    result["comparedBasis"] = "RGBA8 after per-image mode normalization"

    if np_version is not None:
        import numpy

        a = numpy.asarray(ref_rgba, dtype=numpy.int16)
        b = numpy.asarray(cand_rgba, dtype=numpy.int16)
        delta = numpy.abs(a - b)
        per_pixel = delta.max(axis=2)
        diff_mask = per_pixel > 0
        differing = int(diff_mask.sum())
        total = int(diff_mask.size)
        result["totalPixels"] = total
        result["differingPixels"] = differing
        result["differingPixelFraction"] = (differing / total) if total else 0.0
        result["differingSamples"] = int((delta > 0).sum())
        result["maxAbsChannelDelta"] = int(delta.max())
        result["meanAbsChannelDelta"] = float(delta.mean())
        result["perChannelMaxDelta"] = {
            name: int(delta[:, :, i].max())
            for i, name in enumerate(["R", "G", "B", "A"])
        }
        result["perChannelDifferingSamples"] = {
            name: int((delta[:, :, i] > 0).sum())
            for i, name in enumerate(["R", "G", "B", "A"])
        }
        bbox = None
        if differing:
            ys, xs = numpy.nonzero(diff_mask)
            bbox = [int(xs.min()), int(ys.min()),
                    int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
        result["diffBoundingBox_xywh"] = bbox
        result["hasFullyTransparentPixels"] = bool(
            (numpy.asarray(ref_rgba)[:, :, 3] == 0).any()
            or (numpy.asarray(cand_rgba)[:, :, 3] == 0).any())
        alpha_only_difference = bool(
            differing and (delta[:, :, :3].max() == 0))
        result["differenceIsAlphaOnly"] = alpha_only_difference
    else:
        a = ref_rgba.tobytes()
        b = cand_rgba.tobytes()
        if a == b:
            differing = 0
            total = ref_info["size"][0] * ref_info["size"][1]
            max_delta = 0
            bbox = None
        else:
            pa = ref_rgba.getdata()
            pb = cand_rgba.getdata()
            differing = 0
            max_delta = 0
            total = 0
            xs, ys = [], []
            w = ref_info["size"][0]
            for idx, (ca, cb) in enumerate(zip(pa, pb)):
                total += 1
                d = max(abs(ca[k] - cb[k]) for k in range(4))
                if d:
                    differing += 1
                    max_delta = max(max_delta, d)
                    xs.append(idx % w)
                    ys.append(idx // w)
            bbox = ([min(xs), min(ys), max(xs) - min(xs) + 1,
                     max(ys) - min(ys) + 1] if differing else None)
            result["differingSamples"] = None
            result["meanAbsChannelDelta"] = None
            result["perChannelMaxDelta"] = None
            result["perChannelDifferingSamples"] = None
        result["totalPixels"] = total
        result["differingPixels"] = differing
        result["differingPixelFraction"] = (differing / total) if total else 0.0
        result["maxAbsChannelDelta"] = max_delta
        result["diffBoundingBox_xywh"] = bbox
        result["differenceIsAlphaOnly"] = None
        result["hasFullyTransparentPixels"] = None

    result["comparable"] = True
    result["identicalPixels"] = differing == 0
    result["verdict"] = "identical" if differing == 0 else "different"
    return result


def write_diff(ref_path, cand_path, out_path):
    """Write a visualization: amplified absolute difference, red on gray."""
    from PIL import Image, ImageChops

    with Image.open(ref_path) as r, Image.open(cand_path) as c:
        a = r.convert("RGB")
        b = c.convert("RGB")
        if a.size != b.size:
            raise ValueError("cannot diff images of different sizes")
        diff = ImageChops.difference(a, b)
        gray = a.convert("L")
        vis = Image.merge("RGB", (gray, gray, gray))
        mask = diff.convert("L").point(lambda v: 255 if v else 0)
        red = Image.new("RGB", a.size, (255, 0, 0))
        vis.paste(red, (0, 0), mask)
        vis.save(out_path)


def main(argv):
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("reference")
    ap.add_argument("candidate")
    ap.add_argument("--json-out")
    ap.add_argument("--diff-out")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    try:
        result = compare(args.reference, args.candidate)
    except FileNotFoundError as exc:
        print(json.dumps({"verdict": "incomparable", "reason": str(exc),
                          "limits": LIMITS}, indent=2))
        return 2
    except Exception as exc:  # unreadable / unsupported image, missing Pillow
        print(json.dumps({"verdict": "incomparable",
                          "reason": "%s: %s" % (type(exc).__name__, exc),
                          "limits": LIMITS}, indent=2))
        return 2

    if args.diff_out and result.get("comparable"):
        try:
            write_diff(args.reference, args.candidate, args.diff_out)
            result["diffImage"] = args.diff_out
        except Exception as exc:
            result["diffImageError"] = "%s: %s" % (type(exc).__name__, exc)

    text = json.dumps(result, indent=2)
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")
    if not args.quiet:
        print(text)

    if not result.get("comparable", False):
        return 2
    return 0 if result["identicalPixels"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
