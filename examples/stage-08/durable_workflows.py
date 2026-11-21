"""A compact durable-execution model with history replay and fenced activity leases."""
from dataclasses import dataclass
from copy import deepcopy
import json

class DurableWorkflowError(Exception): pass
class StaleWorker(DurableWorkflowError): pass
class LeaseBusy(DurableWorkflowError): pass

@dataclass
class HistoryEvent:
    sequence: int
    event_type: str
    payload: dict

class ReplayWorkflow:
    def __init__(self,workflow_id,code_version=1,history=None):
        self.workflow_id=workflow_id
        self.code_version=code_version
        self.history=list(history or [])
        self.state=self.replay()
    def append(self,event_type,payload):
        event=HistoryEvent(len(self.history)+1,event_type,deepcopy(payload))
        self.history.append(event)
        self.state=self.replay()
        return event
    def replay(self):
        state={"activities":{},"signals":{},"versions":{},"status":"running","continued_to":None}
        for event in self.history:
            p=event.payload
            if event.event_type=="ActivityScheduled":
                prior=state["activities"].get(p["activity_id"],{})
                state["activities"][p["activity_id"]]={"status":"scheduled","input":p["input"],"idempotency_key":p["idempotency_key"],"attempt":prior.get("attempt",0)+1}
            elif event.event_type=="ActivityCompleted":
                state["activities"][p["activity_id"]]={"status":"completed","result":p["result"],"idempotency_key":p["idempotency_key"]}
            elif event.event_type=="ActivityFailed":
                state["activities"].setdefault(p["activity_id"],{}).update({"status":"failed","error":p["error"]})
            elif event.event_type=="SignalReceived":
                state["signals"][p["signal_id"]]=p["payload"]
            elif event.event_type=="VersionMarker":
                state["versions"][p["change_id"]]=p["version"]
            elif event.event_type=="WorkflowContinuedAsNew":
                state["status"]="continued_as_new"
                state["continued_to"]=p["new_workflow_id"]
                state["compact_state"]=p["compact_state"]
        return state
    def schedule_activity(self,activity_id,activity_input,idempotency_key):
        prior=self.state["activities"].get(activity_id)
        if prior and prior.get("status")=="completed":
            if prior.get("idempotency_key")!=idempotency_key:raise DurableWorkflowError("activity key changed")
            return {"dispatch":False,"status":"completed","result":prior["result"]}
        if prior:
            if prior.get("idempotency_key")!=idempotency_key:raise DurableWorkflowError("activity key changed")
            if prior.get("status")!="failed":return {"dispatch":False,"status":prior["status"],"attempt":prior.get("attempt",1)}
        self.append("ActivityScheduled",{"activity_id":activity_id,"input":activity_input,"idempotency_key":idempotency_key})
        return {"dispatch":True,"status":"scheduled"}
    def complete_activity(self,activity_id,idempotency_key,result):
        prior=self.state["activities"].get(activity_id)
        if not prior or prior.get("idempotency_key")!=idempotency_key:raise DurableWorkflowError("activity was not scheduled with this key")
        if prior.get("status")=="completed":
            if prior["result"]!=result:raise DurableWorkflowError("completed activity result is immutable")
            return False
        self.append("ActivityCompleted",{"activity_id":activity_id,"idempotency_key":idempotency_key,"result":result})
        return True
    def fail_activity(self,activity_id,error):
        if activity_id not in self.state["activities"]:raise KeyError("activity not found")
        self.append("ActivityFailed",{"activity_id":activity_id,"error":str(error)})
    def signal(self,signal_id,payload):
        if signal_id in self.state["signals"]:return {"duplicate":True,"payload":self.state["signals"][signal_id]}
        self.append("SignalReceived",{"signal_id":signal_id,"payload":payload})
        return {"duplicate":False,"payload":payload}
    def version_marker(self,change_id,version):
        prior=self.state["versions"].get(change_id)
        if prior is not None and prior!=version:raise DurableWorkflowError("version marker changed for existing history")
        if prior is None:self.append("VersionMarker",{"change_id":change_id,"version":version})
        return version
    def continue_as_new(self,new_workflow_id,compact_state):
        if not new_workflow_id or new_workflow_id==self.workflow_id:raise ValueError("new workflow ID must be distinct")
        self.append("WorkflowContinuedAsNew",{"new_workflow_id":new_workflow_id,"compact_state":compact_state})
        return ReplayWorkflow(new_workflow_id,self.code_version,[HistoryEvent(1,"WorkflowStarted",{"continued_from":self.workflow_id,"compact_state":compact_state})])

class LeaseManager:
    def __init__(self,clock):
        self.clock=clock;self.leases={};self.fences={}
    def claim(self,task_id,worker_id,lease_seconds):
        if lease_seconds<=0:raise ValueError("lease duration must be positive")
        now=self.clock();prior=self.leases.get(task_id)
        if prior and prior["expires_at"]>now and prior["owner"]!=worker_id:raise LeaseBusy("task lease is held")
        token=self.fences.get(task_id,0)+1
        self.fences[task_id]=token
        self.leases[task_id]={"owner":worker_id,"expires_at":now+lease_seconds,"fence":token}
        return dict(self.leases[task_id])
    def heartbeat(self,task_id,worker_id,fence,lease_seconds):
        self.validate(task_id,worker_id,fence)
        self.leases[task_id]["expires_at"]=self.clock()+lease_seconds
        return dict(self.leases[task_id])
    def validate(self,task_id,worker_id,fence):
        lease=self.leases.get(task_id)
        if not lease or lease["expires_at"]<=self.clock() or lease["owner"]!=worker_id or lease["fence"]!=fence:
            raise StaleWorker("worker lease or fencing token is stale")
        return True

def demo():
    workflow=ReplayWorkflow("loan-42",3)
    print(workflow.schedule_activity("verify_identity",{"applicant":"A1"},"loan-42:verify"))
    workflow.complete_activity("verify_identity","loan-42:verify",{"verified":True,"provider_id":"idv-9"})
    restarted=ReplayWorkflow("loan-42",3,workflow.history)
    print(restarted.schedule_activity("verify_identity",{"applicant":"A1"},"loan-42:verify"))
    print(restarted.signal("approval-1",{"decision":"approved"}))
if __name__=="__main__":demo()
