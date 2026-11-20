"""Dependency-free reference algorithms for Stage 2 classical machine learning."""
from __future__ import annotations
import math
from collections import Counter
from typing import Sequence

def linear_regression(x: Sequence[float], y: Sequence[float]) -> dict[str, float]:
    if not x or len(x) != len(y):
        raise ValueError("x and y must be non-empty and have equal lengths")
    mx, my = sum(x)/len(x), sum(y)/len(y)
    variance = sum((v-mx)**2 for v in x)
    if variance == 0:
        raise ValueError("feature variance is zero; slope is undefined")
    slope = sum((a-mx)*(b-my) for a,b in zip(x,y))/variance
    intercept = my-slope*mx
    mse = sum((slope*a+intercept-b)**2 for a,b in zip(x,y))/len(x)
    return {"slope":slope,"intercept":intercept,"mse":mse}

def sigmoid(z: float) -> float:
    if z >= 0:
        return 1/(1+math.exp(-min(z,709)))
    exp_z=math.exp(max(z,-709))
    return exp_z/(1+exp_z)

def binary_cross_entropy(probabilities: Sequence[float], labels: Sequence[int], epsilon: float=1e-12) -> float:
    if not probabilities or len(probabilities)!=len(labels):
        raise ValueError("probabilities and labels must be non-empty and aligned")
    if any(label not in (0,1) for label in labels):
        raise ValueError("labels must be binary")
    if any(not math.isfinite(p) or p<0 or p>1 for p in probabilities):
        raise ValueError("probabilities must be finite and in [0,1]")
    return -sum(y*math.log(max(epsilon,p))+(1-y)*math.log(max(epsilon,1-p)) for p,y in zip(probabilities,labels))/len(labels)

def gini(labels: Sequence[int]) -> float:
    if not labels:return 0.0
    counts=Counter(labels); total=len(labels)
    return 1-sum((count/total)**2 for count in counts.values())

def entropy(labels: Sequence[int]) -> float:
    if not labels:return 0.0
    counts=Counter(labels); total=len(labels)
    return -sum((count/total)*math.log2(count/total) for count in counts.values())

def information_gain(parent: Sequence[int], left: Sequence[int], right: Sequence[int], criterion: str="gini") -> float:
    if not parent or len(left)+len(right)!=len(parent):
        raise ValueError("children must partition a non-empty parent")
    impurity=gini if criterion=="gini" else entropy if criterion=="entropy" else None
    if impurity is None:raise ValueError("criterion must be gini or entropy")
    return impurity(parent)-(len(left)/len(parent))*impurity(left)-(len(right)/len(parent))*impurity(right)

def majority_vote(predictions: Sequence[int]) -> int:
    if not predictions or any(p not in (0,1) for p in predictions):
        raise ValueError("predictions must be a non-empty binary sequence")
    ones=sum(predictions)
    return 1 if ones>len(predictions)/2 else 0

def knn_predict(points: Sequence[Sequence[float]], labels: Sequence[int], query: Sequence[float], k: int=3) -> int:
    if not points or len(points)!=len(labels):raise ValueError("points and labels must be non-empty and aligned")
    if k<1 or k>len(points):raise ValueError("k must be between 1 and the number of points")
    if any(len(point)!=len(query) for point in points):raise ValueError("feature dimensions must match")
    ranked=sorted(enumerate(points),key=lambda item:(sum((a-b)**2 for a,b in zip(item[1],query)),item[0]))[:k]
    return majority_vote([labels[index] for index,_ in ranked])

def kmeans_step(points: Sequence[Sequence[float]], centroids: Sequence[Sequence[float]]) -> tuple[list[int],list[list[float]]]:
    if not points or not centroids:raise ValueError("points and centroids must be non-empty")
    dims=len(points[0])
    if any(len(p)!=dims for p in points) or any(len(c)!=dims for c in centroids):
        raise ValueError("all points and centroids must have equal dimensions")
    assignments=[]
    for point in points:
        assignments.append(min(range(len(centroids)),key=lambda i:sum((a-b)**2 for a,b in zip(point,centroids[i]))))
    updated=[]
    for i,center in enumerate(centroids):
        members=[p for p,a in zip(points,assignments) if a==i]
        updated.append([sum(p[d] for p in members)/len(members) for d in range(dims)] if members else list(center))
    return assignments,updated

def pca_2d(points: Sequence[Sequence[float]]) -> dict[str, object]:
    if len(points)<2 or any(len(p)!=2 for p in points):raise ValueError("PCA requires at least two 2D points")
    mx=sum(p[0] for p in points)/len(points); my=sum(p[1] for p in points)/len(points)
    centered=[(p[0]-mx,p[1]-my) for p in points]
    a=sum(x*x for x,_ in centered)/(len(points)-1)
    b=sum(x*y for x,y in centered)/(len(points)-1)
    d=sum(y*y for _,y in centered)/(len(points)-1)
    trace=a+d; disc=math.sqrt((a-d)**2+4*b*b)
    l1,l2=(trace+disc)/2,(trace-disc)/2
    if abs(b)>1e-12:
        vx,vy=b,l1-a
    else:
        vx,vy=(1.0,0.0) if a>=d else (0.0,1.0)
    norm=math.hypot(vx,vy); vector=(vx/norm,vy/norm)
    total=l1+l2
    return {"mean":(mx,my),"covariance":((a,b),(b,d)),"eigenvalues":(l1,l2),"first_component":vector,"explained_variance_ratio":l1/total if total else 0.0}

def confusion_metrics(tp:int,fp:int,fn:int,tn:int) -> dict[str,float]:
    if min(tp,fp,fn,tn)<0:raise ValueError("confusion counts must be non-negative")
    precision=tp/(tp+fp) if tp+fp else 0.0
    recall=tp/(tp+fn) if tp+fn else 0.0
    f1=2*precision*recall/(precision+recall) if precision+recall else 0.0
    total=tp+fp+fn+tn
    return {"precision":precision,"recall":recall,"f1":f1,"accuracy":(tp+tn)/total if total else 0.0}

def roc_auc(scores: Sequence[float], labels: Sequence[int]) -> float:
    if not scores or len(scores)!=len(labels) or set(labels)!={0,1}:
        raise ValueError("ROC-AUC needs aligned scores and both binary classes")
    positives=[s for s,y in zip(scores,labels) if y==1]
    negatives=[s for s,y in zip(scores,labels) if y==0]
    wins=sum(1.0 if p>n else 0.5 if p==n else 0.0 for p in positives for n in negatives)
    return wins/(len(positives)*len(negatives))
