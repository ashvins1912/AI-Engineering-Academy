"""Minimal dependency-free inference HTTP service for container hardening labs."""
import hashlib,json,os,signal,threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer

MODEL_PATH=os.getenv("MODEL_PATH","/app/model/model.json")
MAX_BODY_BYTES=int(os.getenv("MAX_BODY_BYTES","16384"))
MODEL=None
READY=False
STOP=threading.Event()

def load_model(path=MODEL_PATH):
 with open(path,encoding="utf-8") as f: model=json.load(f)
 weights=model.get("weights");bias=model.get("bias")
 if not isinstance(weights,list) or not weights or not all(isinstance(x,(int,float)) for x in weights):
  raise ValueError("model weights must be a non-empty numeric array")
 if not isinstance(bias,(int,float)): raise ValueError("model bias must be numeric")
 return {"weights":[float(x) for x in weights],"bias":float(bias),"sha256":hashlib.sha256(json.dumps(model,sort_keys=True).encode()).hexdigest()}

def predict(features,model):
 if not isinstance(features,list) or len(features)!=len(model["weights"]): raise ValueError("feature vector length mismatch")
 if not all(isinstance(x,(int,float)) and not isinstance(x,bool) for x in features): raise ValueError("features must be numeric")
 score=model["bias"]+sum(float(x)*w for x,w in zip(features,model["weights"]))
 return {"score":score,"model_sha256":model["sha256"]}

class Handler(BaseHTTPRequestHandler):
 server_version="AcademyInference/1.0"
 def log_message(self,fmt,*args): print(json.dumps({"event":"http_access","message":fmt%args}),flush=True)
 def send_json(self,status,payload):
  body=json.dumps(payload,separators=(",",":")).encode()
  self.send_response(status);self.send_header("Content-Type","application/json")
  self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store");self.end_headers();self.wfile.write(body)
 def do_GET(self):
  if self.path=="/health/live": return self.send_json(200,{"status":"live"})
  if self.path=="/health/ready":
   return self.send_json(200 if READY else 503,{"status":"ready" if READY else "not_ready","model_loaded":MODEL is not None})
  return self.send_json(404,{"error":"not_found"})
 def do_POST(self):
  if self.path!="/predict": return self.send_json(404,{"error":"not_found"})
  try:
   length=int(self.headers.get("Content-Length","0"))
   if length<1 or length>MAX_BODY_BYTES: return self.send_json(413,{"error":"invalid_body_size"})
   payload=json.loads(self.rfile.read(length))
   result=predict(payload.get("features"),MODEL)
   return self.send_json(200,result)
  except (ValueError,TypeError,json.JSONDecodeError) as exc:return self.send_json(400,{"error":"invalid_request","detail":str(exc)})
  except Exception:return self.send_json(503,{"error":"inference_unavailable"})

def main():
 global MODEL,READY
 MODEL=load_model();READY=True
 server=ThreadingHTTPServer(("0.0.0.0",int(os.getenv("PORT","8080"))),Handler)
 def stop(*_):
  READY=False
  threading.Thread(target=server.shutdown,daemon=True).start()
 signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
 print(json.dumps({"event":"service_started","model_sha256":MODEL["sha256"]}),flush=True)
 try:server.serve_forever(poll_interval=.25)
 finally:server.server_close();READY=False
if __name__=="__main__":main()
