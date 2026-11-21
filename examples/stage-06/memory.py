"""From-scratch memory layers, policy filtering and token-budgeted context assembly."""
from pathlib import Path
import json
FIXTURE=json.loads((Path(__file__).parent/'fixtures'/'memory.json').read_text(encoding='utf-8'))

def memory_score(record):
    return .5*record['relevance'] + .3*record['reliability'] + .2*record['recency']

def select_memories(records,tenant_id,now,token_budget):
    if token_budget < 0: raise ValueError('token budget cannot be negative')
    eligible=[r for r in records if r['tenant_id']==tenant_id and not r['deleted'] and r['expires_at']>now]
    ranked=sorted(eligible,key=lambda r:(-memory_score(r),r['id']))
    selected=[];used=0
    for record in ranked:
        cost=record['token_cost']
        if cost < 0: raise ValueError('token cost cannot be negative')
        if used+cost<=token_budget:
            selected.append({'id':record['id'],'type':record['type'],'text':record['text'],'source_id':record['source_id'],'score':round(memory_score(record),3),'token_cost':cost})
            used+=cost
    return {'items':selected,'tokens_used':used,'tokens_remaining':token_budget-used}

if __name__=='__main__':
    result=select_memories(FIXTURE['records'],FIXTURE['tenantId'],FIXTURE['now'],FIXTURE['tokenBudget'])
    print(json.dumps(result,indent=2))
