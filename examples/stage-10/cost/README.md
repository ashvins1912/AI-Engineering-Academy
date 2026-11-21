# Stage 10 — AI cost engineering lab

This lab uses synthetic prices and local Decimal arithmetic. It makes no provider calls, does not download models and does not contact billing systems.

## Run

```bash
python examples/stage-10/cost/cost_engine.py
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Cost model

- Text model input and output tokens use separate rates per million.
- Embeddings use their own token rate; reranking is modeled per thousand calls.
- Tool costs are supplied from metered usage.
- Every attempt is counted, including failures. Failed tasks remain in total workload cost even though they do not increase the successful-task denominator.
- Use effective-dated, versioned pricing configuration. Reconcile estimates with provider billing exports.

## Cost per successful task

`total cost of all task attempts and supporting operations / number of tasks meeting success criteria`

This metric makes retries, poor routing and task failures visible. Report request cost and token cost too, but do not use them as substitutes for successful-task unit economics.

## Safe optimization

1. Trim duplicate prompt context and retrieve only the required evidence.
2. Cap input/output tokens, retrieval fan-out, tool calls and retry attempts.
3. Use tenant/ACL/model/prompt/index-version-aware cache keys and verify freshness before reuse.
4. Batch embeddings and non-interactive work where latency objectives permit.
5. Route by task complexity only when quality, safety and latency gates pass.
6. Enforce request/user/tenant spend envelopes before expensive execution.
7. Attribute costs with verified tenant context and safe bounded labels; never store raw prompts in billing dimensions.
8. Detect usage spikes and denial-of-wallet patterns; apply rate limits and admission control.

The simulator demonstrates arithmetic and policy behavior only. Production needs current provider rate cards, invoice reconciliation, secure usage ledgers and quality/latency evaluations.
