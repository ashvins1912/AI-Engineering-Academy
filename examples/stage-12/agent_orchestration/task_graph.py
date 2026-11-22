"""Small from-scratch DAG planner for bounded agent workflows.

This module validates task identity/dependencies and returns a deterministic
topological order. It never evaluates model-generated code or imports tools.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class TaskSpec:
    task_id: str
    operation: str
    dependencies: tuple[str, ...] = ()
    payload: dict | None = None
    retry_limit: int = 0
    compensation: str | None = None


class PlanError(ValueError):
    pass


def validate_plan(tasks: Iterable[TaskSpec]) -> list[TaskSpec]:
    items = list(tasks)
    by_id = {task.task_id: task for task in items}
    if len(by_id) != len(items):
        raise PlanError("DUPLICATE_TASK_ID")
    for task in items:
        if not task.task_id or not task.operation:
            raise PlanError("EMPTY_TASK_ID_OR_OPERATION")
        if task.retry_limit < 0:
            raise PlanError("NEGATIVE_RETRY_LIMIT")
        if len(set(task.dependencies)) != len(task.dependencies):
            raise PlanError(f"DUPLICATE_DEPENDENCY:{task.task_id}")
        for dependency in task.dependencies:
            if dependency not in by_id:
                raise PlanError(f"UNKNOWN_DEPENDENCY:{task.task_id}:{dependency}")
            if dependency == task.task_id:
                raise PlanError(f"SELF_DEPENDENCY:{task.task_id}")

    indegree = {task.task_id: len(task.dependencies) for task in items}
    children = {task.task_id: [] for task in items}
    for task in items:
        for dependency in task.dependencies:
            children[dependency].append(task.task_id)
    ready = sorted(task_id for task_id, degree in indegree.items() if degree == 0)
    ordered: list[TaskSpec] = []
    while ready:
        current = ready.pop(0)
        ordered.append(by_id[current])
        for child in sorted(children[current]):
            indegree[child] -= 1
            if indegree[child] == 0:
                ready.append(child)
                ready.sort()
    if len(ordered) != len(items):
        cyclic = sorted(task_id for task_id, degree in indegree.items() if degree > 0)
        raise PlanError("DEPENDENCY_CYCLE:" + ",".join(cyclic))
    return ordered
