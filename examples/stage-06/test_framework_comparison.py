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
    return AgentResult("refund approved",[ToolCall("order_lookup",{"tenant_id":"tenant-a"})],[],False)
  with self.assertRaises(PermissionError):benchmark(Bad(),self.request,self.tools)
 def test_empty_answer_rejected(self):
  class Bad:
   name="bad"
   def run(self,request,tools):return AgentResult(" ",[],[])
  with self.assertRaises(ValueError):benchmark(Bad(),self.request,self.tools)
if __name__=="__main__":unittest.main()
