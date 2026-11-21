"""Framework-neutral benchmark contract for comparing agent frameworks fairly."""
from dataclasses import dataclass
from typing import Protocol

@dataclass
class ToolCall:
    name:str
    arguments:dict

@dataclass
class AgentResult:
    answer:str
    tool_calls:list
    citations:list
    approval_required:bool=False
    trace:list|None=None

class FrameworkAdapter(Protocol):
    name:str
    def run(self,request:dict,tools:dict)->AgentResult: ...

ALLOWED_TOOLS={"order_lookup","policy_search","refund_quote"}

def validate_result(result,request,tools,max_tool_calls=4):
    if not isinstance(result,AgentResult): raise TypeError("adapter must return AgentResult")
    if len(result.tool_calls)>max_tool_calls: raise ValueError("tool-call budget exceeded")
    for call in result.tool_calls:
        if call.name not in ALLOWED_TOOLS or call.name not in tools: raise PermissionError("tool is not allow-listed")
        if call.arguments.get("tenant_id")!=request["tenant_id"]: raise PermissionError("tenant scope mismatch")
    if request.get("intent")=="refund" and request.get("amount",0)>=10000 and not result.approval_required:
        raise PermissionError("high-value refund requires human approval")
    if not result.answer.strip(): raise ValueError("empty answer")
    return {"answer":result.answer,"tool_calls":[c.name for c in result.tool_calls],"citations":result.citations,"approval_required":result.approval_required}

class ReferenceAdapter:
    name="reference"
    def run(self,request,tools):
        tenant=request["tenant_id"]; calls=[]; trace=[]
        order=tools["order_lookup"]({"tenant_id":tenant,"order_id":request["order_id"]})
        calls.append(ToolCall("order_lookup",{"tenant_id":tenant,"order_id":request["order_id"]}))
        policy=tools["policy_search"]({"tenant_id":tenant,"topic":request["intent"]})
        calls.append(ToolCall("policy_search",{"tenant_id":tenant,"topic":request["intent"]}))
        quote=tools["refund_quote"]({"tenant_id":tenant,"amount":request.get("amount",0)})
        calls.append(ToolCall("refund_quote",{"tenant_id":tenant,"amount":request.get("amount",0)}))
        approval=request.get("intent")=="refund" and request.get("amount",0)>=10000
        trace.extend(["order_lookup","policy_search","refund_quote","policy_gate"])
        answer=f"Order {order['order_id']} is {order['status']}. Policy: {policy['summary']}. Quote: {quote['quote']}. "+("Human approval is required before execution." if approval else "No approval gate is required.")
        return AgentResult(answer,calls,[order["source"],policy["source"]],approval,trace)

def benchmark(adapter,request,tools,max_tool_calls=4):
    result=adapter.run(request,tools)
    normalized=validate_result(result,request,tools,max_tool_calls)
    return {"framework":adapter.name,"result":normalized,"trace":result.trace or [],"metrics":{"tool_calls":len(result.tool_calls),"citations":len(result.citations),"approval_gate":result.approval_required}}

def fake_tools():
    return {
      "order_lookup":lambda x:{"order_id":x["order_id"],"status":"shipped","source":"orders/ORD-7"},
      "policy_search":lambda x:{"summary":"Refunds require eligibility and may need finance review.","source":"policy/refunds-v3"},
      "refund_quote":lambda x:{"quote":f"₹{x['amount']}"}
    }

if __name__=="__main__":
    request={"tenant_id":"tenant-a","order_id":"ORD-7","intent":"refund","amount":12500}
    print(benchmark(ReferenceAdapter(),request,fake_tools()))
