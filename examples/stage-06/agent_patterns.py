"""Small, deterministic implementations of common agent architectures."""
from concurrent.futures import ThreadPoolExecutor, as_completed

def router(task, handlers):
    route=task.get("route")
    if route not in handlers: raise ValueError(f"unsupported route: {route}")
    return {"route":route,"result":handlers[route](task)}

def supervisor(task, workers, max_delegations=3):
    plan=task.get("delegations", [])
    if len(plan)>max_delegations: raise ValueError("delegation budget exceeded")
    results=[]
    for item in plan:
        worker=item["worker"]
        if worker not in workers: raise ValueError(f"unknown worker: {worker}")
        results.append({"worker":worker,"result":workers[worker](item["input"])})
    return {"status":"completed","results":results}

def parallel_map(items, worker, max_workers=3):
    if max_workers<1: raise ValueError("max_workers must be positive")
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures=[pool.submit(worker,item) for item in items]
        return [future.result() for future in futures]

def hierarchical(task, decomposer, executor):
    subtasks=decomposer(task)
    if not subtasks: raise ValueError("decomposer returned no subtasks")
    results=[executor(item) for item in subtasks]
    return {"subtasks":subtasks,"results":results,"status":"completed"}

def reflection(task, draft_fn, critique_fn, revise_fn, max_revisions=2):
    if max_revisions<0: raise ValueError("max_revisions cannot be negative")
    draft=draft_fn(task); trace=[]
    for attempt in range(max_revisions):
        critique=critique_fn(task,draft)
        trace.append({"attempt":attempt+1,"critique":critique})
        if critique.get("pass"): break
        draft=revise_fn(task,draft,critique)
    return {"draft":draft,"trace":trace,"revisions":len(trace)}

class EventAgent:
    def __init__(self, handlers):
        self.handlers=handlers; self.seen=set(); self.events=[]
    def consume(self,event):
        event_id=event.get("event_id"); kind=event.get("type")
        if not event_id or not kind: raise ValueError("event_id and type required")
        if event_id in self.seen: return {"status":"duplicate","event_id":event_id}
        if kind not in self.handlers: raise ValueError(f"unsupported event: {kind}")
        result=self.handlers[kind](event["payload"])
        self.seen.add(event_id)
        record={"event_id":event_id,"type":kind,"result":result}
        self.events.append(record)
        return {"status":"processed",**record}

if __name__=="__main__":
    handlers={"catalog":lambda t:{"sku":t["sku"],"price":80},"support":lambda t:{"ticket":t["ticket"]}}
    print("router:",router({"route":"catalog","sku":"MUG-1"},handlers))
    workers={"search":lambda q:f"found:{q}","summarize":lambda q:f"summary:{q}"}
    print("supervisor:",supervisor({"delegations":[{"worker":"search","input":"policy"},{"worker":"summarize","input":"policy"}]},workers))
    print("parallel:",parallel_map([1,2,3],lambda x:x*x))
    print("hierarchical:",hierarchical("launch",lambda _:["research","design","test"],lambda x:x.upper()))
    print("reflection:",reflection("explain",lambda _: "draft",lambda _,d:{"pass":d=="revised","issue":"missing example"},lambda *_:"revised"))
    bus=EventAgent({"order.created":lambda p:{"accepted":p["order_id"]}})
    event={"event_id":"evt-1","type":"order.created","payload":{"order_id":"ORD-7"}}
    print("event:",bus.consume(event),bus.consume(event))
