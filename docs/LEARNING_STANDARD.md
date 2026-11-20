# Mandatory lesson standard

Every lesson must include all of these sections, with depth appropriate to the topic:

1. Learning outcomes and prerequisite map.
2. Intuition from zero, analogy and motivation.
3. Vocabulary and mental model.
4. Architecture/data-flow diagram with explained components.
5. Step-by-step execution visualization.
6. Numerical or concrete worked example.
7. Equations/protocol details and intermediate values where applicable.
8. Implementation from scratch.
9. Framework/tool implementation and what it abstracts.
10. Production design: security, reliability, scalability and cost.
11. Failure modes and debugging lab.
12. Guided exercise, independent assignment and challenge.
13. Interview questions and system-design scenario.
14. Assessment rubric and mastery evidence.
15. Further reading with versioned primary references.

A lesson is not complete if it is only prose, a list of definitions, a copied diagram or a framework quickstart.

## Mastery evidence
Track separate evidence for conceptual explanation, calculation/reasoning, implementation, debugging and applied design. Completion is not equivalent to mastery.

## Interactive implementation workbench requirement

Every lesson detail view must expose a guided practice workbench in addition to its conceptual notes. The workbench must include:

1. An interactive, step-selectable workflow based on the lesson's own workflow sequence.
2. Local environment setup commands that create an isolated Python environment and install only the lesson-track packages required by the example.
3. A copyable starter implementation with a clear run command and expected observation.
4. Debugging prompts that deliberately target likely shape, data, protocol, security or operational failures for the topic.
5. A production checklist appropriate to the stage, including validation, authorization, reliability, observability, resource limits and cost where relevant.
6. Official primary documentation links for the relevant technical ecosystem.
7. An independent practice submission and explicit completion criteria.

The Academy website itself must not execute arbitrary learner code. Code is copied into a learner-controlled local environment or notebook. Interactive visualizations may remain deterministic browser-side teaching simulations and must label simplifications honestly.

A starter snippet is a launch point, not a substitute for the full assignment. Topic-specific lessons should progressively add implementation-from-scratch, framework-assisted implementation, tests, failure injection and production design.
