"""Integrated, offline acceptance runner for the Stage 12 production practicum.

Each adapter is an existing deterministic topic demo. No network, hosted model,
GPU, cloud resource or learner-supplied code is executed.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from practicum_release_gate import EvidenceRecord, evaluate_practicum_release


ROOT = Path(__file__).resolve().parents[3]
TENANT_ID = "tenant-practicum-A"
RELEASE_VERSION = "stage12-practicum-v1"

# The sequence is deliberate: foundations and controls are exercised before the
# final integrated release dossier is evaluated.
COMMANDS = (
    ("agent_orchestration", "examples/stage-12/agent_orchestration/durable_runtime.py"),
    ("protocol_interop", "examples/stage-12/protocol_interop/protocol_lab.py"),
    ("advanced_retrieval", "examples/stage-12/advanced_retrieval/retrieval_engine.py"),
    ("evaluation_scale", "examples/stage-12/evaluation_scale/evaluation_engine.py"),
    ("ai_red_team", "examples/stage-12/ai_red_team/red_team_lab.py"),
    ("inference_simulator", "examples/stage-12/inference_performance/inference_simulator.py"),
    ("capacity_sweep", "examples/stage-12/inference_performance/capacity_sweep.py"),
    ("multimodal_systems", "examples/stage-12/multimodal_systems/multimodal_pipeline.py"),
    ("enterprise_governance", "examples/stage-12/enterprise_governance/governance_engine.py"),
    ("stage11_capstone", "examples/stage-11/capstone_acceptance.py"),
)


def _run_demo(capability: str, relative_path: str) -> dict:
    command = [sys.executable, relative_path]
    if not (ROOT / relative_path).is_file():
        return {
            "capability": capability, "passed": False,
            "returncode": None, "stdout": "", "stderr": "DEMO_FILE_MISSING",
        }
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    try:
        completed = subprocess.run(
            command, cwd=ROOT, env=env, capture_output=True, text=True,
            timeout=90, check=False,
        )
        return {
            "capability": capability,
            "passed": completed.returncode == 0,
            "returncode": completed.returncode,
            "stdout": completed.stdout[-1200:],
            "stderr": completed.stderr[-1200:],
        }
    except subprocess.TimeoutExpired as error:
        return {
            "capability": capability, "passed": False,
            "returncode": None,
            "stdout": (error.stdout or "")[-1200:] if isinstance(error.stdout, str) else "",
            "stderr": "DEMO_TIMEOUT_AFTER_90_SECONDS",
        }
    except OSError as error:
        return {
            "capability": capability, "passed": False,
            "returncode": None, "stdout": "", "stderr": f"DEMO_EXECUTION_ERROR:{error}",
        }


def run_acceptance() -> dict:
    demos = [_run_demo(capability, path) for capability, path in COMMANDS]
    evidence = []
    for result in demos:
        output_digest = hashlib.sha256(
            (result["stdout"] + result["stderr"]).encode("utf-8")
        ).hexdigest()
        evidence.append(EvidenceRecord(
            capability=result["capability"],
            passed=result["passed"],
            evidence_ref=f"local://stage12/{result['capability']}/{output_digest}",
            tenant_id=TENANT_ID,
            release_version=RELEASE_VERSION,
        ))

    decision = evaluate_practicum_release(
        evidence,
        tenant_id=TENANT_ID,
        release_version=RELEASE_VERSION,
        unresolved_findings=[],
    )
    checks = {item["capability"]: item["passed"] for item in demos}
    return {
        "stage": 12,
        "topic": 9,
        "project": "integrated-enterprise-ai-operations-platform",
        "checks": checks,
        "passed": sum(checks.values()),
        "total": len(COMMANDS),
        "release_gate": {
            "passed": decision.passed,
            "reasons": list(decision.reasons),
            "accepted_capabilities": list(decision.accepted_capabilities),
        },
        "demos": demos,
        "result": "PASS" if decision.passed else "FAIL",
    }


def main() -> None:
    report = run_acceptance()
    print(json.dumps(report, indent=2, sort_keys=True))
    if report["result"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
