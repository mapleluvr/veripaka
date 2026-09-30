# Pixel-equality check: reference.png vs candidate.png

Status: **measurement record for a reusable checker.** This is a capability
construction + execution record, not a product acceptance result. No Veripaka
run was created. No approval is implied.

## What was checked

Question: do `reference.png` and `candidate.png` have identical **rendered
pixels**, treating PNG compression/metadata differences as non-differences?

Approach: a local, non-model, deterministic checker that decodes both PNGs with
an independent image library (Pillow, default libpng/zlib decoder) and compares
the decoded pixel samples exactly. File bytes/hashes are recorded only as
provenance, never as the verdict.

- Script: `check_pixels.py` (Pillow; numpy used if present, pure-PIL fallback)
- Diff visualization: `diff_reference_vs_candidate.png`
- Machine-readable result: `result_reference_vs_candidate.json`

## Reusable invocation

Any two image paths (not just these files):

```
python check_pixels.py REFERENCE CANDIDATE --json-out RESULT.json --diff-out DIFF.png
```

Concrete run for this task:

```
python check_pixels.py reference.png candidate.png \
  --json-out result_reference_vs_candidate.json \
  --diff-out diff_reference_vs_candidate.png
```

Stable exit-code contract for reuse in scripts:

- `0` decoded pixels identical
- `1` decoded pixels differ
- `2` incomparable (size/frame mismatch, unreadable file, unsupported format)

`--quiet` suppresses stdout (JSON still written with `--json-out`), so the
result can be consumed purely by exit code.

## Actual measured result

Verdict: **different** (exit 1). Decoded dimensions and mode match, so the
comparison is valid rather than incomparable.

| Field | reference.png | candidate.png |
|---|---|---|
| bytes (sha256) | 6323 `6de6d712…390409` | 4128 `a8f0e5b6…0d964f41` |
| format / mode / size | PNG / RGB / 380×250 | PNG / RGB / 380×250 |
| frames / animation | 1 / false | 1 / false |
| PNG ancillary metadata keys | none | none |

Comparison (basis RGBA8 after mode normalization, exact tolerance 0):

- total pixels: 95,000
- differing pixels: **9,491** (9.99% of pixels)
- differing channel samples: **28,114** (R 9,343 / G 9,415 / B 9,356 / A 0)
- max absolute channel delta: **233**; mean absolute channel delta: 13.16
- per-channel max delta: R 233, G 127, B 195, A 0
- alpha differs nowhere; difference is **not** alpha-only
- diff bounding box (x, y, w, h): **44, 108, 200, 48** — a localized ~200×48 region
- no fully transparent pixels present

Conclusion supported: the two files do **not** have identical rendered pixels.
The difference is localized, large in magnitude (max delta 233/255), and
alpha-independent, i.e. a real color/content change in that band, not a
compression or metadata artifact.

## Negative controls actually executed (checker behaves as claimed)

Each fixture was generated from `reference.png`, compared, then deleted; the
inputs were never modified (hashes above, mtimes unchanged at 04:07:05).

| Control | File bytes differ? | Expected | Observed |
|---|---|---|---|
| re-encoded, `compress_level=9, optimize=True` | yes | identical | exit 0 |
| re-encoded with tEXt `PngInfo` metadata | yes | identical | exit 0 |
| re-encoded with tEXt (Comment/Software) | yes | identical | exit 0 |
| saved interlaced (Adam7) | yes | identical | exit 0 |
| lossy quantize to 64 colors | yes | different | exit 1 (1,588 px, max Δ53) |
| single-pixel +1 change in R at (0,0) | yes | different | exit 1 |
| resize to 10×10 | yes | incomparable | exit 2 |
| 4-color synthetic RGB → lossless palette | yes | identical | exit 0 |
| 4-color synthetic → RGB `compress_level=0` | yes | identical | exit 0 |

Note on the 64-color and 256-color palette fixtures: this image has 585
distinct colors, so those conversions are genuinely lossy (585→64 and 585→256)
and exit 1 is correct, not a false positive. Lossless palette handling was
therefore verified on a synthetic 4-color image, where it exits 0 as expected.
A side effect: the checker would flag a lossy palette/quantization change as a
pixel difference, which is the intended semantics ("rendered pixels differ").

### Independent cross-tool corroboration

Decoded independently with `ffmpeg -pix_fmt rgb24` and compared the raw
285,000-byte streams: reference vs the recompressed control were byte-identical,
and reference vs candidate differed in exactly **28,114 bytes** — the same
sample count as the Pillow path. Two independent decoders agree.

## Material paths

- `reference.png`, `candidate.png` — the two inputs (unmodified)
- `check_pixels.py` — the reusable checker
- `result_reference_vs_candidate.json` — full JSON result for this run
- `diff_reference_vs_candidate.png` — gray reference with differing pixels in red

## What this check supports

- An exact, reproducible yes/no on whether two given image files decode to the
  same pixel matrix, ignoring PNG byte-level/compression/metadata differences.
- Localizing and quantifying any difference (counts, per-channel deltas, bbox).
- Reuse for other image path pairs via the same command and exit codes.
- Reuse for CI-style gating of decoded-output equality (exit codes are stable).

## What this check does NOT support

- It does not re-render any page, DOM, or application. It says nothing about
  the browser/canvas/rasterizer that produced either file.
- It is not evidence that either image is **correct**, current, or the intended
  output. A difference here is not automatically a bug, and a pass is not
  correctness.
- It does not establish that the real rendering pipeline is deterministic; it
  characterizes only these two concrete artifacts.
- Color management is decoder-dependent: no ICC/color-profile transform, HDR,
  gamma-chunk, or 16-bit downconversion semantics are modeled. Interlaced decode
  was smoke-tested but is not exhaustively covered.
- It is exact-only (tolerance 0). Near-matches are not passable by this checker;
  use the reported delta statistics to judge closeness separately.
- No conclusion about product acceptance, no Veripaka run/verdict, and no claim
  beyond the two files examined.
