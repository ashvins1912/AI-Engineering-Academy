"""Deterministic two-hidden-unit neural classifier with checkpointable training."""
from __future__ import annotations
import argparse,json,math
from pathlib import Path
from typing import Sequence

def sigmoid(z):return 1/(1+math.exp(-max(-30,min(30,z))))
def make_dataset():
    return [{"x":[float(a),float(b)],"y":int(a+b>0)} for a in (-2,-1,0,1,2) for b in (-2,-1,0,1,2)]
def split_dataset(rows):
    train=[r for i,r in enumerate(rows) if i%5 not in (0,1)]
    validation=[r for i,r in enumerate(rows) if i%5==1]
    test=[r for i,r in enumerate(rows) if i%5==0]
    if not train or not validation or not test:raise ValueError("split must produce train, validation and test rows")
    return train,validation,test
def initial_state():
    return {"epoch":0,"w1":[[.15,-.2],[.1,.2]],"b1":[0.0,0.0],"w2":[.1,-.1],"b2":0.0,
            "best_validation_loss":float("inf"),"best_epoch":0,"best_model":None,"patience_count":0}
def forward(state,x):
    hidden=[math.tanh(sum(state["w1"][j][k]*x[k] for k in range(2))+state["b1"][j]) for j in range(2)]
    probability=sigmoid(sum(state["w2"][j]*hidden[j] for j in range(2))+state["b2"])
    return hidden,probability
def binary_loss(state,rows):
    if not rows:raise ValueError("evaluation rows must be non-empty")
    total=0.0
    for row in rows:
        _,p=forward(state,row["x"]);y=row["y"]
        total-=y*math.log(max(p,1e-12))+(1-y)*math.log(max(1-p,1e-12))
    return total/len(rows)
def train_epoch(state,rows,learning_rate=.1):
    if not rows or learning_rate<=0:raise ValueError("training rows and positive learning rate are required")
    gw1=[[0.0,0.0],[0.0,0.0]];gb1=[0.0,0.0];gw2=[0.0,0.0];gb2=0.0
    for row in rows:
        x,y=row["x"],row["y"]
        z1=[sum(state["w1"][j][k]*x[k] for k in range(2))+state["b1"][j] for j in range(2)]
        h=[math.tanh(z) for z in z1]
        p=sigmoid(sum(state["w2"][j]*h[j] for j in range(2))+state["b2"])
        delta2=p-y
        for j in range(2):
            gw2[j]+=delta2*h[j]
            delta1=delta2*state["w2"][j]*(1-h[j]*h[j])
            gb1[j]+=delta1
            for k in range(2):gw1[j][k]+=delta1*x[k]
        gb2+=delta2
    n=len(rows)
    for j in range(2):
        state["w2"][j]-=learning_rate*gw2[j]/n
        state["b1"][j]-=learning_rate*gb1[j]/n
        for k in range(2):state["w1"][j][k]-=learning_rate*gw1[j][k]/n
    state["b2"]-=learning_rate*gb2/n
    state["epoch"]+=1
    return binary_loss(state,rows)
def evaluate(state,rows):
    tp=fp=fn=tn=0
    for row in rows:
        _,p=forward(state,row["x"]);pred=int(p>=.5);actual=row["y"]
        if pred and actual:tp+=1
        elif pred:fp+=1
        elif actual:fn+=1
        else:tn+=1
    total=tp+fp+fn+tn
    return {"accuracy":(tp+tn)/total if total else 0.0,"precision":tp/(tp+fp) if tp+fp else 0.0,
            "recall":tp/(tp+fn) if tp+fn else 0.0,"tp":tp,"fp":fp,"fn":fn,"tn":tn}
def save_checkpoint(path:Path,state):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(state,sort_keys=True,allow_nan=False,indent=2)+"\n",encoding="utf-8")
def load_checkpoint(path:Path):
    state=json.loads(path.read_text(encoding="utf-8"))
    required={"epoch","w1","b1","w2","b2","best_validation_loss","best_epoch","best_model","patience_count"}
    if not required.issubset(state):raise ValueError("checkpoint is missing required training state")
    return state
def train_project(checkpoint:Path,epochs=250,learning_rate=.1,patience=25,resume=False):
    rows=make_dataset();train,validation,test=split_dataset(rows)
    state=load_checkpoint(checkpoint) if resume and checkpoint.exists() else initial_state()
    history=[]
    while state["epoch"]<epochs:
        train_loss=train_epoch(state,train,learning_rate)
        val_loss=binary_loss(state,validation)
        history.append({"epoch":state["epoch"],"train_loss":train_loss,"validation_loss":val_loss})
        if val_loss<state["best_validation_loss"]-1e-8:
            state["best_validation_loss"]=val_loss;state["best_epoch"]=state["epoch"]
            state["best_model"]={key:state[key] for key in ("w1","b1","w2","b2")}
            state["patience_count"]=0
        else:
            state["patience_count"]+=1
        save_checkpoint(checkpoint,state)
        if state["patience_count"]>=patience:break
    if state["best_model"]:
        for key,value in state["best_model"].items():state[key]=value
    return {"epochs_run":state["epoch"],"best_epoch":state["best_epoch"],"best_validation_loss":state["best_validation_loss"],
            "test_metrics":evaluate(state,test),"checkpoint":str(checkpoint),"history":history,"split_counts":{"train":len(train),"validation":len(validation),"test":len(test)}}
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint",type=Path,default=Path("build/stage-03/mlp-checkpoint.json"))
    parser.add_argument("--epochs",type=int,default=250);parser.add_argument("--resume",action="store_true")
    args=parser.parse_args()
    report=train_project(args.checkpoint,args.epochs,resume=args.resume)
    print(json.dumps({k:v for k,v in report.items() if k!="history"},indent=2))
if __name__=="__main__":main()
