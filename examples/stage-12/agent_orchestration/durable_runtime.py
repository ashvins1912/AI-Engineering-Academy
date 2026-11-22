"""Local durable task coordinator with bounded concurrency and checkpoints.

The runtime accepts only explicitly registered operations. It is an educational
reference, not a distributed workflow engine or a secure code sandbox.
"""
from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
import threading
import time
from typing import Callable

from task_graph import PlanError, TaskSpec, validate_plan

Operation = Callable[[dict, str, "ExecutionJournal"], dict]


class ExecutionJournal:
    """Atomic JSON checkpoint and local idempotency ledger.

    The operation callback runs while the ledger lock is held. For real external
    side effects, use the destination system's own idempotency/transaction API;
    a local file cannot make a remote side effect and local checkpoint atomic.
    """
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        if self.path.exists():
            self.data = json.loads(self.path.read_text(encoding="utf-8"))
            if self.data.get("version") != 1:
                raise ValueError("UNSUPPORTED_JOURNAL_VERSION")
        else:
            self.data = {"version": 1, "tasks": {}, "idempotency": {}}
            self._save()

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix=self.path.name + ".", dir=self.path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(self.data, handle, sort_keys=True)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_name, self.path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)

    def task(self, task_id: str) -> dict:
        with self._lock:
            return dict(self.data["tasks"].get(task_id, {"status": "pending", "attempts": 0}))

    def update_task(self, task_id: str, **fields) -> None:
        with self._lock:
            current = self.data["tasks"].setdefault(task_id, {"status": "pending", "attempts": 0})
            current.update(fields)
            self._save()

    def apply_once(self, key: str, payload: dict, operation: Callable[[], dict]) -> tuple[dict, bool]:
        if not key:
            raise ValueError("IDEMPOTENCY_KEY_REQUIRED")
        digest = sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        with self._lock:
            previous = self.data["idempotency"].get(key)
            if previous:
                if previous["digest"] != digest:
                    raise ValueError("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD")
                return previous["result"], False
            result = operation()
            # Persist the result before returning it to the task coordinator.
            self.data["idempotency"][key] = {"digest": digest, "result": result}
            self._save()
            return result, True


