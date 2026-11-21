import os
import sqlite3
import tempfile
import unittest
from a2a_protocol import Artifact
from a2a_protocol_production import A2ATaskStore

class A2ATaskStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "a2a.db")
        self.store = A2ATaskStore(self.path, clock=lambda: 100.0)
        self.task = self.store.create_task("tenant-a", "ctx-1", {"role":"user","parts":[{"kind":"text","content":"review"}]}, "task-1")

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def artifact(self, artifact_id="artifact-1"):
        return Artifact(artifact_id, "Refund review", "application/json",
                        [{"kind":"data","content":'{"eligible":true}'}], ["orders/7","policy/refunds-v3"])

    def test_task_and_events_persist(self):
        self.store.transition("tenant-a", self.task, "working", 0)
        self.store.add_artifact("tenant-a", self.task, self.artifact())
        self.store.transition("tenant-a", self.task, "completed", 1)
        task = self.store.get_task("tenant-a", self.task, "ctx-1")
        self.assertEqual(task["status"], "completed")
        self.assertEqual(len(task["artifacts"]), 1)
        self.assertEqual([x["sequence"] for x in self.store.events("tenant-a", self.task)], [1,2,3,4])

    def test_tenant_and_context_isolation(self):
        with self.assertRaises(KeyError): self.store.get_task("tenant-b", self.task)
        with self.assertRaises(KeyError): self.store.get_task("tenant-a", self.task, "wrong-context")
        with self.assertRaises(KeyError): self.store.events("tenant-b", self.task)

    def test_optimistic_version_conflict(self):
        self.store.transition("tenant-a", self.task, "working", 0)
        with self.assertRaises(RuntimeError): self.store.transition("tenant-a", self.task, "completed", 0)

    def test_invalid_transition_and_terminal_artifact_rejected(self):
        with self.assertRaises(ValueError): self.store.transition("tenant-a", self.task, "completed", 0)
        self.store.transition("tenant-a", self.task, "working", 0)
        self.store.transition("tenant-a", self.task, "completed", 1)
        with self.assertRaises(ValueError): self.store.add_artifact("tenant-a", self.task, self.artifact())

    def test_duplicate_artifact_id_rejected(self):
        self.store.transition("tenant-a", self.task, "working", 0)
        self.store.add_artifact("tenant-a", self.task, self.artifact())
        with self.assertRaises(ValueError): self.store.add_artifact("tenant-a", self.task, self.artifact())

    def test_push_callback_dedup_and_tenant_scope(self):
        url = "https://callbacks.example.com/a2a"
        first = self.store.receive_push("tenant-a", self.task, "evt-1", url, {"callbacks.example.com"}, {"status":"working"})
        retry = self.store.receive_push("tenant-a", self.task, "evt-1", url, {"callbacks.example.com"}, {"status":"working"})
        self.assertFalse(first["duplicate"]); self.assertTrue(retry["duplicate"])
        with self.assertRaises(KeyError):
            self.store.receive_push("tenant-b", self.task, "evt-2", url, {"callbacks.example.com"}, {"status":"working"})

    def test_callback_event_cannot_be_replayed_against_another_task(self):
        other = self.store.create_task("tenant-a", "ctx-2", {"parts":[{"kind":"text"}]}, "task-2")
        url = "https://callbacks.example.com/a2a"
        self.store.receive_push("tenant-a", self.task, "evt-1", url, {"callbacks.example.com"}, {})
        with self.assertRaises(ValueError):
            self.store.receive_push("tenant-a", other, "evt-1", url, {"callbacks.example.com"}, {})

    def test_reopen_persistence(self):
        self.store.transition("tenant-a", self.task, "working", 0)
        self.store.close()
        self.store = A2ATaskStore(self.path, clock=lambda: 101.0)
        self.assertEqual(self.store.get_task("tenant-a", self.task)["status"], "working")
        self.assertEqual(len(self.store.events("tenant-a", self.task)), 2)

if __name__ == "__main__":
    unittest.main()
