"""MCP 2026-07-28 advanced flows: MRTR, Tasks extension, progress and deprecation guidance."""
import base64,hashlib,hmac,json
class RequestStateError(ValueError):pass

class RequestStateSigner:
 def __init__(self,secret,ttl_seconds=300):
  if len(secret)<16:raise ValueError("request-state secret must be at least 16 bytes")
  self.secret=secret.encode();self.ttl=ttl_seconds
 def issue(self,payload,now):
  body={**payload,"exp":now+self.ttl}
  raw=json.dumps(body,sort_keys=True,separators=(",",":")).encode()
  encoded=base64.urlsafe_b64encode(raw).decode().rstrip("=")
  signature=base64.urlsafe_b64encode(hmac.new(self.secret,encoded.encode(),hashlib.sha256).digest()).decode().rstrip("=")
  return encoded+"."+signature
 def verify(self,token,now):
  try:encoded,signature=token.split(".",1)
  except ValueError as e:raise RequestStateError("malformed requestState") from e
  expected=base64.urlsafe_b64encode(hmac.new(self.secret,encoded.encode(),hashlib.sha256).digest()).decode().rstrip("=")
  if not hmac.compare_digest(signature,expected):raise RequestStateError("requestState signature mismatch")
  raw=base64.urlsafe_b64decode(encoded+"="*((4-len(encoded)%4)%4))
  payload=json.loads(raw)
  if now>=payload["exp"]:raise RequestStateError("requestState expired")
  return payload

class MultiRoundTripEngine:
 def __init__(self,signer,max_rounds=4):self.signer=signer;self.max_rounds=max_rounds
 def start(self,call_id,order_id,amount,now,round_number=1):
  if round_number>self.max_rounds:raise RequestStateError("maximum round trips exceeded")
  token=self.signer.issue({"call_id":call_id,"order_id":order_id,"amount":amount,"round":round_number},now)
  return {"resultType":"input_required","inputRequests":{"refund_approval":{"method":"elicitation/create","params":{"mode":"form","message":f"Approve refund of INR {amount} for {order_id}?","requestedSchema":{"type":"object","properties":{"approved":{"type":"boolean"},"reason":{"type":"string"}},"required":["approved"]}}}},"requestState":token}
 def resume(self,request_state,input_responses,now):
  state=self.signer.verify(request_state,now)
  if state["round"]>self.max_rounds:raise RequestStateError("maximum round trips exceeded")
  response=input_responses.get("refund_approval")
  if not response:return self.start(state["call_id"],state["order_id"],state["amount"],now,state["round"]+1)
  if response.get("kind")!="elicit":raise RequestStateError("unexpected input response kind")
  if response.get("action") in {"decline","cancel"}:
   return {"resultType":"complete","status":"CANCELLED","reason":"user declined or cancelled"}
  content=response.get("content",{})
  if not isinstance(content.get("approved"),bool):raise RequestStateError("approved must be boolean")
  if not content["approved"]:return {"resultType":"complete","status":"REJECTED","reason":content.get("reason","not approved")}
  return {"resultType":"complete","status":"APPROVED_FOR_REVIEW","order_id":state["order_id"],"amount":state["amount"],"note":"This approval does not itself execute the refund."}

class TaskManager:
 def __init__(self):self.tasks={};self.subscriptions={}
 def create(self,task_id,tenant_id):
  if task_id in self.tasks:raise ValueError("duplicate task")
  self.tasks[task_id]={"taskId":task_id,"tenantId":tenant_id,"status":"working","progress":0,"result":None}
  return self.get(task_id,tenant_id)
 def get(self,task_id,tenant_id):
  task=self.tasks.get(task_id)
  if task is None or task["tenantId"]!=tenant_id:raise KeyError("task not found")
  return dict(task)
 def update(self,task_id,tenant_id,status,result=None):
  task=self.tasks.get(task_id)
  if task is None or task["tenantId"]!=tenant_id:raise KeyError("task not found")
  if task["status"] in {"completed","failed","cancelled"}:raise ValueError("terminal task cannot be updated")
  if status not in {"working","input_required","completed","failed","cancelled"}:raise ValueError("invalid task status")
  task["status"]=status;task["result"]=result if status=="completed" else task["result"]
  return self.get(task_id,tenant_id)
 def cancel(self,task_id,tenant_id):
  task=self.tasks.get(task_id)
  if task is None or task["tenantId"]!=tenant_id:raise KeyError("task not found")
  if task["status"] not in {"completed","failed","cancelled"}:task["cancelRequested"]=True
  return self.get(task_id,tenant_id)
 def subscribe(self,client_id,task_ids):
  self.subscriptions[client_id]=set(task_ids);return {"acknowledged":sorted(task_ids)}
 def notifications(self,client_id):
  ids=self.subscriptions.get(client_id,set())
  return [self.get(task_id,self.tasks[task_id]["tenantId"]) for task_id in sorted(ids) if task_id in self.tasks]

class ProgressReporter:
 def __init__(self):self.progress=0
 def update(self,value):
  if value<self.progress or value<0 or value>1:raise ValueError("progress must be monotonic between 0 and 1")
  self.progress=value
  return {"method":"notifications/progress","params":{"progress":value,"total":1}}

def deprecated_capability_guidance():
 return {"roots":{"deprecated":True,"replacement":"explicit tool parameters, resource URIs or server configuration"},"sampling":{"deprecated":True,"replacement":"direct LLM provider API integration"},"logging":{"deprecated":True,"replacement":"stderr for STDIO and OpenTelemetry for structured telemetry"}}

if __name__=="__main__":
 engine=MultiRoundTripEngine(RequestStateSigner("academy-demo-secret-32-bytes-long"))
 first=engine.start("call-1","ORD-7",12500,100)
 final=engine.resume(first["requestState"],{"refund_approval":{"kind":"elicit","action":"accept","content":{"approved":True}}},101)
 print(first["resultType"],"→",final["status"])
