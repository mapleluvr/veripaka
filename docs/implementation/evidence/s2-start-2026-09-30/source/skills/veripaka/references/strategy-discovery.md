# Choosing and developing a test method

Use this when a task needs a testing strategy, not just another execution of a known test. These are conditional questions, not a schema to fill in. If a suitable method already answers the goal, use it without inventing an exploration ritual.

## Choose the observation for the claim

Ask what would have to be true for the user's claim to hold, and what the available observations could actually distinguish. Learn missing object facts with a cheap, safe probe when needed. A build can support buildability, not behavior; structure can support semantics, not every property of a rendered image; a successful write response does not establish durable storage.

Objects can have multiple relevant representations. Use the one that preserves the information the claim depends on, and combine independent observations when one is only a proxy. Do not quietly replace an unavailable observation with an easier, unrelated check.

## Prefer the smallest sufficient trustworthy tool

Before building a checker or decoder, inspect the available project tests, libraries and tools and exercise the relevant capability. Existing, verified components usually reduce both implementation work and the new correctness claims you would otherwise have to establish.

Implement missing glue rather than a new general-purpose engine. If an existing tool is insufficient, explain the observed limitation and keep the replacement's support range narrow. Portability or zero dependencies can matter, but they are not automatic reasons to rebuild working infrastructure for a bounded task. Tool count, code volume and impressive coverage lists are not evidence of useful agency.

## Establish the judgment, not just the measurement

Find an authorized expectation: a requirement, accepted reference, domain law, independent implementation or suitably defined statistical target. The current object's output is not automatically its own expected answer.

Distinguish what is measured from what it proves. For example, comparing decoded samples can answer a restricted image-equality question, not whether the entire product looks right. Display transforms, timing or environment differences may make that restricted comparison inappropriate. If the required oracle is unavailable, preserve the gap rather than invent a favorable threshold.

## Make validity failures change the outcome

Identify prerequisites for interpreting the measurement: valid input, successful acquisition, correct subject, supported representation and usable reference. If one fails, an otherwise convenient comparison must not produce a positive claim it no longer supports.

An independent checker that cannot decode or disagrees with the result is not merely decorative logging. Decide whether it invalidates this conclusion or narrows its scope, and make the actual result reflect that decision. Warning text beside an unconditional PASS is not fail-closed behavior.

## Challenge the method before preserving it

Try a valid normal case, a relevant changed behavior and, where important, a misleading proxy or an invalid/inapplicable input. Prefer checks with independent expectations; a generator and checker that share the same bug can make their own self-tests look convincing.

A useful method should discriminate rather than pass everything or reject everything. Check that harmless representational changes do not create false alarms and that a relevant change cannot hide outside a hard-coded sample region. Keep calibration results separate from later evaluation. Once a result shapes the method or this guidance, it is no longer untouched holdout evidence.

## Adjust or stop deliberately

Use observations to choose the next action, not to justify a preselected tool. A state may require an independent reader or a lifecycle boundary; a temporal property may require a sequence rather than a snapshot; a statistical claim may require a distribution rather than one sample. These are prompts to investigate applicability, not compulsory recipes.

Stop when the question has a sufficient supported answer, when more exploration would not change the decision, or when a necessary premise/permission cannot be obtained. Distinguish “this method does not apply” from “I cannot currently determine the answer.” Do not retry behavioral failures until one run looks good.

## Preserve only useful knowledge

Keep a short account of the goal, observed facts, chosen method and reason, required conditions, relevant material and remaining gaps. A reusable Recipe should retain why its observations and interventions matter, which parts can be adjusted, and when not to use it—not just the successful command sequence.

If the result is still exploratory or the checks fail calibration, retain it as a candidate with its failure, not as a qualified method. Do not create a Recipe solely to increase the library's size.
