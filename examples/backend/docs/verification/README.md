# Backend verification

This local reference project has two trial methods and one `backend` profile. Start with `find settings` or `recipe show <id>`, using the installed Veripaka Skill launcher.

The question mapping is in `verification-input.json`. Use `apply backend --input verification-input.json`, then `run <returned-run-id>`. The command invokes the existing Node tests against the real source with private data directories and dynamic loopback ports.

Read the scoped verdict, per-claim evidence and uncovered questions. Cross-device synchronization is intentionally not verified. Do not edit a frozen plan; source or method changes require a new plan. Do not mark these trial methods reusable merely because a run is green.
