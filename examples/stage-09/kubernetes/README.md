# Stage 9 Topic 8 — Kubernetes for AI services

This is a local, deterministic learning lab. It does **not** connect to a cluster, install a Kubernetes distribution, provision cloud resources, or deploy workloads.

## What you will learn

- How Deployments reconcile desired replicas into Pods.
- Why requests drive scheduling while limits constrain runtime.
- How startup, readiness and liveness probes differ.
- Why HPA cannot create node or GPU capacity.
- How service accounts, security contexts and NetworkPolicy reduce risk.
- How to diagnose Pending, OOMKilled, CrashLoopBackOff and empty Service endpoints.

## Run the simulator

From the repository root:

```bash
python examples/stage-09/kubernetes/simulator.py
python -m unittest examples.stage-09.test_kubernetes -v
```

Expected default trace:

- 2 replicas requested.
- 2 replicas scheduled on a 16 GiB allocatable node with 6 GiB request per Pod.
- Model startup completes in 75 seconds within a 120-second startup budget.
- 2 replicas become ready.
- A third replica remains Pending because 18 GiB of requests exceed 16 GiB allocatable.

## Review the production-shaped manifests

- `deployment.yaml`: digest-pinned image, resource contract, distinct probes, non-root security context and rolling update.
- `service.yaml`: stable ClusterIP endpoint selecting the Deployment's ready Pods.
- `hpa.yaml`: bounded CPU-based example. Production AI workloads may need queue depth, in-flight tokens or GPU metrics.
- `network-policy.yaml`: illustrative default-deny policy plus explicit ingress/egress. Verify the selected CNI enforces NetworkPolicy.

The manifests are templates, not apply-ready production configuration. Replace example registry, image digest, namespace labels, port and dependency selectors. Validate them against the exact cluster version and policy before any deployment.

## Safe diagnostic sequence

1. `kubectl describe deployment inference-api -n ai-serving`
2. `kubectl get pods -n ai-serving -o wide`
3. `kubectl describe pod <pod> -n ai-serving` and inspect Events.
4. `kubectl logs <pod> -c model-api -n ai-serving`; if it restarted, add `--previous`.
5. `kubectl top pod -n ai-serving` and `kubectl describe node <node>`.
6. `kubectl get svc,endpointslices,hpa -n ai-serving`.
7. Inspect NetworkPolicy and CNI enforcement before changing application code.

## Important production caveats

- Set requests from measured peak usage; do not copy the example 6 GiB blindly.
- Memory limits are hard ceilings; CPU limits can throttle latency-sensitive inference.
- A startup probe should cover measured cold-start percentiles plus margin.
- Readiness must not run a full expensive inference request on every probe.
- HPA needs metrics and cluster capacity. GPU scheduling additionally needs compatible drivers, runtime and device plugin.
- A toleration allows a Pod onto a tainted node; node affinity/selectors and GPU resource requests still determine placement.
- A rollout with `maxSurge: 1` needs temporary capacity for one extra Pod.
- Do not commit secrets or kubeconfig files. This lab never uses credentials or calls `kubectl apply`.

