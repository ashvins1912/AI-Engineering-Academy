import importlib.util
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).parent / "agent_orchestration"
sys.path.insert(0, str(ROOT))
from task_graph import PlanError, TaskSpec, validate_plan
from durable_runtime import ExecutionJournal, TaskCoordinator


class TaskGraphTests(unittest.TestCase):
    def test_topological_order_respects_dependencies(self):
        tasks = [TaskSpec("b", "op", ("a",)), TaskSpec("a", "op"), TaskSpec("c", "op", ("b",))]
        ordered = validate_plan(tasks)
        positions = {task.task_id: index for index, task in enumerate(ordered)}
        self.assertLess(positions["a"], positions["b"])
        self.assertLess(positions["b"], positions["c"])

    def test_duplicate_task_id_rejected(self):
        with self.assertRaisesRegex(PlanError, "DUPLICATE_TASK_ID"):
            validate_plan([TaskSpec("a", "op"), TaskSpec("a", "op")])

    def test_missing_dependency_rejected(self):
        with self.assertRaisesRegex(PlanError, "UNKNOWN_DEPENDENCY"):
            validate_plan([TaskSpec("a", "op", ("missing",))])

    def test_cycle_rejected(self):
        with self.assertRaisesRegex(PlanError, "DEPENDENCY_CYCLE"):
            validate_plan([TaskSpec("a", "op", ("b",)), TaskSpec("b", "op", ("a",))])

    def test_negative_retry_rejected(self):
        with self.assertRaisesRegex(PlanError, "NEGATIVE_RETRY_LIMIT"):
            validate_plan([TaskSpec("a", "op", retry_limit=-1)])


class DurableCoordinatorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.journal_path = Path(self.tmp.name) / "state" / "journal.json"

    def test_bounded_parallel_execution_and_dependency_barrier(self):
        lock = threading.Lock()
        active = 0
        maximum = 0
        parallel_start = threading.Barrier(2)
        def op(payload, key, journal):
            nonlocal active, maximum
            with lock:
                active += 1
                maximum = max(maximum, active)
            if payload["name"] in {"a", "b"}:
                parallel_start.wait(timeout=2)
            time.sleep(0.005)
            with lock:
                active -= 1
            return {"task": payload["name"]}
        tasks = [
            TaskSpec("a", "op", payload={"name": "a"}),
            TaskSpec("b", "op", payload={"name": "b"}),
            TaskSpec("c", "op", ("a", "b"), {"name": "c"}),
        ]
        result = TaskCoordinator(tasks, {"op": op}, ExecutionJournal(self.journal_path), max_workers=2).run()
        self.assertEqual(result["status"], "completed")
        self.assertEqual(maximum, 2)
        self.assertLessEqual(result["max_in_flight"], 2)
        self.assertEqual(result["tasks"]["c"]["status"], "completed")

    def test_retry_is_bounded_and_eventually_succeeds(self):
        calls = 0
        def flaky(payload, key, journal):
            nonlocal calls
            calls += 1
            if calls == 1:
                raise RuntimeError("temporary")
            return {"ok": True}
        task = TaskSpec("retry", "flaky", retry_limit=1)
        result = TaskCoordinator([task], {"flaky": flaky}, ExecutionJournal(self.journal_path)).run()
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["tasks"]["retry"]["attempts"], 2)

    def test_retry_exhaustion_fails_and_blocks_dependents(self):
        def broken(payload, key, journal):
            raise RuntimeError("permanent")
        tasks = [TaskSpec("a", "broken", retry_limit=1), TaskSpec("b", "broken", ("a",))]
        result = TaskCoordinator(tasks, {"broken": broken}, ExecutionJournal(self.journal_path)).run()
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["tasks"]["a"]["attempts"], 2)
        self.assertEqual(result["tasks"]["b"]["status"], "blocked")

    def test_checkpoint_resume_skips_completed_tasks(self):
        calls = []
        def op(payload, key, journal):
            calls.append(key)
            return {"done": payload["value"]}
        tasks = [TaskSpec("a", "op", payload={"value": 1}), TaskSpec("b", "op", ("a",), {"value": 2})]
        journal = ExecutionJournal(self.journal_path)
        first = TaskCoordinator(tasks, {"op": op}, journal).run()
        second = TaskCoordinator(tasks, {"op": op}, ExecutionJournal(self.journal_path)).run()
        self.assertEqual(first["status"], "completed")
        self.assertEqual(second["status"], "completed")
        self.assertEqual(calls, ["task:a", "task:b"])

    def test_interrupted_running_task_is_resumed(self):
        journal = ExecutionJournal(self.journal_path)
        journal.update_task("a", status="running", attempts=1)
        calls = []
        def op(payload, key, journal):
            calls.append(key)
            return {"recovered": True}
        result = TaskCoordinator([TaskSpec("a", "op")], {"op": op}, journal).run()
        self.assertEqual(result["status"], "completed")
        self.assertEqual(calls, ["task:a"])

    def test_idempotency_replay_returns_original_result(self):
        calls = []
        journal = ExecutionJournal(self.journal_path)
        payload = {"order": "A-17", "state": "approved"}
        first = journal.apply_once("order:A-17:approve", payload, lambda: calls.append("write") or {"version": 3})
        second = journal.apply_once("order:A-17:approve", payload, lambda: calls.append("duplicate") or {"version": 4})
        self.assertEqual(first, ({"version": 3}, True))
        self.assertEqual(second, ({"version": 3}, False))
        self.assertEqual(calls, ["write"])

    def test_idempotency_key_cannot_be_reused_for_different_payload(self):
        journal = ExecutionJournal(self.journal_path)
        journal.apply_once("same-key", {"amount": 10}, lambda: {"ok": True})
        with self.assertRaisesRegex(ValueError, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD"):
            journal.apply_once("same-key", {"amount": 1000}, lambda: {"ok": True})

    def test_compensates_completed_work_in_reverse_order(self):
        events = []
        def run(payload, key, journal):
            events.append("run:" + payload["name"])
            return {"name": payload["name"]}
        def undo(payload, key, journal):
            events.append("undo:" + payload["task_id"])
            return {"undone": payload["task_id"]}
        def fail(payload, key, journal):
            raise RuntimeError("injected failure")
        tasks = [
            TaskSpec("a", "run", payload={"name": "a"}, compensation="undo"),
            TaskSpec("b", "run", ("a",), {"name": "b"}, compensation="undo"),
            TaskSpec("c", "fail", ("b",)),
        ]
        result = TaskCoordinator(tasks, {"run": run, "undo": undo, "fail": fail},
                                  ExecutionJournal(self.journal_path)).run()
        self.assertEqual(result["status"], "failed")
        self.assertEqual(events, ["run:a", "run:b", "undo:b", "undo:a"])
        self.assertEqual(result["compensated"], ["b", "a"])

    def test_operation_must_be_registered(self):
        with self.assertRaisesRegex(PlanError, "UNREGISTERED_OPERATION"):
            TaskCoordinator([TaskSpec("a", "shell")], {}, ExecutionJournal(self.journal_path))


if __name__ == "__main__":
    unittest.main()
