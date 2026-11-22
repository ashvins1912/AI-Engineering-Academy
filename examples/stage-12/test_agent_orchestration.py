import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "agent_orchestration.py"
spec = importlib.util.spec_from_file_location("stage12_agent_orchestration", MODULE_PATH)
engine = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = engine
spec.loader.exec_module(engine)

Task = engine.Task
Checkpoint = engine.Checkpoint
AgentOrchestrator = engine.AgentOrchestrator
PlanError = engine.PlanError


class AgentOrchestrationTests(unittest.TestCase):
    def test_dependency_order_and_checkpoint(self):
        events = []
        handlers = {name: (lambda task, name=name: events.append(name) or name)
                    for name in ("plan", "retrieve", "answer")}
        tasks = [Task("plan", "plan"), Task("retrieve", "retrieve", ("plan",)),
                 Task("answer", "answer", ("retrieve",))]
        journal = AgentOrchestrator(tasks, handlers).run()
        self.assertEqual(events, ["plan", "retrieve", "answer"])
        self.assertEqual(journal.records["answer"].result, "answer")
        restored = Checkpoint.restore(journal.snapshot())
        resumed = AgentOrchestrator(tasks, handlers).run(restored)
        self.assertEqual(resumed.records["answer"].attempts, 1)
        self.assertEqual(events, ["plan", "retrieve", "answer"])

    def test_cycle_is_rejected(self):
        with self.assertRaisesRegex(PlanError, "DEPENDENCY_CYCLE"):
            AgentOrchestrator([Task("a", "x", ("b",)), Task("b", "x", ("a",))],
                              {"x": lambda task: None})

    def test_unknown_dependency_is_rejected(self):
        with self.assertRaisesRegex(PlanError, "UNKNOWN_DEPENDENCY"):
            AgentOrchestrator([Task("a", "x", ("missing",))], {"x": lambda task: None})

    def test_duplicate_task_id_is_rejected(self):
        with self.assertRaisesRegex(PlanError, "DUPLICATE_OR_EMPTY_TASK_ID"):
            AgentOrchestrator([Task("a", "x"), Task("a", "x")], {"x": lambda task: None})

    def test_unknown_action_is_rejected(self):
        with self.assertRaisesRegex(PlanError, "UNKNOWN_ACTION"):
            AgentOrchestrator([Task("a", "missing")], {})

    def test_retry_succeeds_after_transient_failure(self):
        attempts = []
        def flaky(task):
            attempts.append(task.task_id)
            if len(attempts) == 1:
                raise RuntimeError("temporary")
            return "ok"
        journal = AgentOrchestrator([Task("a", "flaky", max_attempts=2)],
                                    {"flaky": flaky}).run()
        self.assertEqual(journal.records["a"].status, "SUCCEEDED")
        self.assertEqual(journal.records["a"].attempts, 2)

    def test_failure_blocks_dependent_task(self):
        events = []
        def fail(task):
            raise RuntimeError("provider unavailable")
        tasks = [Task("a", "fail"), Task("b", "side_effect", ("a",))]
        journal = AgentOrchestrator(tasks, {"fail": fail,
            "side_effect": lambda task: events.append("ran")}, max_workers=1).run()
        self.assertEqual(journal.records["a"].status, "FAILED")
        self.assertEqual(journal.records["b"].error, "DEPENDENCY_FAILED")
        self.assertEqual(events, [])

    def test_idempotency_prevents_duplicate_side_effect_on_resume(self):
        calls = []
        ledger = engine.IdempotencyLedger()
        tasks = [Task("a", "write")]
        handlers = {"write": lambda task: calls.append("write") or {"id": 7}}
        first = AgentOrchestrator(tasks, handlers, ledger=ledger).run()
        second = AgentOrchestrator(tasks, handlers, ledger=ledger).run(
            Checkpoint.restore(first.snapshot()))
        self.assertEqual(calls, ["write"])
        self.assertEqual(second.records["a"].result, {"id": 7})

    def test_idempotency_payload_mismatch_fails(self):
        ledger = engine.IdempotencyLedger()
        ledger.execute_once("key", {"x": 1}, lambda: "first")
        with self.assertRaisesRegex(PlanError, "IDEMPOTENCY_PAYLOAD_MISMATCH"):
            ledger.execute_once("key", {"x": 2}, lambda: "second")

    def test_nonpositive_worker_bound_rejected(self):
        with self.assertRaisesRegex(ValueError, "MAX_WORKERS_MUST_BE_POSITIVE"):
            AgentOrchestrator([], {}, max_workers=0)

    def test_nonterminal_checkpoint_rejected(self):
        with self.assertRaisesRegex(PlanError, "CHECKPOINT_HAS_NONTERMINAL_STATE"):
            AgentOrchestrator([Task("a", "x")], {"x": lambda task: None}).run(
                Checkpoint({"a": engine.TaskRecord(status="RUNNING")}))


if __name__ == "__main__":
    unittest.main()
