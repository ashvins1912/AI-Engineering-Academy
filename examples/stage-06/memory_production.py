"""Production-shaped tenant-scoped memory service with lifecycle and audit hooks.
The repository is in-memory for deterministic tests; replace it with a DB adapter that
uses tenant predicates/RLS. Encryption is injected at the storage boundary in production.
"""
from dataclasses import dataclass,asdict
from typing import Any,Callable
@dataclass
class MemoryRecord:
    id:str;tenant_id:str;user_id:str;kind:str;text:str;source_id:str;created_at:int;expires_at:int
    relevance:float=.5;reliability:float=.8;recency:float=.5;token_cost:int=20;deleted:bool=False;consented:bool=True;derived_from:str|None=None
class MemoryService:
    def __init__(self,clock:Callable[[],int],audit:Callable[[dict[str,Any]],None]|None=None):
        self.clock=clock;self.audit=audit or (lambda event:None);self.records:dict[str,MemoryRecord]={};self.derived:dict[str,list[str]]={}
    def write(self,record:MemoryRecord,*,tenant_id:str,allowed_kinds:set[str])->None:
        if record.tenant_id!=tenant_id: raise PermissionError('tenant scope mismatch')
        if not record.consented: raise PermissionError('memory consent required')
        if record.kind not in allowed_kinds: raise PermissionError('memory type not allowed')
        if record.expires_at<=self.clock(): raise ValueError('expiry must be in the future')
        if record.id in self.records: raise ValueError('memory id already exists')
        self.records[record.id]=record;self.audit({'event':'memory.write','tenant_id':tenant_id,'memory_id':record.id,'source_id':record.source_id})
    def retrieve(self,*,tenant_id:str,user_id:str,query:str,token_budget:int)->dict[str,Any]:
        if token_budget<0: raise ValueError('token budget cannot be negative')
        # Authorization and TTL filtering happen before ranking and before text is returned.
        eligible=[r for r in self.records.values() if r.tenant_id==tenant_id and r.user_id==user_id and not r.deleted and r.consented and r.expires_at>self.clock()]
        ranked=sorted(eligible,key=lambda r:(-(.5*r.relevance+.3*r.reliability+.2*r.recency),r.id))
        selected=[];used=0
        for r in ranked:
            if used+r.token_cost<=token_budget:
                selected.append({'id':r.id,'kind':r.kind,'text':r.text,'source_id':r.source_id,'score':round(.5*r.relevance+.3*r.reliability+.2*r.recency,3),'token_cost':r.token_cost});used+=r.token_cost
        self.audit({'event':'memory.retrieve','tenant_id':tenant_id,'user_id':user_id,'query':query,'selected_ids':[x['id'] for x in selected],'tokens_used':used})
        return {'items':selected,'tokens_used':used,'tokens_remaining':token_budget-used}
    def link_derived(self,source_id:str,derived_id:str,*,tenant_id:str)->None:
        source=self.records.get(source_id)
        if source is None or source.tenant_id!=tenant_id: raise PermissionError('source not found in tenant scope')
        self.derived.setdefault(source_id,[]).append(derived_id)
    def expire(self)->list[str]:
        now=self.clock();expired=[]
        for record in self.records.values():
            if not record.deleted and record.expires_at<=now:
                record.deleted=True;expired.append(record.id)
                self.audit({'event':'memory.expire','tenant_id':record.tenant_id,'memory_id':record.id})
        return expired
    def delete(self,memory_id:str,*,tenant_id:str)->list[str]:
        record=self.records.get(memory_id)
        if record is None or record.tenant_id!=tenant_id: raise PermissionError('memory not found in tenant scope')
        record.deleted=True
        derived=self.derived.get(memory_id,[])
        self.audit({'event':'memory.delete','tenant_id':tenant_id,'memory_id':memory_id,'derived_ids':derived})
        # Production adapter must fan this tombstone out to summaries, vector indexes, caches and backups.
        return list(derived)
    def supersede(self,old_id:str,new_record:MemoryRecord,*,tenant_id:str)->None:
        old=self.records.get(old_id)
        if old is None or old.tenant_id!=tenant_id: raise PermissionError('old memory not found in tenant scope')
        self.write(new_record,tenant_id=tenant_id,allowed_kinds={new_record.kind})
        old.deleted=True
        self.audit({'event':'memory.supersede','tenant_id':tenant_id,'old_id':old_id,'new_id':new_record.id})
