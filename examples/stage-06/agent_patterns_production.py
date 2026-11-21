"""Production-shaped patterns: bounded fan-out, safe aggregation and idempotent event handling."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

class BoundedFanout:
    def __init__(self,max_workers=4,max_items=20,timeout_seconds=3):
        if min(max_workers,max_items)<=0 or timeout_seconds<=0: raise ValueError("limits must be positive")
        self.max_workers=max_workers; self.max_items=max_items; self.timeout=timeout_seconds
    def run(self,items,worker):
        if len(items)>self.max_items: raise ValueError("fan-out item budget exceeded")
        results=[None]*len(items)
        with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            futures={pool.submit(worker,item):(i,item) for i,item in enumerate(items)}
            try:
                for future in as_completed(futures,timeout=self.timeout):
                    i,_=futures[future]; results[i]=future.result()
            except TimeoutError:
                for future in futures: future.cancel()
                raise TimeoutError("fan-out deadline exceeded")
        return results

class IdempotentEventProcessor:
    """In-memory teaching adapter. Replace the lock/store with a DB transaction + unique key."""
    def __init__(self,handlers):
        self.handlers=handlers; self._lock=Lock(); self._results={}
    def process(self,event,tenant_id):
        event_id=event.get("event_id"); kind=event.get("type")
        if not tenant_id or not event_id or kind not in self.handlers: raise ValueError("invalid event envelope")
        key=(tenant_id,event_id)
        with self._lock:
            if key in self._results: return {"status":"duplicate","result":self._results[key]}
            result=self.handlers[kind](event["payload"])
            self._results[key]=result
            return {"status":"processed","result":result}

def aggregate_or_fail(results):
    errors=[r for r in results if isinstance(r,dict) and r.get("error")]
    if errors: return {"status":"partial_failure","errors":errors}
    return {"status":"completed","results":results}
