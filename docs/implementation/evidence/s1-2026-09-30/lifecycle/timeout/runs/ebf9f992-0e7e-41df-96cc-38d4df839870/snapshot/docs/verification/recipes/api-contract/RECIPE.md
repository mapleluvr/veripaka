---
schema: veripaka.recipe/v0
id: api-contract
title: Reject unsupported settings without writing state
summary: Check the HTTP boundary rather than a mock of input validation
kind: verification
status: trial
tags: [backend, api, boundary, settings]
applies: Use when the settings API or its input validation changes.
excludes: [Authentication, arbitrary request fuzzing, production deployment]
execution:
  mode: command
  commandRef: backend-tests
claims:
  - id: reject-invalid-theme
    required: true
    expected: Unsupported theme returns HTTP 400 and the stored theme remains light.
    source: docs/behavior.md
    judge: executable
    check:
      file: tests/settings.test.mjs
      name: api rejects unsupported theme without changing stored state
    evidence: [node-test-result]
---

## Intent and procedure

Use the original Node test in `tests/settings.test.mjs`. It starts the real service with a private temporary data directory, sends an invalid value through HTTP, checks the status and reads back persisted state. The production route, not a duplicate validation function, receives the request.

The project command also runs the persistence check. The plan explicitly determines which claims are required; discovering extra results must not change the plan.

## Failure handling and cleanup

A failing HTTP status/state assertion is a behavior failure. Missing runner evidence or failure to start the service is not proof of a product bug. The test closes its owned service and removes only its own temporary directory.

## False-pass traps and limits

Do not just assert a mock returned 400, or look for PASS in stdout. A successful process with no selected tests is not evidence. This does not establish authentication or deployed-service correctness.

## Qualification

Trial until actual records are captured. In an isolated copy, bypass the real route's invalid-theme rejection; this check must fail. Restore the service to obtain the corresponding normal result. Cold-session reuse is separate from one green run.
