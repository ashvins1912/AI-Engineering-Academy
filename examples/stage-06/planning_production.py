"""Production-shaped DAG executor with allow-listed handlers and idempotency keys."""
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Any, Callable
Handler=Callable[[dict[str,Any],str],dict[str,Any]]
@dataclass(frozen=True)
class Task:
    id:str
    depends_on:tuple[str,...]
    payload:dict[str,Any]

def validate_dag(tasks:list[Task])->list[str]:
    by_id={task.id:task for task in tasks}
    if len(by_id)!=len(tasks): raise ValueError('duplicate task id')
    indegree={task.id:0 for task in tasks}; children=defaultdict(list)
    for task in tasks:
        if len(set(task.depends_on))!=len(task.depends_on): raise ValueError('duplicate dependency')
        for dep in task.depends_on:
            if dep not in by_id: raise ValueError(f'unknown dependency: {dep}')
            children[dep].append(task.id); indegree[task.id]+=1
    ready=deque(sorted(key for key,value in indegree.items() if value==0)); order=[]
    while ready:
        node=ready.popleft(); order.append(node)
        for child in sorted(children[node]):
            indegree[child]-=1
            if indegree[child]==0: ready.append(child)
    if len(order)!=len(tasks): raise ValueError('dependency cycle detected')
    return order

def execute_plan(tasks:list[Task],handlers:dict[str,Handler],*,max_tasks:int=20,run_id:str='run-local')->dict[str,Any]:
    if max_tasks<1: raise ValueError('max_tasks must be positive')
    order=validate_dag(tasks); by_id={task.id:task for task in tasks}; status={key:'pending' for key in order}; trace=[]; executed=0
    while True:
        ready=[key for key in order if status[key]=='pending' and all(status[d]=='succeeded' for d in by_id[key].depends_on)]
        if not ready or executed>=max_tasks: break
        key=ready[0]; handler=handlers.get(key)
        if handler is None: status[key]='failed'; trace.append({'task':key,'status':'failed','reason':'handler_not_allowlisted'}); break
        idem=f'{run_id}:{key}'
        try:
            result=handler(by_id[key].payload,idem); status[key]='succeeded'; trace.append({'task':key,'status':'succeeded','idempotency_key':idem,'result':result})
        except Exception as error:
            status[key]='failed'; trace.append({'task':key,'status':'failed','reason':type(error).__name__}); break
        executed+=1
    changed=True
    while changed:
        changed=False
        for key in order:
            if status[key]=='pending' and any(status[d] in {'failed','blocked'} for d in by_id[key].depends_on): status[key]='blocked'; changed=True
    if executed>=max_tasks:
        for key in order:
            if status[key]=='pending': status[key]='budget_exhausted'
    complete=all(v=='succeeded' for v in status.values())
    return {'status':'completed' if complete else ('needs_intervention' if any(v in {'failed','blocked'} for v in status.values()) else 'incomplete'),'task_status':status,'trace':trace}
