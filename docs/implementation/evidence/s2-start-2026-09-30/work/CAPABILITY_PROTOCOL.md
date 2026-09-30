# S2 input capability characterization — v1

This is a bounded capability probe, not S2 method-discovery acceptance. The parent generated the two arbitrary rendered image fixtures and knows their answers. Private truth is outside the consumer; the model is given only images and the public task. These images may not later be called independent method-evaluation holdouts.

Frozen inputs per attempt: scripts/pi-smoke.mjs (current), capability-task.txt, installed Skill, two image digests, installed package. Actual commands and bytes are recorded. Node v24.15.0; installed Pi v0.99.1 (different from historical S1).

Success for this narrow probe requires actual read calls to both PNGs, image results, no forbidden tool calls/other-file reads, and exact code/shape/color agreement on both images. A textual self-claim or process exit is insufficient. Read/vision inability is a capability result, not a transient access failure.

Retry policy for this pilot, fixed before the first model call: keep Pi's observed native provider retry events and all errors. The outer harness never silently replays. On clearly transient upstream access/transport failures only, the parent may make up to 12 additional attempts with the exact same model and frozen inputs, backoff 10/20/40/60 seconds then 60 seconds, each in a unique attempt directory. Do not retry wrong answers or inability until green. If tools already ran or execution was interrupted, inspect the read-only calls/files and cleanup before a new attempt; preserve partial and failed samples. Persistent failure is a blocker, not permission to switch model. No pending child model process may be ignored.

No synthetic CLI contract-test result counts as a real model sample. Changes to the prompt or strategy begin a different revision and invalidate any claim of untouched holdout status for consumed results.
