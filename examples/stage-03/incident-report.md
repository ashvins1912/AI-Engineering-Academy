# Stage 3 training failure incident report

## Injected failure
A training run continues updating weights after validation loss has stopped improving and returns the final epoch.

## Symptom
Training loss keeps decreasing while validation loss worsens; the final checkpoint performs worse than an earlier epoch.

## Root cause
The loop tracks training progress but does not preserve the best validation checkpoint or apply a patience rule.

## Resolution
Track best validation loss and epoch, save the model state when improved, increment patience otherwise, stop at the configured limit and restore the best weights before test evaluation.

## Prevention
Keep test data out of checkpoint selection, preserve optimizer/scheduler/RNG state for real resume workflows and test resume equivalence.
