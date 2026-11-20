# Stage 3 model card — two-hidden-unit synthetic MLP

## Model purpose
Educational binary classifier used to demonstrate neural forward propagation, backpropagation, validation monitoring, early stopping and checkpoint/resume.

## Architecture
Two numeric inputs → two tanh hidden units → one sigmoid probability output.

## Evaluation
A deterministic dataset split separates training, validation and test examples. The validation loss selects the best checkpoint; test metrics are computed only after training selection.

## Intended use
Learning and testing neural-network mechanics in a controlled environment.

## Prohibited use
Do not use the model or synthetic output for any real decision about a person.

## Limitations
The dataset is synthetic and tiny; the architecture is intentionally small; results do not establish generalization. No GPU, distributed training, mixed precision or production serving is claimed.

## Operational checklist for real systems
Use representative data, document provenance and consent, protect sensitive records, test subgroup performance, calibrate outputs, version model/data/code, preserve optimizer and RNG state, monitor drift and define rollback.
