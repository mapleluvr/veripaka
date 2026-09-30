# Evaluator setup issues retained with the pilot

This is a retrospective incident note, not a preregistered protocol.

## R1 — preparation failure did not halt launch

The intended new equivalent-input control used Pillow adaptive palette conversion with 256 colors. The original image has more than 256 distinct colors (585 observed), so this transformation was not lossless. The setup's `ImageChops.difference(...).getbbox() is None` assertion correctly failed.

The ad-hoc shell command lacked `set -e`, continued after Python exited nonzero, and launched the R1 model session. Consequently there is no completed R1 `registered-cases.json`, and R1 MUST NOT count as a preregistered independent-holdout evaluation. `r1/private/palette-identical.png` retains the misleading original filename as failure evidence; it is NOT an identical-pixel control. No timestamp or registration was backfilled.

The method-generation session itself is retained. Its input images, task and installed Skill were frozen; tool logs show the strategy reference was not consumed. No benefit is attributed to the guidance.

## R2 — fail-fast caught an exception-classification mistake

The next setup used `set -e` and an opaque-RGBA equivalent control instead of quantization. Pillow's `verify()` raised `OSError: truncated PNG file` for the missing-IEND control, while the initial setup caught only `SyntaxError`. The shell stopped BEFORE model launch. The expected validator exception handling was corrected to accept OSError or SyntaxError, files were independently checked, and registration completed before the one R2 model call. This was not a rerun of a failed model sample.

## Interpretation of the strict integrity control

The registration requested refusal for missing IEND. R2 instead reported identical decoded samples because Pillow `load()` tolerates that container truncation. It fails a strict complete-PNG reference gate, but its narrower declared decoded-sample equality may remain true. Report this distinction, rather than silently adding a new user requirement or marking all sample comparisons wrong.

Future experiment setup must fail before a model call when fixture preconditions or registration fail. Changing these prepared samples does not repair R1's missing preregistration retroactively.
