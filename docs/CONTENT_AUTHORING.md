# Topic content authoring guide

This guide defines how to add a topic without weakening the Academy's learning standard.

## Contract files

- `content/topic.schema.json` is the machine-readable topic contract.
- `content/examples/attention-topic.json` is a complete, small reference record.
- `scripts/validate-topic-contract.mjs` validates the sample, verifies linked artifact paths and checks that an intentionally incomplete record is rejected.
- `npm run validate:topic-contract` runs the contract check locally and in CI.

## Required topic content

A topic record must include:

1. Stable topic identity, stage and realistic estimated duration.
2. Three or more observable learning outcomes, prerequisites and glossary.
3. The problem, beginner-friendly explanation, mental model and limitations.
4. A real use case with actors, inputs, constraints, outputs and a success metric.
5. An architecture/DFD reference, named components, explained data-flow edges, trust boundaries and failure paths.
6. A visual fixture with at least two traceable steps and accessibility notes.
7. A worked example with intermediate operations and expected output.
8. At least one runnable implementation and its test path.
9. Three or more topic-specific failure cases, each with symptom, root cause, recovery and regression test.
10. Guided, independent, real-world and expert practice.
11. A weighted assessment rubric that totals 100, a pass threshold and objective evidence.
12. At least two primary references with source type and date checked.

## Artifact layout

Keep artifacts close to their topic or in a clearly named shared topic directory. Paths in the topic record are repository-root-relative.

```text
content/
  topics/<topic-id>/
    lesson.json
    examples/
    tests/
    visual/
    fixtures/
    challenge/
```

The sample currently uses `content/examples/` to keep the first contract example compact. Do not interpret that sample path as a requirement that all future topics share one directory.

## State progression

Use the lowest state supported by evidence:

- `outline`: scope and learning outcomes exist.
- `explained`: concept explanation, glossary and use case are reviewed.
- `worked-example`: deterministic worked example and expected values exist.
- `runnable`: learner can run the reference implementation using documented commands.
- `tested`: automated tests pass against the declared fixture.
- `visualized`: diagram/visual steps use the same fixture and explain the transformations.
- `reviewed`: independent technical and instructional review completed.
- `pilot-validated`: beginner/target learner pilot evidence meets acceptance criteria.
- `mastered`: reserved for learner mastery evidence; never use this as a content-author status.

A state is an evidence claim, not a percentage-complete label.

## Quality and safety rules

- Keep the same fixture values in explanation, visual, implementation and tests. Add assertions for numeric outputs.
- Explain what a diagram arrow means; a diagram file by itself is not instruction.
- Do not copy generic filler into every topic. Explain the mechanism and limitations specific to the topic.
- Pin runtime/tool versions for reproducible code examples; record specification versions for protocol lessons.
- Never run arbitrary learner-submitted code inside the Academy web/API process. Learners use their own environment or a separately reviewed sandbox.
- Do not require paid APIs or cloud resources to complete a core lesson. Clearly label optional paid extensions.
- Use official documentation and foundational papers as references; record the date/version checked.
- Keep learner self-confidence separate from objective assessment and demonstrated mastery.

## Local validation

```bash
npm run validate:topic-contract
npm run validate:curriculum
npm run typecheck
npm run build
```

CI must run the topic contract validator before accepting curriculum changes. A deliberately incomplete record must fail validation; the complete reference record must pass.
