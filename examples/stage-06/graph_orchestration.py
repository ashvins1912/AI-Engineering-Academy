"""A tiny LangGraph-inspired state graph; no framework or API key required."""
from dataclasses import dataclass,field
from copy import deepcopy

@dataclass
class GraphState:
    values: dict=field(default_factory=dict)
    messages: list=field(default_factory=list)
    next_node: str|None=None
    status: str="running"
    steps: int=0

class StateGraph:
    def __init__(self):
        self.nodes={}; self.edges={}; self.routes={}; self.entry=None; self.ends=set()
    def add_node(self,name,fn):
        if not name or name in self.nodes: raise ValueError("node name missing or duplicated")
        self.nodes[name]=fn; return self
    def set_entry_point(self,name): self.entry=name; return self
    def add_edge(self,source,target):
        self.edges[source]=target; return self
    def add_conditional_edges(self,source,router,mapping):
        self.routes[source]=(router,dict(mapping)); return self
    def add_end(self,name): self.ends.add(name); return self
    def compile(self):
        if self.entry not in self.nodes: raise ValueError("entry node is not registered")
        for source,target in self.edges.items():
            if source not in self.nodes or (target not in self.nodes and target not in self.ends):
                raise ValueError(f"invalid edge {source}->{target}")
        for source,(_,mapping) in self.routes.items():
            if source not in self.nodes or any(t not in self.nodes and t not in self.ends for t in mapping.values()):
                raise ValueError(f"invalid conditional route from {source}")
        return CompiledGraph(self)

class InMemoryCheckpoints:
    def __init__(self): self.data={}
    def save(self,thread_id,state): self.data[thread_id]=deepcopy(state)
    def load(self,thread_id): return deepcopy(self.data.get(thread_id))

class CompiledGraph:
    def __init__(self,graph): self.graph=graph
    def invoke(self,initial,thread_id="demo",max_steps=20,checkpoints=None,resume=False):
        if max_steps<1: raise ValueError("max_steps must be positive")
        state=checkpoints.load(thread_id) if resume and checkpoints else None
        state=state or GraphState(values=deepcopy(initial),next_node=self.graph.entry)
        trace=[]
        while state.next_node not in self.graph.ends and state.status=="running":
            if state.steps>=max_steps:
                state.status="step_limit"; break
            name=state.next_node
            if name not in self.graph.nodes: raise ValueError(f"unknown next node: {name}")
            update=self.graph.nodes[name](deepcopy(state.values))
            if not isinstance(update,dict): raise TypeError(f"node {name} must return a dict update")
            state.values.update(update)
            state.steps+=1
            if name in self.graph.routes:
                router,mapping=self.graph.routes[name]
                key=router(deepcopy(state.values))
                if key not in mapping: raise ValueError(f"unmapped route: {key}")
                target=mapping[key]
            else: target=self.graph.edges.get(name)
            if target is None: raise ValueError(f"node {name} has no outgoing edge")
            state.next_node=target
            trace.append({"step":state.steps,"node":name,"update":deepcopy(update),"next":target})
            if checkpoints: checkpoints.save(thread_id,state)
            if target in self.graph.ends: state.status="completed"
        return {"state":state,"trace":trace}

def build_support_graph():
    g=StateGraph()
    g.add_node("classify",lambda s:{"intent":"billing" if "invoice" in s["question"].lower() else "general"})
    g.add_node("billing",lambda s:{"answer":"Invoice help: check the billing portal."})
    g.add_node("general",lambda s:{"answer":"I can help with that request."})
    g.add_node("finish",lambda s:{})
    g.set_entry_point("classify").add_conditional_edges("classify",lambda s:s["intent"],{"billing":"billing","general":"general"})
    g.add_edge("billing","finish").add_edge("general","finish").add_end("finish")
    return g.compile()

if __name__=="__main__":
    result=build_support_graph().invoke({"question":"Where is my invoice?"})
    print(result["state"].status,result["state"].values)
    print(result["trace"])
