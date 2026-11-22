"""Deterministic precision/concurrency sweep for the inference simulator."""
from inference_simulator import InferenceSimulator, Request, ServingConfig


def main() -> None:
    workload = [
        Request(f"req-{index}", f"tenant-{index % 2}", 256 * (index % 4 + 1),
                128 + 32 * (index % 3), arrival_ms=index * 5)
        for index in range(12)
    ]
    for bits in (16, 8, 4):
        simulator = InferenceSimulator(config=ServingConfig(
            max_batch_size=4, max_queue=12, kv_memory_budget_mb=1024,
            prefill_tokens_per_second=2000, decode_tokens_per_second=50,
            quantization_bits=bits, speculative_acceptance_rate=0.6,
            draft_speedup=1.8,
        ))
        report = simulator.simulate_workload(workload)
        one_sequence_mib = simulator.kv_cache_bytes(4096) / 1024**2
        print(
            f"KV={bits}-bit one-4k-sequence={one_sequence_mib:.1f}MiB "
            f"accepted={report['accepted']} rejected={len(report['rejected'])} "
            f"p95={report['p95_latency_ms']:.1f}ms "
            f"throughput={report['throughput_tokens_per_second']:.1f} tok/s"
        )


if __name__ == "__main__":
    main()
