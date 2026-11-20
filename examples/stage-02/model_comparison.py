"""Deterministic three-family model comparison with fold-local preprocessing."""
from __future__ import annotations
import argparse,csv,json,math,random
from dataclasses import dataclass,asdict
from pathlib import Path
from classical_ml import confusion_metrics,knn_predict

@dataclass(frozen=True)
class Row:
    row_id:str
    features:tuple[float,float]
    target:int

def load_rows(path:Path)->list[Row]:
    rows=[]
    with path.open("r",encoding="utf-8",newline="") as f:
        reader=csv.DictReader(f)
        required={"id","study_hours","attendance","target"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError("dataset is missing required columns")
        seen=set()
        for line,r in enumerate(reader,start=2):
            rid=(r["id"] or "").strip()
            if not rid or rid in seen:raise ValueError(f"line {line}: missing or duplicate id")
            seen.add(rid)
            try:x=(float(r["study_hours"]),float(r["attendance"]));y=int(r["target"])
            except ValueError as exc:raise ValueError(f"line {line}: invalid numeric field") from exc
            if not all(math.isfinite(v) for v in x) or y not in (0,1):raise ValueError(f"line {line}: invalid feature or target")
            rows.append(Row(rid,x,y))
    if len(rows)<6:raise ValueError("at least six rows are required for three-fold comparison")
    return rows

def fit_scaler(rows:list[Row])->tuple[tuple[float,float],tuple[float,float]]:
    means=tuple(sum(r.features[j] for r in rows)/len(rows) for j in range(2))
    scales=[]
    for j in range(2):
        variance=sum((r.features[j]-means[j])**2 for r in rows)/len(rows)
        scales.append(math.sqrt(variance) or 1.0)
    return means,(scales[0],scales[1])

def apply_scaler(rows:list[Row],scaler)->list[tuple[float,float]]:
    means,scales=scaler
    return [tuple((r.features[j]-means[j])/scales[j] for j in range(2)) for r in rows]

def stratified_folds(rows:list[Row],folds:int=3)->list[list[int]]:
    if folds<2:raise ValueError("folds must be at least two")
    buckets=[[] for _ in range(folds)]
    by_label={0:[],1:[]}
    for i,r in enumerate(rows):by_label[r.target].append(i)
    for label,indices in by_label.items():
        for position,index in enumerate(indices):buckets[position%folds].append(index)
    return [sorted(bucket) for bucket in buckets]

def fit_logistic(features:list[tuple[float,float]],labels:list[int],epochs:int=250,rate:float=.2):
    w=[0.0,0.0];bias=0.0
    for _ in range(epochs):
        gw=[0.0,0.0];gb=0.0
        for x,y in zip(features,labels):
            p=1/(1+math.exp(-max(-30,min(30,w[0]*x[0]+w[1]*x[1]+bias))))
            error=p-y
            gw[0]+=error*x[0];gw[1]+=error*x[1];gb+=error
        w=[w[j]-rate*gw[j]/len(features) for j in range(2)]
        bias-=rate*gb/len(features)
    return w,bias

def predict_logistic(model,features):
    w,b=model
    return [1 if 1/(1+math.exp(-max(-30,min(30,w[0]*x[0]+w[1]*x[1]+b))))>=.5 else 0 for x in features]

def fit_stump(features:list[tuple[float,float]],labels:list[int]):
    best=None
    for column in range(2):
        values=sorted(set(x[column] for x in features))
        thresholds=[(a+b)/2 for a,b in zip(values,values[1:])]
        for threshold in thresholds:
            left=[y for x,y in zip(features,labels) if x[column]<=threshold]
            right=[y for x,y in zip(features,labels) if x[column]>threshold]
            if not left or not right:continue
            def impurity(group):
                p=sum(group)/len(group)
                return 2*p*(1-p)
            gain=impurity(labels)-(len(left)/len(labels))*impurity(left)-(len(right)/len(labels))*impurity(right)
            candidate=(gain,column,threshold,1 if sum(left)>len(left)/2 else 0,1 if sum(right)>len(right)/2 else 0)
            if best is None or candidate[0]>best[0]:best=candidate
    if best is None:
        majority=1 if sum(labels)>len(labels)/2 else 0
        return (0,0.0,majority,majority)
    return best[1],best[2],best[3],best[4]

def predict_stump(stump,features):
    column,threshold,left,right=stump
    return [left if x[column]<=threshold else right for x in features]

def fit_bagged_stumps(features:list[tuple[float,float]],labels:list[int],seed:int=7,count:int=9):
    rng=random.Random(seed);models=[]
    for _ in range(count):
        indices=[rng.randrange(len(features)) for _ in features]
        sample_x=[features[i] for i in indices];sample_y=[labels[i] for i in indices]
        models.append(fit_stump(sample_x,sample_y))
    return models

def predict_bagged_stumps(models,features):
    predictions=[]
    for x in features:
        votes=[predict_stump(model,[x])[0] for model in models]
        predictions.append(1 if sum(votes)>len(votes)/2 else 0)
    return predictions

def evaluate(y_true:list[int],y_pred:list[int])->dict[str,float]:
    tp=sum(a==1 and b==1 for a,b in zip(y_true,y_pred))
    fp=sum(a==0 and b==1 for a,b in zip(y_true,y_pred))
    fn=sum(a==1 and b==0 for a,b in zip(y_true,y_pred))
    tn=sum(a==0 and b==0 for a,b in zip(y_true,y_pred))
    return confusion_metrics(tp,fp,fn,tn)

def compare_models(input_path:Path,output_path:Path,folds:int=3)->dict:
    rows=load_rows(input_path);validation_folds=stratified_folds(rows,folds)
    model_scores={"logistic":[],"knn":[],"bagged_stumps":[]};fold_audit=[]
    for fold,valid_indices in enumerate(validation_folds):
        valid_set=set(valid_indices)
        train=[r for i,r in enumerate(rows) if i not in valid_set]
        valid=[rows[i] for i in valid_indices]
        scaler=fit_scaler(train) # fit on training fold only
        x_train=apply_scaler(train,scaler);x_valid=apply_scaler(valid,scaler)
        y_train=[r.target for r in train];y_valid=[r.target for r in valid]
        logistic=fit_logistic(x_train,y_train)
        knn=[knn_predict(x_train,y_train,x,k=min(3,len(x_train))) for x in x_valid]
        ensemble=fit_bagged_stumps(x_train,y_train,seed=7+fold)
        predictions={
            "logistic":predict_logistic(logistic,x_valid),
            "knn":knn,
            "bagged_stumps":predict_bagged_stumps(ensemble,x_valid)
        }
        for name,pred in predictions.items():model_scores[name].append(evaluate(y_valid,pred))
        fold_audit.append({"fold":fold,"train_rows":len(train),"validation_rows":len(valid),"scaler_fit_rows":len(train),"validation_used_for_fit":False})
    summary={}
    for name,scores in model_scores.items():
        summary[name]={metric:sum(row[metric] for row in scores)/len(scores) for metric in ("precision","recall","f1","accuracy")}
    report={"dataset_rows":len(rows),"folds":folds,"models":summary,"fold_audit":fold_audit,
            "selection_note":"Educational synthetic comparison only; select models using representative validation data and operational constraints."}
    output_path.parent.mkdir(parents=True,exist_ok=True)
    output_path.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    return report

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",type=Path,default=Path("examples/stage-02/fixtures/student-outcomes.csv"))
    parser.add_argument("--output",type=Path,default=Path("build/stage-02/model-comparison.json"))
    parser.add_argument("--folds",type=int,default=3)
    args=parser.parse_args()
    report=compare_models(args.input,args.output,args.folds)
    print(json.dumps({"output":str(args.output),"dataset_rows":report["dataset_rows"],"models":report["models"],"folds":report["fold_audit"]},indent=2))
if __name__=="__main__":main()
