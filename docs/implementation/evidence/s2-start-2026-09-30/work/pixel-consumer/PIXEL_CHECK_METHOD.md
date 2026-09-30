# PNG pixel-equality check for reference.png vs candidate.png

Scope: does the **rendered pixel content** of the two PNG files match exactly?
File size, file hash, chunk layout and compression settings are explicitly **not**
used as evidence of rendering equality; they are only reported as context.

## Tool

`png_pixel_compare.py` — pure Python standard library (Pillow used only as an
optional independent cross-check; the verdict does not depend on it).

Method: parse PNG chunks (+CRC), zlib-decompress IDAT, reverse scanline filters,
decode to a canonical 16-bit-per-channel RGBA sample grid (palette, tRNS,
sub-byte depths, 16-bit big-endian, Adam7 all handled), then compare samples
exactly pixel by pixel.

## Reusable commands

```powershell
# real check (exit 0 = identical, 1 = differ, 2 = error/unsupported)
python png_pixel_compare.py reference.png candidate.png --json pixel_compare_result.json --diff pixel_compare_diff.png --max-report 5

# works with any two paths, e.g. another render
python png_pixel_compare.py <reference.png> <candidate.png> --json out.json --diff out.diff.png

# decoder self-tests (recompression / Adam7 / palette / real diff fixtures)
python png_pixel_compare.py --selftest --dir pixel_check_selftest
```

## Verdict for this task: PIXELS_DIFFER

| item | reference.png | candidate.png |
|---|---|---|
| dimensions | 380x250 | 380x250 |
| color type / depth / interlace | truecolor / 8 / none | truecolor / 8 / none |
| file bytes | 6323 | 4128 |
| file sha256 | 6de6d712…390409 | a8f0e5b6…964f41 |
| chunk types | IHDR, IDAT x3, IEND | IHDR, IDAT x2, IEND |

Measurements (decoded RGBA16 samples, both decoders agreeing):

* total pixels 95000, differing 9491, identical 85509 (0.900094737)
* rows containing differences: 48 (y = 108..155)
* difference bounding box: x 44..243, y 108..155 (200x48); **zero** differences outside it
* max per-channel |delta| in 16-bit units: R 59881, G 32639, B 50115, A 0 (alpha never differs)
* 228 RGBA colors exist only in reference.png; 0 colors exist only in candidate.png
  → candidate is not an anti-aliasing/tolerance variant; it is missing content
* every differing pixel is reference=<some color> vs candidate=(65535,65535,65535,65535)
* candidate's whole rect x44..243,y108..155 is pure white; the 9491 non-white
  reference pixels inside that rect are exactly the 9491 differences
* therefore candidate == reference rendered with that 200x48 rectangle painted white

Evidence files: `pixel_compare_result.json` (machine-readable), `pixel_compare_diff.png`
(red = differing pixel, grey = matching pixel, independently re-decoded as a valid
PNG with 9491 red pixels), `pixel_compare_run.log`, `pixel_check_selftest.log`,
`pixel_check_selftest/` (decoder calibration fixtures + `selftest_summary.json`,
allPassed = true).

## What this supports

* The two files do **not** decode to the same pixels; the difference is localized
  to a 200x48 rectangle and is a uniform white overwrite of content.
* The comparison mechanism itself is trustworthy here: my decoder and Pillow agree
  on every pixel of both files (0 mismatches), all chunk CRCs are valid, the run is
  deterministic and symmetric (swapping the two paths gives the same count), and a
  file compared with itself reports 0 differences.

## What this does NOT support

* No statement about the product, the page, or the UI being correct: two equal or
  unequal files do not establish that a rendered page is acceptable.
* No statement about **why**: no DOM, CSS, layout, font or browser data is used.
  The "white rectangle" description is a measured pixel pattern, not a diagnosed cause.
* No color management: iCCP/gAMA/cHRM/sRGB would be recorded but never applied; a
  profile-only difference would be reported as identical.
* No resampling: differing dimensions would be reported as a difference, not scaled.
* Only the default frame of an APNG would be compared.
* Only these two files at these paths were measured; nothing was captured from a browser.
* The model's own image-viewing channel was not used or verified at any point.

Files under this directory were created by this check; `reference.png`,
`candidate.png`, `node_modules/` and anything outside this directory were not modified.
