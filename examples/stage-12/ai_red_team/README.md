# Stage 12 Topic 5 — AI red teaming and adversarial validation

A deterministic, offline attack-scenario runner for prompt injection, retrieval poisoning, tool abuse, cross-tenant access, data exfiltration, denial of wallet, approval replay, argument tampering, jailbreaks and model artifact supply-chain attacks.

## Run

```bash
python examples/stage-12/ai_red_team/red_team_lab.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

## Safety boundary

All payloads are synthetic and all tools are simulated policy decisions. The lab does not attack external systems, invoke a live model, execute tools, contact networks, read secrets or process production data. A blocked attack in this harness demonstrates only the tested control path; it is not a penetration-test certificate or proof of production security.
