# Stage 10 — Tracing and telemetry lab

This is an offline trace-graph simulator. It creates no network requests and does not require an OpenTelemetry collector or telemetry backend.

## Run

```bash
python examples/stage-10/tracing/trace_engine.py
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Signal responsibilities

- **Metrics:** aggregate rates, error ratios, queue depth, token throughput, TTFT/ITL and latency histograms. Keep labels bounded.
- **Logs:** discrete structured events with trace/span IDs, event type, safe error category and correlation metadata.
- **Traces:** causal path and timing for one request, including gateway, retrieval, model, tool, queue and persistence spans.

## Instrumentation rules

1. Use stable span names such as `vector.search`, `model.generate`, `mcp.tool` and `queue.consume`; never include raw IDs or prompt text in span names.
2. Extract/inject W3C `traceparent` and apply a strict policy to `tracestate` and baggage.
3. Serialize trace context explicitly across queues; create consumer spans or links after dequeue.
4. Record bounded attributes such as provider, model family, status class, top-k, cache hit, token counts and retry category.
5. Do not collect prompts, retrieved text, access tokens, cookies, customer identifiers or raw tool arguments by default.
6. Use monotonic clocks for local duration. Treat cross-host timestamp differences cautiously.
7. Close spans on success, exception, timeout, cancellation and streaming disconnect.
8. Use head sampling for baseline volume and tail policies for errors/latency outliers; size buffers and define overload behavior.
9. Keep unique IDs in access-controlled traces/logs, not metrics labels.

## Production mapping

Use OpenTelemetry SDKs and semantic conventions in services, OTLP for export, and a collector for batching, redaction, sampling and routing. Protect the collector and backend with authentication, tenant-aware access, retention controls and exporter backpressure. Test instrumentation coverage and privacy with synthetic prompt/token canaries.

The simulator validates graph and hygiene rules only. It does not replace real SDK instrumentation, collector capacity tests or backend access-control reviews.
