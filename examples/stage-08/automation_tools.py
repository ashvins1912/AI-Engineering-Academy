"""Framework-neutral automation adapters with API-first and approval controls."""
from dataclasses import dataclass
from urllib.parse import urlsplit
from pathlib import PurePosixPath
import hashlib
import json

class AutomationError(Exception):pass
class ScopeDenied(AutomationError):pass
class OriginDenied(AutomationError):pass
class ApprovalDenied(AutomationError):pass
class IdempotencyConflict(AutomationError):pass

@dataclass(frozen=True)
class Principal:
    tenant_id:str
    user_id:str
    scopes:frozenset

class CredentialRegistry:
    """Store only opaque credential references and scope metadata in workflow state."""
    def __init__(self):self.refs={}
    def register(self,reference,tenant_id,scopes):
        if not reference or reference in self.refs:raise ValueError("credential reference missing or duplicated")
        self.refs[reference]={"tenant_id":tenant_id,"scopes":frozenset(scopes)}
    def authorize(self,reference,principal,required_scope):
        record=self.refs.get(reference)
        if not record or record["tenant_id"]!=principal.tenant_id:
            raise ScopeDenied("credential reference is unavailable for tenant")
        if required_scope not in record["scopes"] or required_scope not in principal.scopes:
            raise ScopeDenied("required OAuth scope is missing")
        return True

class APIConnector:
    def __init__(self,credentials):
        self.credentials=credentials;self.actions={};self.results={}
    def register_action(self,name,required_scope,handler):
        if name in self.actions:raise ValueError("action already registered")
        self.actions[name]={"scope":required_scope,"handler":handler}
    def execute(self,name,args,principal,credential_ref,idempotency_key):
        action=self.actions.get(name)
        if not action:raise AutomationError("connector action is not registered")
        self.credentials.authorize(credential_ref,principal,action["scope"])
        if not idempotency_key:raise IdempotencyConflict("stable idempotency key required")
        digest=hashlib.sha256(json.dumps(args,sort_keys=True,separators=(",",":")).encode()).hexdigest()
        key=(principal.tenant_id,name,idempotency_key)
        prior=self.results.get(key)
        if prior:
            if prior["hash"]!=digest:raise IdempotencyConflict("same key with changed payload")
            return prior["result"]
        result=action["handler"](dict(args),principal)
        if not isinstance(result,dict):raise AutomationError("connector result must be an object")
        self.results[key]={"hash":digest,"result":result}
        return result

class BrowserPolicy:
    def __init__(self,allowed_origins,download_root="/sandbox/downloads"):
        self.allowed_origins=set(allowed_origins);self.download_root=PurePosixPath(download_root)
    def validate_navigation(self,url):
        parsed=urlsplit(url)
        origin=f"{parsed.scheme}://{parsed.netloc}"
        if parsed.scheme!="https" or origin not in self.allowed_origins:
            raise OriginDenied("browser navigation origin is not allowlisted")
        return True
    def validate_locator(self,role,name):
        allowed={"button","link","textbox","checkbox","radio","heading","combobox","option"}
        if role not in allowed or not name or len(name)>120:
            raise AutomationError("use a bounded accessible role and name locator")
        return {"role":role,"name":name}
    def validate_download(self,relative_path):
        path=PurePosixPath(relative_path)
        if path.is_absolute() or ".." in path.parts or not path.parts:
            raise OriginDenied("download path escapes sandbox")
        return str(self.download_root/path)

def canonical_hash(action):
    raw=json.dumps(action,sort_keys=True,separators=(",",":"),ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()

class ApprovalGate:
    def __init__(self):self.requests={}
    def request(self,approval_id,tenant_id,run_id,action,allowed_approvers,expires_at):
        if approval_id in self.requests:raise ValueError("approval ID already exists")
        self.requests[approval_id]={"tenant_id":tenant_id,"run_id":run_id,"action_hash":canonical_hash(action),
          "allowed_approvers":set(allowed_approvers),"expires_at":expires_at,"status":"pending","used":False}
        return {"approval_id":approval_id,"payload_hash":self.requests[approval_id]["action_hash"]}
    def decide(self,approval_id,tenant_id,approver,action,decision,now):
        req=self.requests.get(approval_id)
        if not req or req["tenant_id"]!=tenant_id:raise ApprovalDenied("approval not found")
        if req["action_hash"]!=canonical_hash(action):raise ApprovalDenied("approved action payload changed")
        if approver not in req["allowed_approvers"]:raise ApprovalDenied("approver is not authorized")
        if now>=req["expires_at"] or req["used"]:raise ApprovalDenied("approval expired or already used")
        if req["status"]!="pending" or decision not in {"approved","rejected"}:raise ApprovalDenied("invalid approval transition")
        req["status"]=decision
        return {"status":decision,"action_hash":req["action_hash"]}
    def consume(self,approval_id,tenant_id,action,now):
        req=self.requests.get(approval_id)
        if not req or req["tenant_id"]!=tenant_id or req["status"]!="approved" or req["used"]:
            raise ApprovalDenied("approval is not available for execution")
        if req["action_hash"]!=canonical_hash(action) or now>=req["expires_at"]:
            raise ApprovalDenied("approval does not match or has expired")
        req["used"]=True
        return True

class AutomationRun:
    def __init__(self,tenant_id,run_id):
        self.tenant_id=tenant_id;self.run_id=run_id;self.seen_events=set();self.steps=[]
    def accept_trigger(self,event_id):
        key=(self.tenant_id,event_id)
        if key in self.seen_events:return False
        self.seen_events.add(key);return True
    def record_step(self,step_id,result):
        self.steps.append({"step_id":step_id,"result":dict(result)})
        return len(self.steps)

def demo():
    vault=CredentialRegistry();vault.register("cred-docs-tenant-a","tenant-a",{"documents:read"})
    principal=Principal("tenant-a","reviewer",frozenset({"documents:read"}))
    api=APIConnector(vault);api.register_action("document.get","documents:read",lambda args,user:{"document_id":args["id"],"status":"ready"})
    print(api.execute("document.get",{"id":"doc-42"},principal,"cred-docs-tenant-a","doc-42:metadata"))
if __name__=="__main__":demo()
