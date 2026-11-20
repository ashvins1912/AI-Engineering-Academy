# Topic content contract

The machine-readable contract lives in [`content/topic.schema.json`](../content/topic.schema.json). A complete example is in [`content/examples/attention-topic.json`](../content/examples/attention-topic.json), with its runnable fixture, implementation, test and diagram beside it.

## Authoring rules

- Create one topic artifact per curriculum topic. Keep the stable curriculum topic ID in `topic.id`.
- Explain the concept in plain language before introducing framework terminology.
- Use a real scenario with actors, inputs, constraints, outputs and a measurable success metric.
- Keep the architecture diagram, visual walkthrough, worked example and code tied to the same deterministic fixture.
- Include at least three topic-specific failures. Each must include symptom, root cause, recovery and a regression test.
- Include guided, independent, realistic and expert-level practice.
- Make assessment evidence observable. Self-reported confidence is not proof of mastery.
- Pin primary references to the version used and record when they were checked.
- Do not claim a topic is `tested`, `reviewed`, `pilot-validated` or `mastered` until its corresponding evidence exists.

## Topic lifecycle

| State | Minimum evidence |
|---|---|
| `outline` | Topic intent, outcomes and prerequisites are defined |
| `explained` | Plain-language explanation, mental model and use case exist |
| `worked-example` | Reproducible input, intermediate steps and expected output exist |
| `runnable` | Implementation and run command work in a clean environment |
| `tested` | Automated tests and failure/regression cases pass |
| `visualized` | Diagram/visual uses the same fixture and has an accessible text explanation |
| `reviewed` | Technical and instructional review completed |
| `pilot-validated` | Learner pilot evidence meets the agreed quality gates |
| `mastered` | Reserved for learner mastery records; never a content-author shortcut |

States describe the furthest evidence-backed milestone, not a percentage-complete estimate.

## Validation

Run:

```bash
npm run validate:topic-contract
python -m unittest discover -s content/examples/tests -v
python content/examples/attention.py
```

The validator checks the example against required fields, minimum content, enumerations, artifact paths, assessment weight totals and a deliberately incomplete negative fixture. It does not yet migrate or certify all existing 84 lessons; that migration is deliberately staged so legacy content remains usable while it is upgraded.

## Compatibility and migration

The existing `src/data/curriculum.ts` lesson model remains the live application source during Phase 0. New canonical topic artifacts adopt this contract. Stage migrations will progressively replace generic lesson fallbacks with topic-specific content and will not mark legacy topics as compliant until their own evidence passes validation.
