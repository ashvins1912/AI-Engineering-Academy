"""Beginner-first task decomposition and deterministic DAG planning."""
from collections import defaultdict, deque
from pathlib import Path
import json
FIXTURE=json.loads((Path(__file__).parent/'fixtures'/'planning.json').read_text(encoding='utf-8'))

def validate_and_order(tasks):
    by_id={task['id']:task for task in tasks}
    if len(by_id)!=len(tasks): raise ValueError('duplicate task id')
    indegree={key:0 for key in by_id}; children=defaultdict(list)
    for task in tasks:
        for dep in task['dependsOn']:
            if dep not in by_id: raise ValueError(f'unknown dependency: {dep}')
            children[dep].append(task['id']); indegree[task['id']]+=1
    ready=deque(sorted(key for key,value in indegree.items() if value==0)); order=[]
    while ready:
        node=ready.popleft(); order.append(node)
        for child in sorted(children[node]):
            indegree[child]-=1
            if indegree[child]==0: ready.append(child)
    if len(order)!=len(tasks): raise ValueError('dependency cycle detected')
    return order

def priority_score(task):
    if task['effort']<=0: raise ValueError('effort must be positive')
    return task['value']*task['urgency']/task['effort']

def execute_plan(tasks,fail_task=None,max_tasks=10):
    if max_tasks<1: raise ValueError('max_tasks must be positive')
    order=validate_and_order(tasks); by_id={task['id']:task for task in tasks}
    status={key:'pending' for key in order}; trace=[]; executed=0
    while True:
        ready=[key for key in order if status[key]=='pending' and all(status[d]=='succeeded' for d in by_id[key]['dependsOn'])]
        if not ready or executed>=max_tasks: break
        selected=max(ready,key=lambda key:(priority_score(by_id[key]),key)); status[selected]='running'
        failed=selected==fail_task; status[selected]='failed' if failed else 'succeeded'
        trace.append({'task':selected,'status':status[selected],'score':round(priority_score(by_id[selected]),2),'outcome':'simulated stockout' if failed else by_id[selected]['acceptance']}); executed+=1
        if failed: break
    changed=True
    while changed:
        changed=False
        for key in order:
            if status[key]=='pending' and any(status[d] in {'failed','blocked'} for d in by_id[key]['dependsOn']): status[key]='blocked'; changed=True
    if executed>=max_tasks:
        for key in order:
            if status[key]=='pending': status[key]='budget_exhausted'
    complete=all(value=='succeeded' for value in status.values())
    return {'status':'completed' if complete else ('needs_intervention' if any(v in {'failed','blocked'} for v in status.values()) else 'incomplete'),'order':order,'task_status':status,'trace':trace}

if __name__=='__main__': print(json.dumps(execute_plan(FIXTURE['tasks']),indent=2))
