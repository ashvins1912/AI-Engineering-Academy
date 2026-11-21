"""Deterministic data quality, leakage-safe features, lineage and drift checks."""
from __future__ import annotations
from dataclasses import dataclass,asdict
from hashlib import sha256
import json,math,random
from typing import Any

class DataContractError(ValueError): pass

@dataclass(frozen=True)
class Field:
 name:str
 kind:str
 nullable:bool=False
 minimum:float|None=None
 maximum:float|None=None
 allowed:tuple|None=None

@dataclass
class ValidationReport:
 rows:int
 errors:list
 warnings:list
 @property
 def passed(self): return not self.errors

def canonical_hash(value:Any)->str:
 return sha256(json.dumps(value,sort_keys=True,separators=(",",":"),default=str).encode()).hexdigest()

def validate_rows(rows:list[dict],fields:list[Field],unique_key:str|None=None)->ValidationReport:
 errors=[];warnings=[]
 if not rows: errors.append("dataset is empty")
 names={f.name for f in fields}
 seen=set()
 for i,row in enumerate(rows):
  extra=set(row)-names
  if extra: errors.append(f"row {i}: unexpected fields {sorted(extra)}")
  for f in fields:
   value=row.get(f.name)
   if value is None:
    if not f.nullable: errors.append(f"row {i}: {f.name} is required")
    continue
   valid={"number":lambda x:isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x),
          "integer":lambda x:isinstance(x,int) and not isinstance(x,bool),
          "string":lambda x:isinstance(x,str),
          "boolean":lambda x:isinstance(x,bool)}.get(f.kind)
   if valid is None: errors.append(f"contract: unsupported kind {f.kind}");continue
   if not valid(value): errors.append(f"row {i}: {f.name} must be {f.kind}");continue
   if f.minimum is not None and value<f.minimum: errors.append(f"row {i}: {f.name} below minimum")
   if f.maximum is not None and value>f.maximum: errors.append(f"row {i}: {f.name} above maximum")
   if f.allowed is not None and value not in f.allowed: errors.append(f"row {i}: {f.name} not in allowed set")
  if unique_key and unique_key in row:
   key=row[unique_key]
   if key in seen: errors.append(f"row {i}: duplicate {unique_key}={key}")
   seen.add(key)
 return ValidationReport(len(rows),errors,warnings)

def deterministic_split(rows:list[dict],seed:int=17,test_fraction:float=.2):
 if not 0<test_fraction<1: raise ValueError("test_fraction must be between 0 and 1")
 shuffled=list(rows);random.Random(seed).shuffle(shuffled)
 cut=max(1,min(len(shuffled)-1,round(len(shuffled)*(1-test_fraction)))) if len(shuffled)>1 else len(shuffled)
 return shuffled[:cut],shuffled[cut:]

def fit_numeric_feature(train:list[dict],field:str):
 values=[float(r[field]) for r in train if r.get(field) is not None]
 if not values: raise DataContractError(f"no training values for {field}")
 mean=sum(values)/len(values)
 variance=sum((x-mean)**2 for x in values)/len(values)
 std=math.sqrt(variance) or 1.0
 return {"field":field,"mean":mean,"std":std,"fit_rows":len(values),"training_hash":canonical_hash(train)}

def transform_numeric(rows:list[dict],spec:dict,output:str|None=None):
 field=spec["field"];out=output or field+"_z"
 return [{**r,out:None if r.get(field) is None else (float(r[field])-spec["mean"])/spec["std"]} for r in rows]

def population_stability_index(reference:list[float],current:list[float],bins:int=5,epsilon:float=1e-6)->float:
 if not reference or not current: raise ValueError("both distributions must contain values")
 if bins<2: raise ValueError("bins must be >= 2")
 lo=min(reference);hi=max(reference)
 if lo==hi: return 0.0 if all(x==lo for x in current) else float("inf")
 edges=[lo+(hi-lo)*i/bins for i in range(bins+1)]
 def proportions(values):
  counts=[0]*bins
  for x in values:
   idx=0 if x<edges[0] else bins-1 if x>=edges[-1] else next(i for i in range(bins) if edges[i]<=x<edges[i+1])
   counts[idx]+=1
  return [(n/len(values))+epsilon for n in counts]
 a=proportions(reference);b=proportions(current)
 return sum((y-x)*math.log(y/x) for x,y in zip(a,b))

def build_manifest(rows,contract,feature_spec,source_version,code_revision,split_seed):
 manifest={"source_version":source_version,"code_revision":code_revision,"contract_hash":canonical_hash([asdict(f) for f in contract]),
           "raw_data_hash":canonical_hash(rows),"feature_spec":feature_spec,"split_seed":split_seed,"row_count":len(rows)}
 manifest["manifest_hash"]=canonical_hash(manifest)
 return manifest

def demo():
 rows=[{"id":i,"age":20+i,"spend":100+i*10,"label":i%2} for i in range(20)]
 contract=[Field("id","integer",minimum=0),Field("age","integer",minimum=0,maximum=120),Field("spend","number",minimum=0),Field("label","integer",allowed=(0,1))]
 report=validate_rows(rows,contract,"id")
 if not report.passed: raise DataContractError(report.errors)
 train,test=deterministic_split(rows)
 spec=fit_numeric_feature(train,"spend")
 manifest=build_manifest(rows,contract,spec,"customers-v3","git:abc123",17)
 return {"report":asdict(report),"train":len(train),"test":len(test),"feature":spec,"manifest":manifest}
if __name__=="__main__": print(json.dumps(demo(),indent=2))
