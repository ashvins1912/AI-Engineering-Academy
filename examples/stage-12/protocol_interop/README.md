# Stage 12 Topic 2 — Protocol interoperability lab

Offline contract simulators for three different boundaries:

- **MCP 2026-07-28:** model/client ↔ context server exposing tools, resources and prompts. The modern protocol is stateless; legacy handshake versions are modeled separately.
- **A2A 1.0.0:** independent agent ↔ agent task exchange with Agent Cards, tasks, messages, artifacts, streaming and capability checks.
- **Agent Client Protocol (ACP v2):** IDE/editor client ↔ coding agent, using JSON-RPC, initialization, sessions, prompts, updates and permission/capability negotiation.
- **IBM/BeeAI Agent Communication Protocol (legacy ACP):** a separate historical agent-to-agent protocol whose work is now part of A2A. A narrow migration mapper is included; it is not the same as Agent Client Protocol.

## Run

```bash
python examples/stage-12/protocol_interop/protocol_lab.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

## Production boundary

The lab models selected protocol invariants with synthetic payloads. It does not open sockets, implement complete OAuth, verify real Agent Card signatures, launch an IDE, run a terminal, access a host filesystem or claim full wire conformance. For production, pin a released specification and SDK version, run official conformance suites, validate TLS/server identity, enforce per-operation authorization, and test compatibility against real implementations.
