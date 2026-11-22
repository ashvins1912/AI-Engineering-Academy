# Stage 12 Topic 6 — Inference Performance and Capacity Engineering

## Run locally

```bash
python examples/stage-12/inference_performance/inference_simulator.py
python examples/stage-12/inference_performance/capacity_sweep.py
python -m unittest discover -s examples/stage-12 -p 'test_inference_performance.py' -v
```

This is a hardware-independent simulator. It does not load weights, allocate GPU memory, invoke a model server or provision cloud/GPU resources.

## What it models

- Prefill and decode as separate phases, with TTFT and decode latency.
- KV-cache memory: `2 × layers × KV heads × head dimension × bytes/value × sequence tokens × concurrent sequences`.
- Batch size, queue capacity, admission control, overload rejection and p95 latency.
- Tenant-scoped prefix cache; a matching key in another tenant is not a cache hit.
- KV quantization trade-offs: lower precision reduces the modeled cache footprint but carries an explicit illustrative quality penalty.
- Speculative decoding as a simplified acceptance-rate throughput multiplier.
- Deadline misses and output-token throughput.
- Little's Law and memory-based concurrency estimates.
- Round-robin tenant fairness, per-tenant concurrency caps and versioned prefix keys.
- Paged KV allocation, exhaustion and release after cancellation/completion.

## Worked memory example

For 32 layers, 8 KV heads, head dimension 128 and FP16 KV values (2 bytes), each token requires:

`2 × 32 × 8 × 128 × 2 = 131,072 bytes = 128 KiB`

A 4,096-token sequence therefore requires 512 MiB for its KV cache. Two concurrent sequences require approximately 1 GiB before allocator fragmentation, weights, activations or runtime overhead. Real serving capacity must include those additional costs.

## Failure labs

- KV-cache exhaustion: reject before admitting a batch.
- Queue overload: bound queue length and shed excess work.
- Head-of-line waiting: expose queue wait and arrival times in the schedule.
- Prefix cache collision: bind cache entries to tenant identity.
- Quantization regression: show memory savings and modeled quality penalty together.
- Deadline miss: separate queue, prefill and decode contributions.
- Speculative decoding: vary acceptance rate and observe throughput assumptions.
- Tenant starvation: burst one tenant and verify other active tenants get a fair turn.
- KV page leak: release a canceled request and verify free pages return to baseline.

## Important limitations

The formulas are intentionally simplified. Real KV cache layouts, grouped-query attention, page allocation, fragmentation, quantization metadata, tensor parallelism, batching efficiency, model-specific kernels and hardware bandwidth differ by serving engine. The speculative decoding multiplier is an illustrative model, not a benchmark. Use this simulator to reason about capacity and trade-offs, then benchmark the actual engine and model on approved hardware.
