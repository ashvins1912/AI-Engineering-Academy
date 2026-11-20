"""End-to-end deterministic trace through a tiny fixed-weight causal transformer."""
from __future__ import annotations
import json
from pathlib import Path
from transformers import (causal_mask,decode_logits,embedding_lookup,kv_cache_bytes,lora_parameter_count,
                          scaled_dot_product_attention,tokenize_greedy,transformer_block_residual)

VOCAB=["<bos>","hello","world","!"]
TOKEN_IDS={token:i for i,token in enumerate(VOCAB)}
EMBEDDINGS=[[.1,.0,.2,.1],[.2,.1,.0,.3],[.0,.3,.2,.1],[.1,.2,.1,.0]]
POSITIONS=[[.01*i,.02*i,-.01*i,.03*i] for i in range(8)]

def run_trace(text:str="hello world !")->dict[str,object]:
    pieces=tokenize_greedy(text,VOCAB)
    ids=[TOKEN_IDS[p] for p in pieces]
    vectors=embedding_lookup(ids,EMBEDDINGS,POSITIONS)
    mask=causal_mask(len(ids))
    query=vectors[-1]
    attention=scaled_dot_product_attention(query,vectors,vectors,mask[-1])
    ffn=[.02,-.01,.03,.01]
    block=transformer_block_residual(vectors[-1],attention["output"],ffn)
    logits=[sum(a*b for a,b in zip(block,row)) for row in EMBEDDINGS]
    decoded=decode_logits(logits,temperature=.8,top_k=3,top_p=.9,seed=7)
    return {
        "text":text,"tokens":pieces,"token_ids":ids,
        "shapes":{"ids":[1,len(ids)],"embeddings":[1,len(ids),4],"attention_output":[4],"block_output":[4],"logits":[len(VOCAB)]},
        "causal_mask":mask,"attention_weights":attention["weights"],"attention_output":attention["output"],
        "block_output":block,"logits":logits,"decoded_token_id":decoded["token_id"],
        "decoded_token":VOCAB[decoded["token_id"]],"sampling_candidates":decoded["candidates"],
        "lora_rank8_params":lora_parameter_count(4096,4096,8),
        "kv_cache_bytes":kv_cache_bytes(layers=2,sequence=len(ids),kv_heads=2,head_dim=2,bytes_per_value=2),
        "educational_fixed_weights":True
    }

def main():
    result=run_trace()
    print(json.dumps(result,indent=2))
if __name__=="__main__":main()
