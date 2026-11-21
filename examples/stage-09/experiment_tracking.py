"""Local experiment tracker, dataset manifests and deterministic toy logistic regression."""
from dataclasses import dataclass,asdict
import hashlib
import json
import math
import random

class ExperimentError(Exception):pass

def validate_splits(train_ids,validation_ids,test_ids,dataset_ids=None):
    train=set(train_ids);validation=set(validation_ids);test=set(test_ids)
    if train&validation or train&test or validation&test:
        raise ExperimentError("dataset split leakage")
    if dataset_ids is not None and not (train|validation|test).issubset(set(dataset_ids)):
        raise ExperimentError("split contains unknown dataset row")
    return {"train":sorted(train),"validation":sorted(validation),"test":sorted(test)}

@dataclass(frozen=True)
class DatasetManifest:
    name:str
    version:str
    content_hash:str
    split_hash:str
    row_count:int
    schema:dict
    @classmethod
    def create(cls,name,version,records,splits,schema):
        ids=[row["id"] for row in records]
        normalized=validate_splits(splits["train"],splits["validation"],splits["test"],ids)
        content=json.dumps(records,sort_keys=True,separators=(",",":"),ensure_ascii=False)
        split=json.dumps(normalized,sort_keys=True,separators=(",",":"))
        return cls(name,version,hashlib.sha256(content.encode()).hexdigest(),
                   hashlib.sha256(split.encode()).hexdigest(),len(records),dict(schema))

def safe_metadata(value):
    forbidden={"password","token","secret","api_key","authorization","access_token"}
    if isinstance(value,dict):
        result={}
        for key,item in value.items():
            if key.lower() in forbidden:raise ExperimentError("sensitive metadata key rejected")
            result[key]=safe_metadata(item)
        return result
    if isinstance(value,list):return [safe_metadata(x) for x in value]
    return value

class LocalTracker:
    def __init__(self):
        self.runs={}
    def start_run(self,experiment,run_id,metadata,dataset,metric_protocol):
        if run_id in self.runs:raise ExperimentError("run ID already exists")
        self.runs[run_id]={"experiment":experiment,"metadata":safe_metadata(metadata),"dataset":asdict(dataset),
          "metric_protocol":metric_protocol,"params":{},"metrics":{},"artifacts":{},"status":"running"}
        return run_id
    def log_param(self,run_id,key,value):
        run=self.runs[run_id]
        if run["status"]!="running":raise ExperimentError("run is not active")
        value=safe_metadata(value)
        if key in run["params"] and run["params"][key]!=value:raise ExperimentError("run parameters are immutable")
        run["params"][key]=value
    def log_metric(self,run_id,key,value,step):
        run=self.runs[run_id]
        if run["status"]!="running":raise ExperimentError("run is not active")
        if not isinstance(value,(int,float)) or not math.isfinite(value):raise ExperimentError("metric must be finite numeric")
        history=run["metrics"].setdefault(key,[])
        if history and step<=history[-1]["step"]:raise ExperimentError("metric steps must increase")
        history.append({"step":step,"value":float(value)})
    def log_artifact(self,run_id,name,content,media_type="application/octet-stream"):
        run=self.runs[run_id]
        if run["status"]!="running":raise ExperimentError("run is not active")
        raw=content.encode() if isinstance(content,str) else bytes(content)
        run["artifacts"][name]={"sha256":hashlib.sha256(raw).hexdigest(),"size":len(raw),"media_type":media_type}
    def finish_run(self,run_id,status="finished"):
        if status not in {"finished","failed","killed"}:raise ValueError("invalid run status")
        self.runs[run_id]["status"]=status
    def compare(self,run_a,run_b,metric):
        a=self.runs[run_a];b=self.runs[run_b]
        if a["dataset"]["content_hash"]!=b["dataset"]["content_hash"] or a["dataset"]["split_hash"]!=b["dataset"]["split_hash"] or a["metric_protocol"]!=b["metric_protocol"]:
            raise ExperimentError("runs do not share the same evaluation protocol")
        return {"metric":metric,"a":a["metrics"][metric][-1]["value"],"b":b["metrics"][metric][-1]["value"],
                "delta":b["metrics"][metric][-1]["value"]-a["metrics"][metric][-1]["value"]}

def sigmoid(value):
    if value>=0:
        z=math.exp(-value);return 1/(1+z)
    z=math.exp(value);return z/(1+z)

def train_logistic_regression(records,seed=42,learning_rate=0.1,epochs=12):
    rows=list(records);random.Random(seed).shuffle(rows)
    split=max(1,int(len(rows)*0.75));train=rows[:split];validation=rows[split:] or rows[-1:]
    weight=0.0;bias=0.0;history=[]
    for epoch in range(1,epochs+1):
        grad_w=0.0;grad_b=0.0;loss=0.0
        for row in train:
            probability=sigmoid(weight*row["x"]+bias)
            error=probability-row["y"]
            grad_w+=error*row["x"];grad_b+=error
            loss-=row["y"]*math.log(max(probability,1e-12))+(1-row["y"])*math.log(max(1-probability,1e-12))
        weight-=learning_rate*grad_w/len(train);bias-=learning_rate*grad_b/len(train)
        correct=0
        for row in validation:
            prediction=1 if sigmoid(weight*row["x"]+bias)>=0.5 else 0
            correct+=prediction==row["y"]
        history.append({"epoch":epoch,"train_loss":loss/len(train),"validation_accuracy":correct/len(validation)})
    return {"weights":{"weight":weight,"bias":bias},"history":history,"train_rows":len(train),"validation_rows":len(validation)}

def demo():
    records=[{"id":str(i),"x":float(i-6),"y":int(i>=6)} for i in range(12)]
    splits={"train":[str(i) for i in range(8)],"validation":["8","9"],"test":["10","11"]}
    manifest=DatasetManifest.create("sentiment-toy","v1",records,splits,{"x":"float","y":"binary"})
    tracker=LocalTracker();tracker.start_run("sentiment","run-1",{"git_commit":"8f3a","seed":42},manifest,"accuracy-v1")
    result=train_logistic_regression(records)
    tracker.log_param("learning_rate",0.1)
    for item in result["history"]:
        tracker.log_metric("validation_accuracy",item["validation_accuracy"],item["epoch"])
    tracker.log_artifact("model.json",json.dumps(result["weights"]),"application/json")
    tracker.finish_run("run-1")
    print(manifest);print(result["history"][-1])
if __name__=="__main__":demo()
