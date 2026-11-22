"""Deterministic durable-agent orchestration teaching engine.

This is a local workflow simulator, not a distributed workflow service. It uses
bounded thread concurrency, explicit task dependencies, checkpoint snapshots,
and idempotency keys. It never calls a model or network service.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from hashlib import sha256
import json
from typing import Any, Callable


@dataclass(frozen=True)
class Task:
    task_id: str
    action: str
    depends_on: tuple[str, ...] = ()
    max_attempts: int = 1
    compensation: str | None = None


@dataclass
class TaskRecord:
    status: str = "PENDING"
    attempts: int = 0
    result: Any = None
    error: str | None = None


class PlanError(ValueError):
    pass


class Checkpoint:
    """Serializable execution journal; persist snapshots atomically in real systems."""
    def __init__(self, records: dict[str, TaskRecord] | None = None):
        self.records = records or {}

    def snapshot(self) -> dict[str, dict[str, Any]]:
        return {key: asdict(value) for key, value in sorted(self.records.items())}

    @classmethod
    def restore(cls, payload: dict[str, dict[str, Any]]) -> "Checkpoint":
        return cls({key: TaskRecord(**value) for key, value in payload.items()})


class IdempotencyLedger:
    def __init__(self):
        self._results: dict[str, tuple[str, Any]] = {}

    def execute_once(self, key: str, payload: Any, operation: Callable[[], Any]):
        digest = sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()
        if key in self._results:
            previous_digest, result = self._results[key]
            if previous_digest != digest:
                raise PlanError("IDEMPOTENCY_PAYLOAD_MISMATCH")
            return result, False
        result = operation()
        self._results[key] = (digest, result)
        return result, True


class AgentOrchestrator:
    def __init__(self, tasks: list[Task], handlers: dict[str, Callable[[Task], Any]],
                 *, max_workers: int = 2, ledger: IdempotencyLedger | None = None):
        if max_workers < 1:
            raise ValueError("MAX_WORKERS_MUST_BE_POSITIVE")
        self.tasks = {task.task_id: task for task in tasks}
        if len(self.tasks) != len(tasks) or any(not key for key in self.tasks):
            raise PlanError("DUPLICATE_OR_EMPTY_TASK_ID")
        self.handlers = handlers
        self.max_workers = max_workers
        self.ledger = ledger or IdempotencyLedger()
        self._validate_graph()

    def _validate_graph(self):
        for task in self.tasks.values():
            if task.max_attempts < 1:
                raise PlanError("MAX_ATTEMPTS_MUST_BE_POSITIVE")
            if task.action not in self.handlers:
                raise PlanError(f"UNKNOWN_ACTION:{task.action}")
            missing = set(task.depends_on) - self.tasks.keys()
            if missing:
                raise PlanError(f"UNKNOWN_DEPENDENCY:{task.task_id}:{sorted(missing)}")
            if task.task_id in task.depends_on:
                raise PlanError("SELF_DEPENDENCY")
        visiting, visited = set(), set()

        def visit(task_id: str):
            if task_id in visiting:
                raise PlanError("DEPENDENCY_CYCLE")
            if task_id in visited:
                return
            visiting.add(task_id)
            for dependency in self.tasks[task_id].depends_on:
                visit(dependency)
            visiting.remove(task_id)
            visited.add(task_id)

        for task_id in self.tasks:
            visit(task_id)

    def run(self, checkpoint: Checkpoint | None = None) -> Checkpoint:
        journal = checkpoint or Checkpoint()
        for task_id in self.tasks:
            journal.records.setdefault(task_id, TaskRecord())
        unknown = set(journal.records) - self.tasks.keys()
        if unknown:
            raise PlanError(f"CHECKPOINT_UNKNOWN_TASKS:{sorted(unknown)}")
        if any(record.status not in {"PENDING", "SUCCEEDED", "FAILED"} for record in journal.records.values()):
            raise PlanError("CHECKPOINT_HAS_NONTERMINAL_STATE")

        while True:
            pending = [task for task in self.tasks.values()
                       if journal.records[task.task_id].status == "PENDING"]
            if not pending:
                break
            failed_dependencies = {
                task.task_id for task in pending
                if any(journal.records[dep].status == "FAILED" for dep in task.depends_on)
            }
            for task_id in failed_dependencies:
                journal.records[task_id].status = "FAILED"
                journal.records[task_id].error = "DEPENDENCY_FAILED"

            ready = [task for task in pending
                     if all(journal.records[dep].status == "SUCCEEDED" for dep in task.depends_on)]
            if not ready:
                if failed_dependencies:
                    continue
                raise PlanError("NO_RUNNABLE_TASKS")

            batch = ready[:self.max_workers]
            with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
                futures = {pool.submit(self._execute, task, journal.records[task.task_id]): task
                           for task in batch}
                for future in as_completed(futures):
                    task = futures[future]
                    record = journal.records[task.task_id]
                    try:
                        record.result = future.result()
                        record.status = "SUCCEEDED"
                        record.error = None
                    except Exception as error:  # task boundary: persist failure, do not hide it
                        record.status = "FAILED"
                        record.error = str(error)

        return journal

    def _execute(self, task: Task, record: TaskRecord):
        while record.attempts < task.max_attempts:
            record.attempts += 1
            try:
                result, _created = self.ledger.execute_once(
                    f"stage12:{task.task_id}", {"action": task.action, "task": task.task_id},
                    lambda: self.handlers[task.action](task),
                )
                return result
            except Exception:
                if record.attempts >= task.max_attempts:
                    raise
        raise PlanError("ATTEMPT_BUDGET_EXHAUSTED")


def demo():
    events = []
    handlers = {
        "ingest": lambda task: events.append("ingest") or {"documents": 3},
        "retrieve": lambda task: events.append("retrieve") or {"chunks": 2},
        "answer": lambda task: events.append("answer") or {"citations": 2},
    }
    tasks = [
        Task("ingest", "ingest"),
        Task("retrieve", "retrieve", ("ingest",)),
        Task("answer", "answer", ("retrieve",)),
    ]
    journal = AgentOrchestrator(tasks, handlers, max_workers=2).run()
    print(json.dumps({"events": events, "checkpoint": journal.snapshot()}, indent=2))


if __name__ == "__main__":
    demo()
