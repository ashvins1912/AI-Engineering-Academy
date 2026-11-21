"""Deterministic CI/CD promotion gate and canary rollback state machine."""
from dataclasses import dataclass,asdict
from hashlib import sha256
import json

class ReleaseDenied(RuntimeError):pass
class ReleaseConflict(RuntimeError):pass

@dataclass(frozen=True)
class Candidate:
 release_id:str
 commit_sha:str
 image_digest:str
 sbom_digest:str
 tests_passed:bool
 signature_verified:bool
 provenance_verified:bool
 critical_vulnerabilities:int
 high_vulnerabilities:int
 quality_score:float
 p95_latency_ms:float
 cost_per_1k:float

class ReleasePipeline:
 ENVIRONMENTS=("dev","staging","production")
 def __init__(self,quality_floor=.90,latency_limit_ms=800,cost_limit_per_1k=1.0):
  self.quality_floor=quality_floor;self.latency_limit_ms=latency_limit_ms;self.cost_limit_per_1k=cost_limit_per_1k
  self.candidates={};self.aliases={e:None for e in self.ENVIRONMENTS};self.previous_good={e:None for e in self.ENVIRONMENTS};self.events=[];self.idempotency={}
 def register(self,candidate:Candidate):
  if not candidate.commit_sha or len(candidate.image_digest)!=71 or not candidate.image_digest.startswith("sha256:"):raise ValueError("candidate requires commit and immutable sha256 image digest")
  if not candidate.sbom_digest or not candidate.sbom_digest.startswith("sha256:"):raise ValueError("SBOM digest required")
  old=self.candidates.get(candidate.release_id)
  if old and old!=candidate:raise ReleaseConflict("release ID is immutable")
  self.candidates[candidate.release_id]=candidate
 def gate(self,c):
  reasons=[]
  if not c.tests_passed:reasons.append("tests failed")
  if not c.signature_verified:reasons.append("image signature not verified")
  if not c.provenance_verified:reasons.append("build provenance not verified")
  if c.critical_vulnerabilities>0:reasons.append("critical vulnerabilities present")
  if c.high_vulnerabilities>0:reasons.append("high vulnerabilities require explicit reviewed exception")
  if c.quality_score<self.quality_floor:reasons.append("quality below release floor")
  if c.p95_latency_ms>self.latency_limit_ms:reasons.append("p95 latency budget exceeded")
  if c.cost_per_1k>self.cost_limit_per_1k:reasons.append("cost budget exceeded")
  return reasons
 def promote(self,release_id,target,actor,approval_role,idempotency_key):
  if target not in self.ENVIRONMENTS:raise ValueError("unknown environment")
  key=(target,idempotency_key)
  if key in self.idempotency:return self.idempotency[key]
  c=self.candidates.get(release_id)
  if c is None:raise KeyError("release candidate not registered")
  reasons=self.gate(c)
  if reasons:raise ReleaseDenied("; ".join(reasons))
  current=self.aliases[target]
  required={"dev":"engineer","staging":"release-manager","production":"production-approver"}[target]
  if approval_role!=required:raise ReleaseDenied("insufficient promotion role")
  if target=="staging" and self.aliases["dev"]!=release_id:raise ReleaseDenied("candidate must pass dev first")
  if target=="production" and self.aliases["staging"]!=release_id:raise ReleaseDenied("candidate must pass staging first")
  if current!=release_id:self.previous_good[target]=current
  self.aliases[target]=release_id
  result={"environment":target,"release_id":release_id,"image_digest":c.image_digest,"status":"promoted"}
  self.idempotency[key]=result
  self.events.append({"event":"promoted","actor":actor,"role":approval_role,**result})
  return result
 def evaluate_canary(self,environment,error_rate,p95_latency_ms,error_budget_rate=.02,latency_limit_ms=800):
  if environment not in self.ENVIRONMENTS:raise ValueError("unknown environment")
  if self.aliases[environment] is None:raise ReleaseDenied("no active release to evaluate")
  healthy=error_rate<=error_budget_rate and p95_latency_ms<=latency_limit_ms
  if healthy:
   self.events.append({"event":"canary_healthy","environment":environment,"release_id":self.aliases[environment]})
   return {"decision":"continue","release_id":self.aliases[environment]}
  failed=self.aliases[environment];rollback=self.previous_good[environment]
  self.aliases[environment]=rollback
  self.events.append({"event":"rollback","environment":environment,"failed_release":failed,"restored_release":rollback,"error_rate":error_rate,"p95_latency_ms":p95_latency_ms})
  return {"decision":"rollback","failed_release":failed,"restored_release":rollback}
 def audit_hash(self):
  return sha256(json.dumps(self.events,sort_keys=True,separators=(",",":")).encode()).hexdigest()

def demo():
 p=ReleasePipeline()
 good=Candidate("r1","a"*40,"sha256:"+"1"*64,"sha256:"+"a"*64,True,True,True,0,0,.96,350,.25)
 p.register(good)
 p.promote("r1","dev","ci-bot","engineer","dev-r1")
 p.promote("r1","staging","release-manager","release-manager","stage-r1")
 p.promote("r1","production","approver","production-approver","prod-r1")
 return {"aliases":p.aliases,"audit_hash":p.audit_hash()}
if __name__=="__main__":print(json.dumps(demo(),indent=2))
