# Stage 4 causal-generation failure report

## Injected failure
The attention mask is accidentally made fully visible, allowing a position to attend to future tokens during next-token training.

## Symptom
Changing a future token changes an earlier position's attention output and leaks target information.

## Resolution
Construct a lower-triangular causal mask and apply it to attention logits before softmax. The test suite asserts future positions are blocked and their normalized weights are zero.

## Prevention
Keep causal and padding masks distinct, test mask polarity and verify shifted input/target alignment for every decoder dataset.