class TaskCoordinator:
    def __init__(self, tasks: list[TaskSpec], operations: dict[str, Operation],
                 journal: ExecutionJournal, max_workers: int = 2):
        if max_workers < 1:
            raise ValueError("MAX_WORKERS_MUST_BE_POSITIVE")
        self.ordered = validate_plan(tasks)
        self.tasks = {task.task_id: task for task in self.ordered}
        self.operations = operations
        self.journal = journal
        self.max_workers = max_workers
        for task in self.ordered:
            if task.operation not in operations:
                raise PlanError(f"UNREGISTERED_OPERATION:{task.operation}")
            if task.compensation and task.compensation not in operations:
                raise PlanError(f"UNREGISTERED_COMPENSATION:{task.compensation}")
        self.max_observed_in_flight = 0

    def _execute(self, task: TaskSpec) -> tuple[str, dict | None, str | None]:
        existing = self.journal.task(task.task_id)
        if existing.get("status") == "completed":
            return task.task_id, existing.get("result"), None
        attempts = int(existing.get("attempts", 0))
        while attempts <= task.retry_limit:
            attempts += 1
            self.journal.update_task(task.task_id, status="running", attempts=attempts, last_error=None)
            try:
                payload = task.payload or {}
                key = f"task:{task.task_id}"
                result, _created = self.journal.apply_once(
                    key, payload,
                    lambda: self.operations[task.operation](payload, key, self.journal)
                )
                self.journal.update_task(task.task_id, status="completed", result=result, completed_at=time.time_ns(), last_error=None)
                return task.task_id, result, None
            except Exception as exc:  # retries are bounded by the task contract
                self.journal.update_task(task.task_id, status="retrying" if attempts <= task.retry_limit else "failed",
                                         attempts=attempts, last_error=type(exc).__name__ + ":" + str(exc))
                if attempts > task.retry_limit:
                    return task.task_id, None, type(exc).__name__ + ":" + str(exc)
        return task.task_id, None, "RETRY_EXHAUSTED"

    def _compensate(self, completed: list[str]) -> list[str]:
        compensated = []
        for task_id in reversed(completed):
            task = self.tasks[task_id]
            if not task.compensation:
                continue
            record = self.journal.task(task_id)
            payload = {"task_id": task_id, "original_result": record.get("result", {})}
            try:
                self.journal.apply_once(
                    f"compensate:{task_id}", payload,
                    lambda: self.operations[task.compensation](payload, f"compensate:{task_id}", self.journal)
                )
                self.journal.update_task(task_id, status="compensated")
                compensated.append(task_id)
            except Exception as exc:
                self.journal.update_task(task_id, compensation_error=type(exc).__name__ + ":" + str(exc))
        return compensated

    def run(self) -> dict:
        completed = sorted((task_id for task_id in self.tasks if self.journal.task(task_id).get("status") == "completed"),\n                           key=lambda item: self.journal.task(item).get("completed_at", 0))
        failed = []
        in_flight: dict[Future, str] = {}
        stop_dispatch = False
        with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            while True:
                if not stop_dispatch:
                    ready = []
                    for task_id, task in self.tasks.items():
                        state = self.journal.task(task_id).get("status")
                        if state in {"completed", "compensated", "blocked", "failed", "running"}:
                            continue
                        if all(self.journal.task(dep).get("status") == "completed" for dep in task.dependencies):
                            ready.append(task)
                    ready.sort(key=lambda item: item.task_id)
                    while ready and len(in_flight) < self.max_workers:
                        task = ready.pop(0)
                        future = pool.submit(self._execute, task)
                        in_flight[future] = task.task_id
                        self.max_observed_in_flight = max(self.max_observed_in_flight, len(in_flight))
                if not in_flight:
                    break
                done, _ = wait(in_flight, return_when=FIRST_COMPLETED)
                for future in done:
                    task_id = in_flight.pop(future)
                    try:
                        _id, _result, error = future.result()
                    except Exception as exc:
                        error = type(exc).__name__ + ":" + str(exc)
                    if error:
                        failed.append(task_id)
                        stop_dispatch = True
                    elif task_id not in completed:
                        completed.append(task_id)

        if failed:
            for task_id in self.tasks:
                state = self.journal.task(task_id).get("status")
                if state not in {"completed", "failed", "compensated"}:
                    self.journal.update_task(task_id, status="blocked")
            compensated = self._compensate(completed)
            status = "failed"
        else:
            compensated = []
            status = "completed" if all(self.journal.task(task_id).get("status") == "completed"
                                         for task_id in self.tasks) else "blocked"
        return {
            "status": status,
            "completed": sorted(completed),
            "failed": sorted(set(failed)),
            "compensated": compensated,
            "max_in_flight": self.max_observed_in_flight,
            "tasks": {task_id: self.journal.task(task_id) for task_id in self.tasks},
        }


def demo() -> None:
    import tempfile
    from pathlib import Path

    def operation(payload: dict, key: str, journal: ExecutionJournal) -> dict:
        time.sleep(0.01)
        return {"value": payload.get("value", "ok"), "operation_key": key}

    with tempfile.TemporaryDirectory() as directory:
        journal = ExecutionJournal(Path(directory) / "journal.json")
        tasks = [
            TaskSpec("collect", "run", payload={"value": "sources"}),
            TaskSpec("draft", "run", ("collect",), {"value": "draft"}),
            TaskSpec("review", "run", ("collect",), {"value": "review"}),
            TaskSpec("publish", "run", ("draft", "review"), {"value": "published"}),
        ]
        result = TaskCoordinator(tasks, {"run": operation}, journal, max_workers=2).run()
        print(f"status={result['status']} completed={len(result['completed'])}/4 "
              f"max_in_flight={result['max_in_flight']}")


if __name__ == "__main__":
    demo()
