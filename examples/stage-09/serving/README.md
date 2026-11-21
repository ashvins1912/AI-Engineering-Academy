# Model serving and inference optimization lab

This GPU-free lab teaches serving lifecycle, KV-cache capacity, bounded admission, queueing, cancellation and benchmark methodology. No model download, GPU, cloud account or paid endpoint is required.

## Run

```bash
python examples/stage-09/serving/simulator.py --scenario examples/stage-09/serving/benchmark.json
python -m unittest discover -s examples/stage-09 -p 'test_serving.py' -v
```

The simulator uses deterministic synthetic assumptions. TTFT, completion and throughput values are proxies, **not measurements of vLLM, TGI, Ollama or GPU kernels**.

## KV-cache calculation

`bytes/token = 2 × layers × KV_heads × head_dim × bytes_per_element`

For 32 layers, 8 KV heads, head dimension 128 and FP16 (2 bytes), cache is 131,072 bytes = 128 KiB/token. A 4,096-token sequence needs about 512 MiB; eight need 4 GiB before weights, activations, CUDA graphs, temporary buffers and fragmentation.

## Benchmark protocol

1. Pin model revision, tokenizer, engine version, hardware, driver/CUDA, quantization and runtime flags.
2. Warm up the model and report cold-start separately.
3. Fix prompt and output token distributions; include short, long and mixed requests.
4. Sweep concurrency and batch limits; repeat runs.
5. Record queue wait, TTFT, inter-token latency, p50/p95/p99, tokens/sec, GPU utilization, memory, OOMs, cancellations and rejections.
6. Compare quality on representative evaluations whenever precision or decoding changes.
7. Save workload metadata with every result; do not compare numbers from different hardware or fixtures.

## Engine selection

- **vLLM:** candidate for high-throughput GPU serving with continuous batching and PagedAttention; verify model, quantization and GPU compatibility.
- **TGI:** production text-generation server with batching and streaming; verify current support, model architecture and deployment requirements.
- **Ollama:** convenient local model packaging and developer workflows; verify concurrency, API behavior and resource controls before multi-tenant use.

Choose based on model, hardware, SLOs, operational maturity, licensing, security and observability.

## Failure labs

- Queue full: return bounded retryable overload, commonly HTTP 429 with Retry-After.
- KV cache full: reject or defer before GPU allocation; keep reserve for non-cache memory.
- Client disconnect: propagate cancellation and release resources.
- Long prompt: enforce token caps and test fairness.
- Quantization: evaluate quality and kernel performance, not memory alone.
- Do not log raw prompts, credentials or personal data in benchmark traces by default.
