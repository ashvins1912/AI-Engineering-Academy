"""Dependency-free numerical reference operations for transformer and LLM internals."""
from __future__ import annotations
import math,random
from typing import Sequence

def tokenize_greedy(text:str,vocabulary:Sequence[str],max_tokens:int|None=None)->list[str]:
    if not text:return []
    vocab=sorted(set(vocabulary),key=len,reverse=True)
    tokens=[]
    for word in text.split():
        remaining=word
        while remaining:
            match=next((piece for piece in vocab if remaining.startswith(piece)),None)
            if match is None:raise ValueError(f"unknown subword at: {remaining[:8]}")
            tokens.append(match);remaining=remaining[len(match):]
            if max_tokens is not None and len(tokens)>=max_tokens:return tokens
    return tokens

def embedding_lookup(ids:Sequence[int],table:Sequence[Sequence[float]],positions:Sequence[Sequence[float]]|None=None)->list[list[float]]:
    if not table:raise ValueError("embedding table must be non-empty")
    width=len(table[0])
    if any(len(row)!=width for row in table):raise ValueError("embedding table rows must have equal width")
    result=[]
    for pos,token_id in enumerate(ids):
        if token_id<0 or token_id>=len(table):raise ValueError("token ID outside vocabulary")
        token=list(table[token_id])
        if positions is not None:
            if pos>=len(positions) or len(positions[pos])!=width:raise ValueError("position vector shape mismatch")
            token=[a+b for a,b in zip(token,positions[pos])]
        result.append(token)
    return result

def softmax(logits:Sequence[float])->list[float]:
    if not logits:raise ValueError("softmax input must be non-empty")
    if any(not math.isfinite(x) for x in logits):raise ValueError("logits must be finite")
    m=max(logits);values=[math.exp(x-m) for x in logits];total=sum(values)
    return [x/total for x in values]

def causal_mask(length:int)->list[list[bool]]:
    if length<1:raise ValueError("sequence length must be positive")
    return [[column<=row for column in range(length)] for row in range(length)]

def scaled_dot_product_attention(query:Sequence[float],keys:Sequence[Sequence[float]],values:Sequence[Sequence[float]],mask:Sequence[bool]|None=None)->dict[str,list]:
    if not query or not keys or len(keys)!=len(values):raise ValueError("query, keys and values must be non-empty and aligned")
    width=len(query)
    if any(len(k)!=width for k in keys) or any(len(v)!=len(values[0]) for v in values):raise ValueError("attention dimensions do not align")
    if mask is not None and len(mask)!=len(keys):raise ValueError("mask length must match key count")
    scores=[sum(q*k for q,k in zip(query,key))/math.sqrt(width) for key in keys]
    if mask is not None:
        if not any(mask):raise ValueError("attention mask cannot block every key")
        scores=[score if allowed else -1e9 for score,allowed in zip(scores,mask)]
    weights=softmax(scores)
    output=[sum(weights[i]*values[i][j] for i in range(len(values))) for j in range(len(values[0]))]
    return {"scores":scores,"weights":weights,"output":output}

def split_heads(vector:Sequence[float],heads:int)->list[list[float]]:
    if heads<1 or len(vector)%heads:raise ValueError("hidden width must be divisible by head count")
    width=len(vector)//heads
    return [list(vector[i*width:(i+1)*width]) for i in range(heads)]

def merge_heads(heads:Sequence[Sequence[float]])->list[float]:
    if not heads or any(len(h)!=len(heads[0]) for h in heads):raise ValueError("head outputs must be non-empty and equal width")
    return [value for head in heads for value in head]

def layer_norm(vector:Sequence[float],epsilon:float=1e-5)->list[float]:
    if not vector or epsilon<=0:raise ValueError("vector must be non-empty and epsilon positive")
    mean=sum(vector)/len(vector);variance=sum((x-mean)**2 for x in vector)/len(vector)
    return [(x-mean)/math.sqrt(variance+epsilon) for x in vector]

def transformer_block_residual(x:Sequence[float],attention:Sequence[float],ffn:Sequence[float])->list[float]:
    if not x or len(x)!=len(attention) or len(x)!=len(ffn):raise ValueError("residual and sublayer widths must match")
    first=[a+b for a,b in zip(x,attention)]
    normalized=layer_norm(first)
    second=[a+b for a,b in zip(normalized,ffn)]
    return layer_norm(second)

def shifted_lm_examples(token_ids:Sequence[int])->tuple[list[int],list[int]]:
    if len(token_ids)<2:raise ValueError("at least two tokens are required")
    return list(token_ids[:-1]),list(token_ids[1:])

def decode_logits(logits:Sequence[float],temperature:float=1.0,top_k:int|None=None,top_p:float=1.0,seed:int=7)->dict[str,object]:
    if not logits or temperature<=0 or not 0<top_p<=1:raise ValueError("logits, positive temperature and top_p in (0,1] are required")
    probs=softmax([x/temperature for x in logits])
    ranked=sorted(enumerate(probs),key=lambda item:(-item[1],item[0]))
    if top_k is not None:
        if top_k<1:raise ValueError("top_k must be positive")
        ranked=ranked[:top_k]
    kept=[];cumulative=0.0
    for index,p in ranked:
        kept.append((index,p));cumulative+=p
        if cumulative>=top_p:break
    total=sum(p for _,p in kept)
    normalized=[(index,p/total) for index,p in kept]
    rng=random.Random(seed);sample=rng.random();running=0.0;selected=normalized[-1][0]
    for index,p in normalized:
        running+=p
        if sample<=running:selected=index;break
    return {"token_id":selected,"candidates":[i for i,_ in normalized],"probabilities":[p for _,p in normalized]}

def lora_parameter_count(input_width:int,output_width:int,rank:int)->int:
    if min(input_width,output_width,rank)<1:raise ValueError("dimensions and rank must be positive")
    return rank*(input_width+output_width)

def kv_cache_bytes(layers:int,sequence:int,kv_heads:int,head_dim:int,bytes_per_value:int,batch:int=1)->int:
    if min(layers,sequence,kv_heads,head_dim,bytes_per_value,batch)<1:raise ValueError("KV cache dimensions must be positive")
    return 2*layers*sequence*kv_heads*head_dim*bytes_per_value*batch

def perplexity(mean_loss:float)->float:
    if not math.isfinite(mean_loss):raise ValueError("loss must be finite")
    return math.exp(mean_loss)
