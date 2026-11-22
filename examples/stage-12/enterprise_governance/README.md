# Stage 12 Topic 8 — Enterprise AI Governance, Risk and Lifecycle Controls

## Run locally

```bash
python examples/stage-12/enterprise_governance/governance_engine.py
python -m unittest discover -s examples/stage-12 -p 'test_enterprise_governance.py' -v
```

The simulator uses synthetic artifacts, approvals, risks, data assets and audit events. It does not connect to a legal registry, identity provider, production audit system or data catalog.

## Release dossier

A release binds code, model, dataset, prompt and index versions to evidence:
- Model and dataset cards.
- Risk assessment and owned mitigations.
- Privacy and security reviews.
- Evaluation report and quality evidence.
- Data retention/deletion schedule.
- Third-party model/dependency inventory.
- Version-bound approvals and a jurisdiction-specific legal review reference.

## Lifecycle and data controls

- Release lifecycle transitions are explicit: draft → review → approved → released → retired, with reject/withdraw/suspend paths.
- High/critical risks require an owner, mitigation and test evidence; accepted residual risk also requires an acceptance owner.
- High-risk systems require a separate human-oversight approval.
- Personal data requires a consent/provenance record.
- Expired retention, pending deletion and unreviewed cross-border transfers block the dossier.
- The audit ledger demonstrates hash-chain tamper evidence.

## Important limitations

Approval signatures are represented by a boolean fixture, not real cryptographic verification. The in-memory audit chain is not tamper-proof against an attacker who can rewrite the whole store. Production needs authenticated identities, signed approvals, durable append-only/WORM audit, policy versioning, deletion proofs, access-controlled evidence, data lineage and jurisdiction-specific legal/privacy review. This is engineering guidance, not legal advice or a compliance certification.
