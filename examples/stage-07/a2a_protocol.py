"""A2A v1.0.0 reference: Agent Cards, messages, tasks, artifacts and streaming."""
from copy import deepcopy
from uuid import uuid4

TERMINAL={"completed","failed","canceled","rejected"}
class A2AError(Exception):pass

def agent_card():
 return {"protocolVersion":"1.0.0","name":"Refund Specialist Agent","description":"Checks refund eligibility and produces a review artifact.","supportedInterfaces":[{"url":"https://refund-agent.example.com/a2a","protocolBinding":"JSONRPC","protocolVersion":"1.0.0"}],"capabilities":{"streaming":True,"pushNotifications":False},"securitySchemes":{"bearerAuth":{"type":"http","scheme":"bearer"}},"skills":[{"id":"refund-review","name":"Refund review","description":"Review a refund request and return evidence.","tags":["commerce","refund"],"examples":["Review order ORD-7"]}],"defaultInputModes":["text/plain","application/json"],"defaultOutputModes":["text/plain","application/json"]}

class A2AServer:
 def __init__(self,card=None):
  self.card=card or agent_card();self.tasks={};self.messages={}
 def send(self,message,context_id=None,task_id=None,auth=None):
  if not isinstance(message,dict) or message.get("role")!="user" or not message.get("parts"):raise A2AError("invalid message")
  if task_id:
   task=self.tasks.get(task_id)
   if task is None:raise A2AError("task not found")
   if context_id and context_id!=task["contextId"]:raise A2AError("task/context mismatch")
   if task["status"] in TERMINAL:raise A2AError("terminal task cannot accept messages")
   task["history"].append(message)
   task["status"]="working"
   return {"task":deepcopy(task)}
  context_id=context_id or "ctx-"+uuid4().hex[:10]
  new_id="task-"+uuid4().hex[:12]
  if message.get("metadata",{}).get("requiresAuth") and not auth:
   status="auth-required"
  else:
   status="working"
  task={"id":new_id,"contextId":context_id,"status":status,"history":[message],"artifacts":[],"statusMessage":"Authorization required" if status=="auth-required" else "Accepted"}
  self.tasks[new_id]=task
  return {"task":deepcopy(task)}
 def complete(self,task_id,text):
  task=self.tasks[task_id]
  if task["status"] in TERMINAL:raise A2AError("terminal task")
  artifact={"artifactId":"artifact-"+uuid4().hex[:8],"name":"refund-review","parts":[{"kind":"text","text":text}]}
  task["artifacts"].append(artifact);task["status"]="completed";task["statusMessage"]="Review completed"
  return deepcopy(task)
 def get_task(self,task_id,history_length=None):
  task=self.tasks.get(task_id)
  if task is None:raise A2AError("task not found")
  result=deepcopy(task)
  if history_length is not None:result["history"]=result["history"][-max(0,history_length):] if history_length else []
  return result
 def cancel(self,task_id):
  task=self.tasks.get(task_id)
  if task is None:raise A2AError("task not found")
  if task["status"] not in TERMINAL:task["status"]="canceled";task["statusMessage"]="Cancellation accepted"
  return deepcopy(task)
 def stream(self,message):
  if not self.card["capabilities"].get("streaming"):raise A2AError("streaming unsupported")
  created=self.send(message)["task"]
  yield {"kind":"task","task":created}
  task=self.complete(created["id"],"Refund eligibility: eligible; approval required before payment action.")
  yield {"kind":"status-update","taskId":task["id"],"status":task["status"],"final":True}
  yield {"kind":"artifact-update","taskId":task["id"],"artifact":task["artifacts"][0],"lastChunk":True}

class A2AClient:
 def __init__(self,card):self.card=card
 def select_interface(self,bindings=("JSONRPC",)):
  for interface in self.card.get("supportedInterfaces",[]):
   if interface["protocolBinding"] in bindings and interface["protocolVersion"]==self.card["protocolVersion"]:
    return interface
  raise A2AError("no compatible A2A interface")
 def can_stream(self):return bool(self.card.get("capabilities",{}).get("streaming"))
 def can_push(self):return bool(self.card.get("capabilities",{}).get("pushNotifications"))

if __name__=="__main__":
 card=agent_card();client=A2AClient(card);server=A2AServer(card)
 print("selected:",client.select_interface())
 result=server.send({"role":"user","parts":[{"kind":"text","text":"Review order ORD-7"}]})
 print("task:",result["task"]["id"],result["task"]["status"])
 print("completed:",server.complete(result["task"]["id"],"Eligible; approval required.")["status"])
