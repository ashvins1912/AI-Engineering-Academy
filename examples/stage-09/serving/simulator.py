#!/usr/bin/env python3
"""Deterministic GPU-free serving capacity and admission simulator."""
import argparse, json, math, statistics
from dataclasses import dataclass, field
from pathlib import Path

@dataclass
class Request:
    request_id: str
    prompt_tokens: int
    output_tokens: int

@dataclass
class AdmissionController:
    max_active: int
    max_queue: int
    active: dict = field(default_factory=dict)
    queue: list = field(default_factory=list)
    def admit(self, request):
        if request.prompt_tokens <= 0 or request.output_tokens < 0: raise ValueError('invalid token counts')
        if request.request_id in self.active or any(x.request_id == request.request_id for x in self.queue): raise ValueError('duplicate request id')
        if len(self.active) < self.max_active:
            self.active[request.request_id] = request; return 'accepted'
        if len(self.queue) < self.max_queue: self.queue.append(request); return 'queued'
        return 'rejected'
    def _promote(self):
        if self.queue and len(self.active) < self.max_active:
            item = self.queue.pop(0); self.active[item.request_id] = item
    def finish(self, request_id):
        if request_id not in self.active: return False
        del self.active[request_id]; self._promote(); return True
    def cancel(self, request_id):
        if request_id in self.active: del self.active[request_id]; self._promote(); return True
        for i, item in enumerate(self.queue):
            if item.request_id == request_id: del self.queue[i]; return True
        return False

def kv_cache_bytes_per_token(layers, kv_heads, head_dim, bytes_per_element):
    if min(layers, kv_heads, head_dim, bytes_per_element) <= 0: raise ValueError('dimensions must be positive')
    return 2 * layers * kv_heads * head_dim * bytes_per_element

def estimate_kv_cache_bytes(per_token, prompt_tokens, output_tokens, concurrency):
    if per_token <= 0 or prompt_tokens <= 0 or output_tokens < 0 or concurrency <= 0: raise ValueError('invalid cache inputs')
    return per_token * (prompt_tokens + output_tokens) * concurrency

def percentile(values, q):
    if not values: return 0.0
    ordered=sorted(values); return ordered[min(len(ordered)-1, max(0, math.ceil(q*len(ordered))-1))]

def simulate(scenario):
    m, s = scenario['model'], scenario['scheduler']
    per=kv_cache_bytes_per_token(m['layers'],m['kv_heads'],m['head_dim'],m['bytes_per_element'])
    budget=int(m['kv_cache_budget_mib']*1024*1024)
    ctl=AdmissionController(int(s['max_active']),int(s['max_queue']))
    rate=float(s['synthetic_decode_tokens_per_second'])
    if rate <= 0: raise ValueError('decode rate must be positive')
    records=[]; rejected=cancelled=0
    for row in scenario['requests']:
        req=Request(row['id'],int(row['prompt_tokens']),int(row['output_tokens']))
        projected=estimate_kv_cache_bytes(per,req.prompt_tokens,req.output_tokens,max(1,len(ctl.active)))
        if projected > budget:
            records.append({'id':req.request_id,'status':'rejected_memory','estimated_cache_bytes':projected}); rejected+=1; continue
        status=ctl.admit(req)
        if status == 'rejected': records.append({'id':req.request_id,'status':status}); rejected+=1; continue
        wait=len(ctl.queue)*1000/rate
        prefill=req.prompt_tokens*0.08; decode=req.output_tokens*1000/rate
        ttft=wait+prefill+(1000/rate if req.output_tokens else 0)
        records.append({'id':req.request_id,'status':status,'queue_wait_ms':round(wait,2),'ttft_proxy_ms':round(ttft,2),'completion_proxy_ms':round(wait+prefill+decode,2),'estimated_cache_bytes':estimate_kv_cache_bytes(per,req.prompt_tokens,req.output_tokens,1)})
        if row.get('cancel',False): ctl.cancel(req.request_id); cancelled+=1
        else: ctl.finish(req.request_id)
    completed=[x for x in records if x['status'] in ('accepted','queued')]
    ttfts=[x['ttft_proxy_ms'] for x in completed]; totals=[x['completion_proxy_ms'] for x in completed]
    output=sum(int(row['output_tokens']) for row in scenario['requests'] if any(x['id']==row['id'] for x in completed))
    duration=max(totals,default=0)/1000
    return {'label':scenario.get('label','synthetic-serving-simulation'),'metrics_are':'synthetic proxies; not GPU benchmark results','cache_bytes_per_token':per,'cache_kib_per_token':round(per/1024,2),'accepted_or_queued':len(completed),'rejected':rejected,'cancelled':cancelled,'ttft_proxy_p50_ms':round(statistics.median(ttfts),2) if ttfts else 0,'completion_proxy_p95_ms':round(percentile(totals,.95),2),'output_tokens_per_second_proxy':round(output/duration,2) if duration else 0,'records':records}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--scenario',default=str(Path(__file__).with_name('benchmark.json'))); args=parser.parse_args()
    print(json.dumps(simulate(json.loads(Path(args.scenario).read_text())),indent=2))
if __name__ == '__main__': main()
