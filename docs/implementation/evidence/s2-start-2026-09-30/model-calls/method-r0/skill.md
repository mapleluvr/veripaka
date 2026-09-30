---
name: veripaka
description: Find, author, and apply project-local verification recipes with frozen scope, actual test evidence, and explicit uncovered questions.
---

# Veripaka

Use the package-local launcher: `node <this-skill-directory>/../_shared/run-veripaka.mjs <arguments>`. Resolve it relative to this installed SKILL.md, not the current project directory and not a global binary. Pass `--project <absolute-project-directory>` if needed. Commands return JSON; read it rather than parsing log colors.

## Apply an existing method

1. Read the project's `docs/verification/README.md` (or its explicit corpusRoot in `.veripaka/config.json`). Run `find <task words> --json`, then `recipe show <id> --json` only for relevant methods.
2. Read the project's question-to-claim input file. Choose methods that answer the actual question. Keep uncovered questions; typecheck/build is not a substitute for a behavior claim.
3. Run `apply <recipe-or-profile> --input <project-relative-input-file> --json`. It only prepares a frozen plan. If a prerequisite is missing, report that gap rather than enabling arbitrary commands.
4. Run `run <runId> --json`. Command execution automatically captures and finalizes. If a tool wrapper truncates output, inspect the indicated local result file; do not guess its contents.
5. Report `kind`, `verdict`, `verdictBasis`, individual failed/inconclusive checks and uncovered goals. Exit 0 alone does not mean the user's whole task passed. State the subject scope.

To stop an active command, use `run cancel <runId> --json`. Exit 3 with `cancellation-requested` is only an acknowledgement; wait for the original run's terminal result and inspect cleanup. Do not force-kill the CLI or remove its lock to manufacture completion.

Source, tests, methods or inputs changed? Apply a new plan. Never edit plan/result JSON, fabricate invocation IDs, import a hand-written PASS as execution evidence, or silently change a required check.

## Author a method

Use `init` and `recipe new <id>` for non-overwriting scaffolds. The result is a draft, not a working test. Reuse existing framework tests; define an observable expectation with a project source, a stable test file/name and required evidence. Complete the body with procedure, cleanup and false-pass traps. Explicit project command enablement remains a separate authorized action. Run lint, then try normal and relevant faulty objects before claiming reusable maturity.

## Boundaries

S1 runs only local checkout + command + verification + executable Node-test checks. Guided, visual and investigation execution are unsupported; stop with the returned reason. Logs, screenshots, file existence and model explanations are not executable evidence. Refinement creates a proposal/draft, never silently changes thresholds or approvals.
