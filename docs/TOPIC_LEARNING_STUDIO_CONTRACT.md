# Topic Learning Studio — Coverage and Implementation Contract

**Status:** target architecture for the 12-stage, 93-topic Academy  
**Canonical IDs:** `src/data/curriculum.ts`  
**Content contract:** `content/topic.schema.json`

## Product requirement

Every curriculum topic must open a topic-specific learning studio. It must not be enough to show a generic code workbench or a stage-wide simulator beside the lesson. The selected topic must determine the content, fixture, visual steps, controls, code, failure cases and assessment.

## Canonical topic registry

Use stable curriculum IDs as the only routing key. A registry entry should resolve:
- curriculum metadata and prerequisites;
- canonical lesson JSON and version;
- deep-dive guide and lab-pack section;
- runnable example and test command;
- visualizer kind and fixture;
- failure scenarios;
- practice ladder and rubric;
- primary references.

The registry must be generated or validated against the curriculum source. Avoid manually maintaining a second list of topic IDs.

## Runtime architecture

```text
Curriculum (93 stable topic IDs)
          |
          v
Topic Registry + Coverage Manifest
          |
          v
Topic Learning Studio (shared shell)
    |          |          |
    v          v          v
 Learn       Explore    Visualize
    |          |          |
    +----------+----------+
               |
       Same versioned fixture
               |
     +---------+----------+
     |         |          |
   Code      Failures   Assessment
     |         |          |
     +---------+----------+
               |
        Evidence + Reflection
```

### Component responsibilities

- `TopicLearningStudio`: tabs, progress, accessibility, error boundaries and consistent navigation.
- `TopicContentPanel`: beginner explanation, glossary, prerequisites, real use case and worked example.
- `TopicArchitectureView`: component/DFD/sequence/trust-boundary representation.
- `TopicVisualizerRenderer`: standard deterministic step schema with play/pause/step/reset/speed.
- `SpecializedVisualizerAdapter`: mount an existing bespoke simulator without duplicating the common shell.
- `TopicCodeLab`: source, language, pinned environment, fixture, expected output and run strategy.
- `TopicFailureLab`: inject a named failure and show symptom, trace, cause, fix and regression.
- `TopicPracticeLadder`: guided, independent, realistic and expert tasks.
- `TopicAssessment`: scenario questions, rubric and evidence submission.
- `TopicReflection`: readability, ease, confidence, visual usefulness and next action; never equate these with objective mastery.

## Visual step schema

Every standard visual step should include:
- `id`
- `title`
- `narration`
- `input`
- `transformation`
- `output`
- `visualState`
- optional `highlight`, `metrics`, `failure` and `sourceReference`

All steps in a visualization must use the same fixture as the worked example and automated test. A visual that invents a different result is a correctness defect.

## Playground behavior by concept family

| Concept family | Required controls | Visual output |
|---|---|---|
| Math/data | vector values, dimensions, seed, sample size | matrices, plots, shape and intermediate values |
| Classical ML | learning rate, threshold, depth, K, clusters, regularization | loss, decision boundary, split trace, cluster movement and metrics |
| Deep learning | weights, activations, batch, optimizer and learning rate | tensor shapes, forward graph, gradients, filters and sequence state |
| Transformers/LLMs | tokens, positions, Q/K/V, mask, temperature, top-K/top-P | token IDs, attention heatmap, residual flow and probability distribution |
| RAG | chunk size/overlap, retrieval mode, top-K, alpha, rerank | provenance, chunks, candidate ranks, citations and evidence |
| Agents | step budget, tool policy, memory, approval and retry | state machine, tool trace, checkpoint and stop reason |
| Protocols | version, capabilities, transport, identity and payload | request/response trace, negotiation, auth decision and lifecycle |
| Workflows | concurrency, retry, timeout, event order and compensation | DAG, queue, state transitions, DLQ and recovery |
| MLOps/DevOps | environment, rollout weight, replicas, health and budget | CI/CD pipeline, registry promotion, rollout and rollback |
| Security | attacker-controlled input, principal, tenant, scopes and policy | threat path, policy enforcement, denial and audit event |
| Production systems | arrival rate, concurrency, token sizes, memory and SLO | queueing, TTFT/latency, throughput, cache and capacity |
| Governance/capstone | policy, evidence, risk, approver and release criteria | provenance chain, decision record, release gate and audit |

## Execution modes

Every playground must declare its mode:
1. `simulation`: local deterministic calculation; safe default.
2. `local-code`: learner runs a downloaded project or notebook locally.
3. `hosted-sandbox`: only after an isolated execution service is designed and security-tested.
4. `external-service`: only after explicit provider configuration, secret handling, consent and quotas.

Do not silently switch modes. Do not imply that a simulation is a real cloud/model/vector database operation. Network access must be disabled by default in any future hosted runner.

## Accessibility and mobile

- Every animation has narration and a text-only sequence.
- Every control is keyboard operable and has an accessible name.
- Reduced-motion mode disables autoplay and replaces movement with state changes.
- No essential information is communicated by color alone.
- Visualizations fit narrow screens; large matrices can scroll inside their own labelled viewport.
- Provide reset and deterministic seeds so learners can reproduce the same state.

## Coverage validator

CI must enumerate all 93 curriculum topics and verify:
- exactly one registry entry per topic;
- no duplicate or orphan IDs;
- valid JSON against the topic schema;
- visual steps and fixture exist for every topic;
- a diagram/architecture view exists or an explicit `not-applicable` rationale is supplied;
- a code/example strategy exists (runnable, local notebook, or documented conceptual-only exception);
- at least three failure cases exist where meaningful, or an approved exception explains why not;
- practice ladder, rubric and references exist;
- visual output, worked example and tests agree on expected values;
- all links resolve and package versions are pinned.

The validator should produce a per-stage table and per-topic missing-artifact report. It should not mark a topic as mastered; mastery requires learner evidence.

## Delivery rule

Migrate in small stage batches. Keep the existing bespoke visualizers and route them through adapters. Do not replace them with generic animations. Start with a representative topic from each concept family, validate the shared schema and renderer, then migrate the remaining topics with topic-specific fixtures and tests.
