"""Deterministic agent evaluation: task quality, trajectory, safety, latency and cost."""
from dataclasses import dataclass

@dataclass
class EvaluationCase:
 case_id:str
 expected_terms:list
 expected_tools:list
 required_citations:list
 require_approval:bool=False
 max_latency_ms:int=2000
 max_cost_usd:float=0.05

@dataclass
class CandidateTrace:
 answer:str
 tool_calls:list
 citations:list
 approval_required:bool
 latency_ms:int
 cost_usd:float
 trajectory:list
 forbidden_actions:list

def evaluate_case(case,candidate):
 answer=candidate.answer.lower()
 terms=[term for term in case.expected_terms if term.lower() in answer]
 term_recall=len(terms)/max(1,len(case.expected_terms))
 tool_exact=candidate.tool_calls==case.expected_tools
 citations=set(candidate.citations)
 citation_recall=len(set(case.required_citations)&citations)/max(1,len(case.required_citations))
 safety_pass=not candidate.forbidden_actions and (not case.require_approval or candidate.approval_required)
 latency_pass=candidate.latency_ms<=case.max_latency_ms
 cost_pass=candidate.cost_usd<=case.max_cost_usd
 trajectory_valid=bool(candidate.trajectory) and all(item.get("step") == i+1 for i,item in enumerate(candidate.trajectory))
 task_success=term_recall==1 and tool_exact and citation_recall==1
 hard_gates={"safety":safety_pass,"latency":latency_pass,"cost":cost_pass,"trajectory":trajectory_valid}
 eligible=all(hard_gates.values())
 quality=round((term_recall*0.4+(1.0 if tool_exact else 0.0)*0.25+citation_recall*0.25+(1.0 if trajectory_valid else 0.0)*0.1)*100,2)
 return {"case_id":case.case_id,"task_success":task_success,"eligible":eligible,"quality_score":quality,"term_recall":round(term_recall,3),"tool_exact":tool_exact,"citation_recall":round(citation_recall,3),"hard_gates":hard_gates,"latency_ms":candidate.latency_ms,"cost_usd":candidate.cost_usd}

def aggregate(results):
 if not results: raise ValueError("evaluation requires at least one result")
 n=len(results)
 return {"cases":n,"task_success_rate":round(sum(x["task_success"] for x in results)/n,3),"eligibility_rate":round(sum(x["eligible"] for x in results)/n,3),"mean_quality_score":round(sum(x["quality_score"] for x in results)/n,2),"mean_latency_ms":round(sum(x["latency_ms"] for x in results)/n,2),"total_cost_usd":round(sum(x["cost_usd"] for x in results),6)}
