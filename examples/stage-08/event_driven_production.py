"""SQLite transactional outbox/inbox with ordered projections and dead letters."""
import json
import sqlite3
import time

class EventGap(Exception): pass
class EventConflict(Exception): pass

class EventStore:
    def __init__(self,path=":memory:",clock=None):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.clock=clock or time.time
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS business_state(
          tenant_id TEXT NOT NULL,aggregate_id TEXT NOT NULL,version INTEGER NOT NULL,
          state_json TEXT NOT NULL,updated_at REAL NOT NULL,PRIMARY KEY(tenant_id,aggregate_id));
        CREATE TABLE IF NOT EXISTS event_outbox(
          tenant_id TEXT NOT NULL,event_id TEXT NOT NULL,aggregate_id TEXT NOT NULL,
          aggregate_version INTEGER NOT NULL,event_json TEXT NOT NULL,status TEXT NOT NULL,
          created_at REAL NOT NULL,published_at REAL,PRIMARY KEY(tenant_id,event_id),
          UNIQUE(tenant_id,aggregate_id,aggregate_version));
        CREATE TABLE IF NOT EXISTS event_inbox(
          consumer TEXT NOT NULL,tenant_id TEXT NOT NULL,event_id TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,aggregate_version INTEGER NOT NULL,
          result_json TEXT NOT NULL,processed_at REAL NOT NULL,
          PRIMARY KEY(consumer,tenant_id,event_id));
        CREATE TABLE IF NOT EXISTS event_projections(
          consumer TEXT NOT NULL,tenant_id TEXT NOT NULL,aggregate_id TEXT NOT NULL,
          version INTEGER NOT NULL,state_json TEXT NOT NULL,updated_at REAL NOT NULL,
          PRIMARY KEY(consumer,tenant_id,aggregate_id));
        CREATE TABLE IF NOT EXISTS consumer_failures(
          consumer TEXT NOT NULL,tenant_id TEXT NOT NULL,event_id TEXT NOT NULL,
          attempts INTEGER NOT NULL,last_error TEXT NOT NULL,updated_at REAL NOT NULL,
          PRIMARY KEY(consumer,tenant_id,event_id));
        CREATE TABLE IF NOT EXISTS event_dlq(
          consumer TEXT NOT NULL,tenant_id TEXT NOT NULL,event_id TEXT NOT NULL,
          event_json TEXT NOT NULL,attempts INTEGER NOT NULL,reason TEXT NOT NULL,
          created_at REAL NOT NULL,PRIMARY KEY(consumer,tenant_id,event_id));
        """)
    def close(self):self.db.close()
    def _event_dict(self,event):
        return event.to_dict() if hasattr(event,"to_dict") else dict(event)
    def commit_business_event(self,tenant_id,aggregate_id,expected_version,new_state,event):
        data=self._event_dict(event)
        if data.get("tenant_id")!=tenant_id or data.get("aggregate_id")!=aggregate_id or data.get("aggregate_version")!=expected_version+1:
            raise ValueError("event tenant, aggregate and version must match business transaction")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT version FROM business_state WHERE tenant_id=? AND aggregate_id=?",(tenant_id,aggregate_id)).fetchone()
            actual=row["version"] if row else 0
            if actual!=expected_version:raise EventConflict("business aggregate version conflict")
            now=self.clock()
            if row:
                self.db.execute("UPDATE business_state SET version=?,state_json=?,updated_at=? WHERE tenant_id=? AND aggregate_id=? AND version=?",
                    (expected_version+1,json.dumps(new_state,sort_keys=True),now,tenant_id,aggregate_id,expected_version))
            else:
                self.db.execute("INSERT INTO business_state VALUES(?,?,?,?,?)",(tenant_id,aggregate_id,expected_version+1,json.dumps(new_state,sort_keys=True),now))
            self.db.execute("INSERT INTO event_outbox VALUES(?,?,?,?,?,?,?,NULL)",
                (tenant_id,data["event_id"],aggregate_id,data["aggregate_version"],json.dumps(data,sort_keys=True),"pending",now))
            self.db.execute("COMMIT")
            return {"version":expected_version+1,"event_id":data["event_id"]}
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def enqueue(self,event):
        data=self._event_dict(event)
        self.db.execute("INSERT INTO event_outbox VALUES(?,?,?,?,?,?,?,NULL)",
            (data["tenant_id"],data["event_id"],data["aggregate_id"],data["aggregate_version"],json.dumps(data,sort_keys=True),"pending",self.clock()))
        return True
    def pending_outbox(self,limit=100):
        rows=self.db.execute("SELECT event_json FROM event_outbox WHERE status='pending' ORDER BY created_at,event_id LIMIT ?",(limit,))
        return [json.loads(row["event_json"]) for row in rows]
    def mark_published(self,tenant_id,event_id):
        cursor=self.db.execute("UPDATE event_outbox SET status='published',published_at=? WHERE tenant_id=? AND event_id=? AND status='pending'",
            (self.clock(),tenant_id,event_id))
        return cursor.rowcount==1
    def consume_once(self,consumer,event,projection_update):
        data=self._event_dict(event)
        if not isinstance(projection_update,dict):raise ValueError("projection update must be an object")
        tenant=data["tenant_id"];event_id=data["event_id"];aggregate=data["aggregate_id"];version=data["aggregate_version"]
        self.db.execute("BEGIN IMMEDIATE")
        try:
            prior=self.db.execute("SELECT result_json FROM event_inbox WHERE consumer=? AND tenant_id=? AND event_id=?",(consumer,tenant,event_id)).fetchone()
            if prior:
                self.db.execute("COMMIT")
                return {"status":"duplicate","result":json.loads(prior["result_json"])}
            row=self.db.execute("SELECT version,state_json FROM event_projections WHERE consumer=? AND tenant_id=? AND aggregate_id=?",(consumer,tenant,aggregate)).fetchone()
            current=row["version"] if row else 0
            if version<=current:
                result={"stale":True,"current_version":current}
                self.db.execute("INSERT INTO event_inbox VALUES(?,?,?,?,?,?,?)",(consumer,tenant,event_id,aggregate,version,json.dumps(result),self.clock()))
                self.db.execute("COMMIT")
                return {"status":"stale","result":result}
            if version!=current+1:raise EventGap(f"expected aggregate version {current+1}, received {version}")
            state=json.loads(row["state_json"]) if row else {}
            state.update(projection_update)
            now=self.clock()
            if row:
                self.db.execute("UPDATE event_projections SET version=?,state_json=?,updated_at=? WHERE consumer=? AND tenant_id=? AND aggregate_id=?",
                    (version,json.dumps(state,sort_keys=True),now,consumer,tenant,aggregate))
            else:
                self.db.execute("INSERT INTO event_projections VALUES(?,?,?,?,?,?)",(consumer,tenant,aggregate,version,json.dumps(state,sort_keys=True),now))
            result={"applied":True,"aggregate_version":version}
            self.db.execute("INSERT INTO event_inbox VALUES(?,?,?,?,?,?,?)",(consumer,tenant,event_id,aggregate,version,json.dumps(result),now))
            self.db.execute("COMMIT")
            return {"status":"processed","result":result,"projection":state}
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def record_failure(self,consumer,event,reason,max_attempts=3):
        data=self._event_dict(event);tenant=data["tenant_id"];event_id=data["event_id"]
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT attempts FROM consumer_failures WHERE consumer=? AND tenant_id=? AND event_id=?",(consumer,tenant,event_id)).fetchone()
            attempts=(row["attempts"] if row else 0)+1
            now=self.clock()
            if row:
                self.db.execute("UPDATE consumer_failures SET attempts=?,last_error=?,updated_at=? WHERE consumer=? AND tenant_id=? AND event_id=?",(attempts,reason,now,consumer,tenant,event_id))
            else:
                self.db.execute("INSERT INTO consumer_failures VALUES(?,?,?,?,?,?)",(consumer,tenant,event_id,attempts,reason,now))
            if attempts>=max_attempts:
                self.db.execute("INSERT OR REPLACE INTO event_dlq VALUES(?,?,?,?,?,?,?)",(consumer,tenant,event_id,json.dumps(data,sort_keys=True),attempts,reason,now))
                status="dead_letter"
            else:status="retry"
            self.db.execute("COMMIT")
            return {"status":status,"attempts":attempts}
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def projection(self,consumer,tenant_id,aggregate_id):
        row=self.db.execute("SELECT version,state_json FROM event_projections WHERE consumer=? AND tenant_id=? AND aggregate_id=?",(consumer,tenant_id,aggregate_id)).fetchone()
        return None if row is None else {"version":row["version"],"state":json.loads(row["state_json"])}
    def dead_letters(self,consumer,tenant_id):
        rows=self.db.execute("SELECT event_id,event_json,attempts,reason FROM event_dlq WHERE consumer=? AND tenant_id=? ORDER BY created_at",(consumer,tenant_id))
        return [{"event_id":r["event_id"],"event":json.loads(r["event_json"]),"attempts":r["attempts"],"reason":r["reason"]} for r in rows]
