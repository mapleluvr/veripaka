# Frozen verification plan

Run: 2b9bc007-03f3-4430-97dd-c05c69e22f08
Subject: local-api (checkout)

- Does the API reject unsupported themes without changing state?: api-contract/reject-invalid-theme
- Does a successful settings write survive service restart?: settings-persistence/survives-restart
- Does the setting synchronize across devices?: uncovered: Not promised by the reference service and not verified by these methods.

Run this plan using the installed launcher. Read verdict, evidence and uncovered goals; exit code alone is insufficient.


## Intent and procedure

Use the original Node test in `tests/settings.test.mjs`. It starts the real service with a private temporary data directory, sends an invalid value through HTTP, checks the status and reads back persisted state. The production route, not a duplicate validation function, receives the request.

The project command also runs the persistence check. The plan explicitly determines which claims are required; discovering extra results must not change the plan.

## Failure handling and cleanup

A failing HTTP status/state assertion is a behavior failure. Missing runner evidence or failure to start the service is not proof of a product bug. The test closes its owned service and removes only its own temporary directory.

## False-pass traps and limits

Do not just assert a mock returned 400, or look for PASS in stdout. A successful process with no selected tests is not evidence. This does not establish authentication or deployed-service correctness.

## Qualification

Trial until actual records are captured. In an isolated copy, bypass the real route's invalid-theme rejection; this check must fail. Restore the service to obtain the corresponding normal result. Cold-session reuse is separate from one green run.



## Intent and procedure

Run the existing test, which starts the real HTTP service, sends a valid write, closes the service, restarts it against the same isolated data directory and reads settings through HTTP. Checking only the PUT response would miss a broken persistence implementation.

## Failure handling and cleanup

Report the expected and observed theme with the native assertion evidence. A test infrastructure error is inconclusive, not a guessed storage defect. Close the owned server and remove the private test directory in finally blocks.

## False-pass traps and limits

Do not seed the expected value after the write or test only an in-memory cache. The claim concerns this service and this data directory, not a remote deployment or all persistence failures.

## Qualification

Trial until actual records are captured. In a separate copy, remove the real file write while retaining the successful HTTP response; the restart check must reject that object. Retain normal and bad runs separately. Do not change the assertion to manufacture a failure.

