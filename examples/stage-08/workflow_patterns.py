"""Deterministic workflow patterns: DAG scheduler, fan-out/fan-in, branch and saga."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from copy import deepcopy

class WorkflowDefinitionError(Exception): pass
class WorkflowStepError(Exception): pass

@dataclass
class WorkflowNode:
    node_id: str
    dependencies: tuple
    run: object
    compensate: object = None
    idempotent: bool = True

class WorkflowGraph:
    def __init__(self, nodes):
        self.nodes = {node.node_id:node for node in nodes}
        if len(self.nodes) != len(nodes):
            raise WorkflowDefinitionError("duplicate node ID")
        self.order = self._compile()
    def _compile(self):
        for node in self.nodes.values():
            missing = set(node.dependencies) - set(self.nodes)
            if missing:
                raise WorkflowDefinitionError(f"{node.node_id} has unknown dependencies: {sorted(missing)}")
        remaining = {name:set(node.dependencies) for name,node in self.nodes.items()}
        order=[]
        while remaining:
            ready=sorted(name for name,deps in remaining.items() if not deps)
            if not ready:
                raise WorkflowDefinitionError("workflow contains a dependency cycle")
            order.extend(ready)
            for name in ready:remaining.pop(name)
            for deps in remaining.values():deps.difference_update(ready)
        return order
    def execute(self, initial=None, max_workers=2, fail_fast=False):
        if max_workers<1:raise ValueError("max_workers must be positive")
        results=dict(initial or {})
        completed=[];failed={};blocked=[]
        remaining=set(self.nodes)
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            while remaining:
                ready=sorted(name for name in remaining if set(self.nodes[name].dependencies).issubset(results))
                if not ready:
                    blocked.extend(sorted(remaining));break
                snapshot=deepcopy(results)
                futures={pool.submit(self.nodes[name].run,snapshot):name for name in ready}
                wave_results={}
                for future in as_completed(futures):
                    name=futures[future]
                    try:wave_results[name]=future.result()
                    except Exception as exc:failed[name]=f"{type(exc).__name__}: {exc}"
                for name in ready:remaining.remove(name)
                results.update(wave_results)
                completed.extend(name for name in ready if name in wave_results)
                if failed and fail_fast:
                    blocked.extend(sorted(remaining));break
                # Nodes depending on failed outputs can never become ready.
                for name in list(remaining):
                    if set(self.nodes[name].dependencies).intersection(failed):
                        blocked.append(name);remaining.remove(name)
        status="completed" if not failed and not blocked else ("partial_failure" if completed else "failed")
        return {"status":status,"results":results,"completed":completed,"failed":failed,"blocked":sorted(set(blocked)),"order":list(self.order)}

def choose_branch(condition, branches):
    if condition not in branches:
        raise WorkflowDefinitionError("branch target is not registered")
    return branches[condition]

def fan_out_fan_in(items, worker, max_workers=4):
    if max_workers<1:raise ValueError("max_workers must be positive")
    indexed=list(enumerate(items))
    results={};failures={}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures={pool.submit(worker,item):index for index,item in indexed}
        for future in as_completed(futures):
            index=futures[future]
            try:results[index]=future.result()
            except Exception as exc:failures[index]=f"{type(exc).__name__}: {exc}"
    return {"results":[results[i] for i in sorted(results)],"failures":failures,
            "status":"completed" if not failures else "partial_failure",
            "success_count":len(results),"failure_count":len(failures)}

def map_reduce(items, mapper, reducer, max_workers=4):
    mapped=fan_out_fan_in(items,mapper,max_workers)
    if mapped["failures"]:
        return {**mapped,"aggregate":None}
    return {**mapped,"aggregate":reducer(mapped["results"])}

def run_saga(steps):
    completed=[]
    for step in steps:
        try:
            result=step["run"]()
            completed.append({"name":step["name"],"result":result,"compensate":step.get("compensate")})
        except Exception as exc:
            compensation_errors=[]
            for item in reversed(completed):
                compensate=item["compensate"]
                if not compensate:continue
                try:compensate(item["result"])
                except Exception as compensation_error:
                    compensation_errors.append({"step":item["name"],"error":str(compensation_error)})
            status="compensation_required" if compensation_errors else "compensated"
            return {"status":status,"failed_step":step["name"],"error":str(exc),
                    "completed":[x["name"] for x in completed],
                    "compensated":[x["name"] for x in reversed(completed) if x["compensate"]],
                    "compensation_errors":compensation_errors}
    return {"status":"completed","completed":[x["name"] for x in completed],"compensated":[],"compensation_errors":[]}

def demo():
    graph=WorkflowGraph([
        WorkflowNode("fraud",(),lambda _:{"risk":"low"}),
        WorkflowNode("address",(),lambda _:{"valid":True}),
        WorkflowNode("reserve",("fraud","address"),lambda s:{"reservation":"r-1"}),
        WorkflowNode("payment",("reserve",),lambda s:{"payment":"authorized"}),
    ])
    print(graph.execute(max_workers=2))
    print(run_saga([
        {"name":"reserve","run":lambda:"r-1","compensate":lambda r:print("release",r)},
        {"name":"payment","run":lambda:"p-1","compensate":lambda p:print("void",p)},
        {"name":"shipping","run":lambda:(_ for _ in ()).throw(RuntimeError("carrier down"))},
    ]))

if __name__=="__main__":demo()
