# Prompt injection and data exfiltration lab

This is a defensive, deterministic policy exercise. It uses a harmless synthetic canary and mock decisions only. It does not call an LLM, access real secrets, invoke external tools or execute attacker-supplied content.

## Run

```bash
python examples/stage-10/prompt-injection/security_boundary.py --scenario examples/stage-10/prompt-injection/security-scenario.json
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Security invariants

1. Identity and tenant scope are derived from verified authentication.
2. Retrieval authorization runs before content enters the model context.
3. Retrieved documents and tool outputs remain untrusted evidence.
4. Secrets are never inserted into prompts or model-visible context.
5. Model-proposed tool actions are requests, not authorization decisions.
6. The server checks principal, tenant, verb, resource and capability before execution.
7. Restricted tool output is redacted before model or user exposure.
8. Audit events store decision IDs and reason codes, not raw secrets.

## Threat-model checklist

- Direct injection in the user message
- Indirect injection in a document, web page or tool output
- Retrieval poisoning and provenance loss
- Cross-tenant retrieval and confused-deputy tool requests
- Secret exposure through context, generated output or logs
- Parser and connector trust boundaries

## Production note

Prompt delimiters, model refusals and classifiers are defense-in-depth signals only. Keep authorization, tenant isolation, secret management and side-effect controls in deterministic application code. Use real provider-specific evaluations only in a controlled environment with approved data and permissions.
