---
schema: veripaka.recipe/v0
id: settings-persistence
title: Settings survive a real service restart
summary: Detect successful write responses that do not persist the setting
kind: verification
status: trial
tags: [backend, persistence, settings, restart]
applies: Use when the settings write path or persistent storage changes.
excludes: [Cross-device synchronization, crash consistency, distributed writes]
execution:
  mode: command
  commandRef: backend-tests
claims:
  - id: survives-restart
    required: true
    expected: A successful dark-theme write is returned by GET after restarting the service with the same private data directory.
    source: docs/behavior.md
    judge: executable
    check:
      file: tests/settings.test.mjs
      name: settings survive service restart
    evidence: [node-test-result]
---

## Intent and procedure

Run the existing test, which starts the real HTTP service, sends a valid write, closes the service, restarts it against the same isolated data directory and reads settings through HTTP. Checking only the PUT response would miss a broken persistence implementation.

## Failure handling and cleanup

Report the expected and observed theme with the native assertion evidence. A test infrastructure error is inconclusive, not a guessed storage defect. Close the owned server and remove the private test directory in finally blocks.

## False-pass traps and limits

Do not seed the expected value after the write or test only an in-memory cache. The claim concerns this service and this data directory, not a remote deployment or all persistence failures.

## Qualification

Trial until actual records are captured. In a separate copy, remove the real file write while retaining the successful HTTP response; the restart check must reject that object. Retain normal and bad runs separately. Do not change the assertion to manufacture a failure.
