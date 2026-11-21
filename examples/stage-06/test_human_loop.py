import unittest
from human_loop import ApprovalRequest, decide, may_execute, action_hash

class ApprovalTests(unittest.TestCase):
    def setUp(self):
        self.action={"order":"ORD-42","amount":12500}
        self.r=ApprovalRequest("APR-1","acme","agent",self.action,12,{"finance"},2,200)
    def test_two_distinct_reviewers_required(self):
        self.assertEqual(decide(self.r,"f1","finance","APPROVE",100),"PENDING")
        self.assertEqual(decide(self.r,"f2","finance","APPROVE",101),"APPROVED")
        self.assertTrue(may_execute(self.r,self.action,12,102))
    def test_self_approval_and_wrong_role(self):
        with self.assertRaises(PermissionError): decide(self.r,"agent","finance","APPROVE",100)
        with self.assertRaises(PermissionError): decide(self.r,"f1","support","APPROVE",100)
    def test_duplicate_reviewer_and_rejection(self):
        decide(self.r,"f1","finance","APPROVE",100)
        with self.assertRaises(ValueError): decide(self.r,"f1","finance","APPROVE",101)
        self.assertEqual(decide(self.r,"f2","finance","REJECT",102),"REJECTED")
    def test_changed_payload_version_and_expiry(self):
        with self.assertRaises(ValueError): decide(self.r,"f1","finance","APPROVE",100,current_action={"order":"ORD-42","amount":80000})
        with self.assertRaises(ValueError): decide(self.r,"f1","finance","APPROVE",100,current_version=13)
        with self.assertRaises(ValueError): decide(self.r,"f1","finance","APPROVE",200)
    def test_canonical_hash(self):
        self.assertEqual(action_hash({"a":1,"b":2}),action_hash({"b":2,"a":1}))

if __name__ == "__main__": unittest.main()
