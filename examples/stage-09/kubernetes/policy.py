"""Production-shaped static policy checks for an inference workload contract.

The input is JSON so the lab stays dependency-free. This checks policy intent,
not Kubernetes API schema validity or actual cluster enforcement.
"""


def validate(config: dict) -> list[str]:
    errors: list[str] = []
    required = ("image", "replicas", "memory_request_gib", "memory_limit_gib",
                "startup_budget_seconds", "model_startup_p95_seconds",
                "run_as_non_root", "read_only_root_filesystem",
                "allow_privilege_escalation", "dropped_capabilities",
                "service_account", "automount_service_account_token",
                "hpa_min", "hpa_max", "metrics_available")
    for key in required:
        if key not in config:
            errors.append(f"missing required field: {key}")
    if errors:
        return errors

    image = config["image"]
    if not isinstance(image, str) or "@sha256:" not in image:
        errors.append("image must be pinned by sha256 digest")
    if not isinstance(config["replicas"], int) or config["replicas"] < 1:
        errors.append("replicas must be a positive integer")
    if config["memory_request_gib"] <= 0:
        errors.append("memory request must be positive")
    if config["memory_limit_gib"] < config["memory_request_gib"]:
        errors.append("memory limit must be greater than or equal to request")
    if config["startup_budget_seconds"] < config["model_startup_p95_seconds"]:
        errors.append("startup budget must cover measured model startup p95")
    if config["run_as_non_root"] is not True:
        errors.append("container must run as non-root")
    if config["read_only_root_filesystem"] is not True:
        errors.append("root filesystem must be read-only")
    if config["allow_privilege_escalation"] is not False:
        errors.append("privilege escalation must be disabled")
    if "ALL" not in config["dropped_capabilities"]:
        errors.append("all Linux capabilities must be dropped")
    if not config["service_account"]:
        errors.append("dedicated service account is required")
    if config["automount_service_account_token"] is not False:
        errors.append("disable service-account token automount unless API access is required")
    if config["hpa_min"] < 1 or config["hpa_max"] < config["hpa_min"]:
        errors.append("HPA bounds must satisfy 1 <= min <= max")
    if config["metrics_available"] is not True:
        errors.append("HPA metrics source must be available and verified")
    if config.get("gpu_count", 0) < 0:
        errors.append("GPU count cannot be negative")
    if config.get("gpu_count", 0) > 0 and not config.get("gpu_node_selector"):
        errors.append("GPU workloads require an accelerator node selector/affinity")
    if config.get("gpu_count", 0) > 0 and not config.get("device_plugin_ready", False):
        errors.append("GPU device plugin must advertise accelerator resources")
    return errors


def main() -> None:
    example = {
        "image": "registry.example.com/inference@sha256:" + "a" * 64,
        "replicas": 2, "memory_request_gib": 6, "memory_limit_gib": 8,
        "startup_budget_seconds": 120, "model_startup_p95_seconds": 75,
        "run_as_non_root": True, "read_only_root_filesystem": True,
        "allow_privilege_escalation": False, "dropped_capabilities": ["ALL"],
        "service_account": "inference-runtime",
        "automount_service_account_token": False,
        "hpa_min": 2, "hpa_max": 6, "metrics_available": True,
        "gpu_count": 0, "gpu_node_selector": None, "device_plugin_ready": False,
    }
    violations = validate(example)
    print("PASS: inference workload policy" if not violations else "\n".join(violations))


if __name__ == "__main__":
    main()
