# Prompt-injection security lab

This lab models the **application security boundary**, not an LLM's ability to recognize every attack. It uses synthetic tenants, records and a canary string. No real credentials, customer data, hosted model or external tool is used.

## Run

```bash
python examples/stage-10/prompt-injection/security_policy.py --scenario examples/stage-10/prompt-injection/attack-scenarios.json
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Security contract

1. Treat user text, retrieved chunks, web pages, OCR and tool outputs as untrusted data.
2. Preserve source ID, tenant, timestamp and trust label through retrieval and generation.
3. Keep credentials and broad secrets outside model-visible context.
4. Treat every model tool call as a proposal. Check authenticated principal, action, scope, resource ownership and approval in server code.
5. Deny unknown tools and actions by default. Re-check tenant ownership at the data layer.
6. Validate citations against the caller's access-control list and block synthetic canary leakage.
7. Log policy version, correlation ID, source IDs and decision reason; do not log raw secrets or full prompts by default.

## Threat-model checklist

- Direct and indirect prompt injection, including encoded and multi-turn variants
- Poisoned retrieval, malicious HTML/PDF/OCR and untrusted tool output
- Confused-deputy and cross-tenant access
- Citation manipulation and unauthorized source references
- Secret extraction through response, tool arguments, logs and traces
- Tool schema abuse, excess permissions and missing approval

## Important limitation

The included pattern matcher is an **advisory signal**, not a security control. Attackers can paraphrase or encode malicious instructions. Security comes from data minimization, provenance, deterministic authorization, narrow tools, tenant isolation and output validation. A production implementation must enforce those controls at API, tool and data boundaries and test against a continuously updated adversarial corpus.
