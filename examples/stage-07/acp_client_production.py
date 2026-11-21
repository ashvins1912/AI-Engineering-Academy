"""SQLite session/audit persistence for an ACP client integration."""
import json
import sqlite3
import time

class ACPSessionStore:
    def __init__(self, path=":memory:", clock=None):
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.clock = clock or time.time
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS acp_sessions(
          session_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
          cwd TEXT NOT NULL, roots_json TEXT NOT NULL, state TEXT NOT NULL,
          version INTEGER NOT NULL, history_json TEXT NOT NULL, created_at REAL NOT NULL,
          updated_at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS ix_acp_owner_workspace ON acp_sessions(owner_id,workspace_id);
        CREATE TABLE IF NOT EXISTS acp_updates(
          session_id TEXT NOT NULL REFERENCES acp_sessions(session_id),
          sequence INTEGER NOT NULL, update_json TEXT NOT NULL, created_at REAL NOT NULL,
          PRIMARY KEY(session_id,sequence));
        CREATE TABLE IF NOT EXISTS acp_permissions(
          session_id TEXT NOT NULL REFERENCES acp_sessions(session_id),
          request_id TEXT NOT NULL, tool_call_id TEXT, outcome TEXT NOT NULL,
          option_id TEXT, scope TEXT NOT NULL, created_at REAL NOT NULL,
          PRIMARY KEY(session_id,request_id));
        CREATE TABLE IF NOT EXISTS acp_tool_calls(
          session_id TEXT NOT NULL REFERENCES acp_sessions(session_id),
          tool_call_id TEXT NOT NULL, status TEXT NOT NULL, cancel_supported INTEGER NOT NULL,
          updated_at REAL NOT NULL, PRIMARY KEY(session_id,tool_call_id));
        """)
    def close(self):
        self.db.close()
    def _session(self, owner_id, workspace_id, session_id):
        row = self.db.execute(
            "SELECT * FROM acp_sessions WHERE owner_id=? AND workspace_id=? AND session_id=?",
            (owner_id,workspace_id,session_id),
        ).fetchone()
        if row is None:
            raise KeyError("session not found")
        return row
    def create_session(self, owner_id, workspace_id, session_id, cwd, roots):
        if not all((owner_id,workspace_id,session_id,cwd)) or not roots:
            raise ValueError("owner, workspace, session, cwd and roots are required")
        if not cwd.startswith("/") or any(not r.startswith("/") for r in roots):
            raise ValueError("workspace paths must be absolute")
        now=self.clock()
        self.db.execute(
            "INSERT INTO acp_sessions VALUES(?,?,?,?,?,?,?,?,?,?)",
            (session_id,owner_id,workspace_id,cwd,json.dumps(roots),"idle",0,"[]",now,now),
        )
        return self.get_session(owner_id,workspace_id,session_id)
    def get_session(self, owner_id, workspace_id, session_id):
        row=self._session(owner_id,workspace_id,session_id)
        return {"session_id":row["session_id"],"owner_id":row["owner_id"],
                "workspace_id":row["workspace_id"],"cwd":row["cwd"],
                "roots":json.loads(row["roots_json"]),"state":row["state"],
                "version":row["version"],"history":json.loads(row["history_json"])}
    def update_state(self, owner_id, workspace_id, session_id, expected_version, state, message=None):
        if state not in {"idle","running","requires_action"}:
            raise ValueError("unsupported foreground session state")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self._session(owner_id,workspace_id,session_id)
            if row["version"]!=expected_version:
                raise RuntimeError("session version conflict")
            history=json.loads(row["history_json"])
            if message is not None:history.append(message)
            cursor=self.db.execute(
                "UPDATE acp_sessions SET state=?,version=?,history_json=?,updated_at=? "
                "WHERE session_id=? AND owner_id=? AND workspace_id=? AND version=?",
                (state,expected_version+1,json.dumps(history,sort_keys=True),self.clock(),
                 session_id,owner_id,workspace_id,expected_version),
            )
            if cursor.rowcount!=1:raise RuntimeError("session version conflict")
            self.db.execute("COMMIT")
            return self.get_session(owner_id,workspace_id,session_id)
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def append_update(self, owner_id, workspace_id, session_id, update):
        self._session(owner_id,workspace_id,session_id)
        if not isinstance(update,dict) or not update.get("sessionUpdate"):
            raise ValueError("typed ACP session update required")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT COALESCE(MAX(sequence),0)+1 n FROM acp_updates WHERE session_id=?",(session_id,)).fetchone()
            sequence=row["n"]
            self.db.execute("INSERT INTO acp_updates VALUES(?,?,?,?)",(session_id,sequence,json.dumps(update,sort_keys=True),self.clock()))
            self.db.execute("COMMIT")
            return sequence
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def updates(self, owner_id, workspace_id, session_id, after=0):
        self._session(owner_id,workspace_id,session_id)
        rows=self.db.execute("SELECT sequence,update_json FROM acp_updates WHERE session_id=? AND sequence>? ORDER BY sequence",(session_id,after))
        return [{"sequence":r["sequence"],"update":json.loads(r["update_json"])} for r in rows]
    def record_permission(self, owner_id, workspace_id, session_id, request_id, tool_call_id, outcome, option_id=None, scope="once"):
        self._session(owner_id,workspace_id,session_id)
        if outcome not in {"selected","cancelled"} or scope not in {"once","always"}:
            raise ValueError("invalid permission outcome or scope")
        if outcome=="selected" and not option_id:
            raise ValueError("selected outcome requires option ID")
        self.db.execute("INSERT INTO acp_permissions VALUES(?,?,?,?,?,?,?)",
            (session_id,request_id,tool_call_id,outcome,option_id,scope,self.clock()))
        return self.permission(owner_id,workspace_id,session_id,request_id)
    def permission(self, owner_id, workspace_id, session_id, request_id):
        self._session(owner_id,workspace_id,session_id)
        row=self.db.execute("SELECT * FROM acp_permissions WHERE session_id=? AND request_id=?",(session_id,request_id)).fetchone()
        return None if row is None else dict(row)
    def record_tool_call(self, owner_id, workspace_id, session_id, tool_call_id, status, cancel_supported=False):
        self._session(owner_id,workspace_id,session_id)
        if status not in {"pending","in_progress","paused","completed","failed","cancelled"}:
            raise ValueError("unknown tool call status")
        prior=self.db.execute("SELECT status FROM acp_tool_calls WHERE session_id=? AND tool_call_id=?",(session_id,tool_call_id)).fetchone()
        if prior and prior["status"] in {"completed","failed","cancelled"} and status!=prior["status"]:
            raise ValueError("terminal tool call cannot transition")
        self.db.execute(
            "INSERT INTO acp_tool_calls VALUES(?,?,?,?,?) ON CONFLICT(session_id,tool_call_id) "
            "DO UPDATE SET status=excluded.status,cancel_supported=excluded.cancel_supported,updated_at=excluded.updated_at",
            (session_id,tool_call_id,status,int(bool(cancel_supported)),self.clock()),
        )
        return {"tool_call_id":tool_call_id,"status":status,"cancel_supported":bool(cancel_supported)}
    def accept_tool_cancel(self, owner_id, workspace_id, session_id, tool_call_id):
        self._session(owner_id,workspace_id,session_id)
        row=self.db.execute("SELECT * FROM acp_tool_calls WHERE session_id=? AND tool_call_id=?",(session_id,tool_call_id)).fetchone()
        if row is None or not row["cancel_supported"] or row["status"] in {"completed","failed","cancelled"}:
            raise PermissionError("tool call is not cancellable")
        return {"accepted":True,"tool_call_id":tool_call_id}
