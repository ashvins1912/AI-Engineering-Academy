"""Dependency-free numerical references for deep-learning fundamentals."""
from __future__ import annotations
import math, random
from typing import Sequence

def sigmoid(z:float)->float:
    if z>=0:return 1/(1+math.exp(-min(z,709)))
    e=math.exp(max(z,-709));return e/(1+e)

def relu(x:float)->float:return max(0.0,x)

def neuron_forward(x:float,w:float,b:float)->tuple[float,float]:
    z=w*x+b
    return z,sigmoid(z)

def neuron_loss_gradient(x:float,w:float,b:float,target:float)->dict[str,float]:
    z,p=neuron_forward(x,w,b)
    loss=.5*(p-target)**2
    delta=(p-target)*p*(1-p)
    return {"logit":z,"prediction":p,"loss":loss,"grad_w":delta*x,"grad_b":delta}

def finite_difference(fn,x:float,epsilon:float=1e-5)->float:
    if epsilon<=0:raise ValueError("epsilon must be positive")
    return (fn(x+epsilon)-fn(x-epsilon))/(2*epsilon)

def forward_2_2_1(x:Sequence[float])->dict[str,object]:
    if len(x)!=2:raise ValueError("network expects two input features")
    z1=(.5*x[0]-.4*x[1]+.1,-.3*x[0]+.8*x[1]-.2)
    hidden=(sigmoid(z1[0]),sigmoid(z1[1]))
    z2=.7*hidden[0]-.5*hidden[1]+.2
    return {"hidden":hidden,"logit":z2,"output":sigmoid(z2)}

def conv2d_valid(image:Sequence[Sequence[float]],kernel:Sequence[Sequence[float]],stride:int=1)->list[list[float]]:
    if not image or not kernel or stride<1:raise ValueError("image/kernel must be non-empty and stride positive")
    ih,iw=len(image),len(image[0]);kh,kw=len(kernel),len(kernel[0])
    if any(len(row)!=iw for row in image) or any(len(row)!=kw for row in kernel):raise ValueError("ragged matrices are not supported")
    if kh>ih or kw>iw:raise ValueError("kernel cannot exceed input dimensions")
    oh=(ih-kh)//stride+1;ow=(iw-kw)//stride+1
    return [[sum(image[r+i*stride][c+j*stride]*kernel[i][j] for i in range(kh) for j in range(kw)) for c in range(ow)] for r in range(oh)]

def max_pool2d(matrix:Sequence[Sequence[float]],size:int=2,stride:int=2)->list[list[float]]:
    if not matrix or size<1 or stride<1:raise ValueError("matrix, pool size and stride must be valid")
    h,w=len(matrix),len(matrix[0])
    if any(len(row)!=w for row in matrix):raise ValueError("ragged matrix")
    return [[max(matrix[r+i][c+j] for i in range(size) for j in range(size)) for c in range(0,w-size+1,stride)] for r in range(0,h-size+1,stride)]

def rnn_sequence(inputs:Sequence[float],w_x:float=1.0,w_h:float=.5,b:float=0.0,h0:float=0.0)->list[float]:
    state=h0;states=[]
    for value in inputs:
        state=math.tanh(w_x*value+w_h*state+b);states.append(state)
    return states

def lstm_step(x:float,h_prev:float,c_prev:float)->dict[str,float]:
    i=sigmoid(.8*x+.2*h_prev-.1)
    f=sigmoid(.7*x+.1*h_prev+.2)
    o=sigmoid(.6*x+.3*h_prev-.2)
    candidate=math.tanh(.5*x+.4*h_prev)
    cell=f*c_prev+i*candidate
    hidden=o*math.tanh(cell)
    return {"input_gate":i,"forget_gate":f,"output_gate":o,"candidate":candidate,"cell":cell,"hidden":hidden}

def dropout(values:Sequence[float],probability:float,seed:int=7,training:bool=True)->list[float]:
    if not 0<=probability<1:raise ValueError("dropout probability must be in [0,1)")
    if not training:return list(values)
    rng=random.Random(seed);keep=1-probability
    return [value/keep if rng.random()<keep else 0.0 for value in values]

def batch_norm(values:Sequence[float],gamma:float=1.0,beta:float=0.0,epsilon:float=1e-5)->list[float]:
    if not values:raise ValueError("batch must be non-empty")
    mean=sum(values)/len(values)
    variance=sum((x-mean)**2 for x in values)/len(values)
    return [gamma*(x-mean)/math.sqrt(variance+epsilon)+beta for x in values]

def optimizer_step(parameter:float,gradient:float,learning_rate:float,kind:str="sgd",state:dict|None=None,step:int=1)->tuple[float,dict]:
    if learning_rate<=0 or not math.isfinite(learning_rate):raise ValueError("learning rate must be finite and positive")
    state=dict(state or {})
    if kind=="sgd":return parameter-learning_rate*gradient,state
    if kind=="momentum":
        velocity=.9*state.get("velocity",0.0)+gradient
        state["velocity"]=velocity
        return parameter-learning_rate*velocity,state
    if kind=="adam":
        m=.9*state.get("m",0.0)+.1*gradient
        v=.999*state.get("v",0.0)+.001*gradient*gradient
        mh=m/(1-.9**step);vh=v/(1-.999**step)
        state.update({"m":m,"v":v})
        return parameter-learning_rate*mh/(math.sqrt(vh)+1e-8),state
    raise ValueError("optimizer must be sgd, momentum or adam")

def early_stopping(validation_losses:Sequence[float],patience:int=3,min_delta:float=0.0)->dict[str,int|float]:
    if not validation_losses or patience<1:raise ValueError("losses must be non-empty and patience positive")
    best=float("inf");best_epoch=0;wait=0;stop_epoch=len(validation_losses)
    for epoch,value in enumerate(validation_losses,1):
        if not math.isfinite(value):raise ValueError("validation loss must be finite")
        if value<best-min_delta:best=value;best_epoch=epoch;wait=0
        else:
            wait+=1
            if wait>=patience:stop_epoch=epoch;break
    return {"best_epoch":best_epoch,"best_loss":best,"stop_epoch":stop_epoch}

def generalization_gap(train_loss:float,validation_loss:float)->float:
    return validation_loss-train_loss
