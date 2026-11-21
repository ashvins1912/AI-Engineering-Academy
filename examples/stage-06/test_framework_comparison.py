import unittest
from framework_comparison import AgentResult,ToolCall,ReferenceAdapter,benchmark,fake_tools

class FrameworkComparisonTests(unittest.TestCase):
 def setUp(self):
  self.request={"tenant_id":"tenant-a","order_id":"ORD-7","intent":"refund","amount":12500}
  self.tools=fake_tools()
 def test_reference_adapter_returns_traceable_cited_answer_and_approval(self):
  result=benchmark(ReferenceAdapter(),self.request,self.tools)
  self.assertEqual(result["metrics"]["tool_calls"],3)
  self.assertEqual(result["metrics"]["citations"],2)
  self.assertTrue(result["metrics"]["approval_gate"])
  self.assertIn("Human approval is required",result["result"]["answer"])
 def test_tenant_mismatch_rejected(self):
  class Bad:
   name="bad"
   def run(self,request,tools):
    return AgentResult("answer",[ToolCall("order_lookup",{"tenant_id":"other"})],[])
  with self.assertRaises(PermissionError):benchmark(Bad(),self.request,self.tools)
 def test_unregistered_tool_rejected(self):
  class Bad:
   name="bad"
   def run(self,request,tools):
    return AgentResult("answer",[ToolCall("shell",{"tenant_id":"tenant-a"})],[])
  with self.assertRaises(PermissionError):benchmark(Bad(),self.request,self.tools)
 def test_tool_budget_rejected(self):
  class Bad:
   name="bad"
   def run(self,request,tools):
    return AgentResult("answer",[ToolCall("order_lookup",{"tenant_id":"tenant-a"})]*5,[])
  with self.assertRaises(ValueError):benchmark(Bad(),self.request,self.tools,max_tool_calls=4)
 def test_high_value_refund_requires_approval(self):
  class Bad:
   name="bad"
   def run(self,request,tools):
    args={"tenant_id":"tenant-a","order_id":"ORD-7"}
    tools["order_lookup"](args)
    return AgentResult("refund approved",[ToolCall("order_lookup",args)],[],False)
  with self.assertRaises(PermissionError):benchmark(Bad(),self.request,self.tools)
 def test_gateway_blocks_cross_tenant_before_domain_side_effect(self):
  invoked=[]
  tools=dict(self.tools)
  tools["order_lookup"]=lambda args: invoked.append(args) or {"order_id":"ORD-7"}
  class Bad:
   name="cross-tenant"
   def run(self,request,gateway):
    gateway["order_lookup"]({"tenant_id":"tenant-b","order_id":"ORD-7"})
    return AgentResult("answer",[],[])
  with self.assertRaises(PermissionError):benchmark(Bad(),self.request,tools)
  self.assertEqual(invoked,[])
 def test_adapter_cannot_claim_unexecuted_tool_call(self):
  class Bad:
   name="fabricated-call"
   def run(self,request,gateway):
    return AgentResult("answer",[ToolCall("order_lookup",{"tenant_id":"tenant-a"})],[])
  with self.assertRaises(ValueError):benchmark(Bad(),self.request,self.tools)
 def test_gateway_enforces_call_budget_before_second_tool(self):
  invoked=[]
  tools=dict(self.tools)
  tools["order_lookup"]=lambda args: invoked.append(args) or {"order_id":"ORD-7"}
  class Bad:
   name="over-budget"
   def run(self,request,gateway):
    gateway["order_lookup"]({"tenant_id":"tenant-a","order_id":"1"})
    gateway["order_lookup"]({"tenant_id":"tenant-a","order_id":"2"})
    return AgentResult("answer",[],[])
  with self.assertRaises(ValueError):benchmark(Bad(),self.request,tools,max_tool_calls=1)
  self.assertEqual(len(invoked),1)
 def test_empty_answer_rejected(self):
  class Bad:
   name="bad"
   def run(self,request,tools):return AgentResult(" ",[],[])
  with self.assertRaises(ValueError):benchmark(Bad(),self.request,self.tools)
if __name__=="__main__":unittest.main()
